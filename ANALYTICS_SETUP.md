# Dealflow Analytics Setup Guide

## Overview

This analytics module provides comprehensive dealflow statistics with visual waterfall charts and performance metrics for the AngelOS platform.

## Features Implemented

### 📊 Waterfall Visualization
- **Deal Pipeline Flow**: Visual representation from submission to investor interest
- **Conversion Rates**: Stage-by-stage conversion tracking
- **Drop-off Analysis**: Identifies where deals exit the pipeline
- **Interest Collection**: Total investor commitment amounts tracked

### 📈 Analytics Views

1. **Dealflow Waterfall Stats** (`dealflow_waterfall_stats`)
   - Total deals at each pipeline stage
   - Conversion rates between stages
   - Investor interest metrics
   - IC voting statistics

2. **Deal Velocity Metrics** (`deal_velocity_metrics`)
   - Time-to-decision tracking
   - Days in each pipeline stage
   - Total time from submission to publication

3. **Sector Analytics** (`sector_analytics`)
   - Performance by industry sector
   - Success rates by sector
   - Average deal sizes and valuations
   - Screening score comparisons

4. **IC Member Performance** (`ic_member_performance`)
   - Individual voting patterns
   - Yes/No/Abstain distributions
   - Confidence levels
   - Alignment with IC Chair decisions
   - Participation rates

5. **Manager Productivity** (`manager_productivity`)
   - Deals reviewed per manager
   - Approval rates
   - Average screening scores
   - Time-to-review metrics

6. **Monthly Dealflow Trends** (`monthly_dealflow_trends`)
   - Volume trends over time
   - Conversion rate evolution
   - Capital sought vs. interest generated
   - Time-series analysis

7. **Investor Interest Analytics** (`investor_interest_analytics`)
   - Investor participation patterns
   - Commitment amounts by investor
   - Signal distributions (yes/maybe/no)
   - Average ticket sizes

### 🔧 SQL Functions

1. **`get_dealflow_waterfall(start_date, end_date)`**
   - Returns waterfall data for specific time periods
   - Useful for quarterly/yearly reports
   - Includes conversion rates between stages

2. **`get_dealflow_kpis(start_date, end_date)`**
   - Key performance indicators
   - Filterable by date range
   - Returns formatted metrics for dashboards

## Installation Steps

### 1. Apply SQL Migration

You have two options to apply the migration:

#### Option A: Using Supabase CLI (Recommended)

```bash
# Navigate to project directory
cd C:\Users\spiri\angel2

# Apply the migration
npx supabase db push
```

#### Option B: Manual Application via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the migration file: `supabase/migrations/20251218_dealflow_analytics.sql`
4. Copy and paste the entire SQL content
5. Click **Run** to execute

### 2. Verify Installation

Run this query in Supabase SQL Editor to verify views are created:

```sql
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name LIKE '%analytics%' OR table_name LIKE '%waterfall%';
```

Expected results:
- `dealflow_waterfall_stats`
- `deal_velocity_metrics`
- `sector_analytics`
- `ic_member_performance`
- `manager_productivity`
- `monthly_dealflow_trends`
- `investor_interest_analytics`

### 3. Test the Analytics Page

1. Start your development server:
```bash
npm run dev
```

2. Navigate to: `http://localhost:3000/app/analytics`

3. Login with a user that has one of these roles:
   - `admin`
   - `dealflow_manager`
   - `ic_chair`
   - `ic_member`

## Data Requirements

The analytics will work with **existing data** in your Supabase database. No mock data is created.

### Minimum Data for Meaningful Analytics

For best results, ensure you have:
- ✅ At least 5-10 deals in various statuses
- ✅ Some completed screening reviews
- ✅ IC votes on deals
- ✅ At least one IC chair decision
- ✅ Investor interest signals on published deals

### If Database is Empty

The analytics page will still load, but will show:
- Zero values in KPI cards
- Empty charts
- "No data" states in tables

