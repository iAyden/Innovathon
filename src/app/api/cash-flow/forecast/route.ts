import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/http";
import { triggerN8n } from "@/lib/server/n8n";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  try {
    const context = await requireOrganization();
    const admin = getSupabaseAdmin()!;
    const { data: entries } = await admin
      .from("cash_flow_entries")
      .select("entry_type, category, amount, occurred_on")
      .eq("organization_id", context.organizationId)
      .order("occurred_on", { ascending: true })
      .limit(500);
    const automation = await triggerN8n({
      workflow: "cashflow-forecast",
      organizationId: context.organizationId,
      payload: {
        currency: "MXN",
        horizons: [30, 60, 90],
        entries: entries ?? [],
      },
    });

    return NextResponse.json({
      configured: automation.configured,
      correlationId: automation.correlationId,
      forecast:
        automation.ok && automation.data
          ? automation.data.forecast ?? automation.data
          : null,
      message: automation.ok
        ? "Pronostico generado correctamente."
        : automation.configured
          ? "n8n no pudo generar el pronostico."
        : "Configura N8N_CASHFLOW_FORECAST_WEBHOOK_URL para activar el pronostico.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
