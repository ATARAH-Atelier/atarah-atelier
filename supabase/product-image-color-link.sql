alter table if exists public.product_images
add column if not exists color_name text;

create index if not exists product_images_product_id_color_name_idx
on public.product_images (product_id, color_name);
