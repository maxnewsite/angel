# Quick Fix for Column Name Error

## Error You're Getting
```
ERROR: column "founder_user_id" does not exist
HINT: Perhaps you meant to reference the column "startups.owner_user_id"
```

## Solution

Your existing database uses `owner_user_id` instead of `founder_user_id`. I've created a corrected incremental migration that works with your existing schema.

## Steps to Fix

### 1. Run the Incremental Migration

Go to **Supabase Dashboard → SQL Editor** and run this file:
```
supabase/migrations/002_incremental_update.sql
```

This migration will:
- ✅ Add missing columns to existing tables (`created_by`, `submitted_at`)
- ✅ Create screening tables (`screening_criteria`, `screening_scores`, `screening_reviews`)
- ✅ Create supporting tables (`deal_assignments`, `activity_log`, `watchlists`)
- ✅ Set up all RLS policies
- ✅ Seed the 7 default screening criteria
- ✅ Create performance indexes

**Important**: This migration is safe to run multiple times - it uses `IF NOT EXISTS` checks.

### 2. Deploy Edge Functions

Run these commands from your project root:

```bash
supabase functions deploy dealflow-transition
supabase functions deploy ic-vote
supabase functions deploy ic-chair-decision
supabase functions deploy deal-assign
supabase functions deploy admin-set-role
```

### 3. Verify the Setup

After running the migration, run this verification query in SQL Editor:

```sql
SELECT
  'screening_criteria' as table_name,
  COUNT(*) as row_count
FROM screening_criteria
UNION ALL
SELECT 'screening_scores', COUNT(*) FROM screening_scores
UNION ALL
SELECT 'screening_reviews', COUNT(*) FROM screening_reviews;
```

You should see:
- `screening_criteria`: 7 rows (the default criteria)
- `screening_scores`: 0 rows (will fill up as managers screen deals)
- `screening_reviews`: 0 rows (will fill up as managers submit reviews)

## What Was Fixed

### 1. Column Name Mismatches
- Changed `founder_user_id` → `owner_user_id` throughout
- Added missing `created_by` column to `startups` and `deals` tables
- Added missing `submitted_at` column to `deals` table

### 2. Edge Function Issues
- Fixed `dealflow-transition` function to use correct imports and patterns
- Fixed `ic-vote` status check from `ic_review` → `ic_in_review`
- Created missing `_shared/util.ts` helper file

### 3. Screening Functionality
- Added `ScreeningEditor` component to deal detail page (was hidden before)
- Now visible to dealflow managers and admins
- Properly integrated with 7 criteria scoring system

## Testing the Fix

### Test Dealflow Transitions

1. **Create a test deal** as a founder (or use existing deal in "submitted" status)

2. **As dealflow manager**, go to the deal page at `/app/deals/[deal-id]`

3. **Test transitions**:
   - Click "Start screening" → should change status to `screening_in_progress`
   - Click "Approve to IC" → should change status to `ic_in_review`
   - Click "Reject (screening)" → should change status to `screening_rejected`

### Test Screening with 7 Criteria

1. **On deal detail page** (as dealflow manager), you should now see "Screening (7 criteria)" card

2. **Score each criterion** using the sliders (1-5)

3. **Add optional notes** for each criterion

4. **Select decision**: Approve / Needs info / Reject

5. **Write summary memo** (optional)

6. **Click "Save screening"** → should save successfully

7. **Reload page** → scores and decision should persist

## Files Modified

✅ `supabase/functions/_shared/util.ts` - Created (helper functions)
✅ `supabase/functions/dealflow-transition/index.ts` - Fixed
✅ `supabase/functions/ic-vote/index.ts` - Fixed status check
✅ `supabase/migrations/001_dealflow_schema.sql` - Updated column names
✅ `supabase/migrations/002_incremental_update.sql` - **New incremental migration**
✅ `app/app/deals/[id]/page.tsx` - Added ScreeningEditor component

## Troubleshooting

### If you still get column errors:

1. Check which columns exist in your `startups` table:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'startups';
```

2. Check which columns exist in your `deals` table:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'deals';
```

3. If columns are still missing, run the ALTER TABLE commands manually:
```sql
ALTER TABLE startups ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
```

### If edge functions fail:

Check the logs:
- Dashboard → Edge Functions → [function name] → Logs
- Look for specific error messages

### If screening criteria don't appear:

Verify they were seeded:
```sql
SELECT * FROM screening_criteria WHERE is_active = true;
```

Should return 7 rows.

## Next Steps After Fix

Once everything is working:

1. ✅ Assign deals to dealflow managers using the `deal-assign` edge function
2. ✅ Screen deals using the 7 criteria system
3. ✅ Transition approved deals to IC review
4. ✅ IC members vote on deals
5. ✅ IC chair makes final decision and publishes

---

**Questions?** Check the full setup guide in `SUPABASE_SETUP.md` or the Supabase dashboard logs for detailed error messages.
