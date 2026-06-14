import { NextResponse } from "next/server";
import {
  applyDocumentReviewRules,
  isDocumentAnalysis,
  normalizeDocumentAmounts,
} from "@/lib/document-analysis";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const context = await requireOrganization();
    const { data, error } = await getSupabaseAdmin()!
      .from("business_documents")
      .select(
        "id, file_name, document_type, analysis_status, extracted_data, recommendations, created_at, updated_at",
      )
      .eq("organization_id", context.organizationId)
      .neq("document_type", "tax-status-certificate")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(error.message);
    }

    const documents = (data ?? []).map((document) => {
      const candidate = {
        extractedData: document.extracted_data,
        recommendations: Array.isArray(document.recommendations)
          ? document.recommendations
          : [],
      };

      return {
        id: document.id,
        fileName: document.file_name,
        documentType: document.document_type,
        analysisStatus: document.analysis_status,
        analysis: isDocumentAnalysis(candidate)
          ? applyDocumentReviewRules(normalizeDocumentAmounts(candidate))
          : null,
        createdAt: document.created_at,
        updatedAt: document.updated_at,
      };
    });

    return NextResponse.json({ documents });
  } catch (error) {
    return errorResponse(error);
  }
}
