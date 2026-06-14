import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse, HttpError } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireOrganization();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const movement = body.movement === "out" ? "out" : "in";
    const quantity = Number(body.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new HttpError("La cantidad debe ser mayor a cero.", 400);
    }

    const admin = getSupabaseAdmin()!;
    const { data: current, error: currentError } = await admin
      .from("inventory_items")
      .select("id, stock")
      .eq("id", id)
      .eq("organization_id", auth.organizationId)
      .maybeSingle();

    if (currentError || !current) {
      throw new HttpError("Producto no encontrado.", 404);
    }

    const nextStock =
      Number(current.stock) + (movement === "in" ? quantity : -quantity);
    if (nextStock < 0) {
      throw new HttpError(
        "La salida supera la existencia disponible del producto.",
        409,
      );
    }

    const { data, error } = await admin
      .from("inventory_items")
      .update({
        stock: nextStock,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", auth.organizationId)
      .select("id, article_id, name, stock, unit_price, sale_price, updated_at")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}

