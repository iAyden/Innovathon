import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse, HttpError } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireOrganization();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();
    const rfc = String(body.rfc ?? "").trim() || null;
    const email = String(body.email ?? "").trim() || null;
    const whatsapp = String(body.whatsapp ?? "").trim() || null;

    if (!name) {
      throw new HttpError("El nombre del proveedor es obligatorio.", 400);
    }

    const admin = getSupabaseAdmin()!;
    const { data: duplicate } = await admin
      .from("suppliers")
      .select("id")
      .eq("organization_id", auth.organizationId)
      .ilike("name", name)
      .neq("id", id)
      .maybeSingle();

    if (duplicate) {
      throw new HttpError("Ya existe otro proveedor con ese nombre.", 400);
    }

    const { data, error } = await admin
      .from("suppliers")
      .update({ name, rfc, email, whatsapp })
      .eq("id", id)
      .eq("organization_id", auth.organizationId)
      .select("id, name, rfc, email, whatsapp")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new HttpError("Proveedor no encontrado.", 404);

    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}
