# Fix Login Infinite Recursion Error

## Problem
After adding the portfolio view, login fails with error:
```
infinite recursion detected in policy for relation "profiles"
```

## Root Cause
The RLS policy in migration `006_portfolio_access.sql` created infinite recursion by querying the `profiles` table within a policy on the `profiles` table itself.

## Immediate Fix

**Run this SQL in Supabase SQL Editor NOW:**

```sql
-- Drop the problematic policy
DROP POLICY IF EXISTS "Internal roles can view all profiles" ON profiles;
```

That's it! Login should work immediately after running this.

## What Happened

The problematic policy looked like this:
```sql
CREATE POLICY "Internal roles can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p  -- ❌ This queries profiles INSIDE a profiles policy!
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );
```

This creates infinite recursion:
1. User tries to SELECT from profiles
2. Policy checks by SELECTing from profiles
3. That SELECT triggers the policy again
4. Loop forever → Error

## Long-term Solution Applied

Migration `007_fix_profiles_recursion.sql` has been created and will:
1. Drop the problematic policy
2. Portfolio view now displays investor IDs instead of names/emails
3. No recursion, no problems

## Alternative: Cache Investor Info

If you need investor names in the portfolio, add columns to the interests table:

```sql
-- Add cached investor info to interests table
ALTER TABLE interests ADD COLUMN investor_email TEXT;
ALTER TABLE interests ADD COLUMN investor_name TEXT;

-- Update existing records
UPDATE interests i
SET
  investor_email = (SELECT email FROM profiles WHERE id = i.investor_user_id),
  investor_name = (SELECT full_name FROM profiles WHERE id = i.investor_user_id);

-- Create trigger to auto-populate on insert/update
CREATE OR REPLACE FUNCTION cache_investor_info()
RETURNS TRIGGER AS $$
BEGIN
  SELECT email, full_name
  INTO NEW.investor_email, NEW.investor_name
  FROM profiles
  WHERE id = NEW.investor_user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER interests_cache_investor
  BEFORE INSERT OR UPDATE ON interests
  FOR EACH ROW
  EXECUTE FUNCTION cache_investor_info();
```

Then update portfolio query to use these cached fields instead of joining profiles.

## Verify Fix

After running the DROP POLICY command:

1. ✅ Refresh login page
2. ✅ Login should work normally
3. ✅ Portfolio view still works (shows investor IDs)
4. ✅ No recursion errors

## Files Updated

1. `supabase/migrations/007_fix_profiles_recursion.sql` - Drops problematic policy
2. `app/app/portfolio/page.tsx` - Updated to not query investor profiles
3. `FIX_LOGIN_RECURSION.md` - This fix guide

## Prevention

**Rule**: Never query the same table within its own RLS policy. This will always cause infinite recursion.

**Bad**:
```sql
CREATE POLICY "policy_name" ON table_x
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM table_x ...) -- ❌ Recursion!
  );
```

**Good**:
```sql
CREATE POLICY "policy_name" ON table_x
  FOR SELECT USING (
    auth.uid() = user_id  -- ✅ No table query
  );
```

Or use a SECURITY DEFINER function that explicitly prevents recursion (advanced).
