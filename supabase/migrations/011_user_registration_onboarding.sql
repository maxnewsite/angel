-- User Registration & Onboarding System
-- Comprehensive user profile data collection similar to expert classification
-- Includes email verification tracking and onboarding completion status

-- ============================================================================
-- EXTEND PROFILES TABLE - Add comprehensive user data fields
-- ============================================================================

-- Add basic extended profile fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add onboarding tracking fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Investor-specific fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS investor_type TEXT CHECK (
  investor_type IS NULL OR
  investor_type IN ('angel', 'vc', 'family_office', 'institutional', 'corporate', 'syndicate', 'individual')
);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accredited_investor BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS investment_experience_years INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio_size TEXT CHECK (
  portfolio_size IS NULL OR
  portfolio_size IN ('0-5', '5-10', '10-25', '25-50', '50+')
);

-- Investment preferences (stored as arrays for flexibility)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_sectors TEXT[]; -- e.g., ['Fintech', 'AI', 'Healthcare']
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_stages TEXT[]; -- e.g., ['Pre-Seed', 'Seed', 'Series A']
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_geographies TEXT[]; -- e.g., ['North America', 'Europe', 'Asia']

-- Investment capacity
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS min_ticket_size NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_ticket_size NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS typical_ticket_size NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS annual_investment_capacity NUMERIC;

-- Founder-specific fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS founder_experience TEXT CHECK (
  founder_experience IS NULL OR
  founder_experience IN ('first_time', 'serial', 'previously_exited')
);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS previous_exits INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS previous_fundraising_rounds INTEGER DEFAULT 0;

-- Professional background
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS certifications TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specializations TEXT[];

-- Network and references
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_source TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES profiles(id);

-- Privacy and communication preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_profile BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS newsletter_subscribed BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deal_notifications BOOLEAN DEFAULT true;

-- Administrative and compliance
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_policy_accepted BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_policy_accepted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_documents JSONB;

-- Profile completeness tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completeness INTEGER DEFAULT 0 CHECK (
  profile_completeness >= 0 AND profile_completeness <= 100
);

-- ============================================================================
-- CREATE INVESTOR PREFERENCES TABLE (for detailed investment criteria)
-- ============================================================================

CREATE TABLE IF NOT EXISTS investor_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Detailed sector preferences
  sectors_of_interest TEXT[],
  sectors_to_avoid TEXT[],

  -- Stage preferences
  stages_of_interest TEXT[],

  -- Deal characteristics
  min_revenue NUMERIC,
  max_revenue NUMERIC,
  min_team_size INTEGER,
  max_team_size INTEGER,
  require_product_market_fit BOOLEAN DEFAULT false,
  require_revenue BOOLEAN DEFAULT false,

  -- Geographic preferences
  geographies TEXT[],
  remote_ok BOOLEAN DEFAULT true,

  -- Investment thesis
  investment_thesis TEXT,
  portfolio_strategy TEXT,
  value_add_areas TEXT[], -- What value the investor brings

  -- Engagement preferences
  board_seat_interest BOOLEAN DEFAULT false,
  advisory_role_interest BOOLEAN DEFAULT true,
  syndicate_lead_interest BOOLEAN DEFAULT false,

  -- Follow-on preferences
  reserves_for_follow_on BOOLEAN DEFAULT true,
  follow_on_strategy TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(investor_user_id)
);

-- Enable RLS
ALTER TABLE investor_preferences ENABLE ROW LEVEL SECURITY;

-- Investors can manage their own preferences
CREATE POLICY "Users can manage own investor preferences" ON investor_preferences
  FOR ALL USING (auth.uid() = investor_user_id);

-- Internal roles can view all preferences (for deal matching)
CREATE POLICY "Internal roles can view investor preferences" ON investor_preferences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

-- ============================================================================
-- CREATE ONBOARDING STEPS TABLE (track multi-step onboarding progress)
-- ============================================================================

CREATE TABLE IF NOT EXISTS onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  step_name TEXT NOT NULL, -- e.g., 'role_selection', 'basic_info', 'investor_profile', 'preferences'
  step_order INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  data JSONB, -- Store step-specific data

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, step_name)
);

-- Enable RLS
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;

-- Users can manage their own onboarding steps
CREATE POLICY "Users can manage own onboarding steps" ON onboarding_steps
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- CREATE EMAIL VERIFICATION TOKENS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Public read for token verification
CREATE POLICY "Anyone can verify tokens" ON email_verification_tokens
  FOR SELECT USING (true);

