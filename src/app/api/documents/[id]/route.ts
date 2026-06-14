import { NextResponse } from "next/server";
import {
  applyDocumentReviewRules,
  isDocumentAnalysis,
  normalizeDocumentAmounts,
} from "@/lib/document-analysis";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse, HttpError } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const CATEGORIES = [
  "Alimentos y bebidas",
  "Insumos",
  "Transporte",
  "Servicios",
  "Renta",
  "Mantenimiento",
  "Equipo",
  "Impuestos",
  "Otros",
];

function toIsoDate(value: string) {
  const source = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) return source;

  const match = source.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;

  return new Date().toISOString().slice(0, 10);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireOrganization();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const admin = getSupabaseAdmin()!;
    const { data: document, error } = await admin
      .from("business_documents")
      .select("id, file_name, extracted_data, recommendations")
      .eq("id", id)
      .eq("organization_id", auth.organizationId)
      .single();

    if (error || !document) {
      throw new HttpError("Documento no encontrado.", 404);
    }

    const rawAnalysis = {
      extractedData: document.extracted_data,
      recommendations: Array.isArray(document.recommendations)
        ? document.recommendations
        : [],
    };
    if (!isDocumentAnalysis(rawAnalysis)) {
      throw new HttpError("El documento no tiene un análisis válido.", 409);
    }
    const analysis = applyDocumentReviewRules(
      normalizeDocumentAmounts(rawAnalysis),
    );

    if (action === "classify") {
      const category = String(body.category ?? "").trim();
      if (!CATEGORIES.includes(category)) {
        throw new HttpError("Selecciona una categoría válida.", 400);
      }

      const updatedAnalysis = applyDocumentReviewRules({
        ...analysis,
        extractedData: {
          ...analysis.extractedData,
          category,
          reviewed: false,
          reviewedAt: undefined,
        },
      });
      const extractedData = updatedAnalysis.extractedData;
      const { error: updateError } = await admin
        .from("business_documents")
        .update({
          extracted_data: extractedData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("organization_id", auth.organizationId);

      if (updateError) throw new Error(updateError.message);

      return NextResponse.json({
        success: true,
        analysis: updatedAnalysis,
      });
    }

    if (action === "mark-reviewed") {
      const extractedData = {
        ...analysis.extractedData,
        reviewed: true,
        reviewedAt: new Date().toISOString(),
      };
      const { error: updateError } = await admin
        .from("business_documents")
        .update({
          extracted_data: extractedData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("organization_id", auth.organizationId);

      if (updateError) throw new Error(updateError.message);

      return NextResponse.json({
        success: true,
        analysis: { ...analysis, extractedData },
      });
    }

    if (action === "register-expense") {
      if (analysis.extractedData.total <= 0) {
        throw new HttpError("El documento no tiene un total válido.", 400);
      }

      const { data: existingEntry } = await admin
        .from("cash_flow_entries")
        .select("id")
        .eq("organization_id", auth.organizationId)
        .eq("source", "document-analysis")
        .eq("external_id", id)
        .maybeSingle();

      if (existingEntry) {
        throw new HttpError("Este documento ya fue registrado como salida.", 409);
      }

      const { data: entry, error: entryError } = await admin
        .from("cash_flow_entries")
        .insert({
          organization_id: auth.organizationId,
          entry_type: "expense",
          category: analysis.extractedData.category || "Otros",
          description:
            analysis.extractedData.description ||
            `Compra en ${analysis.extractedData.issuerName || document.file_name}`,
          amount: analysis.extractedData.total,
          occurred_on: toIsoDate(analysis.extractedData.date),
          source: "document-analysis",
          external_id: id,
        })
        .select("id")
        .single();

      if (entryError || !entry) {
        throw new Error(entryError?.message ?? "No se pudo registrar la salida.");
      }

      const extractedData = {
        ...analysis.extractedData,
        registeredAsExpense: true,
        cashFlowEntryId: entry.id,
        reviewed: true,
        reviewedAt: new Date().toISOString(),
      };
      const { error: updateError } = await admin
        .from("business_documents")
        .update({
          extracted_data: extractedData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("organization_id", auth.organizationId);

      if (updateError) throw new Error(updateError.message);

      return NextResponse.json({
        success: true,
        cashFlowEntryId: entry.id,
        analysis: { ...analysis, extractedData },
      });
    }

    throw new HttpError("Acción no reconocida.", 400);
  } catch (error) {
    return errorResponse(error);
  }
}
