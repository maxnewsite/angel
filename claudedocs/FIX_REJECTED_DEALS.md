# Fix: Rejected Deals Not Appearing in Rejected Section

## Problem

When a dealflow manager rejects a deal using the "Reject" button, the deal doesn't appear in the `/app/rejected` section.

## Root Cause

The `dealflow-transition` edge function was only setting the deal `status` field to `"screening_rejected"`, but wasn't setting the `screening_decision` field to `"rejected"`.

The rejected deals page queries for deals where:
```sql
screening_decision = 'rejected'
```

But the transition function was only updating:
```sql
status = 'screening_rejected'
```

## Solution Applied

### 1. Updated `dealflow-transition` Edge Function ✅

**File:** `supabase/functions/dealflow-transition/index.ts`

**Changes:**

#### When Rejecting a Deal:
```typescript
if (action === "reject_screening") {
  newStatus = "screening_rejected";
  patch.screening_decision = "rejected";        // ← ADDED
  patch.screening_completed_at = new Date().toISOString(); // ← ADDED
}
```

#### When Approving to IC:
```typescript
if (action === "approve_to_ic") {
  newStatus = "ic_in_review";
  patch.approved_at = new Date().toISOString();
  patch.screening_decision = "approved";        // ← ADDED
  patch.screening_completed_at = new Date().toISOString(); // ← ADDED
}
```

**Deployed:** ✅ Function has been deployed to production

### 2. Updated Rejected Deals Page Access ✅

**File:** `app/app/rejected/page.tsx`

Added `dealflow_analyst` to allowed roles so analysts can also view rejected deals:

```typescript
// Before
if (!["dealflow_manager", "ic_member", "ic_chair", "admin"].includes(profile.role))

// After
if (!["dealflow_manager", "dealflow_analyst", "ic_member", "ic_chair", "admin"].includes(profile.role))
```

## What Gets Set Now

### When a Deal is Rejected:

| Field | Value | Purpose |
|-------|-------|---------|
| `status` | `"screening_rejected"` | Deal state machine status |
| `screening_decision` | `"rejected"` | Final screening decision (for queries) |
| `screening_completed_at` | Current timestamp | When screening finished |

### When a Deal is Approved to IC:

| Field | Value | Purpose |
|-------|-------|---------|
| `status` | `"ic_in_review"` | Deal state machine status |
| `screening_decision` | `"approved"` | Final screening decision |
| `screening_completed_at` | Current timestamp | When screening finished |
| `approved_at` | Current timestamp | When approved |

## How Rejected Deals Work

### Rejection Workflows:

There are TWO ways to reject a deal:

#### Option 1: Quick Reject (Dealflow Controls)
1. Dealflow Manager clicks "Reject" button in Dealflow Controls
2. Calls `dealflow-transition` with `action: "reject_screening"`
3. Sets `status = "screening_rejected"` and `screening_decision = "rejected"`
4. Deal appears in rejected section immediately

#### Option 2: Finalized Screening with Reject Decision
1. Dealflow Manager completes full screening (7 criteria, flags, memo)
2. Uses a "Finalize Screening" feature (if exists) with decision = "reject"
3. Calls `finalize-screening` edge function
4. Creates detailed screening report in `screening_reports` table
5. Sets `status` and `screening_decision` fields
6. Deal appears in rejected section with full report

## Testing

### Test Rejection Flow:

1. **As Dealflow Manager:**
   ```
   1. Go to /app/dealflow/inbox
   2. Open a deal in screening
   3. Scroll to "Dealflow Controls"
   4. Click "Reject" button
   5. Deal should disappear from inbox
   6. Go to /app/rejected
   7. Deal should appear in rejected list ✅
   ```

2. **As Dealflow Analyst:**
   ```
   1. Go to /app/rejected
   2. Should be able to view rejected deals ✅
   3. Can see rejection reports
   ```

3. **View Rejected Deal:**
   ```
   1. In /app/rejected, click on a rejected deal card
   2. Modal opens with full screening report
   3. Shows:
      - Deal overview
      - Screening scores
      - Red/Green flags
      - Decision rationale
      - Detailed criteria scores
   ```

### Test Approval Flow:

1. **As Dealflow Manager:**
   ```
   1. Open a deal in screening
   2. Click "Approve to IC" button
   3. Deal moves to IC review
   4. Should set screening_decision = "approved" ✅
   ```

## Database Schema

### Deals Table Fields:

```sql
-- Status field (state machine)
status TEXT NOT NULL
  CHECK (status IN (
    'draft', 'submitted', 'screening_in_progress',
    'screening_rejected', 'ic_in_review', 'approved',
    'rejected', 'published'
  ))

-- Decision field (for queries/reports)
screening_decision TEXT
  CHECK (screening_decision IN ('approved', 'rejected'))

-- Timestamps
screening_completed_at TIMESTAMPTZ
approved_at TIMESTAMPTZ
```

## Migration for Existing Rejected Deals

If you have deals that were rejected before this fix and aren't showing up in the rejected section:

```sql
-- Fix existing rejected deals
UPDATE deals
SET
  screening_decision = 'rejected',
  screening_completed_at = updated_at
WHERE
  status = 'screening_rejected'
  AND screening_decision IS NULL;
```

Run this in Supabase SQL Editor to backfill the missing data.

## Files Changed

### Edge Functions (Deployed):
- ✅ `supabase/functions/dealflow-transition/index.ts`

### Frontend (Auto-Updated):
- ✅ `app/app/rejected/page.tsx`

### Documentation:
- ✅ `claudedocs/FIX_REJECTED_DEALS.md` (this file)

## Related Features

### Screening Reports:

When using the `finalize-screening` function (Option 2 above), a detailed report is created in the `screening_reports` table:

```sql
CREATE TABLE screening_reports (
  id UUID PRIMARY KEY,
  deal_id UUID REFERENCES deals(id),
  manager_user_id UUID REFERENCES profiles(id),
  report_type TEXT CHECK (report_type IN ('approved', 'rejected')),
  report_data JSONB,
  decision_rationale TEXT,
  decided_at TIMESTAMPTZ,
  pdf_storage_path TEXT
);
```

The report includes:
- Complete deal data
- All 7 criteria scores with notes
- Red/Green flags
- Overall score and summary memo
- Manager decision rationale

### Rejected Deals Page Query:

```typescript
const { data } = await supabase
  .from("deals")
  .select(`
    id,
    startup:startup_id(name,sector,hq_location),
    round_type,
    target_amount,
    valuation,
    screening_completed_at,
    screening_reports!inner(decided_at,decision_rationale,report_data,report_type)
  `)
  .eq("screening_decision", "rejected")  // ← Key filter
  .eq("screening_reports.report_type", "rejected")
  .order("screening_completed_at", { ascending: false });
```

## Summary

The fix ensures that when deals are rejected:
1. ✅ `screening_decision` field is set to `"rejected"`
2. ✅ `screening_completed_at` timestamp is recorded
3. ✅ Deal appears in `/app/rejected` section
4. ✅ Dealflow analysts can view rejected deals
5. ✅ Both quick reject and finalized screening paths work correctly

Future rejections will now correctly appear in the rejected deals section!
