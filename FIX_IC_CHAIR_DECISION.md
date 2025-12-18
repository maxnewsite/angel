# Fix IC Chair Decision Error

## Problem
IC Chair gets error: "new row for relation 'ic_decisions' violates check constraint 'ic_decisions_decision_check'"

## Root Cause
The `ic_decisions` table has a CHECK constraint that doesn't allow the values the frontend is sending ("recommended", "rejected", "published").

## Solution

### Step 1: Check Current Constraint
Run this in Supabase SQL Editor to see what constraint exists:

```sql
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'ic_decisions'
  AND con.contype = 'c';
```

### Step 2: Fix the Constraint
Run this SQL to fix it:

```sql
-- Drop existing constraint (if any)
ALTER TABLE ic_decisions DROP CONSTRAINT IF EXISTS ic_decisions_decision_check;

-- Add correct constraint
ALTER TABLE ic_decisions ADD CONSTRAINT ic_decisions_decision_check
  CHECK (decision IN ('recommended', 'rejected', 'published'));
```

### Step 3: Verify
After running the SQL, try the IC chair decision again. It should work now.

## Alternative: Remove Constraint Entirely (If Above Fails)

If the constraint name is different, run this to find and drop it:

```sql
-- Find all constraints on ic_decisions
SELECT conname
FROM pg_constraint
WHERE conrelid = 'ic_decisions'::regclass
  AND contype = 'c';
```

Then drop it by name:
```sql
ALTER TABLE ic_decisions DROP CONSTRAINT <constraint_name_from_above>;
```

Then add the correct one:
```sql
ALTER TABLE ic_decisions ADD CONSTRAINT ic_decisions_decision_check
  CHECK (decision IN ('recommended', 'rejected', 'published'));
```

## Expected Values
After the fix, these values will be accepted:
- ✅ `recommended` - IC chair recommends the deal
- ✅ `rejected` - IC chair rejects the deal
- ✅ `published` - IC chair recommends AND publishes to investors (sets status = published)

## Test
1. Log in as IC chair
2. Go to a deal in IC review
3. Select "Recommend"
4. Check "Publish now"
5. Add rationale
6. Click "Save decision"
7. Should see success message ✅
