# Database Constraints Reference

## Deal Status Enum Values

**Column:** `deals.status` (TEXT)
**Valid Values:**
- `draft`
- `submitted`
- `screening_in_progress`
- `screening_rejected`
- `ic_in_review`
- `published`

## Screening Decision Values

**Column:** `deals.screening_decision` (TEXT)
**Constraint:** `CHECK (screening_decision IN ('approved', 'rejected'))`
**Valid Values:**
- `approved` - Deal approved to IC
- `rejected` - Deal rejected during screening

**⚠️ IMPORTANT:** Use `"approved"` not `"approve"`, and `"rejected"` not `"reject"`

## Report Type Values

**Column:** `screening_reports.report_type` (TEXT)
**Constraint:** `CHECK (report_type IN ('approved', 'rejected'))`
**Valid Values:**
- `approved` - Report for approved deals
- `rejected` - Report for rejected deals

**⚠️ IMPORTANT:** Use `"approved"` not `"approve"`, and `"rejected"` not `"reject"`

## Screening Review Decision

**Column:** `screening_reviews.decision` (TEXT)
**Constraint:** `CHECK (decision IN ('approve', 'needs_info', 'reject'))`
**Valid Values:**
- `approve` - Recommend approval
- `needs_info` - Needs more information
- `reject` - Recommend rejection

**Note:** This table uses `"approve"`/`"reject"` (without 'd'), different from other tables!

## Document Visibility

**Column:** `documents.visibility` (TEXT)
**Constraint:** `CHECK (visibility IN ('internal', 'investors', 'public'))`
**Valid Values:**
- `internal` - Internal team only
- `investors` - Visible to investors
- `public` - Publicly visible

## Flag Types

**Column:** `yc_flags_catalog.flag_type` (TEXT)
**Constraint:** `CHECK (flag_type IN ('green', 'red'))`
**Valid Values:**
- `green` - Positive indicator
- `red` - Warning/concern

## Common Mistakes to Avoid

❌ **Wrong:**
```typescript
screening_decision: "approve"  // Missing 'd'
screening_decision: "reject"   // Missing 'ed'
report_type: "approve"         // Missing 'd'
status: "screening"            // Should be "screening_in_progress"
status: "ic_review"            // Should be "ic_in_review"
```

✅ **Correct:**
```typescript
screening_decision: "approved"
screening_decision: "rejected"
report_type: "approved"
status: "screening_in_progress"
status: "ic_in_review"
```

## Code Pattern for Mapping

When accepting user input (e.g., "approve" or "reject"), map to database values:

```typescript
// User provides: "approve" or "reject"
const finalDecision = "approve"; // from user

// Map to database constraint
const dbDecision = finalDecision === "approve" ? "approved" : "rejected";

// Use in insert/update
await supabase
  .from("deals")
  .update({
    screening_decision: dbDecision,  // "approved" or "rejected"
  });
```

## Verification Queries

Check constraint violations:
```sql
-- See all constraints on a table
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'deals';

-- Check for invalid values
SELECT id, screening_decision
FROM deals
WHERE screening_decision NOT IN ('approved', 'rejected')
  AND screening_decision IS NOT NULL;
```
