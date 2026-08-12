-- Public catalog policies, checkout idempotency and guest order RPCs.

alter table if exists public.orders
  add column if not exists subtotal numeric,
  add column if not exists paid_amount numeric default 0,
  add column if not exists balance numeric default 0,
  add column if not exists delivery_method text,
  add column if not exists preferred_contact_method text,
  add column if not exists notes text,
  add column if not exists checkout_token uuid;

alter table if exists public.customers
  add column if not exists address text,
  add column if not exists updated_at timestamptz default timezone('utc', now());

create unique index if not exists orders_checkout_token_key on public.orders (checkout_token);
create sequence if not exists public.order_number_seq;

create or replace function public.next_order_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next bigint;
begin
  v_next := nextval('public.order_number_seq');
  return 'ATA-' || lpad(v_next::text, 6, '0');
end;
$$;

create or replace function public.create_guest_order(
  p_checkout_token uuid,
  p_customer jsonb,
  p_delivery_method text,
  p_requested_date date,
  p_notes text,
  p_preferred_contact_method text,
  p_items jsonb
)
returns table (
  order_id uuid,
  order_number text,
  total numeric,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.orders;
  v_customer_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_total numeric := 0;
  v_subtotal numeric := 0;
  v_item jsonb;
  v_product public.products;
  v_top_size public.product_sizes;
  v_bottom_size public.product_sizes;
  v_color public.product_colors;
  v_unit_price numeric;
  v_line_total numeric;
  v_phone text;
  v_email text;
  v_quantity integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then
    raise exception 'invalid items';
  end if;

  if p_checkout_token is null then
    raise exception 'missing checkout token';
  end if;

  select * into v_existing from public.orders where checkout_token = p_checkout_token;

  if found then
    return query
    select v_existing.id, v_existing.order_number::text, coalesce(v_existing.total, 0), v_existing.status::text, v_existing.created_at;
    return;
  end if;

  v_phone := regexp_replace(coalesce(p_customer ->> 'phone', ''), '\D', '', 'g');
  v_email := nullif(trim(coalesce(p_customer ->> 'email', '')), '');

  if length(v_phone) <> 11 then
    raise exception 'invalid phone';
  end if;

  select id into v_customer_id
  from public.customers
  where regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_phone
  limit 1;

  if v_customer_id is null then
    insert into public.customers (full_name, phone, email, city, state, address)
    values (
      left(trim(coalesce(p_customer ->> 'full_name', '')), 150),
      v_phone,
      v_email,
      left(trim(coalesce(p_customer ->> 'city', '')), 120),
      nullif(left(trim(coalesce(p_customer ->> 'state', '')), 120), ''),
      left(trim(coalesce(p_customer ->> 'address', '')), 250)
    )
    returning id into v_customer_id;
  else
    update public.customers
    set
      full_name = left(trim(coalesce(p_customer ->> 'full_name', full_name)), 150),
      phone = v_phone,
      email = v_email,
      city = left(trim(coalesce(p_customer ->> 'city', city)), 120),
      state = nullif(left(trim(coalesce(p_customer ->> 'state', state)), 120), ''),
      address = left(trim(coalesce(p_customer ->> 'address', address)), 250),
      updated_at = timezone('utc', now())
    where id = v_customer_id;
  end if;

  v_order_number := public.next_order_number();

  insert into public.orders (
    order_number,
    customer_id,
    status,
    subtotal,
    total,
    paid_amount,
    balance,
    requested_date,
    delivery_method,
    preferred_contact_method,
    notes,
    checkout_token
  )
  values (
    v_order_number,
    v_customer_id,
    'pending',
    0,
    0,
    0,
    0,
    p_requested_date,
    p_delivery_method,
    p_preferred_contact_method,
    nullif(left(trim(coalesce(p_notes, '')), 1000), ''),
    p_checkout_token
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := coalesce((v_item ->> 'quantity')::integer, 0);

    if v_quantity < 1 or v_quantity > 20 then
      raise exception 'invalid quantity';
    end if;

    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
      and is_active = true;

    if not found then
      raise exception 'inactive product';
    end if;

    v_unit_price := coalesce(v_product.base_price, 0);

    if v_item ? 'selected_top_size_id' and nullif(v_item ->> 'selected_top_size_id', '') is not null then
      select * into v_top_size
      from public.product_sizes
      where id = (v_item ->> 'selected_top_size_id')::uuid
        and product_id = v_product.id
        and size_type = 'top';

      if not found then
        raise exception 'invalid top size';
      end if;

      v_unit_price := v_unit_price + coalesce(v_top_size.price_adjustment, 0);
    else
      v_top_size := null;
    end if;

    if v_item ? 'selected_bottom_size_id' and nullif(v_item ->> 'selected_bottom_size_id', '') is not null then
      select * into v_bottom_size
      from public.product_sizes
      where id = (v_item ->> 'selected_bottom_size_id')::uuid
        and product_id = v_product.id
        and size_type = 'bottom';

      if not found then
        raise exception 'invalid bottom size';
      end if;

      v_unit_price := v_unit_price + coalesce(v_bottom_size.price_adjustment, 0);
    else
      v_bottom_size := null;
    end if;

    if v_item ? 'selected_color_id' and (v_item ->> 'selected_color_id') is not null and (v_item ->> 'selected_color_id') <> '' then
      select * into v_color
      from public.product_colors
      where id = (v_item ->> 'selected_color_id')::uuid
        and product_id = v_product.id;

      if not found then
        raise exception 'invalid color';
      end if;

      v_unit_price := v_unit_price + coalesce(v_color.price_adjustment, 0);
    else
      v_color := null;
    end if;

    v_line_total := v_unit_price * v_quantity;
    v_subtotal := v_subtotal + v_line_total;

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      product_name_snapshot,
      blouse_size,
      pants_size,
      color_name,
      color_hex,
      quantity,
      unit_price,
      subtotal,
      total,
      line_total,
      notes,
      created_at
    )
    values (
      v_order_id,
      v_product.id,
      v_product.name,
      v_product.name,
      case when v_top_size.id is not null then v_top_size.size else null end,
      case when v_bottom_size.id is not null then v_bottom_size.size else null end,
      case when v_color.id is not null then v_color.color_name else null end,
      case when v_color.id is not null then v_color.color_hex else null end,
      v_quantity,
      v_unit_price,
      v_line_total,
      v_line_total,
      v_line_total,
      nullif(left(trim(coalesce(v_item ->> 'notes', '')), 500), ''),
      timezone('utc', now())
    );
  end loop;

  v_total := v_subtotal;

  update public.orders
  set
    subtotal = v_subtotal,
    total = v_total,
    paid_amount = coalesce(paid_amount, 0),
    balance = v_total - coalesce(paid_amount, 0),
    updated_at = timezone('utc', now())
  where id = v_order_id;

  insert into public.order_status_history (order_id, status, new_status, created_at)
  values (v_order_id, 'pending', 'pending', timezone('utc', now()));

  return query
  select o.id, o.order_number::text, o.total, o.status::text, o.created_at
  from public.orders o
  where o.id = v_order_id;
end;
$$;

create or replace function public.get_guest_order_status(
  p_order_number text,
  p_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_phone text;
  v_items jsonb;
  v_timeline jsonb;
begin
  v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  select o.*
  into v_order
  from public.orders o
  join public.customers c on c.id = o.customer_id
  where o.order_number = trim(p_order_number)
    and regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') = v_phone
  limit 1;

  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'product_name_snapshot', oi.product_name_snapshot,
    'blouse_size', oi.blouse_size,
    'pants_size', oi.pants_size,
    'color_name', oi.color_name,
    'color_hex', oi.color_hex,
    'quantity', oi.quantity,
    'unit_price', oi.unit_price,
    'line_total', oi.line_total,
    'notes', oi.notes
  ) order by oi.created_at), '[]'::jsonb)
  into v_items
  from public.order_items oi
  where oi.order_id = v_order.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'status', osh.status,
    'created_at', osh.created_at
  ) order by osh.created_at), '[]'::jsonb)
  into v_timeline
  from public.order_status_history osh
  where osh.order_id = v_order.id;

  if jsonb_array_length(v_timeline) = 0 then
    v_timeline := jsonb_build_array(jsonb_build_object('status', v_order.status, 'created_at', v_order.created_at));
  end if;

  return jsonb_build_object(
    'order_number', v_order.order_number,
    'status', v_order.status,
    'total', coalesce(v_order.total, 0),
    'paid_amount', coalesce(v_order.paid_amount, 0),
    'balance', coalesce(v_order.balance, 0),
    'requested_date', v_order.requested_date,
    'delivery_method', v_order.delivery_method,
    'created_at', v_order.created_at,
    'updated_at', v_order.updated_at,
    'items', v_items,
    'timeline', v_timeline
  );