You can populate test data by:
1. Creating deals through the platform UI
2. Submitting them for review
3. Completing screening evaluations
4. Running IC votes
5. Publishing deals
6. Recording investor interest

## Key Metrics Explained

### Pipeline Stages

```
Deals Received
    ↓ (Screening)
Screening Approved → Approved to IC
    ↓ (IC Review)
IC Chair Recommended
    ↓ (Publication)
Published to Investors
    ↓ (Syndication)
Investor Interest Collected
```

### Conversion Rates

- **Screening Approval Rate**: (Approved to IC / Total Received) × 100
- **IC Approval Rate**: (Published / Approved to IC) × 100
- **Overall Conversion**: (Published / Total Received) × 100
- **Investor Interest Rate**: (Deals with Interest / Published) × 100

### Interest Amount

Total investor commitment = Sum of all `indicative_ticket` values where `signal = 'yes'`

## Performance Optimizations

The migration includes indexes for optimal query performance:

- `idx_deals_status_dates` - Fast filtering by status and dates
- `idx_interests_signal_ticket` - Quick investor interest aggregation
- `idx_ic_votes_vote_confidence` - Efficient IC voting queries
- `idx_screening_reviews_decision` - Screening decision lookups
- `idx_deals_submitted_month` - Monthly trend calculations

## Troubleshooting

### Views Not Showing Data

**Check permissions:**
```sql
SELECT * FROM dealflow_waterfall_stats;
```

If you get permission errors, ensure you're logged in as an authenticated user.

### Slow Performance

**Check if indexes are created:**
```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';
```

### Migration Conflicts

If you get errors about existing objects:

1. Drop existing views:
```sql
DROP VIEW IF EXISTS dealflow_waterfall_stats CASCADE;
DROP VIEW IF EXISTS deal_velocity_metrics CASCADE;
-- ... repeat for all views
```

2. Reapply the migration

### Empty Charts

Verify you have data:
```sql
-- Check deal counts
SELECT status, COUNT(*)
FROM deals
GROUP BY status;

-- Check investor interest
SELECT signal, COUNT(*), SUM(indicative_ticket)
FROM interests
GROUP BY signal;
```

## Customization

### Add Custom Metrics

Edit the SQL views in the migration file to add new calculated fields:

```sql
-- Example: Add average time to IC decision
ALTER VIEW dealflow_waterfall_stats ADD COLUMN avg_days_to_ic NUMERIC;
```

### Filter by Date Range

Use the provided functions for time-based analysis:

```sql
-- Q4 2024 waterfall
SELECT * FROM get_dealflow_waterfall('2024-10-01', '2024-12-31');

-- Last 30 days KPIs
SELECT * FROM get_dealflow_kpis(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE);
```

### Export Data

All analytics data can be exported via Supabase API or SQL queries:

```javascript
// Example: Export sector analytics
const { data } = await supabase
  .from('sector_analytics')
  .select('*')
  .csv();
```

## Future Enhancements

Potential additions:
- Deal velocity heatmaps
- Predictive analytics (which deals will succeed)
- Geographic distribution maps
- Expert consultation impact analysis
- ROI tracking for published deals
- Cohort analysis by submission period
- Manager vs. AI recommendation comparison

## Support

For issues or questions:
1. Check this documentation
2. Review the SQL migration file comments
3. Inspect browser console for errors
4. Check Supabase logs for database errors

## Files Created

- `/supabase/migrations/20251218_dealflow_analytics.sql` - Database views and functions
- `/app/app/analytics/page.tsx` - Main analytics dashboard page
- `/components/analytics/WaterfallChart.tsx` - Waterfall visualization component
- `/components/analytics/SectorChart.tsx` - Sector performance chart
- `/components/analytics/MonthlyTrendsChart.tsx` - Time-series trend chart
- `/components/AppShell.tsx` - Updated navigation (Analytics link added)
- `ANALYTICS_SETUP.md` - This documentation file
