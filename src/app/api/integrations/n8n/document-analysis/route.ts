import { NextResponse } from "next/server";
import {
  applyDocumentReviewRules,
  isDocumentAnalysis,
  normalizeDocumentAmounts,
} from "@/lib/document-analysis";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse, HttpError } from "@/lib/server/http";
import { triggerN8n } from "@/lib/server/n8n";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const context = await requireOrganization();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new HttpError("Selecciona un documento.", 400);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new HttpError("El documento no puede superar 10 MB.", 400);
    }

    const admin = getSupabaseAdmin()!;
    const { data: document, error: documentError } = await admin
      .from("business_documents")
      .insert({
        organization_id: context.organizationId,
        document_type: "operational-document",
        file_name: file.name,
        analysis_status: "processing",
      })
      .select("id")
      .maybeSingle();

    if (documentError || !document) {
      throw new HttpError(
        "No se pudo registrar el documento antes de analizarlo.",
        500,
      );
    }

    const content = Buffer.from(await file.arrayBuffer()).toString("base64");
    const automation = await triggerN8n({
      workflow: "document-analysis",
      organizationId: context.organizationId,
      payload: {
        documentId: document.id,
        file: {
          name: file.name,
          type: file.type,
          size: file.size,
          contentBase64: content,
        },
      },
      timeoutMs: 60000,
    });
    const rawAnalysis = automation.ok ? (automation.data ?? {}) : {};
    const validAnalysis = isDocumentAnalysis(rawAnalysis);
    const normalizedAnalysis = validAnalysis
      ? applyDocumentReviewRules(normalizeDocumentAmounts(rawAnalysis))
      : null;
    const analysis = normalizedAnalysis ?? rawAnalysis;
    const analysisSucceeded = Boolean(automation.ok && validAnalysis);

    const extractedData = (
      analysis.extractedData &&
      typeof analysis.extractedData === "object" &&
      !Array.isArray(analysis.extractedData)
        ? analysis.extractedData
        : analysis
    ) as any;
    const detectedDocumentType =
      "documentType" in extractedData &&
      typeof extractedData.documentType === "string"
        ? extractedData.documentType
        : "operational-document";
    const { error: updateError } = await admin
      .from("business_documents")
      .update({
        document_type: detectedDocumentType,
        analysis_status: analysisSucceeded ? "completed" : "failed",
        extracted_data: extractedData,
        recommendations: Array.isArray(analysis.recommendations)
          ? analysis.recommendations
          : [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", document.id)
      .eq("organization_id", context.organizationId);

    if (updateError) {
      throw new HttpError(
        "El documento fue analizado, pero no se pudo guardar el resultado.",
        500,
      );
    }

    if (analysisSucceeded && Array.isArray(extractedData.items) && extractedData.items.length > 0) {
      // Upsert into inventory_items
      for (const item of extractedData.items) {
        if (!item.name || typeof item.quantity !== "number") continue;

        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice || 0);
        const articleId = item.articleId || null;

        // Try to fetch existing
        const { data: existingItem } = await admin
          .from("inventory_items")
          .select("id, stock")
          .eq("organization_id", context.organizationId)
          .ilike("name", item.name)
          .maybeSingle();

        if (existingItem) {
          await admin
            .from("inventory_items")
            .update({
              stock: Number(existingItem.stock) + quantity,
              unit_price: unitPrice,
              article_id: articleId || undefined,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingItem.id);
        } else {
          await admin
            .from("inventory_items")
            .insert({
              organization_id: context.organizationId,
              name: item.name,
              article_id: articleId,
              stock: quantity,
              unit_price: unitPrice,
            });
        }
      }
    }

    return NextResponse.json({
      documentId: document.id,
      configured: automation.configured,
      success: analysisSucceeded,
      correlationId: automation.correlationId,
      analysis,
      message: analysisSucceeded
        ? normalizedAnalysis?.extractedData.reviewRequired &&
          !normalizedAnalysis.extractedData.reviewed
          ? "Documento analizado y enviado a revisión."
          : "Documento analizado correctamente."
        : automation.configured
          ? "n8n no pudo analizar el documento."
          : "Configura N8N_DOCUMENT_ANALYSIS_WEBHOOK_URL para activar el analisis.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
