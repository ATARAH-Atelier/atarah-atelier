alter table if exists public.product_sizes
  add column if not exists size_type text;

update public.product_sizes
set size_type = coalesce(size_type, 'top')
where size_type is null;

alter table if exists public.order_items
  add column if not exists product_name_snapshot text,
  add column if not exists blouse_size text,
  add column if not exists pants_size text,
  add column if not exists color_name text,
  add column if not exists color_hex text,
  add column if not exists unit_price numeric default 0,
  add column if not exists line_total numeric default 0,
  add column if not exists notes text,
  add column if not exists created_at timestamptz default timezone('utc', now());

update public.order_items
set blouse_size = coalesce(blouse_size, size)
where size is not null
  and blouse_size is null;

create index if not exists order_items_order_id_idx
  on public.order_items (order_id);
