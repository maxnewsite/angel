# Dealflow Analyst - Quick Setup Guide

## 🚀 Quick Start (5 minutes)

### Step 0: Fix Role Enum (If Needed)

If you get an enum error, run this first in your Supabase SQL editor:

```bash
# Copy and paste the contents of:
claudedocs/FIX_ROLE_ENUM.sql
# Click "Run"
# This will add 'dealflow_analyst' to the app_role enum
```

### Step 1: Apply Database Migration

Run the migration in your Supabase SQL editor:

```bash
# Navigate to Supabase Dashboard → SQL Editor
# Copy and paste the contents of:
supabase/migrations/013_dealflow_analyst.sql
# Click "Run"
```

Or using Supabase CLI:

```bash
supabase db push
```

### Step 2: Create Analyst User(s)

In Supabase SQL editor:

```sql
-- Update existing user to be a dealflow analyst
UPDATE profiles
SET role = 'dealflow_analyst'
WHERE email = 'your-analyst@example.com';

-- Or create multiple analysts
UPDATE profiles
SET role = 'dealflow_analyst'
WHERE email IN (
  'analyst1@example.com',
  'analyst2@example.com',
  'analyst3@example.com'
);
```

### Step 3: Verify Setup

1. Log in as the analyst user
2. Navigate to: `/app/dealflow/inbox`
3. You should see:
   - List of deals in screening
   - Note indicating you're a dealflow analyst

### Step 4: Test Analysis Workflow

As **Dealflow Analyst**:
1. Click on a deal in the inbox
2. Verify you see:
   - ✅ "Analyst Screening (7 criteria)" section
   - ✅ "YC-Style Flags (Analyst)" section
   - ✅ AI screening buttons
   - ❌ NO "Dealflow controls" section
   - ❌ NO "Approve to IC" / "Reject" buttons
3. Try creating an analysis:
   - Click "AI Screen Pitch Deck"
   - Review the scores
   - Click "AI Detect Flags"
   - Add custom notes
   - Click "Save Analysis"

As **Dealflow Manager**:
1. Log in with a dealflow_manager account
2. Open the same deal
3. Verify you see:
   - ✅ "Screening (7 criteria)" section (manager's own)
   - ✅ "YC-Style Flags" section (manager's own)
   - ✅ **NEW**: "Analyst Analyses" section showing the analyst's work
   - ✅ "Dealflow controls" section
4. Expand the analyst analysis card to see full details

## 🎯 Key Differences

### Dealflow Analyst
- Performs screening analysis
- Uses same AI tools
- Analysis saved separately
- **Cannot submit to IC**
- Sees note: "Only the dealflow manager can submit recommendations to IC"

### Dealflow Manager
- Performs own screening analysis
- Views **all analyst analyses** in dedicated section
- Can submit to IC (approve/reject)
- Final decision authority

## 📊 What Gets Created

### Database Tables
- `analyst_screening_scores` - Analyst's 7 criteria scores
- `analyst_screening_reviews` - Analyst's overall review
- `analyst_deal_flags` - Analyst's red/green flags

### Components
- `AnalystScreeningEditor` - Analyst version of screening
- `AnalystYCFlags` - Analyst version of flags
- `AnalystAnalysesView` - Manager's view of all analyses

## 🔧 Common Configuration

### Single Analyst Setup
If you only have one analyst, they will work independently and the manager will review their analysis before submitting to IC.

### Multiple Analysts Setup
Multiple analysts can work on the same deal. Each will see only their own interface, and the manager will see all analyses aggregated.

### Hybrid Setup
You can have some users as managers and others as analysts. Managers can also do their own analysis in addition to reviewing analyst work.

## ⚡ Quick Troubleshooting

**Problem**: Error about "invalid input value for enum app_role: dealflow_analyst"
- **Fix**: Run `claudedocs/FIX_ROLE_ENUM.sql` first to add the enum value
- **Why**: Your database has an `app_role` enum that needs to include the new role
- **Alternative**: The updated migration (013) now handles this automatically

**Problem**: Analyst sees "Deal not accessible"
- **Fix**: Check RLS policies were applied (migration step 1)

**Problem**: Manager doesn't see analyst analyses
- **Fix**: Make sure analyst saved their analysis first

**Problem**: Analyst sees IC submission buttons
- **Fix**: Verify role is set to 'dealflow_analyst' not 'dealflow_manager'

**Problem**: Database errors when saving
- **Fix**: Confirm migration was applied successfully

## 📝 Creating Your First Analysis

### As Analyst:

```
1. Open deal → /app/dealflow/inbox → Click deal
2. Click "AI Screen Pitch Deck" (optional)
3. Adjust scores using sliders (1-5 for each of 7 criteria)
4. Add detailed notes for each criterion
5. Click "AI Detect Flags" (optional)
6. Add/remove/edit flags as needed
7. Select recommendation: Recommend / Needs Info / Not Recommend
8. Write executive summary memo
9. Click "Save Analysis"
10. ✅ Done! Manager will see your analysis
```

### As Manager:

```
1. Open deal → /app/dealflow/inbox → Click deal
2. Do your own screening (same as before)
3. Scroll to "Analyst Analyses" section
4. Click on analyst card to expand
5. Review their scores, flags, and memo
6. Consider their analysis in your decision
7. Use "Approve to IC" or "Reject" buttons
8. ✅ Done! Deal sent to IC with all analyses
```

## 🎓 Training Recommendations

### For Dealflow Analysts
1. Understand the 7 screening criteria
2. Learn to use AI tools effectively
3. Write clear, concise memos
4. Be aware analysis is visible to managers and IC

### For Dealflow Managers
1. Review analyst analyses before making decisions
2. Look for consensus or disagreements across analysts
3. Use analyst insights to improve your own analysis
4. Provide feedback to analysts on their work quality

## 📞 Need Help?

1. Check `DEALFLOW_ANALYST_IMPLEMENTATION.md` for detailed documentation
2. Review browser console for error messages
3. Verify database migration was successful
4. Check Supabase dashboard for RLS policy configuration

---

**Estimated Setup Time**: 5-10 minutes
**Complexity**: Low
**Required Access**: Supabase admin access + ability to update user roles
