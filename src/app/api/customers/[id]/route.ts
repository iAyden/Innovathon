import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse, HttpError } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/customers/[id]">,
) {
  try {
    const auth = await requireOrganization();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();
    const paymentTermsDays = Number(body.paymentTermsDays ?? 0);

    if (!name) {
      throw new HttpError("El nombre del cliente es obligatorio.", 400);
    }
    if (
      !Number.isInteger(paymentTermsDays) ||
      paymentTermsDays < 0 ||
      paymentTermsDays > 365
    ) {
      throw new HttpError("Los dias de credito no son validos.", 400);
    }

    const admin = getSupabaseAdmin()!;
    const { data: duplicate } = await admin
      .from("customers")
      .select("id")
      .eq("organization_id", auth.organizationId)
      .ilike("name", name)
      .neq("id", id)
      .maybeSingle();

    if (duplicate) {
      throw new HttpError("Ya existe otro cliente con ese nombre.", 400);
    }

    const { data, error } = await admin
      .from("customers")
      .update({
        name,
        rfc: optionalText(body.rfc),
        email: optionalText(body.email),
        phone: optionalText(body.phone),
        payment_terms_days: paymentTermsDays,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", auth.organizationId)
      .select("id")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new HttpError("Cliente no encontrado.", 404);

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}

function optionalText(value: unknown) {
  return String(value ?? "").trim() || null;
}
