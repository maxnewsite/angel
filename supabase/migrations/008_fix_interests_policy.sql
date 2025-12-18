-- Fix Interests RLS Policy
-- Allow internal roles to also express interest in deals (not just investors)

-- ============================================================================
-- DROP OLD RESTRICTIVE POLICY
-- ============================================================================
DROP POLICY IF EXISTS "Investors can manage own interests" ON interests;

-- ============================================================================
-- CREATE NEW INCLUSIVE POLICY
-- ============================================================================

-- Anyone can manage their own interests (investor, dealflow_manager, IC, etc.)
CREATE POLICY "Users can manage own interests" ON interests
  FOR ALL USING (auth.uid() = investor_user_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON POLICY "Users can manage own interests" ON interests IS
  'Any authenticated user can express interest in deals, not just investors. This allows internal roles to participate as investors too.';
