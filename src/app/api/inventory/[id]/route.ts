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
    const articleId = String(body.articleId ?? "").trim() || null;
    const unitPrice = parseNonNegativeNumber(body.unitPrice, "costo");
    const salePrice = parseNonNegativeNumber(body.salePrice, "precio de venta");

    if (!name) throw new HttpError("Escribe el nombre del producto.", 400);

    const { data, error } = await getSupabaseAdmin()!
      .from("inventory_items")
      .update({
        article_id: articleId,
        name,
        unit_price: unitPrice,
        sale_price: salePrice,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", auth.organizationId)
      .select("id, article_id, name, stock, unit_price, sale_price, updated_at")
      .maybeSingle();

    if (error?.code === "23505") {
      throw new HttpError("Ya existe un producto con ese nombre.", 409);
    }
    if (error || !data) {
      throw new HttpError("Producto no encontrado.", 404);
    }

    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}

function parseNonNegativeNumber(value: unknown, label: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new HttpError(`El campo ${label} debe ser un numero valido.`, 400);
  }
  return number;
}

