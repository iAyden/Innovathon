import { NextResponse } from "next/server";
import {
  applyDocumentReviewRules,
  isDocumentAnalysis,
  normalizeDocumentAmounts,
  normalizeDocumentItems,
} from "@/lib/document-analysis";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const context = await requireOrganization();
    const { data, error } = await getSupabaseAdmin()!
      .from("business_documents")
      .select("id, file_name, extracted_data, recommendations, created_at")
      .eq("organization_id", context.organizationId)
      .eq("analysis_status", "completed")
      .neq("document_type", "tax-status-certificate")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    const notifications = (data ?? []).flatMap((document) => {
      const candidate = {
        extractedData: document.extracted_data,
        recommendations: Array.isArray(document.recommendations)
          ? document.recommendations
          : [],
      };
      if (!isDocumentAnalysis(candidate)) return [];

      const analysis = applyDocumentReviewRules(
        normalizeDocumentAmounts(normalizeDocumentItems(candidate)),
      );
      const extracted = analysis.extractedData;
      if (!extracted.reviewRequired || extracted.reviewed) return [];

      return [
        {
          id: document.id,
          type: "document-review",
          title: "Documento pendiente de revisión",
          message:
            extracted.reviewReasons?.[0] ??
            "El análisis necesita confirmación manual.",
          fileName: document.file_name,
          createdAt: document.created_at,
        },
      ];
    });

    return NextResponse.json({
      unreadCount: notifications.length,
      notifications,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
