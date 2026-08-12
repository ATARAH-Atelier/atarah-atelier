alter table if exists public.order_items
  add column if not exists product_name text,
  add column if not exists subtotal numeric default 0,
  add column if not exists total numeric default 0;

update public.order_items
set product_name = coalesce(product_name, product_name_snapshot)
where product_name is null
  and product_name_snapshot is not null;

update public.order_items
set subtotal = coalesce(subtotal, line_total, unit_price * quantity, 0)
where subtotal is null;

update public.order_items
set total = coalesce(total, line_total, subtotal, unit_price * quantity, 0)
where total is null;

alter table if exists public.order_items
  alter column product_name drop not null;

alter table if exists public.order_items
  alter column subtotal drop not null;

alter table if exists public.order_items
  alter column total drop not null;
