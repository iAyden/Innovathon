import { NextResponse } from "next/server";
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
    const { data: document } = await admin
      .from("business_documents")
      .insert({
        organization_id: context.organizationId,
        document_type: "operational-document",
        file_name: file.name,
        analysis_status: "processing",
      })
      .select("id")
      .maybeSingle();
    const content = Buffer.from(await file.arrayBuffer()).toString("base64");
    const automation = await triggerN8n({
      workflow: "document-analysis",
      organizationId: context.organizationId,
      payload: {
        documentId: document?.id ?? null,
        file: {
          name: file.name,
          type: file.type,
          size: file.size,
          contentBase64: content,
        },
      },
    });
    const analysis = automation.ok ? (automation.data ?? {}) : {};

    if (document?.id) {
      await admin
        .from("business_documents")
        .update({
          analysis_status: automation.ok ? "completed" : "failed",
          extracted_data: analysis.extractedData ?? analysis,
          recommendations: Array.isArray(analysis.recommendations)
            ? analysis.recommendations
            : [],
          updated_at: new Date().toISOString(),
        })
        .eq("id", document.id)
        .eq("organization_id", context.organizationId);
    }

    return NextResponse.json({
      configured: automation.configured,
      success: Boolean(automation.ok),
      correlationId: automation.correlationId,
      analysis,
      message: automation.ok
        ? "Documento analizado correctamente."
        : automation.configured
          ? "n8n no pudo analizar el documento."
          : "Configura N8N_DOCUMENT_ANALYSIS_WEBHOOK_URL para activar el analisis.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
