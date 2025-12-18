# Profile Pictures Setup Guide

Complete guide to set up profile picture upload functionality with Supabase Storage.

## Features

✅ **Profile Picture Upload** - Users can upload profile pictures (JPG, PNG, WebP, GIF)
✅ **Default Avatar** - Beautiful gradient avatar with user's initial if no picture uploaded
✅ **Profile Settings Page** - Dedicated page where users can update all their information
✅ **Profile Menu** - Dropdown menu in header with avatar, name, and profile link
✅ **Onboarding Integration** - Optional avatar upload during registration

## Installation Steps

### Step 1: Apply Database Migration

Run the SQL migration to add the `avatar_url` field:

**Supabase Dashboard → SQL Editor**

```sql
-- Copy and paste from:
supabase/migrations/012_profile_pictures.sql
```

This adds:
- `avatar_url` field to `profiles` table

### Step 2: Create Storage Bucket

**Supabase Dashboard → Storage → Create Bucket**

1. **Bucket name**: `avatars`
2. **Public**: ✅ **CHECKED** (so avatars can be displayed without signed URLs)
3. **File size limit**: `2097152` (2MB in bytes)
4. **Allowed MIME types**: `image/jpeg,image/png,image/webp,image/gif`

Click **Create Bucket**.

### Step 3: Set Up Storage Policies

**Supabase Dashboard → Storage → avatars bucket → Policies**

Create these policies:

#### Policy 1: Public Read Access
```sql
-- Allow anyone to view avatars (public bucket)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

#### Policy 2: Authenticated Users Can Upload
```sql
-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy 3: Users Can Update Own Avatars
```sql
-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy 4: Users Can Delete Own Avatars
```sql
-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Step 4: Test the Feature

1. **Log in** to your app
2. **Click on your profile avatar/name** in the header
3. **Select "Profile Settings"** from dropdown
4. **Upload a picture** in the Profile Picture section
5. **See your avatar** update in the header immediately

## What Was Changed

### New Files Created

**Database Migration**:
- `supabase/migrations/012_profile_pictures.sql` - Adds avatar_url field

**Profile Settings Page**:
- `app/app/profile/page.tsx` - Complete profile management page with:
  - Profile picture upload
  - Basic information editing
  - Investor profile editing
  - Founder profile editing
  - All user data in one place

**Documentation**:
- `PROFILE_PICTURES_SETUP.md` - This file

### Modified Files

**AppShell Component** (`components/AppShell.tsx`):
- ✅ Loads `avatar_url` and `full_name` from profile
- ✅ Shows profile picture or default gradient avatar with initial
- ✅ Profile dropdown menu with:
  - User name and email
  - "Profile Settings" link
  - "Sign Out" button
- ✅ Removed separate "Sign out" button (now in dropdown)

**Onboarding Page** (`app/onboarding/page.tsx`):
- ✅ Added optional profile picture upload in final step
- ✅ Users can skip and add later in profile settings

## Features Overview

### Profile Settings Page

**Location**: `/app/profile`

**Features**:
- **Profile Picture Section**:
  - Shows current avatar or default gradient with initial
  - Upload new picture button
  - Validates image type and size
  - Instant upload to Supabase Storage
  - Updates avatar throughout app immediately

- **Basic Information**:
  - Full name, email (read-only)
  - Phone, location
  - Company, title
  - LinkedIn URL
  - Bio

- **Role-Specific Sections**:
  - **Investors**: Type, accreditation, experience, preferences
  - **Founders**: Experience level, exits, specializations, education

- **Profile Completeness Badge**: Shows completion percentage

### Default Avatar

If no profile picture is uploaded, the system shows a beautiful gradient avatar with the user's initial:
- Uses first letter of full name or email
- Gradient from blue to purple
- Border and shadow for depth
- Consistent with app design

### Profile Menu in Header

**Features**:
- Shows profile picture or default avatar
- Displays user's full name (or email if no name)
- Dropdown with:
  - User info (name, email)
  - Profile Settings link
  - Sign Out button
- Smooth animations and transitions
- Click outside to close

## Usage

### Upload Profile Picture

