create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  rfc text,
  email text,
  phone text,
  payment_terms_days integer not null default 0
    check (payment_terms_days between 0 and 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts_receivable (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  folio text,
  description text not null,
  amount numeric not null check (amount > 0),
  paid_amount numeric not null default 0
    check (paid_amount >= 0 and paid_amount <= amount),
  currency text not null default 'MXN'
    check (currency in ('MXN', 'USD')),
  issue_date date not null default current_date,
  due_date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'partial', 'paid', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.receivable_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  receivable_id uuid not null references public.accounts_receivable(id) on delete restrict,
  amount numeric not null check (amount > 0),
  paid_on date not null default current_date,
  payment_method text,
  reference text,
  notes text,
  cash_flow_entry_id uuid references public.cash_flow_entries(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists customers_org_name_idx
  on public.customers (organization_id, name);
create index if not exists accounts_receivable_org_due_idx
  on public.accounts_receivable (organization_id, due_date);
create index if not exists accounts_receivable_customer_idx
  on public.accounts_receivable (customer_id);
create index if not exists receivable_payments_receivable_idx
  on public.receivable_payments (receivable_id, paid_on desc);

create or replace function public.prepare_receivable_payment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  receivable public.accounts_receivable%rowtype;
begin
  select *
  into receivable
  from public.accounts_receivable
  where id = new.receivable_id
  for update;

  if receivable.id is null or receivable.organization_id <> new.organization_id then
    raise exception 'Cuenta por cobrar no encontrada.';
  end if;

  if receivable.status in ('paid', 'cancelled') then
    raise exception 'La cuenta no admite nuevos pagos.';
  end if;

  if new.amount > receivable.amount - receivable.paid_amount then
    raise exception 'El pago supera el saldo pendiente.';
  end if;

  return new;
end;
$$;

create or replace function public.apply_receivable_payment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  cash_entry_id uuid;
begin
  update public.accounts_receivable
  set
    paid_amount = paid_amount + new.amount,
    status = case
      when paid_amount + new.amount >= amount then 'paid'
      else 'partial'
    end,
    updated_at = now()
  where id = new.receivable_id;

  insert into public.cash_flow_entries (
    organization_id,
    entry_type,
    category,
    description,
    amount,
    occurred_on,
    source,
    external_id
  )
  select
    new.organization_id,
    'income',
    'Cuentas por cobrar',
    'Cobro de ' || ar.description,
    new.amount,
    new.paid_on,
    'accounts-receivable',
    new.id::text
  from public.accounts_receivable ar
  where ar.id = new.receivable_id
  returning id into cash_entry_id;

  update public.receivable_payments
  set cash_flow_entry_id = cash_entry_id
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists validate_receivable_payment on public.receivable_payments;
create trigger validate_receivable_payment
before insert on public.receivable_payments
for each row execute function public.prepare_receivable_payment();

drop trigger if exists sync_receivable_payment on public.receivable_payments;
create trigger sync_receivable_payment
after insert on public.receivable_payments
for each row execute function public.apply_receivable_payment();

alter table public.customers enable row level security;
alter table public.accounts_receivable enable row level security;
alter table public.receivable_payments enable row level security;

drop policy if exists "members manage customers" on public.customers;
create policy "members manage customers"
on public.customers for all
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "members manage accounts receivable" on public.accounts_receivable;
create policy "members manage accounts receivable"
on public.accounts_receivable for all
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "members manage receivable payments" on public.receivable_payments;
create policy "members manage receivable payments"
on public.receivable_payments for all
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));
