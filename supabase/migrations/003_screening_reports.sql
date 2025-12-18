-- Screening Reports and Final Decisions
-- Run this in Supabase SQL Editor

-- ============================================================================
-- SCREENING REPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS screening_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  manager_user_id UUID NOT NULL REFERENCES profiles(id),

  -- Report type
  report_type TEXT NOT NULL CHECK (report_type IN ('approved', 'rejected')),

  -- Report content (JSON for flexibility)
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- PDF storage
  pdf_storage_path TEXT,

  -- Decision metadata
  decision_rationale TEXT,
  decided_at TIMESTAMPTZ DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One report per deal
  UNIQUE(deal_id)
);

-- Enable RLS
ALTER TABLE screening_reports ENABLE ROW LEVEL SECURITY;

-- Internal roles can view all reports
CREATE POLICY "Internal roles can view reports" ON screening_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

-- Dealflow managers can create reports
CREATE POLICY "Dealflow managers can create reports" ON screening_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager')
    )
  );

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_screening_reports_deal_id ON screening_reports(deal_id);
CREATE INDEX IF NOT EXISTS idx_screening_reports_type ON screening_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_screening_reports_decided_at ON screening_reports(decided_at);

-- ============================================================================
-- UPDATE DEALS TABLE - Add screening completion tracking
-- ============================================================================
ALTER TABLE deals ADD COLUMN IF NOT EXISTS screening_completed_at TIMESTAMPTZ;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS screening_decision TEXT CHECK (screening_decision IN ('approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_deals_screening_decision ON deals(screening_decision);

-- ============================================================================
-- STORAGE BUCKET FOR SCREENING REPORTS (if not exists)
-- ============================================================================
-- Note: Run this separately in Supabase Dashboard → Storage
-- CREATE BUCKET screening-reports WITH public = false;

-- Storage policies for screening-reports bucket
-- INSERT INTO storage.buckets (id, name, public) VALUES ('screening-reports', 'screening-reports', false)
-- ON CONFLICT (id) DO NOTHING;

-- RLS for screening-reports bucket
-- DELETE FROM storage.objects WHERE bucket_id = 'screening-reports'; -- Clear if re-running

-- INSERT INTO storage.policies (name, bucket_id, definition, check_definition, command)
-- VALUES (
--   'Internal roles can read screening reports',
--   'screening-reports',
--   '(EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN (''admin'', ''dealflow_manager'', ''ic_member'', ''ic_chair'')))',
--   '(EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN (''admin'', ''dealflow_manager'', ''ic_member'', ''ic_chair'')))',
--   'SELECT'
-- );

COMMENT ON TABLE screening_reports IS 'Final screening reports for approved/rejected deals';
COMMENT ON COLUMN screening_reports.report_data IS 'JSON structure: {screening_scores, flags, overall_score, summary_memo, etc}';
COMMENT ON COLUMN screening_reports.pdf_storage_path IS 'Path to PDF in screening-reports bucket';
