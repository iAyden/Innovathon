import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse, HttpError } from "@/lib/server/http";
import { triggerN8n } from "@/lib/server/n8n";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseJson(value: unknown) {
  if (typeof value !== "string") return value;

  const source = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(source);
  } catch {
    return value;
  }
}

function normalizeAnalysis(value: unknown) {
  const response = record(value);
  const parsedOutput = record(parseJson(response.output));
  const analysis = Object.keys(parsedOutput).length
    ? parsedOutput
    : response;
  const extractedData = record(parseJson(analysis.extractedData));
  const taxRegimes = Array.isArray(extractedData.taxRegimes)
    ? extractedData.taxRegimes
    : [];
  const firstTaxRegime = record(taxRegimes[0]);
  const parsedRecommendations = parseJson(analysis.recommendations);
  const recommendations = Array.isArray(parsedRecommendations)
    ? parsedRecommendations
    : [];

  return {
    raw: analysis,
    extractedData,
    recommendations,
    profile: {
      businessName: text(extractedData.businessName),
      rfc: text(extractedData.rfc).toUpperCase(),
      taxRegime:
        text(firstTaxRegime.code) ||
        text(firstTaxRegime.name) ||
        text(extractedData.taxRegime),
      fiscalZipCode: text(extractedData.fiscalZipCode),
    },
  };
}

export async function POST(request: Request) {
  try {
    const context = await requireOrganization();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new HttpError("Selecciona una constancia fiscal.", 400);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new HttpError("El documento no puede superar 10 MB.", 400);
    }

    const admin = getSupabaseAdmin()!;
    const { data: document } = await admin
      .from("business_documents")
      .insert({
        organization_id: context.organizationId,
        document_type: "tax-status-certificate",
        file_name: file.name,
        analysis_status: "processing",
      })
      .select("id")
      .maybeSingle();
    const bytes = Buffer.from(await file.arrayBuffer());
    const automation = await triggerN8n({
      workflow: "fiscal-profile",
      organizationId: context.organizationId,
      payload: {
        documentId: document?.id ?? null,
        file: {
          name: file.name,
          type: file.type || "application/pdf",
          size: file.size,
          contentBase64: bytes.toString("base64"),
        },
      },
      timeoutMs: 60000,
    });
    const analysis = normalizeAnalysis(automation.data);
    const analysisSucceeded = Boolean(automation.ok);

    if (document?.id) {
      await admin
        .from("business_documents")
        .update({
          analysis_status: analysisSucceeded ? "completed" : "failed",
          extracted_data: analysis.extractedData,
          recommendations: analysis.recommendations,
          updated_at: new Date().toISOString(),
        })
        .eq("id", document.id)
        .eq("organization_id", context.organizationId);
    }

    if (
      analysisSucceeded &&
      (analysis.profile.businessName || analysis.profile.rfc)
    ) {
      const { data: existingBusiness } = await admin
        .from("business_profiles")
        .select("organization_id")
        .eq("organization_id", context.organizationId)
        .maybeSingle();
      const businessData = {
        ...(analysis.profile.businessName
          ? {
              legal_name: analysis.profile.businessName,
              trade_name: analysis.profile.businessName,
            }
          : {}),
        ...(analysis.profile.rfc ? { rfc: analysis.profile.rfc } : {}),
        updated_at: new Date().toISOString(),
      };

      if (existingBusiness) {
        await admin
          .from("business_profiles")
          .update(businessData)
          .eq("organization_id", context.organizationId);
      } else {
        await admin.from("business_profiles").insert({
          organization_id: context.organizationId,
          ...businessData,
        });
      }

      if (analysis.profile.businessName) {
        await admin
          .from("organizations")
          .update({ name: analysis.profile.businessName })
          .eq("id", context.organizationId);
      }

      if (analysis.profile.businessName && analysis.profile.rfc) {
        const { data: existingTax } = await admin
          .from("tax_profiles")
          .select("id")
          .eq("organization_id", context.organizationId)
          .maybeSingle();
        const taxData = {
          organization_id: context.organizationId,
          business_name: analysis.profile.businessName,
          rfc: analysis.profile.rfc,
          ...(analysis.profile.taxRegime
            ? { tax_regime: analysis.profile.taxRegime }
            : {}),
          ...(analysis.profile.fiscalZipCode
            ? { fiscal_zip_code: analysis.profile.fiscalZipCode }
            : {}),
        };

        if (existingTax) {
          await admin.from("tax_profiles").update(taxData).eq("id", existingTax.id);
        } else {
          await admin.from("tax_profiles").insert({
            ...taxData,
            fiscal_email: context.email,
          });
        }
      }
    }

    return NextResponse.json({
      configured: automation.configured,
      correlationId: automation.correlationId,
      analysis: analysis.raw,
      profile: analysis.profile,
      recommendations: analysis.recommendations,
      profileUpdated: analysisSucceeded,
      message: analysisSucceeded
        ? "Constancia analizada. El perfil fiscal fue actualizado."
        : automation.configured
          ? "No se pudo completar el analisis de la constancia."
        : "El modulo esta listo; falta configurar N8N_FISCAL_PROFILE_WEBHOOK_URL.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
