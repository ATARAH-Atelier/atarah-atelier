-- Collection module. Apply this migration in the Supabase SQL Editor.

alter table public.orders
  add column if not exists payment_due_date date;

create table if not exists public.collection_reminders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  stage text not null check (stage in ('due_soon', 'due_today', 'overdue_3', 'overdue_7', 'manual_followup')),
  priority integer not null default 0,
  balance_snapshot numeric not null check (balance_snapshot > 0),
  days_overdue integer not null default 0,
  message text,
  status text not null default 'pending' check (status in ('pending', 'opened', 'sent', 'skipped', 'cancelled')),
  opened_at timestamptz,
  sent_at timestamptz,
  sent_by_profile_id uuid references public.profiles (id) on delete set null,
  skipped_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (order_id, stage)
);

create index if not exists collection_reminders_queue_idx
  on public.collection_reminders (status, priority desc, created_at desc);
create index if not exists collection_reminders_customer_idx
  on public.collection_reminders (customer_id, created_at desc);

create table if not exists public.payment_promises (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  amount numeric not null check (amount > 0),
  promised_date date not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'fulfilled', 'broken', 'cancelled')),
  created_by_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  fulfilled_at timestamptz,
  cancelled_at timestamptz
);

create index if not exists payment_promises_order_idx
  on public.payment_promises (order_id, status, promised_date);

create or replace function public.set_collection_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists collection_reminders_set_updated_at on public.collection_reminders;
create trigger collection_reminders_set_updated_at
before update on public.collection_reminders
for each row execute function public.set_collection_updated_at();

create or replace function public.create_collection_reminder_if_missing(
  p_order_id uuid,
  p_customer_id uuid,
  p_stage text,
  p_priority integer,
  p_balance_snapshot numeric,
  p_days_overdue integer,
  p_message text default null
)
returns public.collection_reminders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reminder public.collection_reminders;
begin
  if not public.is_staff() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'not authorized';
  end if;

  insert into public.collection_reminders (
    order_id, customer_id, stage, priority, balance_snapshot, days_overdue, message
  )
  values (
    p_order_id, p_customer_id, p_stage, p_priority, p_balance_snapshot, p_days_overdue, p_message
  )
  on conflict (order_id, stage) do nothing
  returning * into v_reminder;

  if v_reminder.id is null then
    select * into v_reminder
    from public.collection_reminders
    where order_id = p_order_id and stage = p_stage;
  end if;

  return v_reminder;
end;
$$;

create or replace view public.collection_debts
with (security_invoker = true)
as
select
  o.id as order_id,
  o.order_number,
  c.id as customer_id,
  c.full_name as customer_name,
  c.phone,
  coalesce(o.total, 0) as total,
  coalesce(o.paid_amount, 0) as paid_amount,
  coalesce(o.balance, greatest(coalesce(o.total, 0) - coalesce(o.paid_amount, 0), 0)) as balance,
  o.payment_due_date
from public.orders o
join public.customers c on c.id = o.customer_id
where o.status <> 'cancelled'
  and coalesce(o.balance, greatest(coalesce(o.total, 0) - coalesce(o.paid_amount, 0), 0)) > 0
  and o.payment_due_date is not null;

create or replace function public.resolve_collection_when_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.balance, 0) <= 0 then
    update public.payment_promises
    set status = 'fulfilled', fulfilled_at = timezone('utc', now())
    where order_id = new.id and status = 'pending';

    update public.collection_reminders
    set status = 'cancelled'
    where order_id = new.id and status in ('pending', 'opened');
  end if;

  return new;
end;
$$;

drop trigger if exists orders_resolve_collection_when_paid on public.orders;
create trigger orders_resolve_collection_when_paid
after update of balance on public.orders
for each row execute function public.resolve_collection_when_paid();

alter table public.collection_reminders enable row level security;
alter table public.payment_promises enable row level security;

drop policy if exists staff_manage_collection_reminders on public.collection_reminders;
create policy staff_manage_collection_reminders on public.collection_reminders
for all to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists staff_manage_payment_promises on public.payment_promises;
create policy staff_manage_payment_promises on public.payment_promises
for all to authenticated
using (public.is_staff())
with check (public.is_staff());

grant select on public.collection_debts to authenticated, service_role;
grant execute on function public.create_collection_reminder_if_missing(uuid, uuid, text, integer, numeric, integer, text) to authenticated, service_role;
