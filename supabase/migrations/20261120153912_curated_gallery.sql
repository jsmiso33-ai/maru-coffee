insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', true, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists gallery_read on storage.objects;
create policy gallery_read on storage.objects for select to anon, authenticated
using (bucket_id = 'gallery');

drop policy if exists gallery_publish on storage.objects;
create policy gallery_publish on storage.objects for insert to authenticated
with check (bucket_id = 'gallery' and (select public.is_admin()));

drop policy if exists gallery_remove on storage.objects;
create policy gallery_remove on storage.objects for delete to authenticated
using (bucket_id = 'gallery' and (select public.is_admin()));

create or replace view public.gallery_photos with (security_invoker = true) as
select name, created_at, user_metadata->>'caption' as caption
from storage.objects where bucket_id = 'gallery';

grant select on public.gallery_photos to anon, authenticated;
