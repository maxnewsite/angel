# Dealflow Analyst Role Implementation

## Overview

This document describes the implementation of the **dealflow_analyst** role, which allows multiple analysts to perform deal screening independently. Only the **dealflow_manager** can submit final recommendations to the IC (Investment Committee).

## Key Features

### For Dealflow Analysts
- ✅ Access to all deals in screening
- ✅ Complete 7-criteria screening analysis
- ✅ AI-powered screening assistance
- ✅ Red/Green flags with AI detection
- ✅ Full analysis memo writing
- ❌ **Cannot** submit deals to IC
- ❌ **Cannot** finalize screening

### For Dealflow Managers
- ✅ All dealflow analyst capabilities
- ✅ View all analyst analyses for each deal
- ✅ Submit deals to IC (approve/reject)
- ✅ Finalize screening reports

## Database Changes

### New Tables

#### 1. `analyst_screening_scores`
Stores screening scores from dealflow analysts (separate from manager scores).

```sql
CREATE TABLE analyst_screening_scores (
  id UUID PRIMARY KEY,
  deal_id UUID REFERENCES deals(id),
  analyst_user_id UUID REFERENCES profiles(id),
  criterion_id UUID REFERENCES screening_criteria(id),
  score INTEGER CHECK (score >= 1 AND score <= 5),
  note TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(deal_id, analyst_user_id, criterion_id)
);
```

#### 2. `analyst_screening_reviews`
Stores overall screening reviews from dealflow analysts.

```sql
CREATE TABLE analyst_screening_reviews (
  id UUID PRIMARY KEY,
  deal_id UUID REFERENCES deals(id),
  analyst_user_id UUID REFERENCES profiles(id),
  overall_score NUMERIC,
  decision TEXT CHECK (decision IN ('recommend', 'needs_info', 'not_recommend')),
  summary_memo TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(deal_id, analyst_user_id)
);
```

#### 3. `analyst_deal_flags`
Stores YC-style red/green flags from dealflow analysts.

```sql
CREATE TABLE analyst_deal_flags (
  id UUID PRIMARY KEY,
  deal_id UUID REFERENCES deals(id),
  analyst_user_id UUID REFERENCES profiles(id),
  green_flags JSONB DEFAULT '[]'::jsonb,
  red_flags JSONB DEFAULT '[]'::jsonb,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(deal_id, analyst_user_id)
);
```

### New Views & Functions

#### `deal_all_analyses` View
Combines manager and analyst analyses for easy viewing by dealflow managers.

#### `get_deal_complete_analysis(deal_id)` Function
Returns complete analysis data including manager and all analyst analyses for a specific deal.

### Updated RLS Policies

All existing policies have been updated to include `dealflow_analyst` where appropriate:
- Can view deals, startups, documents
- Can view screening criteria and YC flags catalog
- Can view AI recommendations
- Can upload documents
- **Cannot** view or modify IC votes/decisions

## Component Architecture

### New Components

#### 1. `AnalystScreeningEditor.tsx`
- Analyst version of the screening editor
- Uses `analyst_screening_scores` and `analyst_screening_reviews` tables
- Same 7-criteria analysis as manager
- Displays note that only managers can submit to IC

#### 2. `AnalystYCFlags.tsx`
- Analyst version of YC flags component
- Uses `analyst_deal_flags` table
- Same AI-powered flag detection

#### 3. `AnalystAnalysesView.tsx`
- Displays all analyst analyses to dealflow managers
- Expandable/collapsible view for each analyst
- Shows complete analysis including:
  - Overall score and recommendation
  - Executive summary
  - Detailed criteria scores
  - Red/green flags
  - Timestamps

### Updated Components

#### `app/app/deals/[id]/page.tsx`
Now conditionally renders based on role:
- **dealflow_manager**: Shows manager screening + all analyst analyses
- **dealflow_analyst**: Shows analyst screening (no IC controls)
- **ic_member/ic_chair**: See screening reports (unchanged)

#### `app/app/dealflow/inbox/page.tsx`
Updated to show role-specific messaging for dealflow analysts.

## User Workflows

### Dealflow Analyst Workflow

1. Access dealflow inbox at `/app/dealflow/inbox`
2. Select a deal to analyze
3. Use AI-powered screening:
   - Click "AI Screen Pitch Deck" for automatic criteria scoring
   - Click "AI Detect Flags" for automatic red/green flag identification
4. Review and adjust AI-generated analysis
5. Add custom notes and flags as needed
6. Save analysis (stored separately from manager analysis)
7. Analysis is visible to dealflow manager and IC members

### Dealflow Manager Workflow

1. Access dealflow inbox
2. Select a deal to review
3. View own screening interface (as before)
4. **NEW**: View all analyst analyses in expandable cards
5. Review multiple analyst perspectives
6. Make final decision based on all analyses
7. Submit to IC (approve) or reject (only manager can do this)

