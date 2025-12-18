-- Incremental Migration for Existing Dealflow System
-- This adds missing columns and tables without recreating existing ones
-- Run this in Supabase SQL Editor

-- ============================================================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add created_by to startups if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'startups' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE startups ADD COLUMN created_by UUID REFERENCES profiles(id);
  END IF;
END $$;

-- Add created_by to deals if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE deals ADD COLUMN created_by UUID REFERENCES profiles(id);
  END IF;
END $$;

-- Add submitted_at to deals if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'submitted_at'
  ) THEN
    ALTER TABLE deals ADD COLUMN submitted_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================================
-- CREATE SCREENING TABLES IF THEY DON'T EXIST
-- ============================================================================

-- SCREENING CRITERIA TABLE
CREATE TABLE IF NOT EXISTS screening_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  weight NUMERIC DEFAULT 1.0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCREENING SCORES TABLE
CREATE TABLE IF NOT EXISTS screening_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  manager_user_id UUID NOT NULL REFERENCES profiles(id),
  criterion_id UUID NOT NULL REFERENCES screening_criteria(id),
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, manager_user_id, criterion_id)
);

-- SCREENING REVIEWS TABLE
CREATE TABLE IF NOT EXISTS screening_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  manager_user_id UUID NOT NULL REFERENCES profiles(id),
  overall_score NUMERIC,
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'needs_info', 'reject')),
  summary_memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, manager_user_id)
);

-- ============================================================================
-- CREATE OTHER MISSING TABLES IF THEY DON'T EXIST
-- ============================================================================

-- DEAL ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS deal_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  assigned_to_user_id UUID NOT NULL REFERENCES profiles(id),
  assigned_by_user_id UUID NOT NULL REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACTIVITY LOG TABLE
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES profiles(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WATCHLISTS TABLE
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, deal_id)
);

-- ============================================================================
-- DOCUMENTS TABLE (for pitch decks and other files)
-- ============================================================================
DO $$
BEGIN
  -- If table doesn't exist, create it
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
    CREATE TABLE documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
      startup_id UUID REFERENCES startups(id),
      storage_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'investors', 'public')),
      uploaded_by_user_id UUID REFERENCES profiles(id),
      created_by UUID REFERENCES profiles(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  ELSE
    -- Table exists, add missing columns first

    -- Add startup_id if it doesn't exist (might be required by existing schema)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'documents' AND column_name = 'startup_id'
    ) THEN
      ALTER TABLE documents ADD COLUMN startup_id UUID REFERENCES startups(id);
    END IF;

    -- Add uploaded_by_user_id if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'documents' AND column_name = 'uploaded_by_user_id'
    ) THEN
      ALTER TABLE documents ADD COLUMN uploaded_by_user_id UUID REFERENCES profiles(id);
    END IF;

    -- Add created_by if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'documents' AND column_name = 'created_by'
    ) THEN
      ALTER TABLE documents ADD COLUMN created_by UUID REFERENCES profiles(id);
    END IF;

    -- Add storage_path if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'documents' AND column_name = 'storage_path'
    ) THEN
      ALTER TABLE documents ADD COLUMN storage_path TEXT;
    END IF;

    -- Add file_name if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'documents' AND column_name = 'file_name'
    ) THEN
      ALTER TABLE documents ADD COLUMN file_name TEXT;
    END IF;

    -- Add created_at if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'documents' AND column_name = 'created_at'
    ) THEN
      ALTER TABLE documents ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Add visibility if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'documents' AND column_name = 'visibility'
    ) THEN
      ALTER TABLE documents ADD COLUMN visibility TEXT NOT NULL DEFAULT 'internal';
    END IF;

    -- Check if visibility column needs conversion from enum to TEXT
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'documents'
      AND column_name = 'visibility'
      AND data_type = 'USER-DEFINED'
    ) THEN
      -- 1. DROP ALL DEPENDENT POLICIES
      DROP POLICY IF EXISTS "documents_select" ON documents;
      DROP POLICY IF EXISTS "documents_insert" ON documents;
      DROP POLICY IF EXISTS "documents_update" ON documents;
      DROP POLICY IF EXISTS "documents_delete" ON documents;
      DROP POLICY IF EXISTS "deal_docs_investor_read_published" ON storage.objects;
      DROP POLICY IF EXISTS "Founders can manage own deal docs" ON documents;
      DROP POLICY IF EXISTS "Internal roles can view documents" ON documents;
      DROP POLICY IF EXISTS "Investors can view accessible docs" ON documents;

      -- 2. Convert enum column to TEXT
      ALTER TABLE documents ALTER COLUMN visibility TYPE TEXT;

      -- 3. Add CHECK constraint
      ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_visibility_check;
      ALTER TABLE documents ADD CONSTRAINT documents_visibility_check
        CHECK (visibility IN ('internal', 'investors', 'public'));

      -- 4. Set default
      ALTER TABLE documents ALTER COLUMN visibility SET DEFAULT 'internal';
    ELSE
      -- Visibility is already TEXT, just add CHECK constraint if missing
      ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_visibility_check;
      ALTER TABLE documents ADD CONSTRAINT documents_visibility_check
        CHECK (visibility IN ('internal', 'investors', 'public'));
    END IF;
  END IF;
END $$;

-- ============================================================================
-- ENABLE RLS ON NEW TABLES
-- ============================================================================

ALTER TABLE screening_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP EXISTING POLICIES IF THEY EXIST (to avoid conflicts)
-- ============================================================================

