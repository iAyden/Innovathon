create table if not exists public.business_profiles (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  legal_name text,
  trade_name text,
  rfc text,
  sector text,
  business_type text,
  employee_count integer not null default 1 check (employee_count between 1 and 250),
  monthly_revenue numeric not null default 0 check (monthly_revenue >= 0),
  state text,
  municipality text,
  phone text,
  contact_email text,
  operation_start_date date,
  goals text[] not null default '{}',
  challenges text[] not null default '{}',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.module_catalog (
  slug text primary key,
  name text not null,
  description text not null,
  category text not null,
  n8n_workflow text,
  recommended_for text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_modules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_slug text not null references public.module_catalog(slug),
  status text not null default 'recommended'
    check (status in ('recommended', 'active', 'paused', 'dismissed')),
  source text not null default 'rules'
    check (source in ('rules', 'n8n', 'manual')),
  reason text,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, module_slug)
);

create table if not exists public.cash_flow_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entry_type text not null check (entry_type in ('income', 'expense')),
  category text,
  description text,
  amount numeric not null check (amount > 0),
  occurred_on date not null default current_date,
  source text not null default 'manual',
  external_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.business_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_type text not null,
  file_name text not null,
  storage_path text,
  analysis_status text not null default 'pending'
    check (analysis_status in ('pending', 'processing', 'completed', 'failed')),
  extracted_data jsonb not null default '{}'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  workflow text not null,
  direction text not null check (direction in ('outbound', 'callback')),
  status text not null check (status in ('pending', 'sent', 'completed', 'failed')),
  correlation_id uuid not null default gen_random_uuid(),
  external_execution_id text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists business_profiles_rfc_idx
  on public.business_profiles (rfc);
create index if not exists organization_modules_org_idx
  on public.organization_modules (organization_id);
create index if not exists cash_flow_entries_org_date_idx
  on public.cash_flow_entries (organization_id, occurred_on desc);
create index if not exists business_documents_org_idx
  on public.business_documents (organization_id, created_at desc);
create index if not exists integration_events_correlation_idx
  on public.integration_events (correlation_id);

insert into public.module_catalog
  (slug, name, description, category, n8n_workflow, recommended_for)
values
  ('cash-flow', 'Flujo de caja', 'Control de entradas, salidas y liquidez.', 'Finanzas', 'cashflow-forecast', array['all']),
  ('invoice-recovery', 'Recuperacion de facturas', 'Seguimiento de XML pendientes e IVA en riesgo.', 'Fiscal', 'request-invoice', array['commerce', 'services', 'manufacturing']),
  ('fiscal-guide', 'Guia fiscal', 'Orientacion basada en la situacion fiscal del negocio.', 'Fiscal', 'fiscal-profile', array['all']),
  ('inventory', 'Inventario', 'Control basico de existencias y compras.', 'Operacion', 'inventory-advisor', array['commerce', 'manufacturing', 'food']),
  ('accounts-receivable', 'Cuentas por cobrar', 'Seguimiento de clientes y cobros pendientes.', 'Finanzas', 'collections-advisor', array['services', 'commerce']),
  ('supplier-control', 'Proveedores', 'Cumplimiento, tiempos de respuesta y compras.', 'Operacion', 'supplier-analysis', array['commerce', 'manufacturing', 'food'])
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  n8n_workflow = excluded.n8n_workflow,
  recommended_for = excluded.recommended_for;

alter table public.business_profiles enable row level security;
alter table public.organization_modules enable row level security;
alter table public.cash_flow_entries enable row level security;
alter table public.business_documents enable row level security;
alter table public.integration_events enable row level security;

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
  );
$$;

drop policy if exists "members manage business profiles" on public.business_profiles;
create policy "members manage business profiles"
on public.business_profiles for all
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "members manage organization modules" on public.organization_modules;
create policy "members manage organization modules"
on public.organization_modules for all
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "members manage cash flow" on public.cash_flow_entries;
create policy "members manage cash flow"
on public.cash_flow_entries for all
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "members manage business documents" on public.business_documents;
create policy "members manage business documents"
on public.business_documents for all
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "members read integration events" on public.integration_events;
create policy "members read integration events"
on public.integration_events for select
using (public.is_organization_member(organization_id));
