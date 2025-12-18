-- ============================================================================
-- DEALFLOW ANALYTICS VIEWS AND FUNCTIONS
-- ============================================================================
-- Purpose: Comprehensive analytics for deal pipeline waterfall and statistics
-- Created: 2025-12-18
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DEALFLOW WATERFALL STATISTICS VIEW
-- ----------------------------------------------------------------------------
-- Provides key metrics for the dealflow funnel visualization
CREATE OR REPLACE VIEW dealflow_waterfall_stats AS
WITH deal_stages AS (
  SELECT
    -- Stage 1: Total Deals Received (submitted or beyond)
    COUNT(*) FILTER (WHERE status != 'draft') AS total_deals_received,

    -- Stage 2: Deals in Screening (screening_in_progress)
    COUNT(*) FILTER (WHERE status = 'screening_in_progress') AS deals_in_screening,

    -- Stage 3: Deals Approved to IC (screening_approved + moved to IC)
    COUNT(*) FILTER (WHERE status IN ('screening_approved', 'ic_in_review', 'published')) AS deals_approved_to_ic,

    -- Stage 4: Deals Currently in IC Review
    COUNT(*) FILTER (WHERE status = 'ic_in_review') AS deals_in_ic_review,

    -- Stage 5: Deals Recommended by IC Chair
    COUNT(DISTINCT icd.deal_id) FILTER (WHERE icd.decision = 'approve') AS deals_ic_chair_recommended,

    -- Stage 6: Deals Published (approved by IC and published)
    COUNT(*) FILTER (WHERE status = 'published') AS deals_published,

    -- Stage 7: Deals Rejected at Screening
    COUNT(*) FILTER (WHERE status = 'screening_rejected') AS deals_screening_rejected,

    -- Stage 8: Deals Rejected at IC
    COUNT(*) FILTER (WHERE status = 'ic_rejected') AS deals_ic_rejected,

    -- Stage 9: Deals Archived
    COUNT(*) FILTER (WHERE status = 'archived') AS deals_archived

  FROM deals d
  LEFT JOIN ic_decisions icd ON d.id = icd.deal_id
),
investor_interest AS (
  SELECT
    -- Total interest amount from investors on published deals
    COALESCE(SUM(i.indicative_ticket), 0) AS total_interest_amount,

    -- Count of positive investor signals
    COUNT(*) FILTER (WHERE i.signal = 'yes') AS positive_interest_count,

    -- Count of maybe signals
    COUNT(*) FILTER (WHERE i.signal = 'maybe') AS maybe_interest_count,

    -- Number of deals with investor interest
    COUNT(DISTINCT i.deal_id) AS deals_with_interest

  FROM interests i
  INNER JOIN deals d ON i.deal_id = d.id
  WHERE d.status = 'published'
),
ic_voting_stats AS (
  SELECT
    -- IC approval metrics
    COUNT(DISTINCT deal_id) FILTER (
      WHERE vote = 'yes'
    ) AS deals_with_ic_yes_votes,

    -- Average IC confidence on approvals
    AVG(confidence) FILTER (WHERE vote = 'yes') AS avg_ic_confidence_on_yes

  FROM ic_votes
)
SELECT
  ds.*,
  ii.total_interest_amount,
  ii.positive_interest_count,
  ii.maybe_interest_count,
  ii.deals_with_interest,
  ics.deals_with_ic_yes_votes,
  ics.avg_ic_confidence_on_yes,

  -- Conversion rates
  CASE
    WHEN ds.total_deals_received > 0
    THEN ROUND((ds.deals_approved_to_ic::numeric / ds.total_deals_received * 100), 2)
    ELSE 0
  END AS screening_approval_rate,

  CASE
    WHEN ds.deals_approved_to_ic > 0
    THEN ROUND((ds.deals_published::numeric / ds.deals_approved_to_ic * 100), 2)
    ELSE 0
  END AS ic_approval_rate,

  CASE
    WHEN ds.total_deals_received > 0
    THEN ROUND((ds.deals_published::numeric / ds.total_deals_received * 100), 2)
    ELSE 0
  END AS overall_conversion_rate,

  CASE
    WHEN ds.deals_published > 0
    THEN ROUND((ii.deals_with_interest::numeric / ds.deals_published * 100), 2)
    ELSE 0
  END AS investor_interest_rate

