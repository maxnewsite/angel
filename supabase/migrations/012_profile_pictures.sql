-- Profile Pictures & Avatar Support
-- Add avatar_url field to profiles table

-- ============================================================================
-- ADD AVATAR FIELD TO PROFILES
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ============================================================================
-- CREATE STORAGE BUCKET FOR PROFILE PICTURES
-- ============================================================================

-- Create storage bucket for avatars (run this in Supabase Dashboard → Storage)
-- Bucket name: 'avatars'
-- Public: true (so avatars can be displayed without signed URLs)
-- File size limit: 2MB
-- Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

-- Note: You need to create the bucket manually in Supabase Dashboard
-- Then apply these policies via SQL

-- Storage policies for avatars bucket
-- These will be created after bucket is set up

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN profiles.avatar_url IS 'URL to user profile picture in Supabase Storage (avatars bucket)';
