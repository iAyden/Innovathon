import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse, HttpError } from "@/lib/server/http";
import { triggerN8n } from "@/lib/server/n8n";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function buildMessage(input: {
  amount: number;
  expenseDate: string;
  businessName: string;
  rfc: string;
  taxRegime?: string | null;
  cfdiUsage?: string | null;
  fiscalEmail?: string | null;
}) {
  return {
    subject: "Solicitud de factura por compra realizada",
    message: `Hola, buen dia.

Realizamos un pago por ${input.amount.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    })} el ${input.expenseDate}. Agradecemos el envio del XML y PDF.

Datos fiscales:
Razon social: ${input.businessName}
RFC: ${input.rfc}
Regimen fiscal: ${input.taxRegime ?? "No especificado"}
Uso CFDI: ${input.cfdiUsage ?? "G03"}
Correo: ${input.fiscalEmail ?? "No especificado"}`,
  };
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireOrganization();
    const { id } = await context.params;
    const admin = getSupabaseAdmin()!;
    const { data: expense, error } = await admin
      .from("expenses")
      .select(
        "id, organization_id, amount, expense_date, description, suppliers(id,name,email)",
      )
      .eq("id", id)
      .eq("organization_id", auth.organizationId)
      .single();

    if (error || !expense) {
      throw new HttpError("Egreso no encontrado.", 404);
    }

    const { data: taxProfile } = await admin
      .from("tax_profiles")
      .select("business_name, rfc, tax_regime, cfdi_usage, fiscal_email")
      .eq("organization_id", auth.organizationId)
      .maybeSingle();
    const supplier = Array.isArray(expense.suppliers)
      ? expense.suppliers[0]
      : expense.suppliers;
    const fallback = buildMessage({
      amount: Number(expense.amount),
      expenseDate: expense.expense_date,
      businessName: taxProfile?.business_name ?? auth.organizationName,
      rfc: taxProfile?.rfc ?? "RFC pendiente",
      taxRegime: taxProfile?.tax_regime,
      cfdiUsage: taxProfile?.cfdi_usage,
      fiscalEmail: taxProfile?.fiscal_email,
    });
    const automation = await triggerN8n({
      workflow: "request-invoice",
      organizationId: auth.organizationId,
      payload: {
        expenseId: expense.id,
        supplier,
        expense: {
          amount: Number(expense.amount),
          date: expense.expense_date,
          description: expense.description,
        },
        taxProfile,
        fallback,
      },
    });
    const generated = {
      subject: automation.data?.subject ?? fallback.subject,
      message: automation.data?.message ?? fallback.message,
    };
    const status = automation.configured && automation.ok ? "sent" : "draft";

    await admin.from("invoice_requests").insert({
      organization_id: auth.organizationId,
      expense_id: expense.id,
      supplier_id: supplier?.id ?? null,
      channel: "email",
      subject: generated.subject,
      message: generated.message,
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    });
    await admin
      .from("expenses")
      .update({ status: status === "sent" ? "request_sent" : "missing_invoice" })
      .eq("id", expense.id)
      .eq("organization_id", auth.organizationId);

    return NextResponse.json({
      expenseId: expense.id,
      status,
      ...generated,
      automationConfigured: automation.configured,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