FROM deal_stages ds
CROSS JOIN investor_interest ii
CROSS JOIN ic_voting_stats ics;

-- Grant access to authenticated users
GRANT SELECT ON dealflow_waterfall_stats TO authenticated;

COMMENT ON VIEW dealflow_waterfall_stats IS 'Dealflow waterfall statistics for pipeline visualization and analytics';


-- ----------------------------------------------------------------------------
-- 2. DEAL VELOCITY METRICS VIEW
-- ----------------------------------------------------------------------------
-- Tracks time spent in each stage of the dealflow
CREATE OR REPLACE VIEW deal_velocity_metrics AS
SELECT
  d.id AS deal_id,
  d.status,
  s.name AS startup_name,
  d.created_at,
  d.submitted_at,
  d.approved_at,
  d.published_at,

  -- Time in each stage (in days)
  CASE
    WHEN d.submitted_at IS NOT NULL
    THEN EXTRACT(DAY FROM (d.submitted_at - d.created_at))
    ELSE NULL
  END AS days_draft_to_submit,

  CASE
    WHEN d.approved_at IS NOT NULL AND d.submitted_at IS NOT NULL
    THEN EXTRACT(DAY FROM (d.approved_at - d.submitted_at))
    ELSE NULL
  END AS days_screening,

  CASE
    WHEN d.published_at IS NOT NULL AND d.approved_at IS NOT NULL
    THEN EXTRACT(DAY FROM (d.published_at - d.approved_at))
    ELSE NULL
  END AS days_ic_review,

  CASE
    WHEN d.published_at IS NOT NULL
    THEN EXTRACT(DAY FROM (d.published_at - d.created_at))
    ELSE NULL
  END AS total_days_to_publish

FROM deals d
INNER JOIN startups s ON d.startup_id = s.id
WHERE d.status != 'draft';

GRANT SELECT ON deal_velocity_metrics TO authenticated;

COMMENT ON VIEW deal_velocity_metrics IS 'Time-to-decision metrics for each deal across pipeline stages';


-- ----------------------------------------------------------------------------
-- 3. SECTOR PERFORMANCE ANALYTICS VIEW
-- ----------------------------------------------------------------------------
-- Analyzes deal performance by sector
CREATE OR REPLACE VIEW sector_analytics AS
SELECT
  s.sector,
  COUNT(d.id) AS total_deals,
  COUNT(*) FILTER (WHERE d.status = 'published') AS deals_published,
  COUNT(*) FILTER (WHERE d.status = 'screening_rejected') AS deals_rejected_screening,
  COUNT(*) FILTER (WHERE d.status = 'ic_rejected') AS deals_rejected_ic,

  -- Average deal size by sector
  ROUND(AVG(d.target_amount), 2) AS avg_target_amount,
  ROUND(AVG(d.valuation), 2) AS avg_valuation,

  -- Success rates
  CASE
    WHEN COUNT(d.id) > 0
    THEN ROUND((COUNT(*) FILTER (WHERE d.status = 'published')::numeric / COUNT(d.id) * 100), 2)
    ELSE 0
  END AS publish_rate,

  -- Average screening scores for published vs rejected
  (
    SELECT ROUND(AVG(sr.overall_score), 2)
    FROM screening_reviews sr
    INNER JOIN deals d2 ON sr.deal_id = d2.id
    INNER JOIN startups s2 ON d2.startup_id = s2.id
    WHERE s2.sector = s.sector AND d2.status = 'published'
  ) AS avg_score_published_deals,

  (
    SELECT ROUND(AVG(sr.overall_score), 2)
    FROM screening_reviews sr
    INNER JOIN deals d2 ON sr.deal_id = d2.id
    INNER JOIN startups s2 ON d2.startup_id = s2.id
    WHERE s2.sector = s.sector AND d2.status IN ('screening_rejected', 'ic_rejected')
  ) AS avg_score_rejected_deals

