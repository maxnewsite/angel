-- Fix Rejected Deals Backfill
-- Updates existing rejected deals to have screening_decision set correctly

-- ============================================================================
-- BACKFILL REJECTED DEALS
-- ============================================================================

-- Fix deals that were rejected before the screening_decision field was properly set
UPDATE deals
SET
  screening_decision = 'rejected',
  screening_completed_at = COALESCE(screening_completed_at, updated_at)
WHERE
  status = 'screening_rejected'
  AND screening_decision IS NULL;

-- Fix deals that were approved but don't have screening_decision set
UPDATE deals
SET
  screening_decision = 'approved',
  screening_completed_at = COALESCE(screening_completed_at, approved_at, updated_at)
WHERE
  status = 'ic_in_review'
  AND screening_decision IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count rejected deals
-- SELECT COUNT(*) as rejected_count
-- FROM deals
-- WHERE screening_decision = 'rejected';

-- Count approved deals
-- SELECT COUNT(*) as approved_count
-- FROM deals
-- WHERE screening_decision = 'approved';

-- Find deals with inconsistent state (for debugging)
-- SELECT id, status, screening_decision, screening_completed_at
-- FROM deals
-- WHERE
--   (status = 'screening_rejected' AND screening_decision != 'rejected') OR
--   (status = 'ic_in_review' AND screening_decision != 'approved')
-- ORDER BY updated_at DESC;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN deals.screening_decision IS 'Final screening decision: approved or rejected. Used for querying rejected/approved deals.';
COMMENT ON COLUMN deals.screening_completed_at IS 'Timestamp when screening was completed (approved or rejected)';
