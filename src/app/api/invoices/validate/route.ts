import { NextResponse } from "next/server";
import { parseCfdiXml, validateCfdi } from "@/lib/cfdi";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse, HttpError } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const context = await requireOrganization();
    const body = await request.json().catch(() => ({}));
    const expenseId = String(body.expenseId ?? "");
    const xmlContent = String(body.xmlContent ?? "");

    if (!expenseId || !xmlContent) {
      throw new HttpError("El egreso y el contenido XML son obligatorios.", 400);
    }

    const admin = getSupabaseAdmin()!;
    const { data: expense, error } = await admin
      .from("expenses")
      .select("amount")
      .eq("id", expenseId)
      .eq("organization_id", context.organizationId)
      .single();

    if (error || !expense) {
      throw new HttpError("No encontramos el egreso relacionado.", 404);
    }

    const { data: taxProfile } = await admin
      .from("tax_profiles")
      .select("rfc")
      .eq("organization_id", context.organizationId)
      .maybeSingle();
    const invoice = parseCfdiXml(xmlContent);
    const validation = validateCfdi({
      parsed: invoice,
      expectedReceiverRfc: taxProfile?.rfc ?? null,
      expectedTotal: Number(expense.amount),
    });

    return NextResponse.json({ ...validation, invoice });
  } catch (error) {
    return errorResponse(error);
  }
}
