import { NextResponse } from "next/server";
import { validateInvoiceAgainstExpense } from "@/lib/cfdi";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const xml = String(body.xmlContent ?? body.xml ?? "");

  if (!xml) {
    return NextResponse.json({ error: "xmlContent es obligatorio." }, { status: 400 });
  }

  let businessRfc = body.businessRfc ?? "CSO920101XXX";
  let expenseAmount = body.expenseAmount ? Number(body.expenseAmount) : null;

  const supabase = getSupabaseAdmin();

  if (supabase && body.expenseId) {
    const { data: expense } = await supabase
      .from("expenses")
      .select("amount, organization_id")
      .eq("id", body.expenseId)
      .maybeSingle();

    if (expense) {
      expenseAmount = Number(expense.amount ?? 0);
      const { data: taxProfile } = await supabase
        .from("tax_profiles")
        .select("rfc")
        .eq("organization_id", expense.organization_id)
        .maybeSingle();
      businessRfc = taxProfile?.rfc ?? businessRfc;
    }
  }

  const result = validateInvoiceAgainstExpense({
    xml,
    businessRfc,
    expenseAmount,
  });

  return NextResponse.json({
    valid: result.valid,
    status: result.valid ? "validated" : "needs_correction",
    invoice: result.invoice,
    errors: result.errors,
    humanMessage: result.humanMessage,
  });
}