-- Only system can create tokens (via functions)
CREATE POLICY "System can create tokens" ON email_verification_tokens
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified ON profiles(email_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_investor_type ON profiles(investor_type);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_investor_preferences_user ON investor_preferences(investor_user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_user ON onboarding_steps(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_completed ON onboarding_steps(user_id, completed);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate profile completeness score
CREATE OR REPLACE FUNCTION calculate_profile_completeness(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  profile_record RECORD;
BEGIN
  SELECT * INTO profile_record FROM profiles WHERE id = user_id;

  IF profile_record IS NULL THEN
    RETURN 0;
  END IF;

  -- Basic fields (40 points total)
  IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN score := score + 10; END IF;
  IF profile_record.email IS NOT NULL AND profile_record.email != '' THEN score := score + 10; END IF;
  IF profile_record.phone IS NOT NULL AND profile_record.phone != '' THEN score := score + 5; END IF;
  IF profile_record.location IS NOT NULL AND profile_record.location != '' THEN score := score + 5; END IF;
  IF profile_record.linkedin_url IS NOT NULL AND profile_record.linkedin_url != '' THEN score := score + 5; END IF;
  IF profile_record.bio IS NOT NULL AND profile_record.bio != '' THEN score := score + 5; END IF;

  -- Professional fields (20 points total)
  IF profile_record.company IS NOT NULL AND profile_record.company != '' THEN score := score + 10; END IF;
  IF profile_record.title IS NOT NULL AND profile_record.title != '' THEN score := score + 10; END IF;

  -- Role-specific fields (40 points total)
  IF profile_record.role = 'investor' THEN
    IF profile_record.investor_type IS NOT NULL THEN score := score + 10; END IF;
    IF profile_record.accredited_investor IS NOT NULL THEN score := score + 5; END IF;
    IF profile_record.preferred_sectors IS NOT NULL AND array_length(profile_record.preferred_sectors, 1) > 0 THEN score := score + 10; END IF;
    IF profile_record.preferred_stages IS NOT NULL AND array_length(profile_record.preferred_stages, 1) > 0 THEN score := score + 10; END IF;
    IF profile_record.typical_ticket_size IS NOT NULL THEN score := score + 5; END IF;
  ELSIF profile_record.role = 'founder' THEN
    IF profile_record.founder_experience IS NOT NULL THEN score := score + 10; END IF;
    IF profile_record.specializations IS NOT NULL AND array_length(profile_record.specializations, 1) > 0 THEN score := score + 15; END IF;
    IF profile_record.education IS NOT NULL AND array_length(profile_record.education, 1) > 0 THEN score := score + 15; END IF;
  END IF;

  RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql;

-- Function to mark onboarding as complete
CREATE OR REPLACE FUNCTION complete_onboarding(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET
    onboarding_completed = true,
    onboarding_completed_at = NOW(),
    profile_completeness = calculate_profile_completeness(user_id),
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to verify email
CREATE OR REPLACE FUNCTION verify_email(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET
    email_verified = true,
    email_verified_at = NOW(),
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update profile_completeness when profile is updated
CREATE OR REPLACE FUNCTION trigger_update_profile_completeness()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profile_completeness := calculate_profile_completeness(NEW.id);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profile_completeness_trigger
BEFORE UPDATE ON profiles
FOR EACH ROW
WHEN (
  OLD.full_name IS DISTINCT FROM NEW.full_name OR
  OLD.email IS DISTINCT FROM NEW.email OR
  OLD.phone IS DISTINCT FROM NEW.phone OR
  OLD.location IS DISTINCT FROM NEW.location OR
  OLD.linkedin_url IS DISTINCT FROM NEW.linkedin_url OR
  OLD.bio IS DISTINCT FROM NEW.bio OR
  OLD.company IS DISTINCT FROM NEW.company OR
  OLD.title IS DISTINCT FROM NEW.title OR
  OLD.investor_type IS DISTINCT FROM NEW.investor_type OR
  OLD.preferred_sectors IS DISTINCT FROM NEW.preferred_sectors OR
  OLD.preferred_stages IS DISTINCT FROM NEW.preferred_stages
)
EXECUTE FUNCTION trigger_update_profile_completeness();

-- ============================================================================
-- UPDATE EXISTING RLS POLICIES
-- ============================================================================

-- Update profiles policies to ensure users can update their own onboarding data
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN profiles.onboarding_completed IS 'Whether user has completed the onboarding process';
COMMENT ON COLUMN profiles.email_verified IS 'Whether user email has been verified (synced from Supabase Auth)';
COMMENT ON COLUMN profiles.investor_type IS 'Type of investor: angel, vc, family_office, institutional, corporate, syndicate, individual';
COMMENT ON COLUMN profiles.accredited_investor IS 'Whether investor is accredited (for compliance)';
COMMENT ON COLUMN profiles.profile_completeness IS 'Percentage of profile completion (0-100)';
COMMENT ON TABLE investor_preferences IS 'Detailed investment criteria and preferences for investors';
COMMENT ON TABLE onboarding_steps IS 'Tracks multi-step onboarding progress for each user';
COMMENT ON FUNCTION calculate_profile_completeness IS 'Calculates profile completeness score (0-100) based on filled fields';
COMMENT ON FUNCTION complete_onboarding IS 'Marks user onboarding as complete and calculates profile completeness';
COMMENT ON FUNCTION verify_email IS 'Marks user email as verified';
