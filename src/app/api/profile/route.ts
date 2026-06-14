import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse, HttpError } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    const context = await requireOrganization();
    const admin = getSupabaseAdmin()!;
    const [{ data: businessProfile }, { data: taxProfile }] = await Promise.all([
      admin
        .from("business_profiles")
        .select("*")
        .eq("organization_id", context.organizationId)
        .maybeSingle(),
      admin
        .from("tax_profiles")
        .select("*")
        .eq("organization_id", context.organizationId)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      organization: {
        id: context.organizationId,
        name: context.organizationName,
      },
      businessProfile: businessProfile ?? null,
      taxProfile: taxProfile ?? null,
      user: { email: context.email, role: context.role },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const context = await requireOrganization();
    const body = await request.json().catch(() => ({}));
    const businessName = text(body.businessName);
    const rfc = text(body.rfc).toUpperCase();

    if (!businessName) {
      throw new HttpError("El nombre del negocio es obligatorio.", 400);
    }
    if (rfc && !/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc)) {
      throw new HttpError("El RFC no tiene un formato valido.", 400);
    }

    const admin = getSupabaseAdmin()!;
    await admin
      .from("organizations")
      .update({ name: businessName })
      .eq("id", context.organizationId);

    const businessPayload = {
      organization_id: context.organizationId,
      legal_name: text(body.legalName) || businessName,
      trade_name: businessName,
      rfc: rfc || null,
      sector: text(body.sector) || null,
      business_type: text(body.businessType) || null,
      employee_count: Math.max(1, Number(body.employeeCount ?? 1)),
      monthly_revenue: Math.max(0, Number(body.monthlyRevenue ?? 0)),
      state: text(body.state) || null,
      municipality: text(body.municipality) || null,
      phone: text(body.phone) || null,
      contact_email: text(body.contactEmail) || context.email,
      operation_start_date: text(body.operationStartDate) || null,
      goals: Array.isArray(body.goals) ? body.goals.map(text).filter(Boolean) : [],
      challenges: Array.isArray(body.challenges)
        ? body.challenges.map(text).filter(Boolean)
        : [],
      onboarding_completed: Boolean(body.sector && body.employeeCount),
      updated_at: new Date().toISOString(),
    };
    const { data: existingBusiness } = await admin
      .from("business_profiles")
      .select("organization_id")
      .eq("organization_id", context.organizationId)
      .maybeSingle();
    const businessQuery = existingBusiness
      ? admin
          .from("business_profiles")
          .update(businessPayload)
          .eq("organization_id", context.organizationId)
      : admin.from("business_profiles").insert(businessPayload);
    const { error: businessError } = await businessQuery;

    if (businessError) {
      throw new HttpError(
        "Aplica la migracion de Pulso AI antes de guardar el perfil operativo.",
        503,
      );
    }

    if (rfc) {
      const taxPayload = {
        organization_id: context.organizationId,
        business_name: text(body.legalName) || businessName,
        rfc,
        tax_regime: text(body.taxRegime) || null,
        cfdi_usage: text(body.cfdiUsage) || null,
        fiscal_email: text(body.fiscalEmail) || context.email,
        fiscal_zip_code: text(body.fiscalZipCode) || null,
      };
      const { data: existingTax } = await admin
        .from("tax_profiles")
        .select("id")
        .eq("organization_id", context.organizationId)
        .maybeSingle();
      const { error: taxError } = existingTax
        ? await admin
            .from("tax_profiles")
            .update(taxPayload)
            .eq("id", existingTax.id)
        : await admin.from("tax_profiles").insert(taxPayload);

      if (taxError) {
        throw new Error(taxError.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
