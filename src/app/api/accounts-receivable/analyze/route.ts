import { NextResponse } from "next/server";
import type { CollectionsAnalysis } from "@/lib/accounts-receivable";
import { loadReceivablePortfolio } from "@/lib/server/accounts-receivable";
import { requireOrganization } from "@/lib/server/auth";
import {
  buildCollectionsFallback,
  normalizeCollectionsAnalysis,
} from "@/lib/server/collections-analysis";
import { errorResponse } from "@/lib/server/http";
import { triggerN8n } from "@/lib/server/n8n";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const auth = await requireOrganization();
    const { data, error } = await getSupabaseAdmin()!
      .from("integration_events")
      .select("response_payload, created_at")
      .eq("organization_id", auth.organizationId)
      .eq("workflow", "collections-advisor")
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
    const portfolio = await loadReceivablePortfolio(
      admin,
      auth.organizationId,
    );
    const fallback = buildCollectionsFallback(
      portfolio.customers,
      portfolio.receivables,
    );
    const open = portfolio.receivables.filter(
      (item) => !["paid", "cancelled"].includes(item.status),
    );
    const automation = await triggerN8n({
      workflow: "collections-advisor",
      organizationId: auth.organizationId,
      payload: {
        scope: "portfolio",
        customers: portfolio.customers,
        receivables: portfolio.receivables,
        totals: {
          customers: portfolio.customers.length,
          openAccounts: open.length,
          outstandingBalance: open.reduce(
            (sum, item) => sum + item.balance,
            0,
          ),
          overdueAccounts: open.filter((item) => item.status === "overdue")
            .length,
          overdueBalance: open
            .filter((item) => item.status === "overdue")
            .reduce((sum, item) => sum + item.balance, 0),
        },
      },
    });
    const candidate = asRecord(automation.data?.analysis) ?? automation.data;
    const usedAutomation = Boolean(
      automation.ok && typeof candidate?.summary === "string",
    );
    const analysis = normalizeCollectionsAnalysis(
      usedAutomation ? candidate : null,
      fallback,
      usedAutomation ? "n8n" : "rules",
    );

    await admin
      .from("integration_events")
      .update({
        status: "completed",
        response_payload: { analysis, portfolio },
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

function readStoredAnalysis(
  value: unknown,
  createdAt?: string,
): CollectionsAnalysis | null {
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
