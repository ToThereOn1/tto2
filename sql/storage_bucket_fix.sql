-- 1. Create the storage bucket 'pet-photos' (if not exists)
insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', true)
on conflict (id) do nothing;

-- 2. Drop existing policies to avoid conflicts (Safe to run multiple times)
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated Users can upload" on storage.objects;
drop policy if exists "Users can update own photos" on storage.objects;
drop policy if exists "Users can delete own photos" on storage.objects;

-- 3. Re-create Policies
-- Note: We skip 'alter table storage.objects enable row level security' as it requires superuser permissions
-- and is usually enabled by default in Supabase.

create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'pet-photos' );

create policy "Authenticated Users can upload"
  on storage.objects for insert
  with check (
    bucket_id = 'pet-photos'
    and auth.role() = 'authenticated'
  );

create policy "Users can update own photos"
  on storage.objects for update
  using (
    bucket_id = 'pet-photos'
    and auth.uid() = owner
  );

create policy "Users can delete own photos"
  on storage.objects for delete
  using (
    bucket_id = 'pet-photos'
    and auth.uid() = owner
  );
