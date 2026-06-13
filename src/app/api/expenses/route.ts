import { NextResponse } from "next/server";
import { estimateIva } from "@/lib/format";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse, HttpError } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type ExpenseRow = {
  id: string;
  amount: number | string | null;
  iva_amount: number | string | null;
  expense_date: string;
  description?: string | null;
  status: string;
  created_at?: string;
  suppliers?:
    | { name?: string | null; email?: string | null }
    | { name?: string | null; email?: string | null }[]
    | null;
};

function mapExpense(row: ExpenseRow) {
  const supplier = Array.isArray(row.suppliers)
    ? row.suppliers[0]
    : row.suppliers;

  return {
    id: row.id,
    supplierName: supplier?.name ?? "Proveedor sin nombre",
    supplierEmail: supplier?.email ?? null,
    description: row.description,
    amount: Number(row.amount ?? 0),
    ivaAmount: Number(row.iva_amount ?? 0),
    expenseDate: row.expense_date,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function GET() {
  try {
    const context = await requireOrganization();
    const admin = getSupabaseAdmin();
    const { data, error } = await admin!
      .from("expenses")
      .select(
        "id, amount, iva_amount, expense_date, description, status, created_at, suppliers(name,email)",
      )
      .eq("organization_id", context.organizationId)
      .order("expense_date", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json((data ?? []).map(mapExpense));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireOrganization();
    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount ?? 0);
    const supplierName = String(body.supplierName ?? "").trim();
    const supplierEmail = String(body.supplierEmail ?? "").trim() || null;
    const expenseDate =
      String(body.expenseDate ?? "") || new Date().toISOString().slice(0, 10);
    const description = String(body.description ?? "").trim() || null;

    if (!supplierName) {
      throw new HttpError("El proveedor es obligatorio.", 400);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new HttpError("El monto debe ser mayor a cero.", 400);
    }

    const admin = getSupabaseAdmin()!;
    let supplierId: string;
    const { data: existingSupplier } = await admin
      .from("suppliers")
      .select("id")
      .eq("organization_id", context.organizationId)
      .ilike("name", supplierName)
      .maybeSingle();

    if (existingSupplier?.id) {
      supplierId = existingSupplier.id;
    } else {
      const { data: supplier, error: supplierError } = await admin
        .from("suppliers")
        .insert({
          organization_id: context.organizationId,
          name: supplierName,
          email: supplierEmail,
        })
        .select("id")
        .single();

      if (supplierError || !supplier) {
        throw new Error(supplierError?.message ?? "No se pudo crear el proveedor.");
      }
      supplierId = supplier.id;
    }

    const { data: expense, error } = await admin
      .from("expenses")
      .insert({
        organization_id: context.organizationId,
        supplier_id: supplierId,
        amount,
        iva_amount: estimateIva(amount),
        expense_date: expenseDate,
        description,
        status: "missing_invoice",
      })
      .select(
        "id, amount, iva_amount, expense_date, description, status, created_at",
      )
      .single();

    if (error || !expense) {
      throw new Error(error?.message ?? "No se pudo registrar el egreso.");
    }

    return NextResponse.json(
      mapExpense({
        ...expense,
        suppliers: { name: supplierName, email: supplierEmail },
      }),
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
