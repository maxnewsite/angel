# Portfolio View - Published Deals with Investor Interest Tracking

## Overview
The Portfolio section provides a comprehensive view of all published deals with detailed investor interest tracking and capital aggregation analytics.

## Access
**Available to**: Admin, IC Members, IC Chair, Dealflow Managers

**Navigation**: `/app/portfolio` (visible in main navigation for authorized roles)

## Features

### 1. Deal Overview Cards
Each published deal displays:
- **Startup Information**: Name, sector, location, round type, target amount
- **Publication Status**: Green "Published" badge
- **Interest Summary**: Total number of investors expressing interest
- **Categorized Interest Counts**: Yes, Maybe, No breakdown
- **Capital Indicators**: Total indicated capital by category
- **Target Progress Bar**: Visual representation of capital raised vs target

### 2. Interest Categorization

#### 🟢 Yes Interest
- Investors who are committed to investing
- Shows total count and aggregated indicated capital
- Green color coding for easy identification

#### 🟡 Maybe Interest
- Investors who are considering the deal
- Shows total count and aggregated indicated capital
- Yellow color coding for tentative interest

#### 🔴 No / Passed
- Investors who have passed on the deal
- Shows count of passes
- Red color coding for declined interest

### 3. Detailed View (Expandable)

When expanded, each deal shows:

#### Deal Information
- Round type
- Instrument
- Valuation
- Target amount
- Minimum ticket
- Publication date

#### IC Chair Decision
- Decision type (recommended/published)
- Decision date
- Rationale provided by IC chair

#### Interest Details by Category
For each investor expressing interest:
- **Email/Name**: Investor identification
- **Indicated Ticket**: Amount they plan to invest
- **Signal Date**: When interest was recorded
- **Notes**: Any comments or conditions from investor

### 4. Capital Analytics

#### Target Progress
- Visual progress bar showing capital raised vs target
- Percentage calculation
- Dollar amounts for easy assessment
- Only considers "Yes" interests for progress calculation

#### Summary Metrics
- Total interest count (all categories)
- Yes interest: count + total capital
- Maybe interest: count + total capital
- No interest: count only

## Use Cases

### For Dealflow Managers
- **Syndicate Formation**: Identify which investors are interested
- **Capital Assembly**: Track progress toward target raise
- **Follow-up Actions**: See who needs engagement (maybes) or updates
- **Deal Performance**: Assess investor appetite across portfolio

### For IC Members & IC Chair
- **Portfolio Monitoring**: Track performance of approved deals
- **Decision Validation**: See if market interest matches IC assessment
- **Network Insights**: Understand investor preferences and patterns
- **Strategic Planning**: Identify high-demand deal characteristics

### For Admins
- **Platform Analytics**: Overall investor engagement metrics
- **Deal Flow Health**: Which deals are attracting capital
- **User Behavior**: Investor signal patterns and preferences
- **Reporting**: Generate portfolio summary reports

## Data Structure

### Interests Table Query
```sql
SELECT
  interests.*,
  investor.email,
  investor.full_name
FROM interests
JOIN profiles investor ON interests.investor_user_id = investor.id
WHERE deal_id = $1
ORDER BY
  CASE signal
    WHEN 'yes' THEN 1
    WHEN 'maybe' THEN 2
    WHEN 'no' THEN 3
  END,
  indicative_ticket DESC;
```

### Capital Calculation
```typescript
// Yes interests total
const totalYesCapital = yesInterests.reduce(
  (sum, i) => sum + (i.indicative_ticket || 0),
  0
);

// Target progress percentage
const targetProgress = (totalYesCapital / deal.target_amount) * 100;
```

## UI Components

### Deal Portfolio Card
```
┌─────────────────────────────────────────────────────┐
│ Acme Corp                          [Published]      │
│ FinTech • Dubai • Seed • $2M target                 │
├─────────────────────────────────────────────────────┤
│ Total: 12 │ ✓ Yes: 8 │ ? Maybe: 3 │ ✗ No: 1        │
│            $1.2M       $400K                          │
├─────────────────────────────────────────────────────┤
│ Target Progress: $1.2M / $2M (60%)                  │
│ [████████████████░░░░░░░░] 60%                      │
└─────────────────────────────────────────────────────┘
```

### Interest Card
```
┌─────────────────────────────────────────────────────┐
│ investor@example.com              $100,000          │
│ John Investor                     12/14/2025        │
├─────────────────────────────────────────────────────┤
│ Strong team and market opportunity.                 │
│ Would like to lead the round.                       │
└─────────────────────────────────────────────────────┘
```