FROM startups s
INNER JOIN deals d ON s.id = d.startup_id
WHERE d.status != 'draft'
GROUP BY s.sector
ORDER BY total_deals DESC;

GRANT SELECT ON sector_analytics TO authenticated;

COMMENT ON VIEW sector_analytics IS 'Performance metrics segmented by startup sector';


-- ----------------------------------------------------------------------------
-- 4. IC MEMBER PERFORMANCE VIEW
-- ----------------------------------------------------------------------------
-- Tracks IC member voting patterns and activity
CREATE OR REPLACE VIEW ic_member_performance AS
SELECT
  p.id AS ic_member_id,
  p.full_name AS ic_member_name,
  COUNT(icv.id) AS total_votes,

  -- Vote distribution
  COUNT(*) FILTER (WHERE icv.vote = 'yes') AS yes_votes,
  COUNT(*) FILTER (WHERE icv.vote = 'no') AS no_votes,
  COUNT(*) FILTER (WHERE icv.vote = 'abstain') AS abstain_votes,

  -- Vote percentages
  CASE
    WHEN COUNT(icv.id) > 0
    THEN ROUND((COUNT(*) FILTER (WHERE icv.vote = 'yes')::numeric / COUNT(icv.id) * 100), 2)
    ELSE 0
  END AS yes_vote_percentage,

  -- Average confidence levels
  ROUND(AVG(icv.confidence) FILTER (WHERE icv.vote = 'yes'), 2) AS avg_confidence_yes,
  ROUND(AVG(icv.confidence) FILTER (WHERE icv.vote = 'no'), 2) AS avg_confidence_no,
  ROUND(AVG(icv.confidence), 2) AS avg_confidence_overall,

  -- Alignment with final IC decision
  (
    SELECT COUNT(*)
    FROM ic_votes icv2
    INNER JOIN ic_decisions icd ON icv2.deal_id = icd.deal_id
    WHERE icv2.ic_member_user_id = p.id
    AND (
      (icv2.vote = 'yes' AND icd.decision = 'approve') OR
      (icv2.vote = 'no' AND icd.decision = 'reject')
    )
  ) AS votes_aligned_with_chair,

  -- Participation rate (votes / total IC deals)
  CASE
    WHEN (SELECT COUNT(DISTINCT deal_id) FROM ic_votes) > 0
    THEN ROUND((COUNT(DISTINCT icv.deal_id)::numeric / (SELECT COUNT(DISTINCT deal_id) FROM ic_votes) * 100), 2)
    ELSE 0
  END AS participation_rate

FROM profiles p
LEFT JOIN ic_votes icv ON p.id = icv.ic_member_user_id
WHERE p.role = 'ic_member'
GROUP BY p.id, p.full_name
ORDER BY total_votes DESC;

GRANT SELECT ON ic_member_performance TO authenticated;

COMMENT ON VIEW ic_member_performance IS 'IC member voting patterns and participation metrics';


-- ----------------------------------------------------------------------------
-- 5. DEALFLOW MANAGER PRODUCTIVITY VIEW
-- ----------------------------------------------------------------------------
-- Tracks manager screening activity and performance
CREATE OR REPLACE VIEW manager_productivity AS
SELECT
  p.id AS manager_id,
  p.full_name AS manager_name,
  COUNT(DISTINCT sr.deal_id) AS deals_reviewed,

  -- Decision distribution
  COUNT(*) FILTER (WHERE sr.decision = 'approve') AS deals_approved,
  COUNT(*) FILTER (WHERE sr.decision = 'reject') AS deals_rejected,
  COUNT(*) FILTER (WHERE sr.decision = 'needs_info') AS deals_needs_info,

  -- Approval rate
  CASE
    WHEN COUNT(DISTINCT sr.deal_id) > 0
    THEN ROUND((COUNT(*) FILTER (WHERE sr.decision = 'approve')::numeric / COUNT(DISTINCT sr.deal_id) * 100), 2)
    ELSE 0
  END AS approval_rate,

  -- Average scores
  ROUND(AVG(sr.overall_score), 2) AS avg_overall_score,
  ROUND(AVG(sr.overall_score) FILTER (WHERE sr.decision = 'approve'), 2) AS avg_score_approved,
  ROUND(AVG(sr.overall_score) FILTER (WHERE sr.decision = 'reject'), 2) AS avg_score_rejected,

  -- IC conversion of manager approvals
  (
    SELECT COUNT(*)
    FROM screening_reviews sr2
    INNER JOIN deals d ON sr2.deal_id = d.id
    WHERE sr2.manager_user_id = p.id
    AND sr2.decision = 'approve'
    AND d.status = 'published'
  ) AS approved_deals_published,

  -- Average time to review (days)
  ROUND(AVG(EXTRACT(DAY FROM (sr.created_at - d.submitted_at))), 2) AS avg_days_to_review

