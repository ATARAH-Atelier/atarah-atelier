create extension if not exists pgcrypto;

create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select p.role from public.profiles p where p.id = auth.uid()), 'customer')::text;
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_profile_role() in ('admin', 'seller');
$$;

alter table if exists public.customers
  add column if not exists auth_user_id uuid references auth.users (id) on delete set null;

create unique index if not exists customers_auth_user_id_key
  on public.customers (auth_user_id)
  where auth_user_id is not null;

alter table if exists public.orders
  add column if not exists seller_profile_id uuid references public.profiles (id) on delete set null,
  add column if not exists source text default 'public';

create index if not exists orders_seller_profile_id_idx on public.orders (seller_profile_id);

create table if not exists public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  amount numeric not null check (amount > 0),
  paid_at timestamptz not null default timezone('utc', now()),
  payment_method text,
  notes text,
  recorded_by_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists order_payments_order_id_idx on public.order_payments (order_id);
create index if not exists order_payments_paid_at_idx on public.order_payments (paid_at desc);

create or replace function public.recalculate_order_payment_totals(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric := 0;
  v_paid numeric := 0;
begin
  select coalesce(total, 0)
    into v_total
  from public.orders
  where id = p_order_id;

  select coalesce(sum(amount), 0)
    into v_paid
  from public.order_payments
  where order_id = p_order_id;

  update public.orders
  set
    paid_amount = v_paid,
    balance = greatest(v_total - v_paid, 0),
    updated_at = timezone('utc', now())
  where id = p_order_id;
end;
$$;

create or replace function public.handle_order_payment_totals_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_order_payment_totals(old.order_id);
    return old;
  end if;

  perform public.recalculate_order_payment_totals(new.order_id);
  return new;
end;
$$;

drop trigger if exists order_payments_recalculate_totals on public.order_payments;
create trigger order_payments_recalculate_totals
after insert or update or delete on public.order_payments
for each row execute function public.handle_order_payment_totals_trigger();

create or replace function public.handle_auth_user_profile_bootstrap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := 'customer';
  v_name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1));
  v_phone text := nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '\D', '', 'g'), '');
