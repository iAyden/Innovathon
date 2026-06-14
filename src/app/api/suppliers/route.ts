import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse, HttpError } from "@/lib/server/http";
import {
  calculateSupplierMetrics,
  type SupplierExpense,
  type SupplierInvoiceRequest,
} from "@/lib/server/supplier-analysis";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const context = await requireOrganization();
    const admin = getSupabaseAdmin();
    const [supplierResult, expenseResult, requestResult] = await Promise.all([
        admin!
          .from("suppliers")
          .select(
            "id, name, rfc, email, whatsapp, compliance_score, avg_response_days, created_at",
          )
          .eq("organization_id", context.organizationId)
          .order("created_at", { ascending: false }),
        admin!
          .from("expenses")
          .select("supplier_id, amount, status")
          .eq("organization_id", context.organizationId),
        admin!
          .from("invoice_requests")
          .select("supplier_id, sent_at, responded_at, status")
          .eq("organization_id", context.organizationId),
      ]);

    if (supplierResult.error) {
      throw new Error(supplierResult.error.message);
    }
    if (expenseResult.error) {
      throw new Error(expenseResult.error.message);
    }
    if (requestResult.error) {
      throw new Error(requestResult.error.message);
    }

    const expensesBySupplier = groupBySupplier<SupplierExpense>(
      expenseResult.data ?? [],
    );
    const requestsBySupplier = groupBySupplier<SupplierInvoiceRequest>(
      requestResult.data ?? [],
    );
    const suppliers = (supplierResult.data ?? []).map((row) => {
      const metrics = calculateSupplierMetrics(
        expensesBySupplier.get(row.id) ?? [],
        requestsBySupplier.get(row.id) ?? [],
      );

      return {
        id: row.id,
        name: row.name,
        rfc: row.rfc,
        email: row.email,
        whatsapp: row.whatsapp,
        complianceScore: metrics.complianceScore,
        avgResponseDays: metrics.avgResponseDays,
        metrics,
        createdAt: row.created_at,
      };
    });

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
      metrics: {
        purchaseCount: 0,
        totalSpend: 0,
        pendingInvoiceCount: 0,
        receivedInvoiceCount: 0,
        requestCount: 0,
        responseCount: 0,
        invoiceCoverageRate: 0,
        avgResponseDays: null,
        complianceScore: null,
        hasActivity: false,
      },
      createdAt: supplier.created_at,
    };

    return NextResponse.json(newSupplier, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

function groupBySupplier<T extends { supplier_id: string | null }>(rows: T[]) {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    if (!row.supplier_id) continue;
    const current = grouped.get(row.supplier_id) ?? [];
    current.push(row);
    grouped.set(row.supplier_id, current);
  }

  return grouped;
}
