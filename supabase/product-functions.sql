create or replace function public.create_product_with_options(
  p_name varchar,
  p_slug varchar,
  p_description text,
  p_category varchar,
  p_base_price numeric,
  p_estimated_days integer,
  p_is_featured boolean,
  p_is_active boolean,
  p_sizes_top jsonb default '[]'::jsonb,
  p_sizes_bottom jsonb default '[]'::jsonb,
  p_colors jsonb default '[]'::jsonb
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products;
  v_size jsonb;
  v_color jsonb;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if exists (select 1 from public.products where slug = p_slug) then
    raise exception using errcode = '23505', message = 'slug already exists';
  end if;

  insert into public.products (
    name,
    slug,
    description,
    category,
    base_price,
    estimated_days,
    is_featured,
    is_active
  )
  values (
    trim(p_name),
    trim(p_slug),
    nullif(trim(coalesce(p_description, '')), ''),
    trim(p_category),
    p_base_price,
    p_estimated_days,
    p_is_featured,
    p_is_active
  )
  returning * into v_product;

  for v_size in select * from jsonb_array_elements(coalesce(p_sizes_top, '[]'::jsonb))
  loop
    insert into public.product_sizes (product_id, size, size_type, price_adjustment)
    values (
      v_product.id,
      trim(v_size ->> 'size'),
      'top',
      coalesce((v_size ->> 'price_adjustment')::numeric, 0)
    );
  end loop;

  for v_size in select * from jsonb_array_elements(coalesce(p_sizes_bottom, '[]'::jsonb))
  loop
    insert into public.product_sizes (product_id, size, size_type, price_adjustment)
    values (
      v_product.id,
      trim(v_size ->> 'size'),
      'bottom',
      coalesce((v_size ->> 'price_adjustment')::numeric, 0)
    );
  end loop;

  for v_color in select * from jsonb_array_elements(coalesce(p_colors, '[]'::jsonb))
  loop
    insert into public.product_colors (product_id, color_name, color_hex, price_adjustment)
    values (
      v_product.id,
      trim(v_color ->> 'color_name'),
      upper(trim(v_color ->> 'color_hex')),
      coalesce((v_color ->> 'price_adjustment')::numeric, 0)
    );
  end loop;

  return v_product;
end;
$$;

create or replace function public.update_product_with_options(
  p_product_id uuid,
  p_name varchar,
  p_slug varchar,
  p_description text,
  p_category varchar,
  p_base_price numeric,
  p_estimated_days integer,
  p_is_featured boolean,
  p_is_active boolean,
  p_sizes_top jsonb default '[]'::jsonb,
  p_sizes_bottom jsonb default '[]'::jsonb,
  p_colors jsonb default '[]'::jsonb
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products;
  v_size jsonb;
  v_color jsonb;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if exists (
    select 1
    from public.products
    where slug = p_slug
      and id <> p_product_id
  ) then
    raise exception using errcode = '23505', message = 'slug already exists';
  end if;

  update public.products
  set
    name = trim(p_name),
    slug = trim(p_slug),
    description = nullif(trim(coalesce(p_description, '')), ''),
    category = trim(p_category),
    base_price = p_base_price,
    estimated_days = p_estimated_days,
    is_featured = p_is_featured,
    is_active = p_is_active,
    updated_at = timezone('utc', now())
  where products.id = p_product_id
  returning * into v_product;

  if not found then
    raise exception 'Product not found';
  end if;

  delete from public.product_sizes where product_id = p_product_id;
  delete from public.product_colors where product_id = p_product_id;

  for v_size in select * from jsonb_array_elements(coalesce(p_sizes_top, '[]'::jsonb))
  loop
    insert into public.product_sizes (product_id, size, size_type, price_adjustment)
    values (
      v_product.id,
      trim(v_size ->> 'size'),
      'top',
      coalesce((v_size ->> 'price_adjustment')::numeric, 0)
    );
  end loop;

  for v_size in select * from jsonb_array_elements(coalesce(p_sizes_bottom, '[]'::jsonb))
  loop
    insert into public.product_sizes (product_id, size, size_type, price_adjustment)
    values (
      v_product.id,
      trim(v_size ->> 'size'),
      'bottom',
      coalesce((v_size ->> 'price_adjustment')::numeric, 0)
    );
  end loop;

  for v_color in select * from jsonb_array_elements(coalesce(p_colors, '[]'::jsonb))
  loop
    insert into public.product_colors (product_id, color_name, color_hex, price_adjustment)
    values (
      v_product.id,
      trim(v_color ->> 'color_name'),
      upper(trim(v_color ->> 'color_hex')),
      coalesce((v_color ->> 'price_adjustment')::numeric, 0)
    );
  end loop;

  return v_product;
end;
$$;

revoke all on function public.create_product_with_options(varchar, varchar, text, varchar, numeric, integer, boolean, boolean, jsonb, jsonb, jsonb) from public;
revoke all on function public.update_product_with_options(uuid, varchar, varchar, text, varchar, numeric, integer, boolean, boolean, jsonb, jsonb, jsonb) from public;

grant execute on function public.create_product_with_options(varchar, varchar, text, varchar, numeric, integer, boolean, boolean, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.update_product_with_options(uuid, varchar, varchar, text, varchar, numeric, integer, boolean, boolean, jsonb, jsonb, jsonb) to authenticated;