### Multi-Analyst Collaboration

When multiple analysts work on the same deal:
- Each analyst sees only their own screening interface
- Dealflow manager sees all analyst analyses
- IC members see all analyses after screening is finalized
- Each analysis is timestamped and attributed to specific analyst

## Migration Instructions

### Step 1: Apply Database Migration

```bash
# The migration file is: supabase/migrations/013_dealflow_analyst.sql
# Apply it using Supabase CLI or SQL editor
```

### Step 2: Create Dealflow Analyst Users

Update user profiles to have `role = 'dealflow_analyst'`:

```sql
UPDATE profiles
SET role = 'dealflow_analyst'
WHERE email IN ('analyst1@example.com', 'analyst2@example.com');
```

### Step 3: Test the Implementation

1. Log in as a dealflow analyst
2. Navigate to `/app/dealflow/inbox`
3. Open a deal in screening
4. Verify you can:
   - See screening interface
   - Use AI features
   - Save analysis
   - **NOT** see IC submission buttons
5. Log in as dealflow manager
6. Open the same deal
7. Verify you can see analyst's analysis

## Security & Permissions

### Row Level Security (RLS)

- ✅ Analysts can only modify their own analyses
- ✅ Analysts cannot view other analysts' work-in-progress
- ✅ Managers can view all analyst analyses
- ✅ IC members can view all analyses after screening finalized
- ✅ Analysts cannot access IC vote/decision tables

### API Permissions

Dealflow analysts have access to:
- `/functions/v1/ai-screen-deal` - AI screening
- `/functions/v1/ai-detect-flags` - AI flag detection
- `/functions/v1/ai-recommend-deal` - AI recommendations

Dealflow analysts **do not** have access to:
- `/functions/v1/dealflow-transition` - Only managers
- `/functions/v1/finalize-screening` - Only managers
- `/functions/v1/ic-vote` - Only IC members
- `/functions/v1/ic-chair-decision` - Only IC chair

## Data Structure Examples

### Analyst Analysis JSON Structure

```json
{
  "analyst_id": "uuid-here",
  "analyst_name": "John Analyst",
  "analyst_email": "john@example.com",
  "overall_score": 3.85,
  "decision": "recommend",
  "summary_memo": "Strong team with proven traction...",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T14:45:00Z",
  "scores": [
    {
      "criterion_name": "Market Opportunity",
      "score": 4,
      "note": "TAM of $5B with 20% annual growth..."
    }
  ],
  "flags": {
    "green_flags": [
      {
        "flag": "Strong product-market fit",
        "note": "10% WoW growth for 12 weeks"
      }
    ],
    "red_flags": [
      {
        "flag": "Solo founder",
        "note": "No co-founder identified yet"
      }
    ]
  }
}
```

## Testing Checklist

- [ ] Analyst can access dealflow inbox
- [ ] Analyst can view deals in screening
- [ ] Analyst can use AI screening features
- [ ] Analyst can save their analysis
- [ ] Analyst cannot see IC controls
- [ ] Manager can see all analyst analyses
- [ ] Manager can still submit to IC
- [ ] IC members can see all analyses after finalization
- [ ] RLS policies prevent unauthorized access
- [ ] Multiple analysts can work on same deal independently

## Future Enhancements

Potential improvements for future iterations:

1. **Analyst Assignment**: Allow managers to assign specific deals to specific analysts
2. **Analyst Discussions**: Add commenting/discussion threads between analysts and managers
3. **Analysis Comparison**: Side-by-side comparison view for multiple analyst analyses
4. **Analyst Metrics**: Track analyst performance (accuracy, speed, recommendations)
5. **Weighted Consensus**: Automatically calculate consensus scores across all analysts
6. **Analyst Specialization**: Tag analysts by expertise (e.g., fintech, biotech) for targeted assignments

## Troubleshooting

### Issue: Analyst cannot see screening interface
**Solution**: Check that profile role is set to 'dealflow_analyst' and RLS policies are applied.

### Issue: Manager cannot see analyst analyses
**Solution**: Verify that `AnalystAnalysesView` component is rendering and check browser console for errors.

### Issue: Analyst sees IC submission buttons
**Solution**: Check role-based conditional rendering in deal detail page.

### Issue: Database permission errors
**Solution**: Ensure migration 013 was applied successfully and all policies are created.

## Support

For issues or questions:
1. Check browser console for error messages
2. Verify database migration was applied
3. Check RLS policies in Supabase dashboard
4. Review this documentation for proper workflow

---

**Migration File**: `supabase/migrations/013_dealflow_analyst.sql`
**Components**:
- `components/AnalystScreeningEditor.tsx`
- `components/AnalystYCFlags.tsx`
- `components/AnalystAnalysesView.tsx`
**Updated Files**:
- `lib/roles.ts`
- `app/app/deals/[id]/page.tsx`
- `app/app/dealflow/inbox/page.tsx`