end;
$$;

alter table public.products enable row level security;
alter table public.product_sizes enable row level security;
alter table public.product_colors enable row level security;
alter table public.product_images enable row level security;

drop policy if exists public_read_active_products on public.products;
create policy public_read_active_products on public.products
for select to anon, authenticated
using (is_active = true);

drop policy if exists public_read_active_product_sizes on public.product_sizes;
create policy public_read_active_product_sizes on public.product_sizes
for select to anon, authenticated
using (exists (select 1 from public.products p where p.id = product_sizes.product_id and p.is_active = true));

drop policy if exists public_read_active_product_colors on public.product_colors;
create policy public_read_active_product_colors on public.product_colors
for select to anon, authenticated
using (exists (select 1 from public.products p where p.id = product_colors.product_id and p.is_active = true));

drop policy if exists public_read_active_product_images on public.product_images;
create policy public_read_active_product_images on public.product_images
for select to anon, authenticated
using (exists (select 1 from public.products p where p.id = product_images.product_id and p.is_active = true));

revoke all on function public.create_guest_order(uuid, jsonb, text, date, text, text, jsonb) from public;
revoke all on function public.get_guest_order_status(text, text) from public;
grant execute on function public.create_guest_order(uuid, jsonb, text, date, text, text, jsonb) to anon, authenticated;
grant execute on function public.get_guest_order_status(text, text) to anon, authenticated;
