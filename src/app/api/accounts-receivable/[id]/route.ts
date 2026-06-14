import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse, HttpError } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/accounts-receivable/[id]">,
) {
  try {
    const auth = await requireOrganization();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const action = String(body.action ?? "");

    if (action !== "cancel") {
      throw new HttpError("Accion no soportada.", 400);
    }

    const admin = getSupabaseAdmin()!;
    const { data: receivable } = await admin
      .from("accounts_receivable")
      .select("paid_amount, status")
      .eq("id", id)
      .eq("organization_id", auth.organizationId)
      .maybeSingle();

    if (!receivable) throw new HttpError("Cuenta no encontrada.", 404);
    if (Number(receivable.paid_amount) > 0) {
      throw new HttpError("No puedes cancelar una cuenta con pagos.", 400);
    }
    if (receivable.status === "paid") {
      throw new HttpError("La cuenta ya fue pagada.", 400);
    }

    const { error } = await admin
      .from("accounts_receivable")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", auth.organizationId);

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
