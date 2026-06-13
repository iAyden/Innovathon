import { NextResponse } from "next/server";
import { parseCfdiXml, validateCfdi } from "@/lib/cfdi";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse, HttpError } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const MAX_XML_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const context = await requireOrganization();
    const formData = await request.formData();
    const expenseId = String(formData.get("expenseId") ?? "");
    const file = formData.get("file");

    if (!expenseId) {
      throw new HttpError("El egreso es obligatorio.", 400);
    }
    if (!(file instanceof File)) {
      throw new HttpError("Selecciona un archivo XML.", 400);
    }
    if (file.size > MAX_XML_SIZE) {
      throw new HttpError("El XML no puede superar 5 MB.", 400);
    }
    if (!file.name.toLowerCase().endsWith(".xml")) {
      throw new HttpError("El archivo debe tener extension XML.", 400);
    }

    const admin = getSupabaseAdmin()!;
    const { data: expense, error: expenseError } = await admin
      .from("expenses")
      .select("id, organization_id, amount")
      .eq("id", expenseId)
      .eq("organization_id", context.organizationId)
      .single();

    if (expenseError || !expense) {
      throw new HttpError("No encontramos el egreso relacionado.", 404);
    }

    const xmlContent = await file.text();
    const parsedInvoice = parseCfdiXml(xmlContent);
    const { data: taxProfile } = await admin
      .from("tax_profiles")
      .select("rfc")
      .eq("organization_id", context.organizationId)
      .maybeSingle();
    const validation = validateCfdi({
      parsed: parsedInvoice,
      expectedReceiverRfc: taxProfile?.rfc ?? null,
      expectedTotal: Number(expense.amount),
    });

    const { error: fileError } = await admin.from("invoice_files").insert({
      organization_id: context.organizationId,
      expense_id: expenseId,
      file_name: file.name,
      uuid: parsedInvoice.uuid,
      issuer_rfc: parsedInvoice.issuerRfc,
      receiver_rfc: parsedInvoice.receiverRfc,
      subtotal: parsedInvoice.subtotal,
      iva: parsedInvoice.iva,
      total: parsedInvoice.total,
      validation_status: validation.status,
      validation_errors: validation.errors,
      raw_xml: xmlContent,
    });

    if (fileError) {
      throw new Error(fileError.message);
    }

    await admin
      .from("expenses")
      .update({ status: validation.status })
      .eq("id", expenseId)
      .eq("organization_id", context.organizationId);

    return NextResponse.json({
      fileName: file.name,
      valid: validation.valid,
      status: validation.status,
      invoice: parsedInvoice,
      errors: validation.errors,
      humanMessage: validation.humanMessage,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
