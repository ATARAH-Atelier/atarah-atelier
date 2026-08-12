-- Fix de registro de usuarios para Atarah Atelier.
-- Ejecutar en Supabase SQL Editor si el registro falla con errores vacios tipo {}.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default 'Cliente Atarah',
  role text not null default 'customer' check (role in ('admin', 'seller', 'customer')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.customers
  add column if not exists auth_user_id uuid references auth.users (id) on delete set null;

create unique index if not exists customers_auth_user_id_key
  on public.customers (auth_user_id)
  where auth_user_id is not null;

create or replace function public.handle_auth_user_profile_bootstrap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := 'customer';
  v_name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1), 'Cliente Atarah');
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

  -- La ficha de customer ayuda a autocompletar pedidos, pero no debe impedir crear el usuario.
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

alter table public.profiles enable row level security;

drop policy if exists profiles_read_own_or_staff on public.profiles;
drop policy if exists staff_read_profiles on public.profiles;
create policy profiles_read_own_or_staff on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_staff());

drop policy if exists profiles_insert_own_customer on public.profiles;
drop policy if exists staff_manage_profiles on public.profiles;
create policy profiles_insert_own_or_admin on public.profiles
for insert to authenticated
with check ((id = auth.uid() and role = 'customer') or public.current_profile_role() = 'admin');

drop policy if exists profiles_update_own_or_admin on public.profiles;
drop policy if exists staff_update_profiles on public.profiles;
create policy profiles_update_own_or_admin on public.profiles
for update to authenticated
using (id = auth.uid() or public.current_profile_role() = 'admin')
with check (id = auth.uid() or public.current_profile_role() = 'admin');

