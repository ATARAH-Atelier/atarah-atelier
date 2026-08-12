-- Fix para el error despues de confirmar correo:
-- "No fue posible validar el perfil de la cuenta."
-- Ejecutar en Supabase SQL Editor.

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

-- Quita policies antiguas o recursivas sobre profiles.
drop policy if exists profiles_read_own_or_staff on public.profiles;
drop policy if exists profiles_insert_own_customer on public.profiles;
drop policy if exists profiles_insert_own_or_admin on public.profiles;
drop policy if exists profiles_update_own_or_admin on public.profiles;
drop policy if exists staff_read_profiles on public.profiles;
drop policy if exists staff_manage_profiles on public.profiles;
drop policy if exists staff_update_profiles on public.profiles;

-- El cliente puede leer su propio perfil. Admin/vendedor puede leer perfiles para pedidos.
create policy profiles_read_own_or_staff on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_staff());

-- El cliente autenticado puede crear su propio perfil si el trigger no lo hizo.
-- Admin puede crear perfiles de vendedores.
create policy profiles_insert_own_or_admin on public.profiles
for insert to authenticated
with check ((id = auth.uid() and role = 'customer') or public.current_profile_role() = 'admin');

-- El cliente puede completar su nombre. Admin puede administrar perfiles.
create policy profiles_update_own_or_admin on public.profiles
for update to authenticated
using (id = auth.uid() or public.current_profile_role() = 'admin')
with check (id = auth.uid() or public.current_profile_role() = 'admin');

-- Recupera perfiles faltantes para usuarios ya creados en Auth.
insert into public.profiles (id, full_name, role, created_at)
select
  users.id,
  left(coalesce(nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(users.email, ''), '@', 1), 'Cliente Atarah'), 150),
  case when users.raw_user_meta_data ->> 'role' in ('admin', 'seller') then users.raw_user_meta_data ->> 'role' else 'customer' end,
  coalesce(users.created_at, timezone('utc', now()))
from auth.users users
where not exists (
  select 1
  from public.profiles profiles
  where profiles.id = users.id
);
