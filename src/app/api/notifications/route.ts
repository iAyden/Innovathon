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
    const admin = getSupabaseAdmin()!;
    const [documentResult, receivableResult] = await Promise.all([
      admin
        .from("business_documents")
        .select("id, file_name, extracted_data, recommendations, created_at")
        .eq("organization_id", context.organizationId)
        .eq("analysis_status", "completed")
        .neq("document_type", "tax-status-certificate")
        .order("created_at", { ascending: false })
        .limit(50),
      admin
        .from("accounts_receivable")
        .select(
          "id, description, amount, paid_amount, due_date, created_at, customers(name)",
        )
        .eq("organization_id", context.organizationId)
        .in("status", ["pending", "partial"])
        .lt("due_date", new Date().toISOString().slice(0, 10))
        .order("due_date")
        .limit(20),
    ]);

    if (documentResult.error) {
      throw new Error(documentResult.error.message);
    }

    const documentNotifications = (documentResult.data ?? []).flatMap(
      (document) => {
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
            context: document.file_name,
            href: "/orders?view=documents",
            createdAt: document.created_at,
          },
        ];
      },
    );
    const receivableNotifications = receivableResult.error
      ? []
      : (receivableResult.data ?? []).map((receivable) => {
          const customer = Array.isArray(receivable.customers)
            ? receivable.customers[0]
            : receivable.customers;
          const balance =
            Number(receivable.amount) - Number(receivable.paid_amount);

          return {
            id: `receivable-${receivable.id}`,
            type: "receivable-overdue",
            title: "Cuenta por cobrar vencida",
            message: `${customer?.name ?? "Cliente"} tiene un saldo vencido de ${formatCurrency(balance)}.`,
            context: receivable.description,
            href: "/accounts-receivable",
            createdAt: receivable.created_at,
          };
        });
    const notifications = [
      ...receivableNotifications,
      ...documentNotifications,
    ];

    return NextResponse.json({
      unreadCount: notifications.length,
      notifications,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}