begin
  insert into public.profiles (id, full_name, role, created_at)
  values (
    new.id,
    left(v_name, 150),
    'customer',
    coalesce(new.created_at, timezone('utc', now()))
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    role = case when public.profiles.role = 'admin' then public.profiles.role else excluded.role end;

  if v_role = 'customer' and to_regclass('public.customers') is not null then
    begin
    insert into public.customers (auth_user_id, full_name, phone, email)
    values (
      new.id,
      left(v_name, 150),
      v_phone,
      nullif(trim(coalesce(new.email, '')), '')
    )
    on conflict (auth_user_id) do update
    set
      full_name = excluded.full_name,
      phone = coalesce(excluded.phone, public.customers.phone),
      email = coalesce(excluded.email, public.customers.email),
      updated_at = timezone('utc', now());
    exception
      when others then
        raise notice 'No se pudo crear customer para auth user %: %', new.id, sqlerrm;
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_profile_bootstrap on auth.users;
create trigger on_auth_user_profile_bootstrap
after insert on auth.users
for each row execute function public.handle_auth_user_profile_bootstrap();

create or replace function public.create_guest_order(
  p_checkout_token uuid,
  p_customer jsonb,
  p_delivery_method text,
  p_requested_date date,
  p_notes text,
  p_preferred_contact_method text,
  p_items jsonb,
  p_customer_auth_user_id uuid default null
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

  if p_customer_auth_user_id is not null then
    select id into v_customer_id
    from public.customers
    where auth_user_id = p_customer_auth_user_id
    limit 1;
  end if;

  if v_customer_id is null then
    select id into v_customer_id
    from public.customers
    where regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_phone
    limit 1;
  end if;

  if v_customer_id is null then
    insert into public.customers (auth_user_id, full_name, phone, email, city, state, address)
    values (
      p_customer_auth_user_id,
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
      auth_user_id = coalesce(p_customer_auth_user_id, auth_user_id),
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
    checkout_token,
    source
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
    p_checkout_token,
    'public'
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

revoke all on function public.create_guest_order(uuid, jsonb, text, date, text, text, jsonb, uuid) from public;
grant execute on function public.create_guest_order(uuid, jsonb, text, date, text, text, jsonb, uuid) to anon, authenticated;

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
  p_paid_at timestamptz default null
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
  v_result record;
  v_status text := coalesce(nullif(trim(p_order_status), ''), 'pending');
begin
  if not public.is_staff() then
    raise exception 'not authorized';
  end if;

  select *
    into v_result
  from public.create_guest_order(
    p_checkout_token,
    p_customer,
    p_delivery_method,
    p_requested_date,
    p_notes,
    p_preferred_contact_method,
    p_items,
    p_customer_auth_user_id
  )
  limit 1;

  update public.orders
  set
    seller_profile_id = auth.uid(),
    source = 'staff',
    status = v_status,
    updated_at = timezone('utc', now())
  where id = v_result.order_id;

  if v_status <> 'pending' then
    insert into public.order_status_history (order_id, status, new_status, created_at)
    values (v_result.order_id, v_status, v_status, timezone('utc', now()));
  end if;

  if coalesce(p_initial_payment_amount, 0) > 0 then
    insert into public.order_payments (
      order_id,
      amount,
      paid_at,
      payment_method,
      notes,
      recorded_by_profile_id
    )
    values (
      v_result.order_id,
      p_initial_payment_amount,
      coalesce(p_paid_at, timezone('utc', now())),
      nullif(trim(coalesce(p_initial_payment_method, '')), ''),
      nullif(trim(coalesce(p_initial_payment_notes, '')), ''),
      auth.uid()
    );
  end if;

  return query
  select o.id, o.order_number::text, o.total, o.status::text, o.created_at
  from public.orders o
  where o.id = v_result.order_id;
end;
$$;

revoke all on function public.create_staff_order(uuid, jsonb, text, date, text, text, jsonb, uuid, text, numeric, text, text, timestamptz) from public;
grant execute on function public.create_staff_order(uuid, jsonb, text, date, text, text, jsonb, uuid, text, numeric, text, text, timestamptz) to authenticated;

alter table if exists public.profiles enable row level security;
alter table if exists public.customers enable row level security;
alter table if exists public.orders enable row level security;
alter table if exists public.order_payments enable row level security;

drop policy if exists staff_read_profiles on public.profiles;
create policy staff_read_profiles on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_staff());

drop policy if exists staff_manage_profiles on public.profiles;
create policy staff_manage_profiles on public.profiles
for insert to authenticated
with check (public.current_profile_role() = 'admin');

drop policy if exists staff_update_profiles on public.profiles;
create policy staff_update_profiles on public.profiles
for update to authenticated
using (public.current_profile_role() = 'admin' or id = auth.uid())
with check (public.current_profile_role() = 'admin' or id = auth.uid());

drop policy if exists staff_read_customers on public.customers;
create policy staff_read_customers on public.customers
for select to authenticated
using (public.is_staff() or auth_user_id = auth.uid());

drop policy if exists staff_update_customers on public.customers;
create policy staff_update_customers on public.customers
for update to authenticated
using (public.is_staff() or auth_user_id = auth.uid())
with check (public.is_staff() or auth_user_id = auth.uid());

drop policy if exists customer_insert_customers on public.customers;
create policy customer_insert_customers on public.customers
for insert to authenticated
with check (public.is_staff() or auth_user_id = auth.uid());

drop policy if exists staff_read_orders on public.orders;
create policy staff_read_orders on public.orders
for select to authenticated
using (public.is_staff() or exists (
  select 1
  from public.customers c
  where c.id = orders.customer_id
    and c.auth_user_id = auth.uid()
));

drop policy if exists staff_update_orders on public.orders;
create policy staff_update_orders on public.orders
for update to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists staff_read_order_payments on public.order_payments;
create policy staff_read_order_payments on public.order_payments
for select to authenticated
using (public.is_staff());

drop policy if exists staff_insert_order_payments on public.order_payments;
create policy staff_insert_order_payments on public.order_payments
for insert to authenticated
with check (public.is_staff());

drop policy if exists staff_update_order_payments on public.order_payments;
create policy staff_update_order_payments on public.order_payments
for update to authenticated
using (public.is_staff())
with check (public.is_staff());


