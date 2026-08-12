alter table if exists public.order_status_history
  add column if not exists status text,
  add column if not exists new_status text,
  add column if not exists created_at timestamptz default timezone('utc', now());

update public.order_status_history
set new_status = coalesce(new_status, status)
where new_status is null
  and status is not null;

alter table if exists public.order_status_history
  alter column status drop not null;

alter table if exists public.order_status_history
  alter column new_status drop not null;

create index if not exists order_status_history_order_id_idx
  on public.order_status_history (order_id, created_at);
