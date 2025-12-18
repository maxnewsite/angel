-- ============================================================================
-- QUICK SETUP: Expert Network & SME Portfolio System
-- ============================================================================
-- Copy and paste this entire script into Supabase SQL Editor and execute
-- This will create all tables, policies, and sample data
-- ============================================================================

-- Create expertise domains table
CREATE TABLE IF NOT EXISTS expertise_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create experts table
CREATE TABLE IF NOT EXISTS experts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  location TEXT,
  title TEXT,
  company TEXT,
  bio TEXT,
  years_of_experience INTEGER,
  seniority TEXT NOT NULL DEFAULT 'senior' CHECK (seniority IN ('junior', 'mid', 'senior', 'principal', 'executive')),
  primary_domain_id UUID REFERENCES expertise_domains(id),
  expertise_domain_ids UUID[],
  industries TEXT[],
  technical_skills TEXT[],
  availability_status TEXT NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'limited', 'busy', 'unavailable')),
  hourly_rate NUMERIC,
  preferred_engagement_types TEXT[],
  max_monthly_engagements INTEGER DEFAULT 3,
  deals_consulted INTEGER DEFAULT 0,
  average_response_time_hours INTEGER,
  rating_average NUMERIC(3,2),
  total_ratings INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  added_by_user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create expert consultations table
CREATE TABLE IF NOT EXISTS expert_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  expert_id UUID NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
  requested_by_user_id UUID REFERENCES profiles(id),
  consultation_type TEXT,
  consultation_areas TEXT[],
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'in_progress', 'completed', 'declined')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  recommendation TEXT,
  confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 5),
  supporting_documents JSONB,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, expert_id)
);

-- Enable RLS
ALTER TABLE expertise_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE experts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_consultations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expertise_domains
DROP POLICY IF EXISTS "Internal roles can view expertise domains" ON expertise_domains;
CREATE POLICY "Internal roles can view expertise domains" ON expertise_domains
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

-- RLS Policies for experts
DROP POLICY IF EXISTS "Internal roles can view experts" ON experts;
CREATE POLICY "Internal roles can view experts" ON experts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

DROP POLICY IF EXISTS "Admins can manage experts" ON experts;
CREATE POLICY "Admins can manage experts" ON experts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- RLS Policies for expert_consultations
DROP POLICY IF EXISTS "Internal roles can view consultations" ON expert_consultations;
CREATE POLICY "Internal roles can view consultations" ON expert_consultations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

DROP POLICY IF EXISTS "Internal roles can request consultations" ON expert_consultations;
CREATE POLICY "Internal roles can request consultations" ON expert_consultations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

DROP POLICY IF EXISTS "Internal roles can update consultations" ON expert_consultations;
CREATE POLICY "Internal roles can update consultations" ON expert_consultations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_experts_seniority ON experts(seniority);
CREATE INDEX IF NOT EXISTS idx_experts_availability ON experts(availability_status);
CREATE INDEX IF NOT EXISTS idx_experts_active ON experts(is_active);
CREATE INDEX IF NOT EXISTS idx_experts_primary_domain ON experts(primary_domain_id);
CREATE INDEX IF NOT EXISTS idx_expert_consultations_deal ON expert_consultations(deal_id);
CREATE INDEX IF NOT EXISTS idx_expert_consultations_expert ON expert_consultations(expert_id);
CREATE INDEX IF NOT EXISTS idx_expert_consultations_status ON expert_consultations(status);

-- Seed expertise domains
INSERT INTO expertise_domains (name, description, category) VALUES
  ('Artificial Intelligence', 'AI, Machine Learning, Deep Learning', 'Technology'),
  ('SaaS & Cloud', 'Software as a Service, Cloud Infrastructure', 'Technology'),
  ('Fintech', 'Financial Technology, Payments, Banking', 'Technology'),
  ('Healthcare Tech', 'Digital Health, MedTech, Biotech', 'Technology'),
  ('Blockchain & Crypto', 'Distributed Ledger, Cryptocurrencies', 'Technology'),
  ('Cybersecurity', 'Information Security, Data Protection', 'Technology'),
  ('IoT & Hardware', 'Internet of Things, Connected Devices', 'Technology'),
  ('Mobile & Apps', 'Mobile Development, App Economy', 'Technology'),
  ('E-commerce', 'Online Retail, Marketplaces', 'Industry'),
  ('Education', 'EdTech, Learning Platforms', 'Industry'),
  ('Real Estate', 'PropTech, Real Estate Technology', 'Industry'),
  ('Energy & Climate', 'CleanTech, Renewable Energy', 'Industry'),
  ('Manufacturing', 'Industry 4.0, Smart Manufacturing', 'Industry'),
  ('Agriculture', 'AgTech, Food Technology', 'Industry'),
  ('Logistics', 'Supply Chain, Transportation', 'Industry'),
  ('Media & Entertainment', 'Content, Gaming, Streaming', 'Industry'),
  ('Product Management', 'Product Strategy, Development', 'Functional'),
  ('Go-to-Market', 'Sales, Marketing, Distribution', 'Functional'),
  ('Operations', 'Business Operations, Scaling', 'Functional'),
  ('Finance & Accounting', 'CFO, Financial Planning', 'Functional'),
  ('Legal & Compliance', 'Corporate Law, Regulatory', 'Functional'),
  ('Talent & HR', 'Recruiting, People Operations', 'Functional'),
  ('Data Science', 'Analytics, Business Intelligence', 'Functional'),
  ('UX & Design', 'User Experience, Product Design', 'Functional')
ON CONFLICT (name) DO NOTHING;

-- Seed sample experts
DO $$
DECLARE
  ai_domain_id UUID;
  saas_domain_id UUID;
  fintech_domain_id UUID;
  product_domain_id UUID;
  gtm_domain_id UUID;
BEGIN
  SELECT id INTO ai_domain_id FROM expertise_domains WHERE name = 'Artificial Intelligence';
  SELECT id INTO saas_domain_id FROM expertise_domains WHERE name = 'SaaS & Cloud';
  SELECT id INTO fintech_domain_id FROM expertise_domains WHERE name = 'Fintech';
  SELECT id INTO product_domain_id FROM expertise_domains WHERE name = 'Product Management';
  SELECT id INTO gtm_domain_id FROM expertise_domains WHERE name = 'Go-to-Market';

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

-- Create helper function to update expert metrics
CREATE OR REPLACE FUNCTION update_expert_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE experts
    SET deals_consulted = deals_consulted + 1,
        updated_at = NOW()
    WHERE id = NEW.expert_id;

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

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_expert_metrics ON expert_consultations;
CREATE TRIGGER trigger_update_expert_metrics
AFTER UPDATE ON expert_consultations
FOR EACH ROW
EXECUTE FUNCTION update_expert_metrics();

-- Create helper function to get available experts by domain
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

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- You can now:
-- 1. Navigate to /app/experts in your application
-- 2. View the 3 sample experts
-- 3. Use filters to search experts
-- 4. (Admin only) Add new experts using the form
-- ============================================================================