## Security & Permissions

### RLS Policies
- **Internal roles** can view all interests (existing policy)
- Investors can only view/edit their own interests
- Deal information follows existing deal RLS policies

### Access Control
```typescript
// Only these roles can access portfolio view
const authorizedRoles = [
  'admin',
  'dealflow_manager',
  'ic_member',
  'ic_chair'
];
```

## Key Metrics Tracked

1. **Interest Velocity**: How quickly investors express interest after publication
2. **Conversion Rate**: Yes / (Yes + Maybe + No) percentage
3. **Capital Coverage**: Total yes capital / Target amount
4. **Average Ticket**: Total yes capital / Number of yes interests
5. **Pass Rate**: No interests / Total interests

## Future Enhancements

### Phase 2 Features
- [ ] Export portfolio to CSV/Excel
- [ ] Email notifications for new interests
- [ ] Bulk investor outreach tools
- [ ] Interest trend charts over time
- [ ] Investor network visualization
- [ ] Capital commitment tracking (committed vs indicated)
- [ ] Deal room access tracking
- [ ] Term sheet generation
- [ ] Closing checklist workflow

### Analytics Dashboard
- [ ] Portfolio performance metrics
- [ ] Investor engagement heatmap
- [ ] Deal success prediction models
- [ ] Time-to-close analytics
- [ ] Investor preference patterns

### Integration Features
- [ ] CRM sync for investor relationships
- [ ] Calendar integration for follow-ups
- [ ] Email templates for investor communications
- [ ] DocuSign integration for commitments
- [ ] Banking integration for capital calls

## Best Practices

### For Dealflow Managers

1. **Regular Monitoring**: Check portfolio daily for new interests
2. **Proactive Follow-up**: Contact "maybe" investors within 48 hours
3. **Capital Assembly**: Track toward target, adjust if needed
4. **Investor Relations**: Keep interested parties updated on progress
5. **Deal Momentum**: Highlight strong interest to create FOMO

### For IC Members

1. **Validation**: Compare IC assessment with market interest
2. **Pattern Recognition**: Learn which deal types attract capital
3. **Network Building**: Note active investors for future deals
4. **Risk Assessment**: Low interest may indicate missed concerns

### For Admins

1. **Platform Health**: Monitor overall interest rates
2. **User Engagement**: Track investor participation
3. **Deal Quality**: Correlation between IC score and interest
4. **Network Effects**: Identify power users and connectors

## Troubleshooting

### No Deals Showing
**Cause**: No deals have been published yet
**Solution**: IC chair must approve and publish deals

### Missing Interests
**Cause**: RLS policy or query issue
**Solution**: Check that internal role policy exists:
```sql
CREATE POLICY "Internal roles can view interests" ON interests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );
```

### Incorrect Capital Totals
**Cause**: Null indicative_ticket values not handled
**Solution**: Already handled with `|| 0` in reduce function

## Related Documentation
- `IC_WORKFLOW.md` - How deals get published
- `INVESTOR_INTEREST.md` - How investors express interest
- `DEAL_STATUS_VALUES.md` - Deal lifecycle and statuses
- `RLS_POLICIES.md` - Security and access control

## API Examples

### Fetch Portfolio Data
```typescript
const { data: deals } = await supabase
  .from("deals")
  .select(`
    id, status, target_amount, published_at,
    startup:startup_id(name, sector),
    interests(
      signal, indicative_ticket, note, updated_at,
      investor:investor_user_id(email, full_name)
    ),
    ic_decisions(decision, rationale)
  `)
  .eq("status", "published")
  .order("published_at", { ascending: false });
```

### Calculate Metrics
```typescript
function calculatePortfolioMetrics(deals: Deal[]) {
  return deals.map(deal => {
    const interests = deal.interests || [];
    const yes = interests.filter(i => i.signal === 'yes');
    const maybe = interests.filter(i => i.signal === 'maybe');
    const no = interests.filter(i => i.signal === 'no');

    const totalYesCapital = yes.reduce((s, i) => s + (i.indicative_ticket || 0), 0);
    const targetProgress = deal.target_amount
      ? (totalYesCapital / deal.target_amount) * 100
      : 0;

    return {
      dealId: deal.id,
      totalInterest: interests.length,
      yesCount: yes.length,
      maybeCount: maybe.length,
      noCount: no.length,
      totalYesCapital,
      targetProgress,
      conversionRate: interests.length
        ? (yes.length / interests.length) * 100
        : 0
    };
  });
}
```
