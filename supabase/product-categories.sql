create extension if not exists pgcrypto;

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists product_categories_name_key on public.product_categories (lower(name));
create unique index if not exists product_categories_slug_key on public.product_categories (slug);

alter table if exists public.products
  add column if not exists category_id uuid references public.product_categories (id) on delete set null;

create index if not exists products_category_id_idx on public.products (category_id);

insert into public.product_categories (name, slug)
select distinct trim(category), regexp_replace(lower(trim(category)), '[^a-z0-9]+', '-', 'g')
from public.products
where nullif(trim(category), '') is not null
on conflict do nothing;

update public.products p
set category_id = pc.id
from public.product_categories pc
where p.category_id is null
  and lower(trim(coalesce(p.category, ''))) = lower(pc.name);

create or replace function public.resolve_product_category(
  p_category_id uuid,
  p_category text
)
returns table (
  category_id uuid,
  category_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category public.product_categories;
  v_category_name text := nullif(trim(coalesce(p_category, '')), '');
begin
  if p_category_id is not null then
    select * into v_category
    from public.product_categories
    where id = p_category_id;

    if not found then
      raise exception 'invalid category_id';
    end if;

    return query select v_category.id, v_category.name;
    return;
  end if;

  if v_category_name is null then
    raise exception 'missing category';
  end if;

  select * into v_category
  from public.product_categories
  where lower(name) = lower(v_category_name)
  limit 1;

  if found then
    return query select v_category.id, v_category.name;
    return;
  end if;

  insert into public.product_categories (name, slug)
  values (
    v_category_name,
    regexp_replace(lower(v_category_name), '[^a-z0-9]+', '-', 'g')
  )
  returning * into v_category;

  return query select v_category.id, v_category.name;
end;
$$;

drop function if exists public.create_product_with_options(varchar, text, numeric, integer, boolean, boolean, jsonb, jsonb);
drop function if exists public.update_product_with_options(uuid, varchar, text, numeric, integer, boolean, boolean, jsonb, jsonb);

create or replace function public.create_product_with_options(
  p_name text,
  p_slug text,
  p_description text,
  p_category varchar,
  p_category_id uuid,
  p_base_price numeric,
  p_estimated_days integer,
  p_is_featured boolean,
  p_is_active boolean,
  p_sizes_top jsonb,
  p_sizes_bottom jsonb,
  p_colors jsonb
)
returns table (id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id uuid;
  v_category record;
  v_size jsonb;
  v_color jsonb;
begin
  if exists (select 1 from public.products p where p.slug = trim(p_slug)) then
    raise exception using errcode = '23505', message = 'slug already exists';
  end if;

  select * into v_category from public.resolve_product_category(p_category_id, p_category);

  insert into public.products (
    name,
    slug,
    description,
    category,
    category_id,
    base_price,
    estimated_days,
    is_featured,
    is_active
  )
  values (
    trim(p_name),
    trim(p_slug),
    nullif(trim(coalesce(p_description, '')), ''),
    v_category.category_name,
    v_category.category_id,
    p_base_price,
    p_estimated_days,
    coalesce(p_is_featured, false),
    coalesce(p_is_active, true)
  )
  returning products.id into v_product_id;

  for v_size in select * from jsonb_array_elements(coalesce(p_sizes_top, '[]'::jsonb))
  loop
    insert into public.product_sizes (product_id, size, size_type, price_adjustment)
    values (v_product_id, trim(v_size ->> 'size'), 'top', coalesce((v_size ->> 'price_adjustment')::numeric, 0));
  end loop;

  for v_size in select * from jsonb_array_elements(coalesce(p_sizes_bottom, '[]'::jsonb))
  loop
    insert into public.product_sizes (product_id, size, size_type, price_adjustment)
    values (v_product_id, trim(v_size ->> 'size'), 'bottom', coalesce((v_size ->> 'price_adjustment')::numeric, 0));
  end loop;

  for v_color in select * from jsonb_array_elements(coalesce(p_colors, '[]'::jsonb))
  loop
    insert into public.product_colors (product_id, color_name, color_hex, price_adjustment)
    values (
      v_product_id,
      trim(v_color ->> 'color_name'),
      nullif(trim(coalesce(v_color ->> 'color_hex', '')), ''),
      coalesce((v_color ->> 'price_adjustment')::numeric, 0)
    );
  end loop;

  return query select v_product_id;
end;
$$;

create or replace function public.update_product_with_options(
  p_product_id uuid,
  p_name text,
  p_slug text,
  p_description text,
  p_category varchar,
  p_category_id uuid,
  p_base_price numeric,
  p_estimated_days integer,
  p_is_featured boolean,
  p_is_active boolean,
  p_sizes_top jsonb,
  p_sizes_bottom jsonb,
  p_colors jsonb
)
returns table (id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category record;
  v_size jsonb;
  v_color jsonb;
begin
  if exists (select 1 from public.products p where p.slug = trim(p_slug) and p.id <> p_product_id) then
    raise exception using errcode = '23505', message = 'slug already exists';
  end if;

  select * into v_category from public.resolve_product_category(p_category_id, p_category);

  update public.products
  set
    name = trim(p_name),
    slug = trim(p_slug),
    description = nullif(trim(coalesce(p_description, '')), ''),
    category = v_category.category_name,
    category_id = v_category.category_id,
    base_price = p_base_price,
    estimated_days = p_estimated_days,
    is_featured = coalesce(p_is_featured, false),
    is_active = coalesce(p_is_active, true),
    updated_at = timezone('utc', now())
  where products.id = p_product_id;

  delete from public.product_sizes where product_id = p_product_id;
  delete from public.product_colors where product_id = p_product_id;

  for v_size in select * from jsonb_array_elements(coalesce(p_sizes_top, '[]'::jsonb))
  loop
    insert into public.product_sizes (product_id, size, size_type, price_adjustment)
    values (p_product_id, trim(v_size ->> 'size'), 'top', coalesce((v_size ->> 'price_adjustment')::numeric, 0));
  end loop;

  for v_size in select * from jsonb_array_elements(coalesce(p_sizes_bottom, '[]'::jsonb))
  loop
    insert into public.product_sizes (product_id, size, size_type, price_adjustment)
    values (p_product_id, trim(v_size ->> 'size'), 'bottom', coalesce((v_size ->> 'price_adjustment')::numeric, 0));
  end loop;

  for v_color in select * from jsonb_array_elements(coalesce(p_colors, '[]'::jsonb))
  loop
    insert into public.product_colors (product_id, color_name, color_hex, price_adjustment)
    values (
      p_product_id,
      trim(v_color ->> 'color_name'),
      nullif(trim(coalesce(v_color ->> 'color_hex', '')), ''),
      coalesce((v_color ->> 'price_adjustment')::numeric, 0)
    );
  end loop;

  return query select p_product_id;
end;
$$;


revoke all on function public.create_product_with_options(text, text, text, varchar, uuid, numeric, integer, boolean, boolean, jsonb, jsonb, jsonb) from public;
revoke all on function public.update_product_with_options(uuid, text, text, text, varchar, uuid, numeric, integer, boolean, boolean, jsonb, jsonb, jsonb) from public;

grant execute on function public.create_product_with_options(text, text, text, varchar, uuid, numeric, integer, boolean, boolean, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.update_product_with_options(uuid, text, text, text, varchar, uuid, numeric, integer, boolean, boolean, jsonb, jsonb, jsonb) to authenticated;
