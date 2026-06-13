import { NextResponse } from "next/server";
import { buildDemoSummary, demoExpenses } from "@/lib/demo-data";
import { getDemoOrganizationId, getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(buildDemoSummary(demoExpenses));
  }

  const organizationId = process.env.DEMO_ORG_ID ?? getDemoOrganizationId();
  const { data, error } = await supabase
    .from("expenses")
    .select("amount, iva_amount, status")
    .eq("organization_id", organizationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const riskyStatuses = ["missing_invoice", "request_sent", "needs_correction", "expired"];
  const monthlyExpenses = rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const expensesWithoutInvoice = rows
    .filter((row) => riskyStatuses.includes(row.status))
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const ivaAtRisk = rows
    .filter((row) => riskyStatuses.includes(row.status))
    .reduce((sum, row) => sum + Number(row.iva_amount ?? 0), 0);
  const ivaRecovered = rows
    .filter((row) => row.status === "validated")
    .reduce((sum, row) => sum + Number(row.iva_amount ?? 0), 0);

  return NextResponse.json({
    monthlyExpenses,
    expensesWithoutInvoice,
    ivaAtRisk,
    ivaRecovered,
    pendingInvoices: rows.filter((row) => row.status !== "validated").length,
    validatedInvoices: rows.filter((row) => row.status === "validated").length,
    suppliersWithLowCompliance: 0,
    insight:
      ivaAtRisk > 0
        ? `Tienes ${ivaAtRisk.toLocaleString("es-MX", { style: "currency", currency: "MXN" })} de IVA estimado en riesgo. Prioriza solicitar XML a tus proveedores pendientes.`
        : "No tienes IVA en riesgo detectado. Tus facturas del mes van al día.",
  });
}
