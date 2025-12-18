-- Dealflow Management System Schema
-- Run this in Supabase SQL Editor

-- ============================================================================
-- PROFILES TABLE (User roles and auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'investor',
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies: Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- STARTUPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS startups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website TEXT,
  sector TEXT,
  hq_location TEXT,
  description TEXT,
  team_summary TEXT,
  traction_summary TEXT,
  owner_user_id UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE startups ENABLE ROW LEVEL SECURITY;

-- Founders can view/edit their own startups
CREATE POLICY "Founders can manage own startups" ON startups
  FOR ALL USING (auth.uid() = owner_user_id);

-- Internal roles can view all startups
CREATE POLICY "Internal roles can view all startups" ON startups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

-- ============================================================================
-- DEALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'draft',
  round_type TEXT,
  instrument TEXT,
  target_amount NUMERIC,
  min_ticket NUMERIC,
  valuation NUMERIC,
  highlights TEXT,
  risks TEXT,
  use_of_funds TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- Founders can manage deals for their startups
CREATE POLICY "Founders can manage own deals" ON deals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM startups
      WHERE startups.id = deals.startup_id
      AND startups.owner_user_id = auth.uid()
    )
  );

-- Internal roles can view all deals
CREATE POLICY "Internal roles can view all deals" ON deals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

-- Investors can only view published deals
CREATE POLICY "Investors can view published deals" ON deals
  FOR SELECT USING (
    status = 'published' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'investor'
    )
  );

-- ============================================================================
-- SCREENING CRITERIA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS screening_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  weight NUMERIC DEFAULT 1.0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE screening_criteria ENABLE ROW LEVEL SECURITY;

-- Internal roles can view criteria
CREATE POLICY "Internal roles can view criteria" ON screening_criteria
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

-- ============================================================================
-- SCREENING SCORES TABLE
-- ============================================================================
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

ALTER TABLE screening_scores ENABLE ROW LEVEL SECURITY;

-- Dealflow managers can manage their own scores
CREATE POLICY "Managers can manage own scores" ON screening_scores
  FOR ALL USING (
    auth.uid() = manager_user_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager')
    )
  );

-- ============================================================================
-- SCREENING REVIEWS TABLE
-- ============================================================================
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

ALTER TABLE screening_reviews ENABLE ROW LEVEL SECURITY;

-- Dealflow managers can manage their own reviews
CREATE POLICY "Managers can manage own reviews" ON screening_reviews
  FOR ALL USING (
    auth.uid() = manager_user_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager')
    )
  );

-- Internal roles can view all reviews
CREATE POLICY "Internal roles can view reviews" ON screening_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

-- ============================================================================
-- IC VOTES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ic_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  ic_member_user_id UUID NOT NULL REFERENCES profiles(id),
  vote TEXT NOT NULL CHECK (vote IN ('yes', 'no', 'abstain')),
  confidence NUMERIC,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, ic_member_user_id)
);

ALTER TABLE ic_votes ENABLE ROW LEVEL SECURITY;

-- IC members can manage their own votes
CREATE POLICY "IC members can manage own votes" ON ic_votes
  FOR ALL USING (
    auth.uid() = ic_member_user_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'ic_member', 'ic_chair')
    )
  );

-- IC chair can view all votes
CREATE POLICY "IC chair can view all votes" ON ic_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'ic_chair')
    )
  );

-- ============================================================================
-- IC DECISIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ic_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  chair_user_id UUID NOT NULL REFERENCES profiles(id),
  decision TEXT NOT NULL,
  rationale TEXT,
  decided_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ic_decisions ENABLE ROW LEVEL SECURITY;

-- IC chair can manage decisions
CREATE POLICY "IC chair can manage decisions" ON ic_decisions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'ic_chair')
    )
  );

-- Internal roles can view decisions
CREATE POLICY "Internal roles can view decisions" ON ic_decisions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

-- ============================================================================
-- DEAL ASSIGNMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS deal_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  assigned_to_user_id UUID NOT NULL REFERENCES profiles(id),
  assigned_by_user_id UUID NOT NULL REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE deal_assignments ENABLE ROW LEVEL SECURITY;

-- Assigned managers can view their assignments
CREATE POLICY "Managers can view own assignments" ON deal_assignments
  FOR SELECT USING (
    auth.uid() = assigned_to_user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- INTERESTS TABLE (Investor signals)
-- ============================================================================
CREATE TABLE IF NOT EXISTS interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  investor_user_id UUID NOT NULL REFERENCES profiles(id),
  signal TEXT NOT NULL CHECK (signal IN ('yes', 'maybe', 'no')),
  indicative_ticket NUMERIC,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, investor_user_id)
);

ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

-- Investors can manage their own interests
CREATE POLICY "Investors can manage own interests" ON interests
  FOR ALL USING (auth.uid() = investor_user_id);

-- Internal roles can view all interests
CREATE POLICY "Internal roles can view interests" ON interests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

-- ============================================================================
-- DOCUMENTS TABLE (Deal room documents)
-- ============================================================================
CREATE TABLE IF NOT EXISTS documents (
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

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Founders can manage documents for their deals
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

-- Internal roles can view all documents
CREATE POLICY "Internal roles can view documents" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

-- Internal roles can upload documents
CREATE POLICY "Internal roles can upload documents" ON documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager')
    )
  );

-- Investors can view investor/public documents for published deals
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
-- ACTIVITY LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES profiles(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Admins can view activity log
CREATE POLICY "Admins can view activity log" ON activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- WATCHLISTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, deal_id)
);

ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

-- Users can manage their own watchlists
CREATE POLICY "Users can manage own watchlist" ON watchlists
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- SEED DATA: Default Screening Criteria (7 criteria)
-- ============================================================================
INSERT INTO screening_criteria (name, description, weight, is_active) VALUES
  ('Market Opportunity', 'Size and growth potential of target market', 1.5, true),
  ('Team Quality', 'Experience and execution capability of founding team', 2.0, true),
  ('Product/Technology', 'Innovation and competitive advantage of solution', 1.5, true),
  ('Traction', 'Customer adoption and revenue metrics', 2.0, true),
  ('Business Model', 'Revenue model and unit economics viability', 1.0, true),
  ('Competition', 'Competitive landscape and differentiation', 1.0, true),
  ('Valuation', 'Deal terms and valuation reasonableness', 1.0, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- INDEXES for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_startup_id ON deals(startup_id);
CREATE INDEX IF NOT EXISTS idx_screening_scores_deal_id ON screening_scores(deal_id);
CREATE INDEX IF NOT EXISTS idx_screening_reviews_deal_id ON screening_reviews(deal_id);
CREATE INDEX IF NOT EXISTS idx_ic_votes_deal_id ON ic_votes(deal_id);
CREATE INDEX IF NOT EXISTS idx_interests_deal_id ON interests(deal_id);
CREATE INDEX IF NOT EXISTS idx_documents_deal_id ON documents(deal_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- ============================================================================
-- STORAGE BUCKET for deal documents
-- ============================================================================
-- Run this in Supabase Storage UI or via SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('deal-docs', 'deal-docs', false);

-- Storage policies will need to be set up in Supabase Dashboard:
-- 1. Allow authenticated users to upload to deal-docs bucket
-- 2. Allow users with proper access to download based on document visibility
