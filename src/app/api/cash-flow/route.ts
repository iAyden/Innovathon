import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse, HttpError } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
// Rutas para manejar el flujo de caja manual
// GET: Obtener los últimos movimientos de flujo de caja
// POST: Registrar un nuevo movimiento de flujo de caja   

export async function GET() {
  try {
    const context = await requireOrganization();
    const { data, error } = await getSupabaseAdmin()!
      .from("cash_flow_entries")
      .select("*")
      .eq("organization_id", context.organizationId)
      .order("occurred_on", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ entries: [], migrationRequired: true });
    }
    return NextResponse.json({ entries: data ?? [], migrationRequired: false });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireOrganization();
    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount ?? 0);
    const entryType = String(body.entryType ?? "");

    if (!["income", "expense"].includes(entryType) || amount <= 0) {
      throw new HttpError("Tipo y monto de movimiento invalidos.", 400);
    }

    const { error } = await getSupabaseAdmin()!.from("cash_flow_entries").insert({
      organization_id: context.organizationId,
      entry_type: entryType,
      category: String(body.category ?? "").trim() || null,
      description: String(body.description ?? "").trim() || null,
      amount,
      occurred_on:
        String(body.occurredOn ?? "") || new Date().toISOString().slice(0, 10),
      source: "manual",
    });

    if (error) {
      throw new HttpError(
        "Aplica la migracion de Pulso AI antes de registrar flujo de caja.",
        503,
      );
    }
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