DROP POLICY IF EXISTS "Internal roles can view criteria" ON screening_criteria;
DROP POLICY IF EXISTS "Managers can manage own scores" ON screening_scores;
DROP POLICY IF EXISTS "Managers can manage own reviews" ON screening_reviews;
DROP POLICY IF EXISTS "Internal roles can view reviews" ON screening_reviews;
DROP POLICY IF EXISTS "Managers can view own assignments" ON deal_assignments;
DROP POLICY IF EXISTS "Admins can view activity log" ON activity_log;
DROP POLICY IF EXISTS "Users can manage own watchlist" ON watchlists;
DROP POLICY IF EXISTS "Founders can manage own deal docs" ON documents;
DROP POLICY IF EXISTS "Internal roles can view documents" ON documents;
DROP POLICY IF EXISTS "Internal roles can upload documents" ON documents;
DROP POLICY IF EXISTS "Investors can view accessible docs" ON documents;

-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================

-- Screening Criteria Policies
CREATE POLICY "Internal roles can view criteria" ON screening_criteria
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

-- Screening Scores Policies
CREATE POLICY "Managers can manage own scores" ON screening_scores
  FOR ALL USING (
    auth.uid() = manager_user_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager')
    )
  );

-- Screening Reviews Policies
CREATE POLICY "Managers can manage own reviews" ON screening_reviews
  FOR ALL USING (
    auth.uid() = manager_user_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager')
    )
  );

CREATE POLICY "Internal roles can view reviews" ON screening_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

-- Deal Assignments Policies
CREATE POLICY "Managers can view own assignments" ON deal_assignments
  FOR SELECT USING (
    auth.uid() = assigned_to_user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Activity Log Policies
CREATE POLICY "Admins can view activity log" ON activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Watchlist Policies
CREATE POLICY "Users can manage own watchlist" ON watchlists
  FOR ALL USING (auth.uid() = user_id);

-- Documents Policies
CREATE POLICY "Founders can manage own deal docs" ON documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deals
      JOIN startups ON startups.id = deals.startup_id
      WHERE deals.id = documents.deal_id
      AND startups.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals
      JOIN startups ON startups.id = deals.startup_id
      WHERE deals.id = documents.deal_id
      AND startups.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Internal roles can view documents" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

CREATE POLICY "Internal roles can upload documents" ON documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager')
    )
  );

CREATE POLICY "Investors can view accessible docs" ON documents
  FOR SELECT USING (
    visibility IN ('investors', 'public') AND
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = documents.deal_id
      AND deals.status = 'published'
    ) AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'investor'
    )
  );

-- ============================================================================
-- STORAGE BUCKET POLICIES (deal-docs bucket)
-- ============================================================================

-- Allow authenticated users to upload files to deal-docs bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-docs', 'deal-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can download accessible files" ON storage.objects;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'deal-docs');

-- Allow users to download based on access rights
CREATE POLICY "Users can download accessible files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deal-docs' AND
  (
    -- Internal roles can access all
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
    OR
    -- Founders can access their own deal files
    EXISTS (
      SELECT 1 FROM documents
      JOIN deals ON deals.id = documents.deal_id
      JOIN startups ON startups.id = deals.startup_id
      WHERE documents.storage_path = storage.objects.name
      AND startups.owner_user_id = auth.uid()
    )
  )
);

-- ============================================================================
-- SEED DATA: 7 Screening Criteria (only if table is empty)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM screening_criteria LIMIT 1) THEN
    INSERT INTO screening_criteria (name, description, weight, is_active) VALUES
      ('Market Opportunity', 'Size and growth potential of target market', 1.5, true),
      ('Team Quality', 'Experience and execution capability of founding team', 2.0, true),
      ('Product/Technology', 'Innovation and competitive advantage of solution', 1.5, true),
      ('Traction', 'Customer adoption and revenue metrics', 2.0, true),
      ('Business Model', 'Revenue model and unit economics viability', 1.0, true),
      ('Competition', 'Competitive landscape and differentiation', 1.0, true),
      ('Valuation', 'Deal terms and valuation reasonableness', 1.0, true);
  END IF;
END $$;

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_screening_scores_deal_id ON screening_scores(deal_id);
CREATE INDEX IF NOT EXISTS idx_screening_scores_manager ON screening_scores(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_screening_reviews_deal_id ON screening_reviews(deal_id);
CREATE INDEX IF NOT EXISTS idx_screening_reviews_manager ON screening_reviews(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_deal_assignments_deal_id ON deal_assignments(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_assignments_user ON deal_assignments(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor ON activity_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_user ON watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_deal ON watchlists(deal_id);

-- Only create index if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'deal_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_documents_deal_id ON documents(deal_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'uploaded_by_user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_documents_uploader ON documents(uploaded_by_user_id);
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Run this to verify everything was created successfully:
SELECT
  'screening_criteria' as table_name,
  COUNT(*) as row_count
FROM screening_criteria
UNION ALL
SELECT 'screening_scores', COUNT(*) FROM screening_scores
UNION ALL
SELECT 'screening_reviews', COUNT(*) FROM screening_reviews
UNION ALL
SELECT 'deal_assignments', COUNT(*) FROM deal_assignments
UNION ALL
SELECT 'activity_log', COUNT(*) FROM activity_log
UNION ALL
SELECT 'watchlists', COUNT(*) FROM watchlists
UNION ALL
SELECT 'documents', COUNT(*) FROM documents;
