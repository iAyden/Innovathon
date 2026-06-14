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

export async function GET(request: Request) {
  try {
    const context = await requireOrganization();
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "6m"; // 7d, 30d, 6m

    if (!admin) {
      throw new Error("Supabase no esta configurado.");
    }

    // Determine the date limit
    const now = new Date();
    let startDate = new Date();
    if (range === "7d") {
      startDate.setDate(now.getDate() - 7);
    } else if (range === "30d") {
      startDate.setDate(now.getDate() - 30);
    } else {
      startDate.setMonth(now.getMonth() - 6);
    }
    const startDateStr = startDate.toISOString().split("T")[0];

    const { data, error } = await admin
      .from("expenses")
      .select("amount, iva_amount, status, expense_date")
      .eq("organization_id", context.organizationId)
      .gte("expense_date", startDateStr)
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
    
    // Group cash flow
    const isDaily = range === "7d" || range === "30d";
    const dateMap = new Map<string, number>();

    // Initialize all dates in range with 0
    let iterDate = new Date(startDate);
    while (iterDate <= now) {
      if (isDaily) {
        const d = iterDate.toISOString().split("T")[0];
        dateMap.set(d, 0);
        iterDate.setDate(iterDate.getDate() + 1);
      } else {
        const m = iterDate.toISOString().slice(0, 7);
        if (!dateMap.has(m)) dateMap.set(m, 0);
        iterDate.setMonth(iterDate.getMonth() + 1);
      }
    }

    rows.forEach((row) => {
      const key = isDaily 
        ? String(row.expense_date).split("T")[0]
        : String(row.expense_date).slice(0, 7);
      
      if (dateMap.has(key)) {
        dateMap.set(key, (dateMap.get(key) ?? 0) + Number(row.amount ?? 0));
      } else {
        dateMap.set(key, Number(row.amount ?? 0));
      }
    });

    // Ensure sorted correctly
    const sortedKeys = Array.from(dateMap.keys()).sort();
    
    const cashFlow = sortedKeys.map((dateKey) => ({
      month: dateKey, // keeping 'month' property name for frontend compatibility
      income: 0,
      expenses: dateMap.get(dateKey) ?? 0,
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
