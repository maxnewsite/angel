-- Run this in Supabase SQL Editor to check if migrations were applied

-- 1. Check if screening_reports table exists
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'screening_reports'
ORDER BY ordinal_position;

-- 2. Check if deals table has screening columns
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'deals'
  AND column_name IN ('screening_completed_at', 'screening_decision')
ORDER BY column_name;

-- 3. Check if deal_flags table exists
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'deal_flags'
ORDER BY ordinal_position;

-- 4. Check if yc_flags_catalog table exists and has data
SELECT
  flag_type,
  COUNT(*) as count
FROM yc_flags_catalog
GROUP BY flag_type;

-- 5. List all current deals and their status
SELECT
  id,
  status,
  screening_decision,
  screening_completed_at,
  created_at
FROM deals
ORDER BY created_at DESC
LIMIT 5;
