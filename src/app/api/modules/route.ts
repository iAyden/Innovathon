import { NextResponse } from "next/server";
import { MODULE_CATALOG, recommendModules } from "@/lib/modules";
import { requireOrganization } from "@/lib/server/auth";
import { errorResponse, HttpError } from "@/lib/server/http";
import { triggerN8n } from "@/lib/server/n8n";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const context = await requireOrganization();
    const admin = getSupabaseAdmin()!;
    const [{ data: profile }, { data: enabledModules }] = await Promise.all([
      admin
        .from("business_profiles")
        .select("sector, employee_count, goals, challenges")
        .eq("organization_id", context.organizationId)
        .maybeSingle(),
      admin
        .from("organization_modules")
        .select("module_slug, status, reason, source")
        .eq("organization_id", context.organizationId),
    ]);
    const persisted = new Map(
      (enabledModules ?? []).map((module) => [module.module_slug, module]),
    );
    const recommended = new Set(
      recommendModules(profile?.sector).map((module) => module.slug),
    );

    return NextResponse.json({
      modules: MODULE_CATALOG.map((module) => ({
        ...module,
        status:
          persisted.get(module.slug)?.status ??
          (recommended.has(module.slug) ? "recommended" : "paused"),
        reason:
          persisted.get(module.slug)?.reason ??
          (recommended.has(module.slug)
            ? "Recomendado segun el giro y etapa del negocio."
            : null),
        source: persisted.get(module.slug)?.source ?? "rules",
      })),
      profileReady: Boolean(profile?.sector),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireOrganization();
    const body = await request.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const admin = getSupabaseAdmin()!;

    if (action === "recommend") {
      const { data: profile } = await admin
        .from("business_profiles")
        .select("*")
        .eq("organization_id", context.organizationId)
        .maybeSingle();
      const fallback = recommendModules(profile?.sector).map((module) => ({
        slug: module.slug,
        reason: "Coincide con las necesidades habituales de este giro.",
      }));
      const automation = await triggerN8n({
        workflow: "module-recommendation",
        organizationId: context.organizationId,
        payload: { profile, availableModules: MODULE_CATALOG },
      });
      const recommendations = Array.isArray(automation.data?.recommendations)
        ? automation.data.recommendations
        : fallback;

      for (const recommendation of recommendations) {
        const slug = String(recommendation.slug ?? "");
        if (!MODULE_CATALOG.some((module) => module.slug === slug)) continue;

        await admin.from("organization_modules").upsert(
          {
            organization_id: context.organizationId,
            module_slug: slug,
            status: "recommended",
            source: automation.ok ? "n8n" : "rules",
            reason: String(recommendation.reason ?? ""),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,module_slug" },
        );
      }

      return NextResponse.json({
        recommendations,
        automationConfigured: automation.configured,
      });
    }

    const moduleSlug = String(body.moduleSlug ?? "");
    const status = String(body.status ?? "");
    if (!MODULE_CATALOG.some((module) => module.slug === moduleSlug)) {
      throw new HttpError("Modulo desconocido.", 400);
    }
    if (!["active", "paused", "dismissed", "recommended"].includes(status)) {
      throw new HttpError("Estado de modulo invalido.", 400);
    }

    const { error } = await admin.from("organization_modules").upsert(
      {
        organization_id: context.organizationId,
        module_slug: moduleSlug,
        status,
        source: "manual",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,module_slug" },
    );

    if (error) {
      throw new HttpError(
        "Aplica la migracion de Pulso AI antes de configurar modulos.",
        503,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
