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
      .select("id, article_id, name, stock, unit_price, sale_price, updated_at")
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

export async function POST(request: Request) {
  try {
    const context = await requireOrganization();
    const body = await request.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();
    const articleId = String(body.articleId ?? "").trim() || null;
    const stock = parseNonNegativeNumber(body.stock, "existencia");
    const unitPrice = parseNonNegativeNumber(body.unitPrice, "costo");
    const salePrice = parseNonNegativeNumber(body.salePrice, "precio de venta");

    if (!name) {
      throw new HttpError("Escribe el nombre del producto.", 400);
    }

    const admin = getSupabaseAdmin()!;
    const { data, error } = await admin
      .from("inventory_items")
      .insert({
        organization_id: context.organizationId,
        article_id: articleId,
        name,
        stock,
        unit_price: unitPrice,
        sale_price: salePrice,
      })
      .select("id, article_id, name, stock, unit_price, sale_price, updated_at")
      .single();

    if (error?.code === "23505") {
      throw new HttpError("Ya existe un producto con ese nombre.", 409);
    }
    if (error || !data) {
      throw new Error(error?.message ?? "No se pudo crear el producto.");
    }

    return NextResponse.json(data, { status: 201 });
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

function parseNonNegativeNumber(value: unknown, label: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new HttpError(`El campo ${label} debe ser un numero valido.`, 400);
  }
  return number;
}
