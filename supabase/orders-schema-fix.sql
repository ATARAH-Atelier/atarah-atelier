alter table if exists public.orders
  add column if not exists subtotal numeric default 0,
  add column if not exists paid_amount numeric default 0,
  add column if not exists balance numeric default 0,
  add column if not exists delivery_method text,
  add column if not exists preferred_contact_method text,
  add column if not exists notes text,
  add column if not exists checkout_token uuid,
  add column if not exists requested_date date;

alter table if exists public.customers
  add column if not exists address text,
  add column if not exists updated_at timestamptz default timezone('utc', now());

create unique index if not exists orders_checkout_token_key on public.orders (checkout_token);
create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists order_status_history_order_id_idx
  on public.order_status_history (order_id, created_at);
