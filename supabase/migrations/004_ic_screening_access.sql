-- Allow IC Members to View Screening Scores
-- This enables IC members to see complete screening analysis (criteria scores with notes)
-- Note: screening_reviews already has IC access via "Internal roles can view reviews" policy

-- ============================================================================
-- SCREENING SCORES - Add IC member read access
-- ============================================================================

-- Add IC member read access (managers already have write access via existing policy)
CREATE POLICY "IC members can view screening scores" ON screening_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('ic_member', 'ic_chair', 'admin')
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON POLICY "IC members can view screening scores" ON screening_scores IS
  'IC members need to see detailed screening criteria scores and notes to make informed decisions';
