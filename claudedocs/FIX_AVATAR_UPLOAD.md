# Fix Avatar Upload Issue

## Problem
Users getting error: "Failed to upload avatar: new row violates row-level security policy"

## Root Cause
The `avatars` storage bucket exists but has no RLS (Row Level Security) policies configured, preventing uploads.

## Solution

### Step 1: Apply Database Migration

Run the migration in your Supabase SQL Editor:

```sql
-- File: supabase/migrations/014_fix_avatar_storage_policies.sql
-- This creates the avatars bucket and sets up proper RLS policies
```

Or using Supabase CLI:
```bash
supabase db push
```

### Step 2: Verify Bucket Exists

1. Go to Supabase Dashboard → Storage
2. Check if `avatars` bucket exists
3. If not, the migration will create it automatically
4. Bucket should be set to **Public** (so avatars can be viewed without auth)

### Step 3: Verify Policies Were Created

Run this in Supabase SQL Editor:

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%avatar%';
```

You should see 4 policies:
- ✅ "Authenticated users can upload avatars" (INSERT)
- ✅ "Authenticated users can update avatars" (UPDATE)
- ✅ "Authenticated users can delete avatars" (DELETE)
- ✅ "Public can view avatars" (SELECT)

### Step 4: Test Avatar Upload

1. Log in to your app
2. Navigate to `/app/profile`
3. Click "Change Picture"
4. Select an image (JPG, PNG, WebP, or GIF, max 2MB)
5. Upload should now work! ✅

## What Changed

### Database Migration (`014_fix_avatar_storage_policies.sql`)
- Creates `avatars` bucket if it doesn't exist
- Sets bucket to public
- Adds 4 storage policies for upload/update/delete/view

### Profile Upload Code (`app/app/profile/page.tsx`)
- Changed file path structure from `filename.ext` to `{uid}/filename.ext`
- Now stores avatars in user-specific folders
- Better organization and future-proof for user-specific policies

### Auth Page (`app/auth/page.tsx`)
- Removed admin bootstrap message
- Cleaner UI

## Storage Structure

Avatars are now stored as:
```
avatars/
  └── {user-id}/
      └── avatar-{timestamp}.{ext}
```

Example:
```
avatars/
  └── 550e8400-e29b-41d4-a716-446655440000/
      └── avatar-1703123456789.jpg
```

## Security

**Current Setup (Simple):**
- Any authenticated user can upload to avatars bucket
- Anyone can view avatars (public bucket)
- Simple and works for most use cases

**Alternative (More Restrictive):**
If you want users to only access their own folder, uncomment the alternative policies in the migration file. This ensures:
- Users can only upload to their own folder (`{uid}/...`)
- Users can only update/delete their own avatars
- Still allows public viewing

## Troubleshooting

**Problem:** Still getting RLS error after migration
- **Fix 1:** Check if policies were created using the SQL query above
- **Fix 2:** Make sure you're logged in (check session)
- **Fix 3:** Try dropping all policies and re-running migration

**Problem:** "Bucket not found" error
- **Fix:** Create bucket manually in Supabase Dashboard → Storage
  - Name: `avatars`
  - Public: ✅ Yes
  - Then re-run migration

**Problem:** Image uploads but doesn't display
- **Fix:** Make sure bucket is set to Public
- **Fix:** Check the avatar_url in profiles table is correct
- **Fix:** Open Network tab and check if image URL returns 200

**Problem:** "File too large" error
- **Fix:** Image must be less than 2MB
- **Fix:** Compress image before uploading
- Supported formats: JPG, PNG, WebP, GIF

## Manual Setup (Alternative)

If you prefer to set up manually instead of migration:

### 1. Create Bucket
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);
```

### 2. Create Policies
```sql
-- Upload policy
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Update policy
CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- Delete policy
CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- View policy
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

## Complete! 🎉

Users should now be able to:
- ✅ Upload profile pictures
- ✅ Update their pictures
- ✅ View their pictures
- ✅ Delete old pictures

The admin bootstrap message has also been removed from the sign-in page.