FROM profiles p
LEFT JOIN screening_reviews sr ON p.id = sr.manager_user_id
LEFT JOIN deals d ON sr.deal_id = d.id
WHERE p.role = 'dealflow_manager'
GROUP BY p.id, p.full_name
ORDER BY deals_reviewed DESC;

GRANT SELECT ON manager_productivity TO authenticated;

COMMENT ON VIEW manager_productivity IS 'Dealflow manager screening productivity and decision quality metrics';


-- ----------------------------------------------------------------------------
-- 6. MONTHLY DEALFLOW TRENDS VIEW
-- ----------------------------------------------------------------------------
-- Tracks dealflow volume and conversion over time
CREATE OR REPLACE VIEW monthly_dealflow_trends AS
WITH monthly_interest AS (
  SELECT
    DATE_TRUNC('month', d.published_at) AS month,
    COALESCE(SUM(i.indicative_ticket) FILTER (WHERE i.signal = 'yes'), 0) AS total_interest_amount
  FROM deals d
  LEFT JOIN interests i ON d.id = i.deal_id
  WHERE d.published_at IS NOT NULL
  GROUP BY DATE_TRUNC('month', d.published_at)
)
SELECT
  DATE_TRUNC('month', d.submitted_at) AS month,
  COUNT(*) AS deals_submitted,
  COUNT(*) FILTER (WHERE d.status IN ('screening_approved', 'ic_in_review', 'published')) AS deals_passed_screening,
  COUNT(*) FILTER (WHERE d.status = 'published') AS deals_published,

  -- Conversion rates
  CASE
    WHEN COUNT(*) > 0
    THEN ROUND((COUNT(*) FILTER (WHERE d.status IN ('screening_approved', 'ic_in_review', 'published'))::numeric / COUNT(*) * 100), 2)
    ELSE 0
  END AS screening_pass_rate,

  CASE
    WHEN COUNT(*) > 0
    THEN ROUND((COUNT(*) FILTER (WHERE d.status = 'published')::numeric / COUNT(*) * 100), 2)
    ELSE 0
  END AS overall_conversion_rate,

  -- Average deal size
  ROUND(AVG(d.target_amount), 2) AS avg_target_amount,

  -- Total capital sought
  SUM(d.target_amount) AS total_capital_sought,

  -- Total investor interest generated (matched by month)
  COALESCE(mi.total_interest_amount, 0) AS total_interest_amount

FROM deals d
LEFT JOIN monthly_interest mi ON DATE_TRUNC('month', d.submitted_at) = mi.month
WHERE d.submitted_at IS NOT NULL
GROUP BY DATE_TRUNC('month', d.submitted_at), mi.total_interest_amount
ORDER BY month DESC;

GRANT SELECT ON monthly_dealflow_trends TO authenticated;

COMMENT ON VIEW monthly_dealflow_trends IS 'Monthly dealflow volume and conversion trend analysis';


