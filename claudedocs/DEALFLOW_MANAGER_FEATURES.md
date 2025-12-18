# Dealflow Manager Features - Complete Guide

## Overview
New features enabling dealflow managers to create deals and analyze them with YC-style red/green flags.

## ✅ What's New

### 1. Dealflow Manager Deal Creation
**Page**: `/app/deals/new`
**Access**: Dealflow managers and admins only

**Features**:
- Create deals for startups received 1:1 (not through founder portal)
- Enter complete startup information
- Upload pitch deck PDF
- Deal automatically goes to "screening" status
- Flagged as dealflow manager uploaded (created_by tracks uploader)

**Fields**:
- **Startup Info**: Name, website, sector, HQ location, description, team summary, traction summary
- **Deal Terms**: Round type, instrument, target amount, min ticket, valuation
- **Details**: Highlights, risks, use of funds
- **Pitch Deck**: PDF upload (max 10MB)

### 2. YC-Style Red/Green Flags
**Location**: Deal detail page → Screening section
**Access**: Dealflow managers and admins

**Features**:
- Mark **Green Flags** (positive indicators)
- Mark **Red Flags** (warning signs)
- AI-powered flag detection
- Standard YC flag catalog
- Custom flags with notes

**Flag Categories**:
- **Team**: Founder quality, technical capability, co-founder dynamics
- **Traction**: Growth rate, product-market fit, revenue
- **Market**: Size, timing, competition
- **Product**: Moat, innovation, differentiation
- **Business Model**: Unit economics, revenue model
- **Deal Terms**: Valuation, cap table, terms

### 3. AI Flag Detection
**Edge Function**: `ai-detect-flags`
**Model**: Claude Haiku 4.5

**How it works**:
1. Analyzes deal information + pitch deck (if available)
2. Identifies 3-5 green flags (strengths)
3. Identifies 3-5 red flags (concerns)
4. Each flag includes supporting evidence/notes
5. Auto-populates flag editor for review

## 🗄️ Database Setup

### Step 1: Run Migration
```bash
# In Supabase SQL Editor, run this file:
supabase/migrations/002_yc_flags.sql
```

**What it creates**:
- ✅ `deal_flags` table - Stores red/green flags per deal
- ✅ `yc_flags_catalog` table - Standard YC flags reference
- ✅ RLS policies for security
- ✅ Indexes for performance
- ✅ Pre-populated catalog with ~30 standard flags

### Step 2: Verify Tables
```sql
-- Check deal_flags table
SELECT COUNT(*) FROM deal_flags;

-- Check catalog
SELECT flag_type, category, COUNT(*) as count
FROM yc_flags_catalog
GROUP BY flag_type, category
ORDER BY flag_type, category;
```

**Expected**:
- 0 rows in `deal_flags` (new table)
- ~30 rows in `yc_flags_catalog` (pre-populated)

### Step 3: Deploy Edge Function
```bash
npx supabase functions deploy ai-detect-flags
```

## 📱 User Guide

### For Dealflow Managers: Creating a Deal

1. **Navigate**: Click "New Deal" in navigation
2. **Enter Startup Info**:
   - Name (required)
   - Website, sector, location
   - Company description
   - Team summary (founders, key hires)
   - Traction summary (revenue, users, growth)

3. **Enter Deal Terms**:
   - Round type (Seed, Series A, etc.)
   - Instrument (SAFE, Equity, etc.)
   - Target amount, min ticket, valuation
   - Highlights, risks, use of funds

4. **Upload Pitch Deck**:
   - PDF format (max 10MB)
   - Required for AI screening

5. **Submit**:
   - Deal created with status "screening"
   - Redirects to deal detail page
   - Ready for AI screening

### For Dealflow Managers: Using YC Flags

1. **Open Deal**: Navigate to any deal in screening
2. **Scroll to YC Flags Section** (below screening criteria)
3. **AI Detection** (recommended):
   - Click "AI Detect Flags" button
   - Wait 10-20 seconds
   - AI analyzes deal + pitch deck
   - Flags auto-populate with notes

4. **Manual Editing**:
   - **Add from Catalog**: Browse standard YC flags
   - **Add Custom**: Create your own flags
   - **Edit Notes**: Add supporting evidence
   - **Remove**: Delete irrelevant flags

5. **Save**: Click "Save Flags" to persist

### For IC Members: Viewing Flags

**In Deal Detail Page**:
- Scroll to "YC-Style Flags" section
- **Green Flags**: Positive indicators (green box)
- **Red Flags**: Warning signs (red box)
- Each flag shows:
  - Flag description
  - Supporting notes/evidence

**Quick Assessment**:
- Count: More green than red = positive signal
- Quality: Read notes for context
- Categories: Team, traction, market, product, business model

## 🤖 AI Flag Detection Details

### What AI Analyzes
1. **Deal Information**:
   - Startup description
   - Team summary
   - Traction summary
   - Round type, valuation
   - Highlights and risks

2. **Pitch Deck** (if uploaded):
   - Team slides
   - Market size/growth
   - Product details
   - Traction metrics
   - Financial projections

### Example Output

**Green Flags**:
```json
[
  {
    "flag": "Exceptional founding team",
    "note": "Founders have 2 prior exits and 10+ years domain expertise. Strong technical capability with engineers from Google/Meta."
  },
  {
    "flag": "Strong product-market fit",
    "note": "15% WoW growth with 60% 30-day retention. High NPS of 72 indicates strong user satisfaction."
  },
  {
    "flag": "Large addressable market",
    "note": "TAM of $50B with 25% CAGR. Clear market trends support continued growth."
  }
]
```