**Method 1: During Onboarding**
1. Complete registration steps
2. On final step, optionally upload picture
3. Click "Complete Registration"

**Method 2: Profile Settings**
1. Click profile avatar/name in header
2. Select "Profile Settings"
3. Click "Change Picture" in Profile Picture section
4. Select image (JPG, PNG, WebP, or GIF)
5. Image uploads automatically
6. Avatar updates throughout app

### Update Profile Information

1. Click profile avatar/name in header
2. Select "Profile Settings"
3. Edit any field
4. Click "Save Changes"
5. Data updates immediately
6. Profile completeness recalculates automatically

## Technical Details

### File Storage Structure

Avatars are stored in Supabase Storage:
```
avatars/
  ├─ user-id-1-timestamp.jpg
  ├─ user-id-2-timestamp.png
  └─ user-id-3-timestamp.webp
```

**Filename Format**: `{user-id}-{timestamp}.{extension}`

### Upload Process

1. User selects image file
2. Frontend validates:
   - File type is image/*
   - File size < 2MB
3. Upload to Supabase Storage `avatars` bucket
4. Get public URL from Storage
5. Update `profiles.avatar_url` with public URL
6. Avatar refreshes throughout app

### Default Avatar Generation

If `avatar_url` is `null`:
```tsx
<div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
  {fullName?.charAt(0)?.toUpperCase() || email?.charAt(0)?.toUpperCase() || "?"}
</div>
```

### Security

**RLS Policies**:
- ✅ Anyone can view avatars (public bucket)
- ✅ Only authenticated users can upload
- ✅ Users can only upload to their own folder
- ✅ Users can only update/delete their own avatars

**Validation**:
- ✅ File type checked (images only)
- ✅ File size limited to 2MB
- ✅ Authenticated users only
- ✅ Storage policies enforce ownership

## Troubleshooting

### Avatar Not Uploading

**Cause**: Storage bucket not created or policies missing
**Solution**:
- Verify `avatars` bucket exists in Supabase Dashboard → Storage
- Check bucket is marked as Public
- Verify storage policies are created (Step 3)

### Avatar Not Displaying

**Cause**: URL not saved or bucket not public
**Solution**:
- Check `profiles.avatar_url` is populated in database
- Verify bucket is set to Public
- Check browser console for image loading errors

### "Failed to upload" Error

**Cause**: File too large or wrong type
**Solution**:
- Ensure image is < 2MB
- Use JPG, PNG, WebP, or GIF format
- Check storage policies allow INSERT

### Old Avatar Still Showing

**Cause**: Browser caching
**Solution**:
- Refresh page (Cmd/Ctrl + R)
- Clear browser cache
- Avatar filename includes timestamp to prevent caching

### Storage Policy Errors

**Cause**: Policies not created correctly
**Solution**:
- Delete existing policies for `avatars` bucket
- Re-create policies from Step 3
- Ensure policies reference `bucket_id = 'avatars'`

## Testing Checklist

- [ ] Database migration applied (`avatar_url` field exists)
- [ ] Storage bucket created (`avatars`)
- [ ] Bucket set to Public
- [ ] All 4 storage policies created
- [ ] Can access profile settings page (`/app/profile`)
- [ ] Profile menu appears in header
- [ ] Default avatar shows with correct initial
- [ ] Can upload JPG image
- [ ] Can upload PNG image
- [ ] Upload rejects files > 2MB
- [ ] Upload rejects non-image files
- [ ] Avatar updates in header immediately
- [ ] Avatar shows in profile menu
- [ ] Can edit and save profile information
- [ ] Profile completeness updates correctly
- [ ] Sign out works from dropdown
- [ ] Mobile responsive design works

## Next Steps

After setup:
1. Customize avatar sizes for different contexts
2. Add image cropping/resizing tool
3. Add avatar preview before upload
4. Consider CDN for avatar delivery
5. Add avatar moderation (if needed)
6. Track avatar upload metrics

## Support

For issues:
1. Check Supabase Storage logs (Dashboard → Storage → Logs)
2. Check browser console for errors
3. Verify storage policies are correct
4. Ensure bucket is marked as Public
5. Test with different image types/sizes
