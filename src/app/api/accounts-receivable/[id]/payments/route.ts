import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse, HttpError } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(
  request: Request,
  context: RouteContext<"/api/accounts-receivable/[id]/payments">,
) {
  try {
    const auth = await requireOrganization();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount ?? 0);
    const paidOn = String(body.paidOn ?? "");

    if (amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) {
      throw new HttpError("Monto o fecha de pago invalidos.", 400);
    }

    const admin = getSupabaseAdmin()!;
    const { data: receivable } = await admin
      .from("accounts_receivable")
      .select("id")
      .eq("id", id)
      .eq("organization_id", auth.organizationId)
      .maybeSingle();

    if (!receivable) throw new HttpError("Cuenta no encontrada.", 404);

    const { data, error } = await admin
      .from("receivable_payments")
      .insert({
        organization_id: auth.organizationId,
        receivable_id: id,
        amount,
        paid_on: paidOn,
        payment_method: optionalText(body.paymentMethod),
        reference: optionalText(body.reference),
        notes: optionalText(body.notes),
      })
      .select("id")
      .single();

    if (error || !data) {
      const message = error?.message ?? "";
      if (/supera el saldo|no admite nuevos pagos/i.test(message)) {
        throw new HttpError(message, 400);
      }
      throw new HttpError(
        "No se pudo registrar el pago. Verifica la migracion.",
        503,
      );
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

function optionalText(value: unknown) {
  return String(value ?? "").trim() || null;
}
