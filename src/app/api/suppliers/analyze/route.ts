import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/http";
import { triggerN8n } from "@/lib/server/n8n";
import {
  buildSupplierPortfolioFallback,
  calculateSupplierMetrics,
  normalizeSupplierPortfolioAnalysis,
  type SupplierExpense,
  type SupplierInvoiceRequest,
  type SupplierPortfolioAnalysis,
  type SupplierPortfolioItem,
} from "@/lib/server/supplier-analysis";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const auth = await requireOrganization();
    const { data, error } = await getSupabaseAdmin()!
      .from("integration_events")
      .select("response_payload, created_at")
      .eq("organization_id", auth.organizationId)
      .eq("workflow", "supplier-analysis")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      analysis: readStoredAnalysis(data?.response_payload, data?.created_at),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST() {
  try {
    const auth = await requireOrganization();
    const admin = getSupabaseAdmin()!;
    const [supplierResult, expenseResult, requestResult] = await Promise.all([
      admin
        .from("suppliers")
        .select("id, name, rfc, email, whatsapp")
        .eq("organization_id", auth.organizationId),
      admin
        .from("expenses")
        .select("supplier_id, amount, status")
        .eq("organization_id", auth.organizationId),
      admin
        .from("invoice_requests")
        .select("supplier_id, sent_at, responded_at, status")
        .eq("organization_id", auth.organizationId),
    ]);

    if (supplierResult.error) throw new Error(supplierResult.error.message);
    if (expenseResult.error) throw new Error(expenseResult.error.message);
    if (requestResult.error) throw new Error(requestResult.error.message);

    const expensesBySupplier = groupBySupplier<SupplierExpense>(
      expenseResult.data ?? [],
    );
    const requestsBySupplier = groupBySupplier<SupplierInvoiceRequest>(
      requestResult.data ?? [],
    );
    const suppliers: SupplierPortfolioItem[] = (supplierResult.data ?? []).map(
      (supplier) => ({
        ...supplier,
        metrics: calculateSupplierMetrics(
          expensesBySupplier.get(supplier.id) ?? [],
          requestsBySupplier.get(supplier.id) ?? [],
        ),
      }),
    );
    const fallback = buildSupplierPortfolioFallback(suppliers);
    const automation = await triggerN8n({
      workflow: "supplier-analysis",
      organizationId: auth.organizationId,
      payload: {
        scope: "portfolio",
        suppliers,
        totals: {
          suppliers: suppliers.length,
          totalSpend: suppliers.reduce(
            (sum, supplier) => sum + supplier.metrics.totalSpend,
            0,
          ),
          pendingInvoices: suppliers.reduce(
            (sum, supplier) => sum + supplier.metrics.pendingInvoiceCount,
            0,
          ),
          suppliersAtRisk: suppliers.filter(
            (supplier) =>
              supplier.metrics.hasActivity &&
              (supplier.metrics.complianceScore ?? 0) < 60,
          ).length,
        },
      },
    });
    const automationAnalysis = asRecord(automation.data?.analysis) ?? automation.data;
    const usedAutomation = Boolean(
      automation.ok && typeof automationAnalysis?.summary === "string",
    );
    const analysis = normalizeSupplierPortfolioAnalysis(
      usedAutomation ? automationAnalysis : null,
      fallback,
      usedAutomation ? "n8n" : "rules",
    );

    await Promise.all(
      suppliers
        .filter((supplier) => supplier.metrics.hasActivity)
        .map((supplier) =>
          admin
            .from("suppliers")
            .update({
              compliance_score: supplier.metrics.complianceScore,
              avg_response_days: supplier.metrics.avgResponseDays,
            })
            .eq("id", supplier.id)
            .eq("organization_id", auth.organizationId),
        ),
    );
    await admin
      .from("integration_events")
      .update({
        response_payload: { analysis, suppliers },
        completed_at: new Date().toISOString(),
      })
      .eq("correlation_id", automation.correlationId);

    return NextResponse.json({
      analysis,
      automationConfigured: automation.configured,
      automationSucceeded: usedAutomation,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function groupBySupplier<T extends { supplier_id: string | null }>(rows: T[]) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    if (!row.supplier_id) continue;
    const entries = grouped.get(row.supplier_id) ?? [];
    entries.push(row);
    grouped.set(row.supplier_id, entries);
  }
  return grouped;
}

function readStoredAnalysis(
  value: unknown,
  createdAt?: string,
): SupplierPortfolioAnalysis | null {
  const payload = asRecord(value);
  const analysis = asRecord(payload?.analysis);
  if (!analysis || typeof analysis.summary !== "string") return null;

  return {
    summary: analysis.summary,
    observations: stringArray(analysis.observations),
    pendingActions: stringArray(analysis.pendingActions),
    recommendations: stringArray(analysis.recommendations),
    riskLevel:
      analysis.riskLevel === "high" || analysis.riskLevel === "low"
        ? analysis.riskLevel
        : "medium",
    generatedAt:
      typeof analysis.generatedAt === "string"
        ? analysis.generatedAt
        : createdAt ?? new Date().toISOString(),
    source: analysis.source === "n8n" ? "n8n" : "rules",
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
