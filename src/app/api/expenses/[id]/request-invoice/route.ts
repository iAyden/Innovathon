import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function buildFallbackMessage(input: {
  supplierName: string;
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
    message: `Hola, buen día.\n\nRealizamos un pago por ${input.amount.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    })} el día ${input.expenseDate}. ¿Nos podrías apoyar enviando el XML y PDF de la factura correspondiente?\n\nTe compartimos nuestros datos fiscales:\nRazón social: ${input.businessName}\nRFC: ${input.rfc}\nRégimen fiscal: ${input.taxRegime ?? "No especificado"}\nUso CFDI: ${input.cfdiUsage ?? "G03"}\nCorreo para recepción: ${input.fiscalEmail ?? "facturas@demo.mx"}\n\nMuchas gracias.`,
  };
}

type SupplierRelation = { id?: string | null; name?: string | null; email?: string | null };
type ExpenseWithSupplier = {
  id: string;
  organization_id: string;
  amount: number | string | null;
  expense_date: string;
  description?: string | null;
  suppliers?: SupplierRelation | SupplierRelation[] | null;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    const generated = buildFallbackMessage({
      supplierName: body.supplierName ?? "Proveedor",
      amount: Number(body.amount ?? 0),
      expenseDate: body.expenseDate ?? new Date().toISOString().slice(0, 10),
      businessName: body.businessName ?? "Clínica Sonrisa S.A. de C.V.",
      rfc: body.rfc ?? "CSO920101XXX",
      taxRegime: body.taxRegime ?? "601",
      cfdiUsage: body.cfdiUsage ?? "G03",
      fiscalEmail: body.fiscalEmail ?? "facturas@clinicaso.com",
    });

    return NextResponse.json({
      expenseId: id,
      status: "request_sent",
      ...generated,
      demo: true,
    });
  }

  const { data: expense, error } = await supabase
    .from("expenses")
    .select("id, organization_id, amount, expense_date, description, suppliers(id,name,email)")
    .eq("id", id)
    .single();

  if (error || !expense) {
    return NextResponse.json({ error: error?.message || "Egreso no encontrado" }, { status: 404 });
  }

  const { data: taxProfile } = await supabase
    .from("tax_profiles")
    .select("business_name, rfc, tax_regime, cfdi_usage, fiscal_email")
    .eq("organization_id", expense.organization_id)
    .maybeSingle();

  const expenseRow = expense as ExpenseWithSupplier;
  const supplier = Array.isArray(expenseRow.suppliers)
    ? expenseRow.suppliers[0]
    : expenseRow.suppliers;

  const payload = {
    expenseId: expenseRow.id,
    supplier: {
      name: supplier?.name ?? "Proveedor",
      email: supplier?.email ?? null,
    },
    expense: {
      amount: Number(expenseRow.amount ?? 0),
      date: expenseRow.expense_date,
      description: expenseRow.description,
    },
    taxProfile: {
      businessName: taxProfile?.business_name ?? "Mi negocio",
      rfc: taxProfile?.rfc ?? "XAXX010101000",
      taxRegime: taxProfile?.tax_regime ?? "601",
      cfdiUse: taxProfile?.cfdi_usage ?? "G03",
      fiscalEmail: taxProfile?.fiscal_email ?? "facturas@demo.mx",
    },
  };

  let generated = buildFallbackMessage({
    supplierName: payload.supplier.name,
    amount: payload.expense.amount,
    expenseDate: payload.expense.date,
    businessName: payload.taxProfile.businessName,
    rfc: payload.taxProfile.rfc,
    taxRegime: payload.taxProfile.taxRegime,
    cfdiUsage: payload.taxProfile.cfdiUse,
    fiscalEmail: payload.taxProfile.fiscalEmail,
  });

  const webhookUrl = process.env.N8N_REQUEST_INVOICE_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (webhookResponse.ok) {
        const webhookJson = await webhookResponse.json().catch(() => null);
        generated = {
          subject: webhookJson?.subject ?? generated.subject,
          message: webhookJson?.message ?? generated.message,
        };
      }
    } catch {
      // Mantiene fallback para no romper demo si n8n está caído.
    }
  }

  await supabase.from("invoice_requests").insert({
    organization_id: expenseRow.organization_id,
    expense_id: expenseRow.id,
    supplier_id: supplier?.id ?? null,
    channel: "email",
    subject: generated.subject,
    message: generated.message,
    status: "sent",
    sent_at: new Date().toISOString(),
  });

  await supabase.from("expenses").update({ status: "request_sent" }).eq("id", expenseRow.id);

  return NextResponse.json({
    expenseId: expenseRow.id,
    status: "request_sent",
    ...generated,
  });
}
