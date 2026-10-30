-- ELECTROCREDIT: ejecutar este archivo en Supabase > SQL Editor.
-- Crea el perfil de administrador y los permisos de catálogo y fotografías.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  category text not null,
  price numeric(12,2) not null check (price >= 0),
  old_price numeric(12,2) check (old_price is null or old_price >= 0),
  badge text,
  description text,
  features text[] not null default '{}',
  images text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_electrocredit_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_admin = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles
for select to authenticated using (id = (select auth.uid()));

drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products" on public.products
for select to anon, authenticated using (is_active = true or public.is_electrocredit_admin());

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products" on public.products
for insert to authenticated with check (public.is_electrocredit_admin());

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products" on public.products
for update to authenticated using (public.is_electrocredit_admin()) with check (public.is_electrocredit_admin());

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products" on public.products
for delete to authenticated using (public.is_electrocredit_admin());

-- Bucket público: los visitantes pueden ver fotos; solo administradores suben o borran.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('electrocredit-products', 'electrocredit-products', true, 8388608,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 8388608;

drop policy if exists "Anyone can view Electrocredit product photos" on storage.objects;
create policy "Anyone can view Electrocredit product photos" on storage.objects
for select to anon, authenticated
using (bucket_id = 'electrocredit-products');

drop policy if exists "Admins can upload Electrocredit product photos" on storage.objects;
create policy "Admins can upload Electrocredit product photos" on storage.objects
for insert to authenticated
with check (bucket_id = 'electrocredit-products' and public.is_electrocredit_admin());

drop policy if exists "Admins can update Electrocredit product photos" on storage.objects;
create policy "Admins can update Electrocredit product photos" on storage.objects
for update to authenticated
using (bucket_id = 'electrocredit-products' and public.is_electrocredit_admin())
with check (bucket_id = 'electrocredit-products' and public.is_electrocredit_admin());

drop policy if exists "Admins can delete Electrocredit product photos" on storage.objects;
create policy "Admins can delete Electrocredit product photos" on storage.objects
for delete to authenticated
using (bucket_id = 'electrocredit-products' and public.is_electrocredit_admin());

-- NOTA: después de crear el usuario en Authentication, ejecuta:
-- update public.profiles set is_admin = true where id = 'UUID_DEL_USUARIO';
