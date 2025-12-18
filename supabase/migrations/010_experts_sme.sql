-- Subject Matter Experts (SME) Portfolio System
-- Stores expert profiles that can be consulted for deal evaluation

-- ============================================================================
-- EXPERTISE DOMAINS TABLE (Reference data for expert categorization)
-- ============================================================================
CREATE TABLE IF NOT EXISTS expertise_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT, -- e.g., "Technology", "Industry", "Functional"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed common expertise domains
INSERT INTO expertise_domains (name, description, category) VALUES
  -- Technology Domains
  ('Artificial Intelligence', 'AI, Machine Learning, Deep Learning', 'Technology'),
  ('SaaS & Cloud', 'Software as a Service, Cloud Infrastructure', 'Technology'),
  ('Fintech', 'Financial Technology, Payments, Banking', 'Technology'),
  ('Healthcare Tech', 'Digital Health, MedTech, Biotech', 'Technology'),
  ('Blockchain & Crypto', 'Distributed Ledger, Cryptocurrencies', 'Technology'),
  ('Cybersecurity', 'Information Security, Data Protection', 'Technology'),
  ('IoT & Hardware', 'Internet of Things, Connected Devices', 'Technology'),
  ('Mobile & Apps', 'Mobile Development, App Economy', 'Technology'),

  -- Industry Domains
  ('E-commerce', 'Online Retail, Marketplaces', 'Industry'),
  ('Education', 'EdTech, Learning Platforms', 'Industry'),
  ('Real Estate', 'PropTech, Real Estate Technology', 'Industry'),
  ('Energy & Climate', 'CleanTech, Renewable Energy', 'Industry'),
  ('Manufacturing', 'Industry 4.0, Smart Manufacturing', 'Industry'),
  ('Agriculture', 'AgTech, Food Technology', 'Industry'),
  ('Logistics', 'Supply Chain, Transportation', 'Industry'),
  ('Media & Entertainment', 'Content, Gaming, Streaming', 'Industry'),

  -- Functional Expertise
  ('Product Management', 'Product Strategy, Development', 'Functional'),
  ('Go-to-Market', 'Sales, Marketing, Distribution', 'Functional'),
  ('Operations', 'Business Operations, Scaling', 'Functional'),
  ('Finance & Accounting', 'CFO, Financial Planning', 'Functional'),
  ('Legal & Compliance', 'Corporate Law, Regulatory', 'Functional'),
  ('Talent & HR', 'Recruiting, People Operations', 'Functional'),
  ('Data Science', 'Analytics, Business Intelligence', 'Functional'),
  ('UX & Design', 'User Experience, Product Design', 'Functional')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- EXPERTS TABLE (SME Profiles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS experts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Information
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  location TEXT,

  -- Professional Profile
  title TEXT, -- e.g., "Former VP Engineering at Google"
  company TEXT, -- Current company
  bio TEXT, -- Professional background and expertise
  years_of_experience INTEGER,

  -- Expertise Classification
  seniority TEXT NOT NULL DEFAULT 'senior' CHECK (seniority IN ('junior', 'mid', 'senior', 'principal', 'executive')),
  primary_domain_id UUID REFERENCES expertise_domains(id),
  expertise_domain_ids UUID[], -- Array of expertise domain IDs
  industries TEXT[], -- Array of industry specializations
  technical_skills TEXT[], -- Specific technical skills

  -- Availability & Engagement
  availability_status TEXT NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'limited', 'busy', 'unavailable')),
  hourly_rate NUMERIC, -- Optional consultation rate
  preferred_engagement_types TEXT[], -- e.g., ["advisory", "due_diligence", "technical_review"]
  max_monthly_engagements INTEGER DEFAULT 3,

  -- Metrics & Performance
  deals_consulted INTEGER DEFAULT 0,
  average_response_time_hours INTEGER,
  rating_average NUMERIC(3,2), -- Average rating from 1.00 to 5.00
  total_ratings INTEGER DEFAULT 0,

  -- Administrative
  is_active BOOLEAN DEFAULT true,
  notes TEXT, -- Internal notes about the expert
  added_by_user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE expertise_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE experts ENABLE ROW LEVEL SECURITY;

-- Policies for expertise_domains (all internal roles can read)
CREATE POLICY "Internal roles can view expertise domains" ON expertise_domains
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

-- Policies for experts
CREATE POLICY "Internal roles can view experts" ON experts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

CREATE POLICY "Admins can manage experts" ON experts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- EXPERT CONSULTATIONS TABLE (Track when experts are engaged on deals)
-- ============================================================================
CREATE TABLE IF NOT EXISTS expert_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  expert_id UUID NOT NULL REFERENCES experts(id) ON DELETE CASCADE,

  -- Consultation Details
  requested_by_user_id UUID REFERENCES profiles(id),
  consultation_type TEXT, -- e.g., "technical_review", "market_validation", "advisory"
  consultation_areas TEXT[], -- Specific areas of focus

  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'in_progress', 'completed', 'declined')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Scheduling
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Deliverables
  notes TEXT, -- Expert's consultation notes
  recommendation TEXT, -- Expert's recommendation
  confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 5),
  supporting_documents JSONB, -- Links to documents, reports, etc.

  -- Feedback
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(deal_id, expert_id) -- One active consultation per expert per deal
);

-- Enable RLS
ALTER TABLE expert_consultations ENABLE ROW LEVEL SECURITY;

-- Policies for expert_consultations
CREATE POLICY "Internal roles can view consultations" ON expert_consultations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

CREATE POLICY "Internal roles can request consultations" ON expert_consultations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

