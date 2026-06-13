import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const RISKY_STATUSES = [
  "missing_invoice",
  "request_sent",
  "needs_correction",
  "expired",
];

export async function GET() {
  try {
    const context = await requireOrganization();
    const admin = getSupabaseAdmin();

    if (!admin) {
      throw new Error("Supabase no esta configurado.");
    }

    const { data, error } = await admin
      .from("expenses")
      .select("amount, iva_amount, status, expense_date")
      .eq("organization_id", context.organizationId)
      .order("expense_date", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const rows = data ?? [];
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyRows = rows.filter((row) =>
      String(row.expense_date).startsWith(currentMonth),
    );
    const pending = monthlyRows.filter((row) =>
      RISKY_STATUSES.includes(row.status),
    );
    const monthMap = new Map<string, number>();

    rows.forEach((row) => {
      const month = String(row.expense_date).slice(0, 7);
      monthMap.set(month, (monthMap.get(month) ?? 0) + Number(row.amount ?? 0));
    });

    const cashFlow = Array.from(monthMap.entries())
      .slice(-6)
      .map(([month, expenses]) => ({
        month,
        income: 0,
        expenses,
      }));

    return NextResponse.json({
      monthlyExpenses: monthlyRows.reduce(
        (sum, row) => sum + Number(row.amount ?? 0),
        0,
      ),
      expensesWithoutInvoice: pending.reduce(
        (sum, row) => sum + Number(row.amount ?? 0),
        0,
      ),
      ivaAtRisk: pending.reduce(
        (sum, row) => sum + Number(row.iva_amount ?? 0),
        0,
      ),
      ivaRecovered: monthlyRows
        .filter((row) => row.status === "validated")
        .reduce((sum, row) => sum + Number(row.iva_amount ?? 0), 0),
      pendingInvoices: pending.length,
      validatedInvoices: monthlyRows.filter(
        (row) => row.status === "validated",
      ).length,
      suppliersWithLowCompliance: 0,
      cashFlow,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
