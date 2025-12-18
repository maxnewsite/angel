-- Portfolio Access - Allow internal roles to view investor profiles
-- This enables the portfolio view to show investor names and emails

-- ============================================================================
-- PROFILES - Add internal role read access
-- ============================================================================

-- Internal roles need to see investor information in portfolio view
CREATE POLICY "Internal roles can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON POLICY "Internal roles can view all profiles" ON profiles IS
  'Dealflow managers, IC members, and admins need to see investor information in portfolio view';
