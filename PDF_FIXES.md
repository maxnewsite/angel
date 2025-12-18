# PDF Visibility and Status Transition Fixes

## Issues Fixed

### 1. PDF Not Visible to Dealflow Managers ✅
**Problem**: Dealflow managers couldn't see uploaded PDFs
**Root Cause**: Missing documents table and storage policies in incremental migration

### 2. Invalid Transition Error ✅
**Problem**: "Invalid transition: deal must be in screening_in_progress or submitted status"
**Root Cause**: Deals table has default status='draft', but transitions didn't allow 'draft' status

## Changes Made

### 1. Updated Migration: `supabase/migrations/002_incremental_update.sql`

Added missing components:

- **Documents Table**: Created with IF NOT EXISTS (using TEXT with CHECK constraint to avoid enum transaction issues)
  ```sql
  CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'investors', 'public')),
    uploaded_by_user_id UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- **RLS Policies for Documents**:
  - Founders can manage their own deal docs
  - Internal roles (dealflow_manager, IC members, admins) can view all documents
  - Investors can view published documents

- **Storage Bucket Policies**:
  - Creates `deal-docs` bucket (if not exists)
  - Allows authenticated users to upload
  - Allows internal roles to download all files
  - Allows founders to download their own files

### 2. Updated Edge Function: `supabase/functions/dealflow-transition/index.ts`

**Changed**: All transition actions now accept "draft" status in addition to previous statuses

- `start_screening`: Now allows "submitted" OR "draft"
- `approve_to_ic`: Now allows "screening_in_progress", "submitted", OR "draft"
- `reject_screening`: Now allows "screening_in_progress", "submitted", OR "draft"

## Deployment Steps

### Step 1: Deploy Updated Migration

```bash
# In Supabase SQL Editor, run the updated migration
supabase/migrations/002_incremental_update.sql
```

This will:
- Create documents table with TEXT visibility column (if missing)
- Add RLS policies for documents
- Create deal-docs storage bucket (if missing)
- Add storage policies for file access
- Enable dealflow managers to view PDFs

**Note**: The migration uses TEXT with CHECK constraint instead of enum type to avoid PostgreSQL transaction issues with enum values

### Step 2: Redeploy Dealflow Transition Function

```bash
# From project root
supabase functions deploy dealflow-transition
```

This will deploy the updated transition logic that accepts "draft" status.

### Step 3: Verify Setup

**Check Documents Table**:
```sql
-- Should show documents table and count
SELECT 'documents' as table_name, COUNT(*) as row_count FROM documents;
```

**Check RLS Policies**:
```sql
-- Should show 3 policies for documents
SELECT policyname FROM pg_policies WHERE tablename = 'documents';
```

**Check Storage Bucket**:
- Dashboard → Storage → Should see "deal-docs" bucket

**Check Storage Policies**:
```sql
-- Should show 2 policies for storage.objects
SELECT policyname FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
AND policyname LIKE '%files%';
```

### Step 4: Test the Flow

1. **As Founder**:
   - Create new deal at `/app/founder/deals/new`
   - Upload pitch deck PDF
   - Submit deal
   - Verify deal is created

2. **As Dealflow Manager**:
   - Go to `/app/dealflow/inbox`
   - Click on the deal
   - **Verify PDF is visible** in Data room section
   - Click "Start screening" button
   - **Verify no error** - should transition to "screening_in_progress"
   - Use "AI Screen Pitch Deck" button (optional)
   - Click "Approve to IC" or "Reject (screening)"
   - **Verify no error** - should transition successfully

## Expected Behavior After Fixes

### PDF Visibility
- ✅ Founders can upload PDFs when creating deals
- ✅ Dealflow managers can see all uploaded PDFs
- ✅ Dealflow managers can download PDFs
- ✅ IC members and admins can access all PDFs
- ✅ Storage is secured with RLS policies

### Status Transitions
- ✅ "Start screening" works from "draft" or "submitted" status
- ✅ "Approve to IC" works from "draft", "submitted", or "screening_in_progress"
- ✅ "Reject (screening)" works from "draft", "submitted", or "screening_in_progress"
- ✅ No more "Invalid transition" errors for new deals

## Troubleshooting

### Issue: Still can't see PDFs

**Check**:
1. Run the migration in Supabase SQL Editor
2. Verify documents table exists: `SELECT * FROM documents;`
3. Verify storage policies exist: Check Supabase Dashboard → Storage → deal-docs → Policies
4. Check user role: Only internal roles can view documents

**Fix**:
```sql
-- Manually verify documents table RLS is enabled
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Manually create storage bucket if needed
INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-docs', 'deal-docs', false)
ON CONFLICT (id) DO NOTHING;
```

### Issue: Still getting transition errors

**Check**:
1. Verify edge function was redeployed: `supabase functions list`
2. Check function logs: `supabase functions logs dealflow-transition`
3. Verify deal status: `SELECT id, status FROM deals WHERE id = 'deal-id';`

**Fix**:
```bash
# Redeploy the function
supabase functions deploy dealflow-transition

# Check deployment status
supabase functions list
```

### Issue: Old deals still have status="draft"

**This is expected** - Deals created before the fix will have "draft" status.

**Options**:
1. **Use them as-is**: The transitions now accept "draft" status
2. **Update manually**:
   ```sql
   UPDATE deals SET status = 'submitted', submitted_at = NOW()
   WHERE status = 'draft';
   ```

## Summary

Both issues are now fixed:

1. **PDF visibility**: Added complete documents infrastructure (table, RLS, storage policies)
2. **Status transitions**: Made transitions permissive to "draft" status

After deploying the migration and edge function, the complete dealflow should work smoothly from deal creation → PDF upload → screening → IC review.
