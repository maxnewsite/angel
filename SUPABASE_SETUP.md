# Supabase Dealflow System Setup Guide

This guide walks you through setting up the complete dealflow management system in Supabase.

## Prerequisites

- Supabase project created
- Supabase CLI installed (`npm install -g supabase`)
- Project linked to Supabase (`supabase link --project-ref YOUR_PROJECT_REF`)

## Step 1: Deploy Database Schema

### Option A: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy the entire contents of `supabase/migrations/001_dealflow_schema.sql`
4. Run the query
5. Verify all tables are created by checking the Table Editor

### Option B: Using Supabase CLI

```bash
# From the project root directory
supabase db push
```

This will apply the migration file automatically.

## Step 2: Deploy Edge Functions

All edge functions need to be deployed to Supabase. Run these commands from your project root:

```bash
# Deploy dealflow-transition function
supabase functions deploy dealflow-transition

# Deploy ic-vote function
supabase functions deploy ic-vote

# Deploy ic-chair-decision function
supabase functions deploy ic-chair-decision

# Deploy deal-assign function
supabase functions deploy deal-assign

# Deploy admin-set-role function
supabase functions deploy admin-set-role
```

### Verify Edge Functions

1. Go to Supabase Dashboard → Edge Functions
2. Confirm all 5 functions are listed and deployed
3. Check that each function has JWT verification enabled (this should be automatic from config.toml)

## Step 3: Set Up Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `deal-docs`
3. **Important:** Set the bucket as **private** (not public)
4. Configure storage policies:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'deal-docs');

-- Allow users to download files based on document visibility
CREATE POLICY "Users can download accessible files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deal-docs' AND
  (
    -- Internal roles can access all files
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
    OR
    -- Investors can access files for published deals
    EXISTS (
      SELECT 1 FROM documents
      JOIN deals ON deals.id = documents.deal_id
      WHERE documents.storage_path = storage.objects.name
      AND documents.visibility IN ('investors', 'public')
      AND deals.status = 'published'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'investor'
      )
    )
    OR
    -- Founders can access their own deal files
    EXISTS (
      SELECT 1 FROM documents
      JOIN deals ON deals.id = documents.deal_id
      JOIN startups ON startups.id = deals.startup_id
      WHERE documents.storage_path = storage.objects.name
      AND startups.owner_user_id = auth.uid()
    )
  )
);
```

## Step 4: Configure Environment Variables

Ensure your `.env.local` file has the correct Supabase variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Step 5: Create Admin User

After deploying, you need to create at least one admin user:

1. Sign up a new user through your application
2. Go to Supabase Dashboard → Authentication → Users
3. Find the user and copy their UUID
4. Go to SQL Editor and run:

```sql
UPDATE profiles
SET role = 'admin'
WHERE id = 'USER_UUID_HERE';
```

## Step 6: Verify Deployment

### Test Edge Functions

You can test each edge function using curl or through your application:

```bash
# Test dealflow-transition (requires authentication token)
curl -X POST \
  https://your-project.supabase.co/functions/v1/dealflow-transition \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deal_id": "some-uuid", "action": "start_screening"}'
```

### Test Database

1. Go to Table Editor
2. Verify these tables exist:
   - `profiles`
   - `startups`
   - `deals`
   - `screening_criteria` (should have 7 default rows)
   - `screening_scores`
   - `screening_reviews`
   - `ic_votes`
   - `ic_decisions`
   - `deal_assignments`
   - `interests`
   - `documents`
   - `activity_log`
   - `watchlists`

### Test RLS Policies

1. Try accessing the application with different user roles
2. Verify:
   - Founders can only see their own deals
   - Dealflow managers can see all deals in screening
   - IC members can see deals in IC review
   - Investors can only see published deals

## Troubleshooting

### Edge Function Errors

**Error: "Invalid Payload"**
- Ensure you're sending the correct JSON payload
- Check that `deal_id` and `action` fields are present
- Verify the JWT token is valid and not expired

**Error: "Unauthorized" or "Forbidden"**
- Check user role in `profiles` table
- Verify RLS policies are correctly set up
- Ensure JWT token includes user ID

**Error: "Deal not found"**
- Verify the deal exists in the `deals` table
- Check RLS policies allow the user to access that deal

### Database Errors

**Error: Table does not exist**
- Re-run the migration script
- Check for SQL errors in Supabase logs

**Error: RLS policy prevents access**
- Review RLS policies for the specific table
- Verify user role is correct in `profiles` table
- Check that auth.uid() returns the expected user ID

### Storage Errors

**Error: Cannot upload files**
- Verify `deal-docs` bucket exists and is private
- Check storage policies are correctly configured
- Ensure user is authenticated

## System Architecture

### Deal Status Flow

```
draft → submitted → screening_in_progress → ic_in_review → published
                         ↓                        ↓
                  screening_rejected        ic_rejected
```

### User Roles

- **admin**: Full system access
- **dealflow_manager**: Can screen deals and transition statuses
- **ic_member**: Can vote on deals in IC review
- **ic_chair**: Can make final IC decisions and publish deals
- **investor**: Can view published deals and express interest
- **founder**: Can create startups and submit deals

### Screening Criteria (Default 7)

1. **Market Opportunity** (weight: 1.5)
2. **Team Quality** (weight: 2.0)
3. **Product/Technology** (weight: 1.5)
4. **Traction** (weight: 2.0)
5. **Business Model** (weight: 1.0)
6. **Competition** (weight: 1.0)
7. **Valuation** (weight: 1.0)

Overall score is calculated as: `Σ(weight × score) / Σ(weight)`

## Next Steps

1. ✅ Deploy database schema
2. ✅ Deploy all edge functions
3. ✅ Set up storage bucket
4. ✅ Create admin user
5. ✅ Test dealflow transitions
6. ✅ Verify screening functionality with 7 criteria
7. Create test deals and run through complete flow

## Support

If you encounter issues:
1. Check Supabase logs (Dashboard → Logs)
2. Verify edge function logs (Dashboard → Edge Functions → [function] → Logs)
3. Test database queries directly in SQL Editor
4. Check browser console for frontend errors
