import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase/server";
import { HttpError } from "@/lib/server/http";

export type OrganizationContext = {
  userId: string;
  email: string | null;
  organizationId: string;
  organizationName: string;
  role: string;
};

export async function requireOrganization(): Promise<OrganizationContext> {
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    throw new HttpError("Debes iniciar sesion.", 401);
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new HttpError("Supabase no esta configurado.", 503);
  }

  const { data: membership, error: membershipError } = await admin
    .from("organization_members")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (membership?.organization_id) {
    const organization = Array.isArray(membership.organizations)
      ? membership.organizations[0]
      : membership.organizations;

    return {
      userId: user.id,
      email: user.email ?? null,
      organizationId: membership.organization_id,
      organizationName: organization?.name ?? "Mi negocio",
      role: membership.role ?? "owner",
    };
  }

  const defaultName = user.user_metadata?.business_name || "Mi negocio";
  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .insert({ name: defaultName })
    .select("id, name")
    .single();

  if (organizationError || !organization) {
    throw new Error(organizationError?.message ?? "No se pudo crear la empresa.");
  }

  const { error: memberError } = await admin
    .from("organization_members")
    .insert({
      organization_id: organization.id,
      user_id: user.id,
      role: "owner",
    });

  if (memberError) {
    throw new Error(memberError.message);
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    organizationId: organization.id,
    organizationName: organization.name,
    role: "owner",
  };
}
