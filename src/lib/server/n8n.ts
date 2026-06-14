import "server-only";

import { createHmac, randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type N8nWorkflow =
  | "request-invoice"
  | "dashboard-insight"
  | "fiscal-profile"
  | "module-recommendation"
  | "cashflow-forecast"
  | "document-analysis"
  | "supplier-analysis";

const ENV_BY_WORKFLOW: Record<N8nWorkflow, string> = {
  "request-invoice": "N8N_REQUEST_INVOICE_WEBHOOK_URL",
  "dashboard-insight": "AI_DASHBOARD_INSIGHT_WEBHOOK_URL",
  "fiscal-profile": "N8N_FISCAL_PROFILE_WEBHOOK_URL",
  "module-recommendation": "N8N_MODULE_RECOMMENDATION_WEBHOOK_URL",
  "cashflow-forecast": "N8N_CASHFLOW_FORECAST_WEBHOOK_URL",
  "document-analysis": "N8N_DOCUMENT_ANALYSIS_WEBHOOK_URL",
  "supplier-analysis": "N8N_SUPPLIER_ANALYSIS_WEBHOOK_URL",
};

function parseJsonString(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const source = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  if (!source.startsWith("{") && !source.startsWith("[")) return value;

  try {
    return JSON.parse(source);
  } catch {
    return value;
  }
}

function parseNestedJson(value: unknown): unknown {
  const parsed = parseJsonString(value);

  if (Array.isArray(parsed)) {
    return parsed.map(parseNestedJson);
  }

  if (parsed && typeof parsed === "object") {
    return Object.fromEntries(
      Object.entries(parsed).map(([key, item]) => [key, parseNestedJson(item)]),
    );
  }

  return parsed;
}

function redactIntegrationPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactIntegrationPayload);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        key === "contentBase64"
          ? `[base64 omitted: ${typeof item === "string" ? item.length : 0} chars]`
          : redactIntegrationPayload(item),
      ]),
    );
  }

  return value;
}

export function normalizeN8nResponse(value: unknown): Record<string, unknown> {
  let normalized = parseNestedJson(value);

  for (let depth = 0; depth < 3; depth += 1) {
    if (
      normalized &&
      typeof normalized === "object" &&
      !Array.isArray(normalized) &&
      "output" in normalized
    ) {
      normalized = parseNestedJson(
        (normalized as Record<string, unknown>).output,
      );
      continue;
    }
    break;
  }

  return normalized && typeof normalized === "object" && !Array.isArray(normalized)
    ? (normalized as Record<string, unknown>)
    : {};
}

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
  timeoutMs?: number;
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
    request_payload: redactIntegrationPayload(envelope),
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
      signal: AbortSignal.timeout(input.timeoutMs ?? 15000),
      cache: "no-store",
    });
    const responseData = await response.json().catch(() => null);
    const normalizedData = normalizeN8nResponse(responseData);

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
      data: normalizedData,
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
