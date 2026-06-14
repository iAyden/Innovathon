import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse, HttpError } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const context = await requireOrganization();
    const admin = getSupabaseAdmin();
    const { data, error } = await admin!
      .from("suppliers")
      .select(
        "id, name, rfc, email, whatsapp, compliance_score, avg_response_days, created_at",
      )
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const suppliers = (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      rfc: row.rfc,
      email: row.email,
      whatsapp: row.whatsapp,
      complianceScore: row.compliance_score,
      avgResponseDays: row.avg_response_days,
      createdAt: row.created_at,
    }));

    return NextResponse.json(suppliers);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireOrganization();
    const body = await request.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim() || null;
    const rfc = String(body.rfc ?? "").trim() || null;
    const whatsapp = String(body.whatsapp ?? "").trim() || null;

    if (!name) {
      throw new HttpError("El nombre del proveedor es obligatorio.", 400);
    }

    const admin = getSupabaseAdmin()!;

    // Check if supplier exists by name
    const { data: existingSupplier } = await admin
      .from("suppliers")
      .select("id")
      .eq("organization_id", context.organizationId)
      .ilike("name", name)
      .maybeSingle();

    if (existingSupplier?.id) {
      throw new HttpError("Ya existe un proveedor con ese nombre.", 400);
    }

    const { data: supplier, error: supplierError } = await admin
      .from("suppliers")
      .insert({
        organization_id: context.organizationId,
        name,
        email,
        rfc,
        whatsapp,
      })
      .select("id, name, rfc, email, whatsapp, compliance_score, avg_response_days, created_at")
      .single();

    if (supplierError || !supplier) {
      throw new Error(supplierError?.message ?? "No se pudo crear el proveedor.");
    }

    const newSupplier = {
      id: supplier.id,
      name: supplier.name,
      rfc: supplier.rfc,
      email: supplier.email,
      whatsapp: supplier.whatsapp,
      complianceScore: supplier.compliance_score,
      avgResponseDays: supplier.avg_response_days,
      createdAt: supplier.created_at,
    };

    return NextResponse.json(newSupplier, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
