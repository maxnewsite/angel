-- ============================================================================
-- AI Screening Verification Script
-- Run this in Supabase SQL Editor to verify setup
-- ============================================================================

-- 1. Check if screening criteria exist
SELECT
  'Screening Criteria' as check_name,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 7 THEN '✓ OK - All 7 criteria present'
    WHEN COUNT(*) > 0 THEN '⚠ WARNING - Expected 7 criteria, found ' || COUNT(*)
    ELSE '✗ ERROR - No criteria found!'
  END as status
FROM screening_criteria
WHERE is_active = true;

-- 2. List all screening criteria
SELECT
  name,
  description,
  weight,
  is_active
FROM screening_criteria
ORDER BY created_at;

-- 3. Check if ANTHROPIC_API_KEY is set (via edge functions)
-- You need to check this manually: npx supabase secrets list

-- 4. Verify RLS policies on screening_criteria
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'screening_criteria';

-- 5. Check recent screening reviews
SELECT
  sr.id,
  sr.deal_id,
  sr.overall_score,
  sr.decision,
  sr.created_at,
  COUNT(ss.id) as score_count
FROM screening_reviews sr
LEFT JOIN screening_scores ss ON sr.deal_id = ss.deal_id AND sr.manager_user_id = ss.manager_user_id
GROUP BY sr.id, sr.deal_id, sr.overall_score, sr.decision, sr.created_at
ORDER BY sr.created_at DESC
LIMIT 5;