CREATE POLICY "Internal roles can update consultations" ON expert_consultations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================
CREATE INDEX idx_experts_seniority ON experts(seniority);
CREATE INDEX idx_experts_availability ON experts(availability_status);
CREATE INDEX idx_experts_active ON experts(is_active);
CREATE INDEX idx_experts_primary_domain ON experts(primary_domain_id);
CREATE INDEX idx_expert_consultations_deal ON expert_consultations(deal_id);
CREATE INDEX idx_expert_consultations_expert ON expert_consultations(expert_id);
CREATE INDEX idx_expert_consultations_status ON expert_consultations(status);

-- ============================================================================
-- SEED SAMPLE EXPERTS (for testing/demo)
-- ============================================================================
DO $$
DECLARE
  ai_domain_id UUID;
  saas_domain_id UUID;
  fintech_domain_id UUID;
  product_domain_id UUID;
  gtm_domain_id UUID;
BEGIN
  -- Get domain IDs
  SELECT id INTO ai_domain_id FROM expertise_domains WHERE name = 'Artificial Intelligence';
  SELECT id INTO saas_domain_id FROM expertise_domains WHERE name = 'SaaS & Cloud';
  SELECT id INTO fintech_domain_id FROM expertise_domains WHERE name = 'Fintech';
  SELECT id INTO product_domain_id FROM expertise_domains WHERE name = 'Product Management';
  SELECT id INTO gtm_domain_id FROM expertise_domains WHERE name = 'Go-to-Market';

  -- Insert sample experts
  INSERT INTO experts (
    full_name, email, title, company, bio, years_of_experience,
    seniority, primary_domain_id, expertise_domain_ids, industries,
    technical_skills, availability_status, preferred_engagement_types,
    hourly_rate, deals_consulted, rating_average, is_active
  ) VALUES
  (
    'Dr. Sarah Chen',
    'sarah.chen@example.com',
    'Former Director of AI Research at Meta',
    'Independent Consultant',
    'PhD in Computer Science with 15 years of experience in AI/ML. Led research teams at Meta and Google. Specialized in NLP, computer vision, and production ML systems. Advised 20+ startups on AI strategy.',
    15,
    'executive',
    ai_domain_id,
    ARRAY[ai_domain_id, saas_domain_id],
    ARRAY['Artificial Intelligence', 'Machine Learning', 'SaaS'],
    ARRAY['Python', 'TensorFlow', 'PyTorch', 'MLOps', 'Kubernetes'],
    'available',
    ARRAY['technical_review', 'advisory', 'due_diligence'],
    500,
    12,
    4.8,
    true
  ),
  (
    'Michael Rodriguez',
    'michael.r@example.com',
    'VP of Product at Stripe',
    'Stripe',
    'Built and scaled product organizations from 0 to IPO. Product leader at Stripe, previously at Square and PayPal. Deep expertise in fintech product strategy, payments infrastructure, and marketplace dynamics.',
    12,
    'executive',
    product_domain_id,
    ARRAY[product_domain_id, fintech_domain_id, gtm_domain_id],
    ARRAY['Fintech', 'Payments', 'B2B SaaS'],
    ARRAY['Product Strategy', 'API Design', 'Platform Development'],
    'limited',
    ARRAY['advisory', 'product_review'],
    750,
    8,
    4.9,
    true
  ),
  (
    'Jennifer Wu',
    'jennifer.wu@example.com',
    'Former CMO at HubSpot',
    'Fractional CMO',
    'Built go-to-market engines for multiple B2B SaaS companies. Led marketing at HubSpot through $1B ARR. Expert in PLG, enterprise sales, and content marketing strategies.',
    10,
    'senior',
    gtm_domain_id,
    ARRAY[gtm_domain_id, saas_domain_id],
    ARRAY['B2B SaaS', 'Marketing Tech'],
    ARRAY['Growth Marketing', 'PLG', 'Content Strategy', 'SEO'],
    'available',
    ARRAY['advisory', 'market_validation', 'gtm_strategy'],
    400,
    15,
    4.7,
    true
  );
END $$;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update expert metrics when consultation is completed
CREATE OR REPLACE FUNCTION update_expert_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Increment deals consulted
    UPDATE experts
    SET deals_consulted = deals_consulted + 1,
        updated_at = NOW()
    WHERE id = NEW.expert_id;

    -- Update rating if provided
    IF NEW.rating IS NOT NULL THEN
      UPDATE experts
      SET
        total_ratings = total_ratings + 1,
        rating_average = (
          COALESCE(rating_average * total_ratings, 0) + NEW.rating
        ) / (total_ratings + 1),
        updated_at = NOW()
      WHERE id = NEW.expert_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update expert metrics
CREATE TRIGGER trigger_update_expert_metrics
AFTER UPDATE ON expert_consultations
FOR EACH ROW
EXECUTE FUNCTION update_expert_metrics();

-- Function to get available experts by domain
CREATE OR REPLACE FUNCTION get_available_experts_by_domain(domain_name TEXT)
RETURNS TABLE (
  expert_id UUID,
  expert_name TEXT,
  expert_title TEXT,
  seniority TEXT,
  availability TEXT,
  rating NUMERIC,
  deals_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.full_name,
    e.title,
    e.seniority,
    e.availability_status,
    e.rating_average,
    e.deals_consulted
  FROM experts e
  JOIN expertise_domains ed ON ed.id = e.primary_domain_id
  WHERE ed.name = domain_name
    AND e.is_active = true
    AND e.availability_status IN ('available', 'limited')
  ORDER BY e.rating_average DESC NULLS LAST, e.deals_consulted DESC;
END;
$$ LANGUAGE plpgsql;
