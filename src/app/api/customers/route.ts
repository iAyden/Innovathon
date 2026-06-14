import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse, HttpError } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const auth = await requireOrganization();
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
      .maybeSingle();

    if (duplicate) {
      throw new HttpError("Ya existe un cliente con ese nombre.", 400);
    }

    const { data, error } = await admin
      .from("customers")
      .insert({
        organization_id: auth.organizationId,
        name,
        rfc: optionalText(body.rfc),
        email: optionalText(body.email),
        phone: optionalText(body.phone),
        payment_terms_days: paymentTermsDays,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new HttpError(
        "Aplica la migracion de cuentas por cobrar antes de registrar clientes.",
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