-- ----------------------------------------------------------------------------
-- 7. INVESTOR INTEREST ANALYTICS VIEW
-- ----------------------------------------------------------------------------
-- Analyzes investor participation and commitment patterns
CREATE OR REPLACE VIEW investor_interest_analytics AS
SELECT
  p.id AS investor_id,
  p.full_name AS investor_name,
  COUNT(DISTINCT i.deal_id) AS deals_viewed,

  -- Interest signals
  COUNT(*) FILTER (WHERE i.signal = 'yes') AS yes_signals,
  COUNT(*) FILTER (WHERE i.signal = 'maybe') AS maybe_signals,
  COUNT(*) FILTER (WHERE i.signal = 'no') AS no_signals,

  -- Commitment amounts
  COALESCE(SUM(i.indicative_ticket) FILTER (WHERE i.signal = 'yes'), 0) AS total_committed,
  COALESCE(SUM(i.indicative_ticket) FILTER (WHERE i.signal = 'maybe'), 0) AS total_maybe_committed,
  ROUND(AVG(i.indicative_ticket) FILTER (WHERE i.signal = 'yes'), 2) AS avg_ticket_size,

  -- Participation rate
  CASE
    WHEN (SELECT COUNT(DISTINCT id) FROM deals WHERE status = 'published') > 0
    THEN ROUND((COUNT(DISTINCT i.deal_id)::numeric / (SELECT COUNT(DISTINCT id) FROM deals WHERE status = 'published') * 100), 2)
    ELSE 0
  END AS participation_rate

FROM profiles p
LEFT JOIN interests i ON p.id = i.investor_user_id
WHERE p.role = 'investor'
GROUP BY p.id, p.full_name
ORDER BY total_committed DESC;

GRANT SELECT ON investor_interest_analytics TO authenticated;

COMMENT ON VIEW investor_interest_analytics IS 'Investor participation and commitment pattern analysis';


