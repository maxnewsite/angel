# Portfolio View Setup Guide

## What Was Created

A comprehensive portfolio management view for internal roles (Admin, IC Members, IC Chair, Dealflow Managers) to track all published deals with detailed investor interest analytics.

## Features

### 📊 Deal Portfolio Cards
- **Deal Overview**: Startup info, round details, target amounts
- **Interest Summary**: Total investors expressing interest
- **Categorized Breakdown**: Yes (🟢), Maybe (🟡), No (🔴)
- **Capital Tracking**: Total indicated capital per category
- **Target Progress**: Visual progress bar showing capital raised vs target

### 📈 Detailed Analytics
- **IC Decision History**: See IC chair's rationale for publishing
- **Investor Details**: Email, name, indicated ticket, notes
- **Capital Aggregation**: Automatic calculation of total commitments
- **Interest Velocity**: Track when investors show interest
- **Conversion Metrics**: Yes rate, pass rate, capital coverage

### 🎯 Key Metrics Displayed
- Total interest count
- Yes interests: count + total capital indicated
- Maybe interests: count + total capital indicated
- No interests: count only
- Target progress percentage with visual bar
- Per-investor details with timestamps

## Files Created

1. **`/app/app/portfolio/page.tsx`** - Main portfolio view page
2. **`/supabase/migrations/006_portfolio_access.sql`** - Database permissions
3. **`/claudedocs/PORTFOLIO_VIEW.md`** - Complete documentation
4. **`/PORTFOLIO_SETUP.md`** - This setup guide

## Files Modified

1. **`/components/AppShell.tsx`** - Added Portfolio link to navigation

## Setup Steps

### Step 1: Run Database Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Allow internal roles to view investor profiles for portfolio view
CREATE POLICY "Internal roles can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );
```

**Why?** This allows internal roles to see investor names and emails in the portfolio view.

### Step 2: Verify Navigation

After the code is deployed, log in as an internal role and verify:
- ✅ "Portfolio" link appears in navigation
- ✅ Link is positioned between "IC" and "Admin"
- ✅ Link is visible for: dealflow_manager, ic_member, ic_chair, admin

### Step 3: Test the Feature

1. **Publish a Deal** (as IC chair):
   - Go to IC queue
   - Open a deal in ic_in_review status
   - Scroll to "Chair decision"
   - Select "Recommend"
   - Check "Publish now"
   - Save decision

2. **Add Investor Interest** (as investor):
   - View the published deal
   - Fill out "Investor action" form
   - Select Yes/Maybe/No
   - Add indicative ticket amount
   - Add notes
   - Save interest

3. **View Portfolio** (as internal role):
   - Click "Portfolio" in navigation
   - See the published deal
   - See interest summary metrics
   - Click "Show details" to expand
   - Verify investor details are visible
   - Check capital calculations are correct

## Expected Behavior

### Portfolio Page Structure
```
Portfolio
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Published deals with investor interest tracking • 3 active

┌─────────────────────────────────────────────┐
│ Acme Corp                    [Published]    │
│ FinTech • Dubai • Seed • $2M target         │
├─────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │Total │ │✓ Yes │ │? Maybe│ │✗ No │        │
│ │  8   │ │  5   │ │   2   │ │  1  │        │
│ │invest│ │$1.2M │ │$300K  │ │pass │        │
│ └──────┘ └──────┘ └──────┘ └──────┘        │
├─────────────────────────────────────────────┤
│ Target Progress                              │
│ $1.2M / $2M (60%)                           │
│ [████████████░░░░░░░] 60%                   │
└─────────────────────────────────────────────┘
```

### Expanded View
When you click "Show details":
- 📋 Deal Information (round, instrument, valuation, etc.)
- ✅ IC Chair Decision with rationale
- 🟢 Yes Interest section with investor cards
- 🟡 Maybe Interest section with investor cards
- 🔴 No Interest section with investor cards

### Investor Card Format
```
┌─────────────────────────────────────────────┐
│ investor@example.com          $100,000      │
│ John Investor                 12/14/2025    │
├─────────────────────────────────────────────┤
│ Very interested in the market opportunity.  │
│ Would like to co-lead with another investor.│
└─────────────────────────────────────────────┘
```

## Access Control

### Who Can See Portfolio
- ✅ Admin
- ✅ IC Chair
- ✅ IC Members
- ✅ Dealflow Managers
- ❌ Investors (see own deals only)
- ❌ Founders (see own deals only)

### What They Can See
- All published deals
- All investor interests (regardless of privacy)
- Investor contact information (email, name)
- Indicated ticket amounts
- Investor notes and comments
- IC chair decisions and rationales
- Capital aggregation metrics

### What They Cannot Do
- Edit investor interests (investors only)
- Delete interests
- Change deal status (separate workflows)
- Contact investors directly from portfolio (future feature)

## Troubleshooting

### "No published deals yet" Message
**Cause**: No deals have been published by IC chair
**Fix**:
1. Go to IC queue as IC chair
2. Approve and publish a deal
3. Return to portfolio

### Investor Names Not Showing
**Cause**: RLS policy not applied
**Fix**: Run the migration in Step 1 above

### Capital Totals Are Zero
**Cause**: Investors haven't entered indicative ticket amounts
**Fix**: This is normal - investors can express interest without amounts

### Portfolio Link Not Visible
**Cause**: User doesn't have correct role
**Fix**: Verify user role is one of: admin, dealflow_manager, ic_member, ic_chair

## Testing Checklist

- [ ] Migration applied successfully
- [ ] Portfolio link visible in navigation
- [ ] Can access `/app/portfolio` page
- [ ] Published deals are displayed
- [ ] Interest counts are correct
- [ ] Capital totals calculate properly
- [ ] Progress bar shows correct percentage
- [ ] Expand/collapse works
- [ ] Investor details are visible
- [ ] Deal information is complete
- [ ] IC decision is shown
- [ ] All three interest categories display
- [ ] Date formatting is correct
- [ ] Currency formatting is correct

## Future Enhancements

### Phase 2 (Next Release)
- Export portfolio to CSV/Excel
- Email notifications for new interests
- Interest trend charts
- Bulk investor communication tools
- Capital commitment tracking
- Deal room access integration

### Phase 3 (Future)
- CRM sync for investor relationships
- Term sheet generation
- Closing checklist workflow
- Banking integration for capital calls
- Investor network visualization
- Predictive analytics for deal success

## Support

For issues or questions:
1. Check `claudedocs/PORTFOLIO_VIEW.md` for detailed documentation
2. Verify all migrations have been run
3. Check browser console for errors
4. Verify user has correct role permissions
5. Check Supabase logs for RLS policy issues

## Related Documentation
- `PORTFOLIO_VIEW.md` - Complete feature documentation
- `IC_WORKFLOW.md` - How deals get published
- `INVESTOR_INTEREST.md` - How interests are recorded
- `RLS_POLICIES.md` - Security and access control
