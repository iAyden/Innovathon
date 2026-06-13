import { NextResponse } from "next/server";
import { parseCfdiXml, validateCfdi } from "@/lib/cfdi";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const DEMO_ORG_ID =
  process.env.DEMO_ORG_ID ?? "00000000-0000-0000-0000-000000000001";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const expenseId = String(body.expenseId ?? "");
    const xmlContent = String(body.xmlContent ?? "");

    if (!expenseId) {
      return NextResponse.json(
        { error: "El expenseId es obligatorio." },
        { status: 400 }
      );
    }

    if (!xmlContent) {
      return NextResponse.json(
        { error: "El contenido XML es obligatorio." },
        { status: 400 }
      );
    }

    const parsedInvoice = parseCfdiXml(xmlContent);
    const supabase = getSupabaseAdmin();

    let expectedTotal: number | null = null;
    let expectedReceiverRfc: string | null = null;

    if (supabase) {
      const { data: expense, error: expenseError } = await supabase
        .from("expenses")
        .select("id, organization_id, amount")
        .eq("id", expenseId)
        .single();

      if (expenseError || !expense) {
        return NextResponse.json(
          {
            error: "No encontramos el egreso relacionado.",
            details: expenseError?.message,
          },
          { status: 404 }
        );
      }

      expectedTotal = Number(expense.amount);

      const { data: taxProfile } = await supabase
        .from("tax_profiles")
        .select("rfc")
        .eq("organization_id", expense.organization_id)
        .maybeSingle();

      expectedReceiverRfc = taxProfile?.rfc ?? null;
    } else {
      expectedTotal = parsedInvoice.total;
      expectedReceiverRfc = "CSO920101XXX";
    }

    const validation = validateCfdi({
      parsed: parsedInvoice,
      expectedReceiverRfc,
      expectedTotal,
    });

    return NextResponse.json({
      valid: validation.valid,
      status: validation.status,
      invoice: parsedInvoice,
      errors: validation.errors,
      humanMessage: validation.humanMessage,
      mode: supabase ? "supabase" : "demo",
      demoOrgId: DEMO_ORG_ID,
    });
  } catch (error) {
    console.error("Invoice validate error:", error);

    return NextResponse.json(
      {
        error: "No se pudo validar el XML.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}