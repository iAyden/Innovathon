import { NextResponse } from "next/server";
import { validateInvoiceAgainstExpense } from "@/lib/cfdi";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const expenseId = formData.get("expenseId")?.toString();
  const businessRfc = formData.get("businessRfc")?.toString() ?? "CSO920101XXX";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido." }, { status: 400 });
  }

  const xml = await file.text();
  const supabase = getSupabaseAdmin();

  let expense: { id: string; organization_id: string; amount: number | string | null } | null = null;
  let taxRfc = businessRfc;

  if (supabase && expenseId) {
    const { data } = await supabase
      .from("expenses")
      .select("id, organization_id, amount")
      .eq("id", expenseId)
      .maybeSingle();
    expense = data;

    if (expense) {
      const { data: taxProfile } = await supabase
        .from("tax_profiles")
        .select("rfc")
        .eq("organization_id", expense.organization_id)
        .maybeSingle();
      taxRfc = taxProfile?.rfc ?? taxRfc;
    }
  }

  const result = validateInvoiceAgainstExpense({
    xml,
    businessRfc: taxRfc,
    expenseAmount: expense?.amount ? Number(expense.amount) : null,
  });

  if (supabase && expense) {
    await supabase.from("invoice_files").insert({
      organization_id: expense.organization_id,
      expense_id: expense.id,
      file_name: file.name,
      uuid: result.invoice.uuid,
      issuer_rfc: result.invoice.issuerRfc,
      receiver_rfc: result.invoice.receiverRfc,
      subtotal: result.invoice.subtotal,
      iva: result.invoice.iva,
      total: result.invoice.total,
      validation_status: result.valid ? "validated" : "needs_correction",
      validation_errors: result.errors,
      raw_xml: xml,
    });

    await supabase
      .from("expenses")
      .update({ status: result.valid ? "validated" : "needs_correction" })
      .eq("id", expense.id);
  }

  return NextResponse.json({
    fileName: file.name,
    valid: result.valid,
    status: result.valid ? "validated" : "needs_correction",
    invoice: result.invoice,
    errors: result.errors,
    humanMessage: result.humanMessage,
  });
}
