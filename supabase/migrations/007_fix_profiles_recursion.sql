-- Fix Infinite Recursion in Profiles Policy
-- The previous policy caused recursion by querying profiles within a profiles policy
-- SOLUTION: Remove the policy and handle investor visibility differently in the app

-- ============================================================================
-- DROP PROBLEMATIC POLICY
-- ============================================================================
DROP POLICY IF EXISTS "Internal roles can view all profiles" ON profiles;

-- ============================================================================
-- NOTE: Portfolio investor names will come from auth.users.email instead
-- This avoids the recursion issue while still showing investor information
-- ============================================================================

COMMENT ON TABLE profiles IS
  'User profiles. RLS prevents recursive queries. For internal role access to investor data, use auth.users.email or modify interests table to include cached investor info.';
