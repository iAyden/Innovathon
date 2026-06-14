import { NextResponse } from "next/server";
import { loadReceivablePortfolio } from "@/lib/server/accounts-receivable";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse, HttpError } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const auth = await requireOrganization();
    const portfolio = await loadReceivablePortfolio(
      getSupabaseAdmin()!,
      auth.organizationId,
    );

    return NextResponse.json({ ...portfolio, migrationRequired: false });
  } catch (error) {
    if (
      error instanceof Error &&
      /customers|accounts_receivable|receivable_payments/i.test(error.message)
    ) {
      return NextResponse.json({
        customers: [],
        receivables: [],
        migrationRequired: true,
      });
    }
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireOrganization();
    const body = await request.json().catch(() => ({}));
    const customerId = String(body.customerId ?? "");
    const description = String(body.description ?? "").trim();
    const amount = Number(body.amount ?? 0);
    const issueDate = validDate(body.issueDate);
    const dueDate = validDate(body.dueDate);
    const currency = body.currency === "USD" ? "USD" : "MXN";

    if (!customerId || !description || amount <= 0 || !issueDate || !dueDate) {
      throw new HttpError("Completa los datos obligatorios de la cuenta.", 400);
    }
    if (dueDate < issueDate) {
      throw new HttpError(
        "La fecha de vencimiento no puede ser anterior a la emision.",
        400,
      );
    }

    const admin = getSupabaseAdmin()!;
    const { data: customer } = await admin
      .from("customers")
      .select("id")
      .eq("id", customerId)
      .eq("organization_id", auth.organizationId)
      .maybeSingle();

    if (!customer) throw new HttpError("Cliente no encontrado.", 404);

    const { data, error } = await admin
      .from("accounts_receivable")
      .insert({
        organization_id: auth.organizationId,
        customer_id: customerId,
        folio: optionalText(body.folio),
        description,
        amount,
        currency,
        issue_date: issueDate,
        due_date: dueDate,
        notes: optionalText(body.notes),
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new HttpError(
        "No se pudo registrar la cuenta. Verifica la migracion.",
        503,
      );
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

function validDate(value: unknown) {
  const text = String(value ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function optionalText(value: unknown) {
  return String(value ?? "").trim() || null;
}
