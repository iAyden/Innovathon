import "server-only";

import { createHmac, randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type N8nWorkflow =
  | "request-invoice"
  | "dashboard-insight"
  | "fiscal-profile"
  | "module-recommendation"
  | "cashflow-forecast"
  | "document-analysis";

const ENV_BY_WORKFLOW: Record<N8nWorkflow, string> = {
  "request-invoice": "N8N_REQUEST_INVOICE_WEBHOOK_URL",
  "dashboard-insight": "AI_DASHBOARD_INSIGHT_WEBHOOK_URL",
  "fiscal-profile": "N8N_FISCAL_PROFILE_WEBHOOK_URL",
  "module-recommendation": "N8N_MODULE_RECOMMENDATION_WEBHOOK_URL",
  "cashflow-forecast": "N8N_CASHFLOW_FORECAST_WEBHOOK_URL",
  "document-analysis": "N8N_DOCUMENT_ANALYSIS_WEBHOOK_URL",
};

export function getN8nStatus() {
  return (Object.keys(ENV_BY_WORKFLOW) as N8nWorkflow[]).map((workflow) => ({
    workflow,
    environmentVariable: ENV_BY_WORKFLOW[workflow],
    configured: Boolean(process.env[ENV_BY_WORKFLOW[workflow]]),
  }));
}

export async function triggerN8n(input: {
  workflow: N8nWorkflow;
  organizationId: string;
  payload: Record<string, unknown>;
}) {
  const webhookUrl = process.env[ENV_BY_WORKFLOW[input.workflow]];
  const correlationId = randomUUID();
  const envelope = {
    version: "1.0",
    event: input.workflow,
    correlationId,
    organizationId: input.organizationId,
    occurredAt: new Date().toISOString(),
    data: input.payload,
  };
  const serialized = JSON.stringify(envelope);
  const secret = process.env.N8N_WEBHOOK_SECRET;
  const signature = secret
    ? createHmac("sha256", secret).update(serialized).digest("hex")
    : null;
  const admin = getSupabaseAdmin();

  await admin?.from("integration_events").insert({
    organization_id: input.organizationId,
    workflow: input.workflow,
    direction: "outbound",
    status: webhookUrl ? "pending" : "failed",
    correlation_id: correlationId,
    request_payload: envelope,
    error_message: webhookUrl ? null : "Webhook no configurado",
  });

  if (!webhookUrl) {
    return { configured: false, correlationId, data: null };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(signature ? { "x-pulso-signature": signature } : {}),
      },
      body: serialized,
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    const responseData = await response.json().catch(() => null);

    await admin
      ?.from("integration_events")
      .update({
        status: response.ok ? "completed" : "failed",
        response_payload: responseData,
        error_message: response.ok ? null : `HTTP ${response.status}`,
        completed_at: new Date().toISOString(),
      })
      .eq("correlation_id", correlationId);

    return {
      configured: true,
      ok: response.ok,
      correlationId,
      data: responseData,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error de conexion";
    await admin
      ?.from("integration_events")
      .update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("correlation_id", correlationId);

    return { configured: true, ok: false, correlationId, data: null };
  }
}
