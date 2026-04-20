-- =====================================================
-- Phase 4: Storage Setup for Letter Photos
-- =====================================================

-- 1. Create the storage bucket 'letter-photos' (if not exists)
insert into storage.buckets (id, name, public)
values ('letter-photos', 'letter-photos', false) -- Private bucket (authenticated only)
on conflict (id) do nothing;

-- 2. Drop existing policies to avoid conflicts (Safe to run multiple times)
drop policy if exists "Authenticated Users can upload letters" on storage.objects;
drop policy if exists "Users can view own letter photos" on storage.objects;
drop policy if exists "Users can update own letter photos" on storage.objects;
drop policy if exists "Users can delete own letter photos" on storage.objects;

-- 3. Create Policies for 'letter-photos' bucket

-- Allow uploads from authenticated users
create policy "Authenticated Users can upload letters"
  on storage.objects for insert
  with check (
    bucket_id = 'letter-photos'
    and auth.role() = 'authenticated'
  );

-- Allow users to view their own photos (Since it's private, we need explicit select policy)
-- Note: 'owner' column in storage.objects is usually the user's UUID.
create policy "Users can view own letter photos"
  on storage.objects for select
  using (
    bucket_id = 'letter-photos'
    and auth.uid() = owner
  );

-- Allow users to update their own photos
create policy "Users can update own letter photos"
  on storage.objects for update
  using (
    bucket_id = 'letter-photos'
    and auth.uid() = owner
  );

-- Allow users to delete their own photos
create policy "Users can delete own letter photos"
  on storage.objects for delete
  using (
    bucket_id = 'letter-photos'
    and auth.uid() = owner
  );

-- Note: No "Public Access" policy because letters are private.
