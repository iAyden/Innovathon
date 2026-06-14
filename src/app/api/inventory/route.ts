import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse, HttpError } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const context = await requireOrganization();
    const admin = getSupabaseAdmin();
    const { data, error } = await admin!
      .from("inventory_items")
      .select("*")
      .eq("organization_id", context.organizationId)
      .order("name", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireOrganization();
    const body = await request.json().catch(() => ({}));
    const id = body.id;
    const salePrice = Number(body.salePrice);

    if (!id || typeof salePrice !== "number" || isNaN(salePrice) || salePrice < 0) {
      throw new HttpError("Datos inválidos para actualizar el precio de venta.", 400);
    }

    const admin = getSupabaseAdmin()!;
    const { data, error } = await admin
      .from("inventory_items")
      .update({
        sale_price: salePrice,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", context.organizationId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "No se pudo actualizar el artículo.");
    }

    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}
