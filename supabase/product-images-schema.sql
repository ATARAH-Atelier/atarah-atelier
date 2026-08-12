create extension if not exists pgcrypto;

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  image_url text not null,
  color_name text,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists product_images_product_id_idx
on public.product_images (product_id);

create index if not exists product_images_product_id_display_order_idx
on public.product_images (product_id, display_order);

create index if not exists product_images_product_id_color_name_idx
on public.product_images (product_id, color_name);

alter table public.product_images enable row level security;

drop policy if exists public_read_active_product_images on public.product_images;
create policy public_read_active_product_images on public.product_images
for select to anon, authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_images.product_id
      and p.is_active = true
  )
);

drop policy if exists admins_manage_product_images on public.product_images;
create policy admins_manage_product_images on public.product_images
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

