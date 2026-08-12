insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'Atarah',
  'Atarah',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy if not exists public_read_product_images_objects
on storage.objects
for select
to public
using (bucket_id = 'Atarah');

create policy if not exists admins_manage_product_images_objects
on storage.objects
for all
to authenticated
using (
  bucket_id = 'Atarah'
  and public.is_admin()
)
with check (
  bucket_id = 'Atarah'
  and public.is_admin()
);
