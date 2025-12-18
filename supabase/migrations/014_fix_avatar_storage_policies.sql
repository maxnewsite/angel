-- Fix Avatar Storage Policies
-- Resolves: "Failed to upload avatar: new row violates row-level security policy"

-- ============================================================================
-- STORAGE POLICIES FOR AVATARS BUCKET
-- ============================================================================

-- First, ensure the bucket exists (this is safe to run even if bucket exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DROP EXISTING POLICIES (if any)
-- ============================================================================
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

-- ============================================================================
-- CREATE STORAGE POLICIES - SIMPLE APPROACH
-- ============================================================================
-- Any authenticated user can upload/update/delete avatars
-- Anyone can view avatars (public bucket)

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- ============================================================================
-- ALTERNATIVE: USER-SPECIFIC FOLDER POLICIES (more restrictive)
-- ============================================================================
-- Uncomment these if you want users to only access their own folder

-- DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;

-- CREATE POLICY "Users can upload own avatar"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'avatars' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- );

-- CREATE POLICY "Users can update own avatar"
-- ON storage.objects FOR UPDATE
-- TO authenticated
-- USING (
--   bucket_id = 'avatars' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- )
-- WITH CHECK (
--   bucket_id = 'avatars' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- );

-- CREATE POLICY "Users can delete own avatar"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--   bucket_id = 'avatars' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- );

-- ============================================================================
-- VERIFY POLICIES
-- ============================================================================
-- Run this to verify policies were created:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
