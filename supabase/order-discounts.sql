create extension if not exists pgcrypto;

create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text,
  type text not null check (type in ('fixed', 'percentage')),
  value numeric not null check (value > 0),
  min_order_amount numeric not null default 0,
  usage_limit integer,
  uses_count integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists discount_codes_code_key on public.discount_codes (upper(code));

alter table if exists public.orders
  add column if not exists discount_code_id uuid references public.discount_codes (id) on delete set null,
  add column if not exists discount_code text,
  add column if not exists discount_amount numeric not null default 0;

create index if not exists orders_discount_code_id_idx on public.orders (discount_code_id);

create or replace function public.compute_discount_for_order(
  p_discount_code text,
  p_subtotal numeric
)
returns table (
  discount_code_id uuid,
  discount_code text,
  discount_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_discount public.discount_codes;
  v_now timestamptz := timezone('utc', now());
  v_discount_amount numeric := 0;
begin
  if nullif(trim(coalesce(p_discount_code, '')), '') is null then
    return query select null::uuid, null::text, 0::numeric;
    return;
  end if;

  select * into v_discount
  from public.discount_codes
  where upper(code) = upper(trim(p_discount_code))
  limit 1;

  if not found then
    raise exception 'discount code not found';
  end if;

  if not coalesce(v_discount.is_active, false) then
    raise exception 'discount code inactive';
  end if;

  if v_discount.starts_at is not null and v_discount.starts_at > v_now then
    raise exception 'discount code inactive';
  end if;

  if v_discount.ends_at is not null and v_discount.ends_at < v_now then
    raise exception 'discount code inactive';
  end if;

  if p_subtotal < coalesce(v_discount.min_order_amount, 0) then
    raise exception 'discount minimum not met';
  end if;

  if v_discount.usage_limit is not null and coalesce(v_discount.uses_count, 0) >= v_discount.usage_limit then
    raise exception 'discount usage limit reached';
  end if;

  if v_discount.type = 'percentage' then
    v_discount_amount := round(greatest(0, p_subtotal * (v_discount.value / 100.0))::numeric, 2);
  else
    v_discount_amount := round(least(p_subtotal, greatest(0, v_discount.value))::numeric, 2);
  end if;

  return query select v_discount.id, upper(v_discount.code), least(p_subtotal, v_discount_amount) as discount_amount;
end;
$$;

create or replace function public.create_guest_order(
  p_checkout_token uuid,
  p_customer jsonb,
  p_delivery_method text,
  p_requested_date date,
  p_notes text,
  p_preferred_contact_method text,
  p_items jsonb,
  p_customer_auth_user_id uuid default null,
  p_discount_code text default null
)
returns table (
  order_id uuid,
  order_number text,
  subtotal numeric,
  discount_amount numeric,
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
  v_discount_amount numeric := 0;
  v_discount_code_id uuid;
  v_discount_code_normalized text;
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
    select v_existing.id, v_existing.order_number::text, coalesce(v_existing.subtotal, 0), coalesce(v_existing.discount_amount, 0), coalesce(v_existing.total, 0), v_existing.status::text, v_existing.created_at;
    return;
  end if;

  v_phone := regexp_replace(coalesce(p_customer ->> 'phone', ''), '\D', '', 'g');
  v_email := nullif(trim(coalesce(p_customer ->> 'email', '')), '');

  if length(v_phone) <> 11 then
    raise exception 'invalid phone';
  end if;

  if p_customer_auth_user_id is not null then
    select id into v_customer_id from public.customers where auth_user_id = p_customer_auth_user_id limit 1;
  end if;

  if v_customer_id is null then
    select id into v_customer_id from public.customers where regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_phone limit 1;
  end if;

  if v_customer_id is null then
    insert into public.customers (auth_user_id, full_name, phone, email, city, state, address)
    values (p_customer_auth_user_id, left(trim(coalesce(p_customer ->> 'full_name', '')), 150), v_phone, v_email, left(trim(coalesce(p_customer ->> 'city', '')), 120), nullif(left(trim(coalesce(p_customer ->> 'state', '')), 120), ''), left(trim(coalesce(p_customer ->> 'address', '')), 250))
    returning id into v_customer_id;
  else
    update public.customers
    set auth_user_id = coalesce(p_customer_auth_user_id, auth_user_id), full_name = left(trim(coalesce(p_customer ->> 'full_name', full_name)), 150), phone = v_phone, email = v_email, city = left(trim(coalesce(p_customer ->> 'city', city)), 120), state = nullif(left(trim(coalesce(p_customer ->> 'state', state)), 120), ''), address = left(trim(coalesce(p_customer ->> 'address', address)), 250), updated_at = timezone('utc', now())
    where id = v_customer_id;
  end if;

  v_order_number := public.next_order_number();

  insert into public.orders (order_number, customer_id, status, subtotal, total, paid_amount, balance, requested_date, delivery_method, preferred_contact_method, notes, checkout_token, source, discount_amount)
  values (v_order_number, v_customer_id, 'pending', 0, 0, 0, 0, p_requested_date, p_delivery_method, p_preferred_contact_method, nullif(left(trim(coalesce(p_notes, '')), 1000), ''), p_checkout_token, 'public', 0)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := coalesce((v_item ->> 'quantity')::integer, 0);

    if v_quantity < 1 or v_quantity > 20 then
      raise exception 'invalid quantity';
    end if;

    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid and is_active = true;
    if not found then raise exception 'inactive product'; end if;

    v_unit_price := coalesce(v_product.base_price, 0);

    if v_item ? 'selected_top_size_id' and nullif(v_item ->> 'selected_top_size_id', '') is not null then
      select * into v_top_size from public.product_sizes where id = (v_item ->> 'selected_top_size_id')::uuid and product_id = v_product.id and size_type = 'top';
      if not found then raise exception 'invalid top size'; end if;
      v_unit_price := v_unit_price + coalesce(v_top_size.price_adjustment, 0);
    else
      v_top_size := null;
    end if;

    if v_item ? 'selected_bottom_size_id' and nullif(v_item ->> 'selected_bottom_size_id', '') is not null then
      select * into v_bottom_size from public.product_sizes where id = (v_item ->> 'selected_bottom_size_id')::uuid and product_id = v_product.id and size_type = 'bottom';
      if not found then raise exception 'invalid bottom size'; end if;
      v_unit_price := v_unit_price + coalesce(v_bottom_size.price_adjustment, 0);
    else
      v_bottom_size := null;
    end if;

    if v_item ? 'selected_color_id' and nullif(v_item ->> 'selected_color_id', '') is not null then
      select * into v_color from public.product_colors where id = (v_item ->> 'selected_color_id')::uuid and product_id = v_product.id;
      if not found then raise exception 'invalid color'; end if;
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

  select computed.discount_code_id, computed.discount_code, computed.discount_amount into v_discount_code_id, v_discount_code_normalized, v_discount_amount
  from public.compute_discount_for_order(p_discount_code, v_subtotal) as computed;

  v_total := greatest(0, v_subtotal - coalesce(v_discount_amount, 0));

  update public.orders
  set subtotal = v_subtotal, total = v_total, paid_amount = coalesce(paid_amount, 0), balance = v_total - coalesce(paid_amount, 0), discount_code_id = v_discount_code_id, discount_code = v_discount_code_normalized, discount_amount = coalesce(v_discount_amount, 0), updated_at = timezone('utc', now())
  where id = v_order_id;

  if v_discount_code_id is not null then
    update public.discount_codes set uses_count = coalesce(uses_count, 0) + 1, updated_at = timezone('utc', now()) where id = v_discount_code_id;
  end if;

  insert into public.order_status_history (order_id, status, new_status, created_at) values (v_order_id, 'pending', 'pending', timezone('utc', now()));

  return query select o.id, o.order_number::text, coalesce(o.subtotal, 0), coalesce(o.discount_amount, 0), o.total, o.status::text, o.created_at from public.orders o where o.id = v_order_id;
end;
$$;

create or replace function public.create_staff_order(
  p_checkout_token uuid,
  p_customer jsonb,
  p_delivery_method text,
  p_requested_date date,
  p_notes text,
  p_preferred_contact_method text,
  p_items jsonb,
  p_customer_auth_user_id uuid default null,
  p_order_status text default 'pending',
  p_initial_payment_amount numeric default 0,
  p_initial_payment_method text default null,
  p_initial_payment_notes text default null,
  p_paid_at timestamptz default null,
  p_discount_code text default null
)
returns table (
  order_id uuid,
  order_number text,
  subtotal numeric,
  discount_amount numeric,
  total numeric,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result record;
  v_status text := coalesce(nullif(trim(p_order_status), ''), 'pending');
begin
  if not public.is_staff() then
    raise exception 'not authorized';
  end if;

  select * into v_result
  from public.create_guest_order(p_checkout_token, p_customer, p_delivery_method, p_requested_date, p_notes, p_preferred_contact_method, p_items, p_customer_auth_user_id, p_discount_code)
  limit 1;

  update public.orders
  set seller_profile_id = auth.uid(), source = 'staff', status = v_status, updated_at = timezone('utc', now())
  where id = v_result.order_id;

  if v_status <> 'pending' then
    insert into public.order_status_history (order_id, status, new_status, created_at)
    values (v_result.order_id, v_status, v_status, timezone('utc', now()));
  end if;

  if coalesce(p_initial_payment_amount, 0) > 0 then
    insert into public.order_payments (order_id, amount, paid_at, payment_method, notes, recorded_by_profile_id)
    values (v_result.order_id, p_initial_payment_amount, coalesce(p_paid_at, timezone('utc', now())), nullif(trim(coalesce(p_initial_payment_method, '')), ''), nullif(trim(coalesce(p_initial_payment_notes, '')), ''), auth.uid());
  end if;

  return query select o.id, o.order_number::text, coalesce(o.subtotal, 0), coalesce(o.discount_amount, 0), o.total, o.status::text, o.created_at from public.orders o where o.id = v_result.order_id;
end;
$$;
