import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/http";
import { triggerN8n } from "@/lib/server/n8n";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}

export async function GET() {
  try {
    const context = await requireOrganization();
    const admin = getSupabaseAdmin()!;
    const { data, error } = await admin
      .from("expenses")
      .select("amount, iva_amount, status, suppliers(name)")
      .eq("organization_id", context.organizationId);

    if (error) {
      throw new Error(error.message);
    }

    const pending = (data ?? []).filter((expense) =>
      ["missing_invoice", "request_sent", "needs_correction", "expired"].includes(
        expense.status,
      ),
    );
    const expensesWithoutInvoice = pending.reduce(
      (sum, expense) => sum + Number(expense.amount ?? 0),
      0,
    );
    const ivaAtRisk = pending.reduce(
      (sum, expense) => sum + Number(expense.iva_amount ?? 0),
      0,
    );
    const topExpense = [...pending].sort(
      (a, b) => Number(b.iva_amount ?? 0) - Number(a.iva_amount ?? 0),
    )[0];
    const topSupplier = Array.isArray(topExpense?.suppliers)
      ? topExpense.suppliers[0]
      : topExpense?.suppliers;
    const fallback = {
      title: ivaAtRisk > 0 ? "IVA que requiere atencion" : "Facturacion al dia",
      message:
        ivaAtRisk > 0
          ? `Hay ${formatCurrency(ivaAtRisk)} de IVA en riesgo en ${pending.length} egresos.`
          : "No detectamos IVA en riesgo en los egresos registrados.",
      recommendedAction:
        ivaAtRisk > 0
          ? `Prioriza ${topSupplier?.name ?? "el egreso de mayor importe"} antes del cierre mensual.`
          : "Continua registrando compras y validando sus XML.",
      riskLevel: ivaAtRisk >= 1500 ? "high" : ivaAtRisk > 0 ? "medium" : "low",
    };
    const automation = await triggerN8n({
      workflow: "dashboard-insight",
      organizationId: context.organizationId,
      payload: {
        expensesWithoutInvoice,
        ivaAtRisk,
        pendingInvoices: pending.length,
        topSupplierName: topSupplier?.name ?? null,
      },
    });

    return NextResponse.json({
      title: automation.data?.title ?? fallback.title,
      message: automation.data?.message ?? fallback.message,
      recommendedAction:
        automation.data?.recommendedAction ?? fallback.recommendedAction,
      riskLevel: automation.data?.riskLevel ?? fallback.riskLevel,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
