import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/http";
import { triggerN8n } from "@/lib/server/n8n";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type DashboardInsight = {
  title: string;
  message: string;
  recommendedAction: string;
  riskLevel: "low" | "medium" | "high";
};

const PENDING_INVOICE_STATUSES = new Set([
  "missing_invoice",
  "request_sent",
  "needs_correction",
  "expired",
]);

export async function POST() {
  try {
    const context = await requireOrganization();
    const admin = getSupabaseAdmin()!;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const monthStart = `${today.slice(0, 7)}-01`;
    const [
      profileResult,
      cashFlowResult,
      expenseResult,
      receivableResult,
      inventoryResult,
      supplierResult,
    ] = await Promise.all([
      admin
        .from("business_profiles")
        .select(
          "sector, business_type, employee_count, monthly_revenue, goals, challenges",
        )
        .eq("organization_id", context.organizationId)
        .maybeSingle(),
      admin
        .from("cash_flow_entries")
        .select("entry_type, amount, occurred_on")
        .eq("organization_id", context.organizationId)
        .gte("occurred_on", monthStart)
        .lte("occurred_on", today),
      admin
        .from("expenses")
        .select("amount, iva_amount, status, expense_date, suppliers(name)")
        .eq("organization_id", context.organizationId)
        .gte("expense_date", monthStart)
        .lte("expense_date", today),
      admin
        .from("accounts_receivable")
        .select("amount, paid_amount, due_date, status")
        .eq("organization_id", context.organizationId)
        .not("status", "in", '("paid","cancelled")'),
      admin
        .from("inventory_items")
        .select("stock, unit_price, sale_price")
        .eq("organization_id", context.organizationId),
      admin
        .from("suppliers")
        .select("compliance_score")
        .eq("organization_id", context.organizationId),
    ]);

    const queryError =
      cashFlowResult.error ??
      expenseResult.error ??
      receivableResult.error ??
      inventoryResult.error ??
      supplierResult.error;
    if (queryError) throw new Error(queryError.message);

    const cashEntries = cashFlowResult.data ?? [];
    const monthlyIncome = sum(
      cashEntries
        .filter((entry) => entry.entry_type === "income")
        .map((entry) => entry.amount),
    );
    const monthlyCashExpenses = sum(
      cashEntries
        .filter((entry) => entry.entry_type === "expense")
        .map((entry) => entry.amount),
    );
    const netCashFlow = monthlyIncome - monthlyCashExpenses;

    const expenses = expenseResult.data ?? [];
    const pendingExpenses = expenses.filter((expense) =>
      PENDING_INVOICE_STATUSES.has(expense.status),
    );
    const expensesWithoutInvoice = sum(
      pendingExpenses.map((expense) => expense.amount),
    );
    const ivaAtRisk = sum(
      pendingExpenses.map((expense) => expense.iva_amount),
    );
    const topExpense = [...pendingExpenses].sort(
      (a, b) => Number(b.amount ?? 0) - Number(a.amount ?? 0),
    )[0];
    const topSupplier = Array.isArray(topExpense?.suppliers)
      ? topExpense.suppliers[0]
      : topExpense?.suppliers;

    const receivables = receivableResult.data ?? [];
    const outstandingBalance = receivables.reduce(
      (total, item) =>
        total + Math.max(0, Number(item.amount) - Number(item.paid_amount)),
      0,
    );
    const overdueReceivables = receivables.filter(
      (item) => item.due_date < today,
    );
    const overdueBalance = overdueReceivables.reduce(
      (total, item) =>
        total + Math.max(0, Number(item.amount) - Number(item.paid_amount)),
      0,
    );

    const inventory = inventoryResult.data ?? [];
    const inventoryValue = inventory.reduce(
      (total, item) =>
        total + Number(item.stock ?? 0) * Number(item.unit_price ?? 0),
      0,
    );
    const outOfStockProducts = inventory.filter(
      (item) => Number(item.stock) <= 0,
    ).length;
    const lowStockProducts = inventory.filter(
      (item) => Number(item.stock) > 0 && Number(item.stock) <= 5,
    ).length;
    const productsWithoutMargin = inventory.filter(
      (item) =>
        Number(item.sale_price) > 0 &&
        Number(item.sale_price) <= Number(item.unit_price),
    ).length;

    const suppliers = supplierResult.data ?? [];
    const suppliersWithLowCompliance = suppliers.filter(
      (supplier) =>
        supplier.compliance_score !== null &&
        Number(supplier.compliance_score) < 60,
    ).length;
    const profile = profileResult.data;
    const indicators = {
      period: {
        from: monthStart,
        to: today,
      },
      business: {
        name: context.organizationName,
        sector: profile?.sector ?? null,
        businessType: profile?.business_type ?? null,
        employeeCount: Number(profile?.employee_count ?? 0),
        estimatedMonthlyRevenue: Number(profile?.monthly_revenue ?? 0),
        goals: profile?.goals ?? [],
        challenges: profile?.challenges ?? [],
      },
      cashFlow: {
        income: monthlyIncome,
        expenses: monthlyCashExpenses,
        net: netCashFlow,
        registeredMovements: cashEntries.length,
      },
      collections: {
        openAccounts: receivables.length,
        outstandingBalance,
        overdueAccounts: overdueReceivables.length,
        overdueBalance,
      },
      fiscalAndInvoicing: {
        registeredExpenses: sum(expenses.map((expense) => expense.amount)),
        expensesWithoutInvoice,
        ivaAtRisk,
        pendingInvoices: pendingExpenses.length,
        topSupplierName: topSupplier?.name ?? null,
      },
      inventory: {
        products: inventory.length,
        inventoryValue,
        outOfStockProducts,
        lowStockProducts,
        productsWithoutMargin,
      },
      suppliers: {
        registered: suppliers.length,
        lowCompliance: suppliersWithLowCompliance,
      },
      dataQuality: {
        profileCompleted: Boolean(profile?.sector && profile?.employee_count),
        hasCashFlowData: cashEntries.length > 0,
        hasReceivablesData: receivables.length > 0,
        hasInventoryData: inventory.length > 0,
      },
    };
    const fallback = buildFallback(indicators);
    const automation = await triggerN8n({
      workflow: "dashboard-insight",
      organizationId: context.organizationId,
      payload: indicators,
    });
    const insight = normalizeInsight(automation.ok ? automation.data : null);

    return NextResponse.json({
      ...(insight ?? fallback),
      source: insight ? "n8n" : "rules",
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function buildFallback(indicators: {
  cashFlow: { income: number; expenses: number; net: number };
  collections: {
    openAccounts: number;
    outstandingBalance: number;
    overdueAccounts: number;
    overdueBalance: number;
  };
  fiscalAndInvoicing: {
    ivaAtRisk: number;
    pendingInvoices: number;
    topSupplierName: string | null;
  };
  inventory: {
    outOfStockProducts: number;
    lowStockProducts: number;
    productsWithoutMargin: number;
  };
  suppliers: { lowCompliance: number };
  dataQuality: {
    profileCompleted: boolean;
    hasCashFlowData: boolean;
    hasReceivablesData: boolean;
    hasInventoryData: boolean;
  };
}): DashboardInsight {
  if (!indicators.dataQuality.hasCashFlowData) {
    return {
      title: "Completa la vision financiera",
      message:
        "Aun no hay movimientos de flujo de caja suficientes para evaluar la situacion general del negocio.",
      recommendedAction:
        "Registra ingresos y egresos del mes para obtener recomendaciones basadas en liquidez real.",
      riskLevel: "medium",
    };
  }

  if (indicators.cashFlow.net < 0) {
    return {
      title: "Flujo de caja bajo presion",
      message: `Los egresos registrados superan a los ingresos del mes por ${formatCurrency(Math.abs(indicators.cashFlow.net))}.`,
      recommendedAction:
        indicators.collections.overdueBalance > 0
          ? `Prioriza el cobro de ${formatCurrency(indicators.collections.overdueBalance)} vencidos y limita gastos no esenciales.`
          : "Revisa los gastos de mayor monto y protege la liquidez de las proximas semanas.",
      riskLevel: "high",
    };
  }

  if (indicators.collections.overdueBalance > 0) {
    const overdueShare =
      indicators.collections.overdueBalance /
      Math.max(indicators.collections.outstandingBalance, 1);
    return {
      title: "Cobranza pendiente por atender",
      message: `${indicators.collections.overdueAccounts} cuenta${indicators.collections.overdueAccounts === 1 ? "" : "s"} vencida${indicators.collections.overdueAccounts === 1 ? "" : "s"} suma${indicators.collections.overdueAccounts === 1 ? "" : "n"} ${formatCurrency(indicators.collections.overdueBalance)}.`,
      recommendedAction:
        "Contacta primero a los clientes con mayor saldo y acuerda una fecha concreta de pago.",
      riskLevel: overdueShare >= 0.4 ? "high" : "medium",
    };
  }

  if (indicators.inventory.outOfStockProducts > 0) {
    return {
      title: "Inventario con productos agotados",
      message: `${indicators.inventory.outOfStockProducts} producto${indicators.inventory.outOfStockProducts === 1 ? "" : "s"} no tiene${indicators.inventory.outOfStockProducts === 1 ? "" : "n"} existencia disponible.`,
      recommendedAction:
        "Revisa cuáles productos tienen demanda vigente y prioriza su reposicion sin comprometer la liquidez.",
      riskLevel: "medium",
    };
  }

  if (indicators.fiscalAndInvoicing.pendingInvoices > 0) {
    return {
      title: "Documentacion fiscal pendiente",
      message: `${indicators.fiscalAndInvoicing.pendingInvoices} egreso${indicators.fiscalAndInvoicing.pendingInvoices === 1 ? "" : "s"} mantiene${indicators.fiscalAndInvoicing.pendingInvoices === 1 ? "" : "n"} ${formatCurrency(indicators.fiscalAndInvoicing.ivaAtRisk)} de IVA en riesgo.`,
      recommendedAction: `Da seguimiento a ${indicators.fiscalAndInvoicing.topSupplierName ?? "los comprobantes de mayor monto"} antes del cierre mensual.`,
      riskLevel: "medium",
    };
  }

  if (
    indicators.inventory.lowStockProducts > 0 ||
    indicators.inventory.productsWithoutMargin > 0 ||
    indicators.suppliers.lowCompliance > 0
  ) {
    return {
      title: "Operacion con ajustes pendientes",
      message:
        "La liquidez es positiva, pero hay existencias, margenes o proveedores que requieren seguimiento.",
      recommendedAction:
        "Revisa primero productos con bajo stock o sin margen y proveedores con menor cumplimiento.",
      riskLevel: "medium",
    };
  }

  return {
    title: "Situacion general estable",
    message:
      "Los indicadores registrados no muestran alertas financieras u operativas prioritarias.",
    recommendedAction:
      "Mantén actualizado el flujo de caja y revisa semanalmente cobranza, inventario y facturacion.",
    riskLevel: "low",
  };
}

function normalizeInsight(
  value: Record<string, unknown> | null,
): DashboardInsight | null {
  if (!value) return null;
  const title = text(value.title);
  const message = text(value.message);
  const recommendedAction = text(value.recommendedAction);
  const risk = String(value.riskLevel ?? "").toLowerCase();

  if (!title || !message || !recommendedAction) return null;
  if (!["low", "medium", "high"].includes(risk)) return null;

  return {
    title,
    message,
    recommendedAction,
    riskLevel: risk as DashboardInsight["riskLevel"],
  };
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sum(values: unknown[]) {
  return values.reduce<number>((total, value) => total + Number(value ?? 0), 0);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}
