-- YC-Style Red/Green Flags for Deal Screening
-- Run this in Supabase SQL Editor

-- ============================================================================
-- DEAL FLAGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS deal_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  manager_user_id UUID NOT NULL REFERENCES profiles(id),

  -- Green Flags (Positive indicators)
  green_flags JSONB DEFAULT '[]'::jsonb,

  -- Red Flags (Warning indicators)
  red_flags JSONB DEFAULT '[]'::jsonb,

  -- Auto-detected by AI
  ai_generated BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one flag set per deal per manager
  UNIQUE(deal_id, manager_user_id)
);

-- Enable RLS
ALTER TABLE deal_flags ENABLE ROW LEVEL SECURITY;

-- Internal roles can view all flags
CREATE POLICY "Internal roles can view flags" ON deal_flags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

-- Dealflow managers can manage flags
CREATE POLICY "Dealflow managers can manage flags" ON deal_flags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager')
    )
  );

-- ============================================================================
-- STANDARD YC FLAGS REFERENCE
-- ============================================================================
COMMENT ON TABLE deal_flags IS 'YC-style red and green flags for deal evaluation';

-- Standard Green Flags (stored as JSONB array of objects)
-- Example structure:
-- [
--   {"flag": "Strong product-market fit", "note": "10% WoW growth, 50% retention"},
--   {"flag": "Exceptional team", "note": "2 prior exits, deep domain expertise"}
-- ]

-- Standard Red Flags (stored as JSONB array of objects)
-- Example structure:
-- [
--   {"flag": "No clear moat", "note": "Easily replicable by competitors"},
--   {"flag": "Weak unit economics", "note": "LTV/CAC < 2"}
-- ]

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_deal_flags_deal_id ON deal_flags(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_flags_manager ON deal_flags(manager_user_id);

-- ============================================================================
-- STANDARD YC FLAGS CATALOG (for reference UI)
-- ============================================================================
CREATE TABLE IF NOT EXISTS yc_flags_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_type TEXT NOT NULL CHECK (flag_type IN ('green', 'red')),
  category TEXT NOT NULL,
  flag_text TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE yc_flags_catalog ENABLE ROW LEVEL SECURITY;

-- Internal roles can view catalog
CREATE POLICY "Internal roles can view catalog" ON yc_flags_catalog
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

-- Insert standard YC-style flags
INSERT INTO yc_flags_catalog (flag_type, category, flag_text, description) VALUES
  -- GREEN FLAGS - Team
  ('green', 'Team', 'Exceptional founder(s)', 'Prior exits, deep domain expertise, technical excellence'),
  ('green', 'Team', 'Strong technical team', 'Engineers from top companies, proven track record'),
  ('green', 'Team', 'Complementary co-founders', 'Business + technical skills, long relationship'),

  -- GREEN FLAGS - Traction
  ('green', 'Traction', 'Strong product-market fit', 'High engagement, low churn, organic growth'),
  ('green', 'Traction', 'Impressive growth rate', '> 10% WoW or 50% MoM sustained growth'),
  ('green', 'Traction', 'Revenue traction early', 'Monetizing before Series A'),
  ('green', 'Traction', 'Key customer wins', 'Fortune 500 customers or strong brand names'),

  -- GREEN FLAGS - Market
  ('green', 'Market', 'Large addressable market', 'TAM > $1B with clear path to capture'),
  ('green', 'Market', 'Market timing is right', 'Technology/regulation/behavior inflection point'),
  ('green', 'Market', 'Growing market', '> 20% annual market growth'),

  -- GREEN FLAGS - Product
  ('green', 'Product', 'Strong moat/defensibility', 'Network effects, data moat, or high switching costs'),
  ('green', 'Product', 'Technical innovation', 'Proprietary technology or IP'),
  ('green', 'Product', '10x better solution', 'Dramatically better than alternatives'),

  -- GREEN FLAGS - Business Model
  ('green', 'Business Model', 'Healthy unit economics', 'LTV/CAC > 3, payback < 12 months'),
  ('green', 'Business Model', 'Multiple revenue streams', 'Diversified monetization'),
  ('green', 'Business Model', 'High gross margins', '> 70% gross margins'),

  -- RED FLAGS - Team
  ('red', 'Team', 'Solo founder', 'No co-founder, lack of complementary skills'),
  ('red', 'Team', 'Weak technical capability', 'Non-technical founders in tech business'),
  ('red', 'Team', 'Co-founder conflicts', 'Unclear equity split, relationship issues'),
  ('red', 'Team', 'Key person risk', 'Over-reliance on single person'),

  -- RED FLAGS - Traction
  ('red', 'Traction', 'No user traction', 'Low engagement, high churn'),
  ('red', 'Traction', 'Flat or declining growth', 'No momentum, losing customers'),
  ('red', 'Traction', 'Fake traction', 'Paid users, unsustainable growth tactics'),

  -- RED FLAGS - Market
  ('red', 'Market', 'Small/unclear market', 'TAM < $100M or unclear market definition'),
  ('red', 'Market', 'Crowded market', 'Many well-funded competitors, commoditized'),
  ('red', 'Market', 'Market timing wrong', 'Too early or too late to market'),

  -- RED FLAGS - Product
  ('red', 'Product', 'No clear moat', 'Easily replicable, no defensibility'),
  ('red', 'Product', 'Product-market fit unclear', 'Pivoting frequently, unclear value prop'),
  ('red', 'Product', 'Solution looking for problem', 'No clear pain point addressed'),

  -- RED FLAGS - Business Model
  ('red', 'Business Model', 'Weak unit economics', 'LTV/CAC < 2, long payback period'),
  ('red', 'Business Model', 'Dependency on single customer', '> 30% revenue from one customer'),
  ('red', 'Business Model', 'Unsustainable burn rate', 'Runway < 6 months, excessive spending'),

  -- RED FLAGS - Deal Terms
  ('red', 'Deal Terms', 'Overvaluation', 'Valuation disconnected from traction'),
  ('red', 'Deal Terms', 'Complex cap table', 'Many previous rounds, messy structure'),
  ('red', 'Deal Terms', 'Unfavorable terms', 'Excessive founder protection, liquidation preferences')
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_yc_flags_type ON yc_flags_catalog(flag_type);
CREATE INDEX IF NOT EXISTS idx_yc_flags_category ON yc_flags_catalog(category);