-- ----------------------------------------------------------------------------
-- 8. FUNCTION: Get Waterfall Data for Specific Time Period
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_dealflow_waterfall(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  stage TEXT,
  deal_count BIGINT,
  conversion_rate NUMERIC,
  amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_deals AS (
    SELECT *
    FROM deals
    WHERE (start_date IS NULL OR submitted_at >= start_date)
    AND (end_date IS NULL OR submitted_at <= end_date)
  ),
  stage_counts AS (
    SELECT
      'Deals Received' AS stage,
      1 AS stage_order,
      COUNT(*) FILTER (WHERE status != 'draft') AS deal_count,
      NULL::NUMERIC AS amount
    FROM filtered_deals

    UNION ALL

    SELECT
      'Screening Approved',
      2,
      COUNT(*) FILTER (WHERE status IN ('screening_approved', 'ic_in_review', 'published')),
      NULL
    FROM filtered_deals

    UNION ALL

    SELECT
      'Sent to IC',
      3,
      COUNT(*) FILTER (WHERE status IN ('ic_in_review', 'published')),
      NULL
    FROM filtered_deals

    UNION ALL

    SELECT
      'IC Chair Recommended',
      4,
      COUNT(DISTINCT icd.deal_id) FILTER (WHERE icd.decision = 'approve'),
      NULL
    FROM filtered_deals fd
    LEFT JOIN ic_decisions icd ON fd.id = icd.deal_id

    UNION ALL

    SELECT
      'Published to Investors',
      5,
      COUNT(*) FILTER (WHERE status = 'published'),
      NULL
    FROM filtered_deals

    UNION ALL

    SELECT
      'Investor Interest',
      6,
      COUNT(DISTINCT i.deal_id),
      SUM(i.indicative_ticket) FILTER (WHERE i.signal = 'yes')
    FROM filtered_deals fd
    INNER JOIN interests i ON fd.id = i.deal_id
    WHERE fd.status = 'published'
  )
  SELECT
    sc.stage,
    sc.deal_count,
    CASE
      WHEN LAG(sc.deal_count) OVER (ORDER BY sc.stage_order) > 0
      THEN ROUND((sc.deal_count::NUMERIC / LAG(sc.deal_count) OVER (ORDER BY sc.stage_order) * 100), 2)
      ELSE 100.0
    END AS conversion_rate,
    sc.amount
  FROM stage_counts sc
  ORDER BY sc.stage_order;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_dealflow_waterfall TO authenticated;

COMMENT ON FUNCTION get_dealflow_waterfall IS 'Returns dealflow waterfall data for specified date range';


-- ----------------------------------------------------------------------------
-- 9. FUNCTION: Get Key Performance Indicators (KPIs)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_dealflow_kpis(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  kpi_name TEXT,
  kpi_value NUMERIC,
  kpi_unit TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_deals AS (
    SELECT *
    FROM deals
    WHERE (start_date IS NULL OR submitted_at >= start_date)
    AND (end_date IS NULL OR submitted_at <= end_date)
  )
  SELECT 'Total Deals Received'::TEXT, COUNT(*)::NUMERIC, 'deals'::TEXT
  FROM filtered_deals WHERE status != 'draft'

  UNION ALL

  SELECT 'Overall Conversion Rate',
    CASE
      WHEN COUNT(*) FILTER (WHERE status != 'draft') > 0
      THEN ROUND((COUNT(*) FILTER (WHERE status = 'published')::NUMERIC / COUNT(*) FILTER (WHERE status != 'draft') * 100), 2)
      ELSE 0
    END,
    '%'
  FROM filtered_deals

  UNION ALL

  SELECT 'Average Screening Score',
    ROUND(AVG(sr.overall_score), 2),
    'score (1-5)'
  FROM filtered_deals fd
  LEFT JOIN screening_reviews sr ON fd.id = sr.deal_id

  UNION ALL

  SELECT 'Total Investor Interest',
    COALESCE(SUM(i.indicative_ticket) FILTER (WHERE i.signal = 'yes'), 0),
    'USD'
  FROM filtered_deals fd
  LEFT JOIN interests i ON fd.id = i.deal_id
  WHERE fd.status = 'published'

  UNION ALL

  SELECT 'Average Days to Publish',
    ROUND(AVG(EXTRACT(DAY FROM (published_at - submitted_at))), 2),
    'days'
  FROM filtered_deals
  WHERE published_at IS NOT NULL

  UNION ALL

  SELECT 'IC Approval Rate',
    CASE
      WHEN COUNT(*) FILTER (WHERE status IN ('ic_in_review', 'ic_rejected', 'published')) > 0
      THEN ROUND((COUNT(*) FILTER (WHERE status = 'published')::NUMERIC / COUNT(*) FILTER (WHERE status IN ('ic_in_review', 'ic_rejected', 'published')) * 100), 2)
      ELSE 0
    END,
    '%'
  FROM filtered_deals;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_dealflow_kpis TO authenticated;

COMMENT ON FUNCTION get_dealflow_kpis IS 'Returns key performance indicators for dealflow within date range';


-- ----------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ----------------------------------------------------------------------------

-- Index for dealflow waterfall queries
CREATE INDEX IF NOT EXISTS idx_deals_status_dates
ON deals(status, submitted_at, approved_at, published_at);

-- Index for investor interest queries
CREATE INDEX IF NOT EXISTS idx_interests_signal_ticket
ON interests(signal, indicative_ticket);

-- Index for IC voting queries
CREATE INDEX IF NOT EXISTS idx_ic_votes_vote_confidence
ON ic_votes(vote, confidence);

-- Index for screening reviews
CREATE INDEX IF NOT EXISTS idx_screening_reviews_decision
ON screening_reviews(decision, overall_score);

-- Index for date-based queries (submitted_at is sufficient for monthly grouping)
CREATE INDEX IF NOT EXISTS idx_deals_submitted_at
ON deals(submitted_at) WHERE submitted_at IS NOT NULL;

-- Index for published_at date queries
CREATE INDEX IF NOT EXISTS idx_deals_published_at
ON deals(published_at) WHERE published_at IS NOT NULL;


-- ============================================================================
-- ANALYTICS VIEWS SUMMARY
-- ============================================================================
--
-- 1. dealflow_waterfall_stats - Core waterfall metrics and conversion rates
-- 2. deal_velocity_metrics - Time-to-decision tracking
-- 3. sector_analytics - Sector performance comparison
-- 4. ic_member_performance - IC voting patterns
-- 5. manager_productivity - Dealflow manager efficiency
-- 6. monthly_dealflow_trends - Time-series trend analysis
-- 7. investor_interest_analytics - Investor participation metrics
-- 8. get_dealflow_waterfall() - Filtered waterfall data function
-- 9. get_dealflow_kpis() - Key performance indicators function
--
-- All views and functions are granted to authenticated users
-- Indexes created for optimal query performance
-- ============================================================================
