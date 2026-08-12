alter table if exists public.profiles
  add column if not exists is_active boolean not null default true,
  add column if not exists email text,
  add column if not exists phone text;

create index if not exists profiles_role_is_active_idx
  on public.profiles (role, is_active);