**Red Flags**:
```json
[
  {
    "flag": "Limited traction",
    "note": "Only $50K ARR after 12 months. MoM growth is inconsistent with no clear scaling path."
  },
  {
    "flag": "Competitive market",
    "note": "10+ well-funded competitors including 2 public companies. Limited differentiation noted."
  }
]
```

### AI Model Details
- **Model**: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)
- **Input**: Deal data + optional pitch deck PDF
- **Output**: 3-5 green flags + 3-5 red flags
- **Cost**: ~$0.03-0.05 per analysis
- **Time**: 10-20 seconds

## 📊 Standard YC Flags Catalog

### Green Flags (15 total)

**Team** (3):
- Exceptional founder(s)
- Strong technical team
- Complementary co-founders

**Traction** (4):
- Strong product-market fit
- Impressive growth rate
- Revenue traction early
- Key customer wins

**Market** (3):
- Large addressable market
- Market timing is right
- Growing market

**Product** (3):
- Strong moat/defensibility
- Technical innovation
- 10x better solution

**Business Model** (3):
- Healthy unit economics
- Multiple revenue streams
- High gross margins

### Red Flags (15 total)

**Team** (4):
- Solo founder
- Weak technical capability
- Co-founder conflicts
- Key person risk

**Traction** (3):
- No user traction
- Flat or declining growth
- Fake traction

**Market** (3):
- Small/unclear market
- Crowded market
- Market timing wrong

**Product** (3):
- No clear moat
- Product-market fit unclear
- Solution looking for problem

**Business Model** (3):
- Weak unit economics
- Dependency on single customer
- Unsustainable burn rate

**Deal Terms** (3):
- Overvaluation
- Complex cap table
- Unfavorable terms

## 🔒 Security & Permissions

### RLS Policies

**deal_flags**:
- Internal roles (dealflow_manager, IC, admin) can view all flags
- Dealflow managers can create/edit flags
- Founders cannot see flags (internal only)

**yc_flags_catalog**:
- Internal roles can view catalog
- Read-only reference data

### Data Privacy
- Flags are internal-only
- Not visible to founders
- Not visible to regular investors
- Only visible to IC and dealflow team

## 🎯 Best Practices

### When to Use Manual vs AI Flags

**Use AI Detection**:
- ✅ First-pass analysis
- ✅ Pitch deck is comprehensive
- ✅ Time-constrained screening
- ✅ Standardized evaluation

**Use Manual Flags**:
- ✅ Nuanced concerns
- ✅ Call-specific insights
- ✅ Proprietary information
- ✅ Updating after diligence

### Flag Quality Guidelines

**Good Flags**:
- ✅ Specific and concrete
- ✅ Evidence-based notes
- ✅ Actionable for IC
- ✅ Focused on material factors

**Avoid**:
- ❌ Vague statements
- ❌ Unsupported opinions
- ❌ Minor/trivial issues
- ❌ Duplicate information

### IC Presentation Tips

1. **Lead with Flags**: Start IC presentation with red/green summary
2. **Category Balance**: Show flags across all categories
3. **Evidence**: Always reference supporting notes
4. **Discussion**: Use flags to guide IC questions
5. **Decision**: Weight flags in final recommendation

## 📝 Database Schema

### deal_flags Table
```sql
CREATE TABLE deal_flags (
  id UUID PRIMARY KEY,
  deal_id UUID REFERENCES deals(id),
  manager_user_id UUID REFERENCES profiles(id),
  green_flags JSONB DEFAULT '[]',  -- Array of {flag, note}
  red_flags JSONB DEFAULT '[]',     -- Array of {flag, note}
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(deal_id, manager_user_id)
);
```

### yc_flags_catalog Table
```sql
CREATE TABLE yc_flags_catalog (
  id UUID PRIMARY KEY,
  flag_type TEXT CHECK (flag_type IN ('green', 'red')),
  category TEXT,
  flag_text TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ
);
```

## 🚀 Deployment Checklist

- ✅ Run migration: `002_yc_flags.sql`
- ✅ Deploy edge function: `ai-detect-flags`
- ✅ Verify ANTHROPIC_API_KEY secret
- ✅ Test deal creation at `/app/deals/new`
- ✅ Test flag detection on existing deal
- ✅ Verify catalog has ~30 flags
- ✅ Check RLS policies working

## 📈 Metrics to Track

**Adoption**:
- Deals created by dealflow managers
- Flags added per deal
- AI vs manual flag usage

**Quality**:
- Flags per category distribution
- IC feedback on flag usefulness
- False positive/negative rate

**Efficiency**:
- Time to screen with flags
- IC decision time reduction
- Pass-through rate correlation

## 🔧 Troubleshooting

### "Access denied" on /app/deals/new
**Fix**: Check user role is `dealflow_manager` or `admin`

### Flags not saving
**Fix**: Run migration `002_yc_flags.sql` in SQL Editor

### AI detection fails
**Fix**:
1. Check ANTHROPIC_API_KEY: `npx supabase secrets list`
2. Verify edge function deployed: `npx supabase functions list`
3. Check browser console for errors

### Catalog is empty
**Fix**: Re-run INSERT statements from migration

### Flags not visible in UI
**Fix**: Check RLS policies, verify user role

## 📚 Related Documentation

- `AI_SCREENING_SETUP.md` - AI pitch deck screening
- `SCREENING_CRITERIA_MAPPING.md` - 7 criteria scoring
- `002_yc_flags.sql` - Database migration file
- `YCFlags.tsx` - React component code
- `ai-detect-flags/index.ts` - Edge function code
