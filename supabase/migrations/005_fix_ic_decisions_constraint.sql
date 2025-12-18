-- Fix IC Decisions Check Constraint
-- The frontend sends "recommended", "rejected", or "published"
-- Ensure the check constraint matches these values

-- ============================================================================
-- DROP EXISTING CONSTRAINT (if it exists)
-- ============================================================================
ALTER TABLE ic_decisions DROP CONSTRAINT IF EXISTS ic_decisions_decision_check;

-- ============================================================================
-- ADD CORRECT CONSTRAINT
-- ============================================================================
ALTER TABLE ic_decisions ADD CONSTRAINT ic_decisions_decision_check
  CHECK (decision IN ('recommended', 'rejected', 'published'));

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON CONSTRAINT ic_decisions_decision_check ON ic_decisions IS
  'IC chair can recommend, reject, or publish deals. Published means recommended + made visible to investors.';
