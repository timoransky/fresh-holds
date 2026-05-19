-- Photos attached to user-submitted reset suggestions. The file lives in
-- the `reset-photos` storage bucket; we only store the object path here so
-- the admin can generate a signed URL on demand.

alter table reset_submissions
  add column photo_path text;

-- Private bucket — admins read via signed URLs, owners can read their own.
insert into storage.buckets (id, name, public)
values ('reset-photos', 'reset-photos', false)
on conflict (id) do nothing;

-- Authenticated users can upload only under submissions/<their uid>/...
create policy "reset photos insert own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'reset-photos'
    and (storage.foldername(name))[1] = 'submissions'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Owner can read their own uploads (so the profile page can show them later
-- if we want it). Admins can read everything.
create policy "reset photos read own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'reset-photos'
    and (storage.foldername(name))[1] = 'submissions'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "reset photos read admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'reset-photos'
    and exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
