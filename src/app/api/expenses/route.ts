import { NextResponse } from "next/server";
import { demoExpenses } from "@/lib/demo-data";
import { estimateIva } from "@/lib/format";
import { getDemoOrganizationId, getSupabaseAdmin } from "@/lib/supabase-admin";

type ExpenseRow = {
  id: string;
  amount: number | string | null;
  iva_amount: number | string | null;
  expense_date: string;
  description?: string | null;
  status: string;
  created_at?: string;
  supplier_name?: string | null;
  supplier_email?: string | null;
  suppliers?: { name?: string | null; email?: string | null } | { name?: string | null; email?: string | null }[] | null;
};

function mapExpense(row: ExpenseRow) {
  const supplier = Array.isArray(row.suppliers) ? row.suppliers[0] : row.suppliers;
  return {
    id: row.id,
    supplierName: supplier?.name ?? row.supplier_name ?? "Proveedor sin nombre",
    supplierEmail: supplier?.email ?? row.supplier_email ?? null,
    description: row.description,
    amount: Number(row.amount ?? 0),
    ivaAmount: Number(row.iva_amount ?? 0),
    expenseDate: row.expense_date,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(demoExpenses);
  }

  const organizationId = process.env.DEMO_ORG_ID ?? getDemoOrganizationId();
  const { data, error } = await supabase
    .from("expenses")
    .select("id, amount, iva_amount, expense_date, description, status, created_at, suppliers(name,email)")
    .eq("organization_id", organizationId)
    .order("expense_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(mapExpense));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const amount = Number(body.amount ?? 0);
  const ivaAmount = Number(body.ivaAmount ?? estimateIva(amount));
  const supplierName = String(body.supplierName ?? "Proveedor sin nombre");
  const supplierEmail = body.supplierEmail || null;
  const expenseDate = body.expenseDate || new Date().toISOString().slice(0, 10);
  const description = body.description || null;

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "El monto del egreso es obligatorio." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({
      id: `demo-${Date.now()}`,
      supplierName,
      supplierEmail,
      amount,
      ivaAmount,
      expenseDate,
      description,
      status: "missing_invoice",
      message: "Egreso demo registrado. Falta factura.",
    });
  }

  const organizationId = body.organizationId || process.env.DEMO_ORG_ID || getDemoOrganizationId();

  let supplierId = null;
  const { data: existingSupplier } = await supabase
    .from("suppliers")
    .select("id")
    .eq("organization_id", organizationId)
    .ilike("name", supplierName)
    .maybeSingle();

  if (existingSupplier?.id) {
    supplierId = existingSupplier.id;
  } else {
    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .insert({ organization_id: organizationId, name: supplierName, email: supplierEmail })
      .select("id")
      .single();

    if (supplierError || !supplier) {
      return NextResponse.json({ error: supplierError?.message || "No se pudo crear proveedor" }, { status: 500 });
    }
    supplierId = supplier.id;
  }

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      organization_id: organizationId,
      supplier_id: supplierId,
      amount,
      iva_amount: ivaAmount,
      expense_date: expenseDate,
      description,
      status: "missing_invoice",
    })
    .select("id, amount, iva_amount, expense_date, description, status, created_at")
    .single();

  if (error || !expense) {
    return NextResponse.json({ error: error?.message || "No se pudo registrar egreso" }, { status: 500 });
  }

  return NextResponse.json({
    ...mapExpense({ ...expense, suppliers: { name: supplierName, email: supplierEmail } }),
    message: "Egreso registrado. Falta factura.",
  });
}
