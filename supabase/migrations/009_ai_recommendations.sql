-- AI Recommendations Table
-- Stores AI-generated recommendation scores for deals

CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  recommendation_text TEXT NOT NULL,
  rationale TEXT NOT NULL,
  analysis_data JSONB,
  generated_by_user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id)
);

-- Enable RLS
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

-- Internal roles can view recommendations
CREATE POLICY "Internal roles can view recommendations" ON ai_recommendations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

-- Dealflow managers can create/update recommendations
CREATE POLICY "Dealflow managers can manage recommendations" ON ai_recommendations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager')
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_ai_recommendations_deal_id ON ai_recommendations(deal_id);
