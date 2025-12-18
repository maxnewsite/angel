-- ============================================================================
-- DEALFLOW ANALYST ROLE - ENUM FIX
-- ============================================================================
-- This script fixes the app_role enum to include 'dealflow_analyst'
-- Run this BEFORE applying migration 013_dealflow_analyst.sql
-- ============================================================================

-- Step 1: Check what type the role column is
SELECT
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'role';

-- Step 2: Check if app_role enum exists
SELECT
  t.typname AS enum_name,
  e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'app_role'
ORDER BY e.enumsortorder;

-- Step 3: Add dealflow_analyst to the enum (if it exists and value not present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = 'app_role'::regtype
      AND enumlabel = 'dealflow_analyst'
    ) THEN
      ALTER TYPE app_role ADD VALUE 'dealflow_analyst';
      RAISE NOTICE '✅ Added dealflow_analyst to app_role enum';
    ELSE
      RAISE NOTICE 'ℹ️ dealflow_analyst already exists in app_role enum';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ app_role enum does not exist - role column may be TEXT type';
    RAISE NOTICE 'ℹ️ This is OK - the migration will work with TEXT columns';
  END IF;
END $$;

-- Step 4: Verify the enum was updated
SELECT
  t.typname AS enum_name,
  e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'app_role'
ORDER BY e.enumsortorder;

-- ============================================================================
-- ALTERNATIVE: If role is TEXT with CHECK constraint
-- ============================================================================
-- If the role column is TEXT with a CHECK constraint, you may need to drop
-- the constraint first. Uncomment the following if needed:

-- Check for constraints on profiles.role
-- SELECT
--   conname AS constraint_name,
--   pg_get_constraintdef(oid) AS constraint_definition
-- FROM pg_constraint
-- WHERE conrelid = 'profiles'::regclass
-- AND conname LIKE '%role%';

-- Drop the constraint (replace 'constraint_name' with actual name from above)
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- After running this script, verify you can insert a dealflow_analyst:
-- UPDATE profiles SET role = 'dealflow_analyst' WHERE email = 'test@example.com';

-- If you get an error, check the constraint/enum again and report the error.
