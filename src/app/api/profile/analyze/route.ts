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
    });

    if (document?.id) {
      await admin
        .from("business_documents")
        .update({
          analysis_status: automation.ok ? "completed" : "processing",
          extracted_data: automation.data?.extractedData ?? {},
          recommendations: automation.data?.recommendations ?? [],
          updated_at: new Date().toISOString(),
        })
        .eq("id", document.id)
        .eq("organization_id", context.organizationId);
    }

    return NextResponse.json({
      configured: automation.configured,
      correlationId: automation.correlationId,
      analysis: automation.data,
      message: automation.configured
        ? "La constancia fue enviada a analisis."
        : "El modulo esta listo; falta configurar N8N_FISCAL_PROFILE_WEBHOOK_URL.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
