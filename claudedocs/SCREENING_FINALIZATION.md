# Screening Finalization & Reporting - Complete Guide

## Overview
After completing screening analysis, dealflow managers can make final decisions to approve deals to IC or reject them. Both actions generate comprehensive reports.

## ✅ What's Implemented

### 1. Final Decision Workflow
**Location**: Deal detail page → Screening section → Bottom of screening editor

**Two Decision Buttons**:
- ✅ **Approve to IC** (Green button)
- ❌ **Reject Deal** (Red button)

**Features**:
- Confirmation modal before finalizing
- Clear explanation of what happens
- One-way action (screening closes after confirmation)
- Auto-generates comprehensive reports
- Updates deal status automatically

### 2. Report Generation
**Edge Function**: `finalize-screening`
**Database**: `screening_reports` table

**What Gets Captured**:
- All 7 screening scores + notes
- Overall weighted score
- Summary memo
- Red/green flags
- Deal information
- Startup details
- Decision rationale
- Timestamp of decision

### 3. Status Transitions

**When Approved**:
- Deal status: `screening_in_progress` → `ic_in_review`
- Screening marked as completed
- Report stored in database
- IC members can access report
- Deal appears in IC queue

**When Rejected**:
- Deal status: `screening_in_progress` → `screening_rejected`
- Screening marked as completed
- Report stored in database
- Deal archived in rejected section
- Accessible to dealflow/IC/admin only

### 4. Rejected Deals Archive
**Page**: `/app/rejected`
**Access**: Dealflow managers, IC members, IC chair, admins

**Features**:
- List all rejected deals
- See rejection date
- View full screening reports
- Read decision rationale
- See all scores and flags
- Modal view for detailed reports

## 🗄️ Database Setup

### Step 1: Run Migration
```bash
# In Supabase SQL Editor, run:
supabase/migrations/003_screening_reports.sql
```

**This creates**:
- `screening_reports` table - Stores final reports
- Adds `screening_completed_at` to deals table
- Adds `screening_decision` to deals table
- RLS policies for security
- Indexes for performance

### Step 2: Verify Tables
```sql
-- Check screening_reports table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'screening_reports';

-- Check deals table updates
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'deals'
  AND column_name IN ('screening_completed_at', 'screening_decision');
```

### Step 3: Verify Edge Function
```bash
npx supabase functions list
```

**Expected**:
- `finalize-screening` ✓ ACTIVE

## 📱 User Workflows

### For Dealflow Managers: Approving to IC

1. **Complete Screening**:
   - Run AI screening or manual scoring
   - Add red/green flags
   - Write summary memo
   - Save screening data

2. **Make Decision**:
   - Scroll to bottom of screening section
   - Click "✅ Approve to IC" button
   - Review confirmation modal
   - Click "Confirm"

3. **What Happens**:
   - ✅ Screening closes (no more edits)
   - ✅ Report generated automatically
   - ✅ Deal moves to IC review status
   - ✅ IC members notified (via queue)
   - ✅ Report accessible to IC

4. **Result**:
   - Success alert appears
   - Screening shows "completed" badge
   - Deal no longer editable
   - IC can now review

### For Dealflow Managers: Rejecting Deal

1. **Complete Screening**:
   - Run AI screening or manual scoring
   - Identify red flags
   - Document concerns in memo
   - Save screening data

2. **Make Decision**:
   - Scroll to bottom of screening section
   - Click "❌ Reject Deal" button
   - Review confirmation modal
   - Click "Confirm"

3. **What Happens**:
   - ❌ Screening closes (no more edits)
   - ❌ Report generated automatically
   - ❌ Deal status = rejected
   - ❌ Deal archived
   - ❌ Report accessible to internal roles only

4. **Result**:
   - Success alert appears
   - Deal moved to rejected archive
   - Report available at `/app/rejected`
   - PDF generated (future enhancement)

### For IC Members: Viewing Reports

**Approved Deals**:
1. Navigate to `/app/ic/queue`
2. Find deal in IC review
3. Open deal detail page
4. Scroll to screening section
5. View all scores, flags, memo

**Rejected Deals**:
1. Navigate to `/app/rejected`
2. Browse rejected deals archive
3. Click on any deal
4. View full screening report modal
5. See scores, flags, rationale

## 🎨 UI Components

### Screening Editor - Decision Buttons
```
┌─────────────────────────────────────┐
│ Save screening          [Save]      │
│                                      │
│ ⚠️ Final decision will close        │
│    screening and generate report    │
│                                      │
│ [❌ Reject Deal] [✅ Approve to IC] │
└─────────────────────────────────────┘
```

### Confirmation Modal
```
┌─────────────────────────────────────┐
│ ✅ Approve to IC?                   │
│                                      │
│ This will:                           │
│ • Close screening (no more edits)   │
│ • Generate IC report                 │
│ • Send deal to IC queue              │
│ • Make report accessible to IC      │
│                                      │
│ [Cancel]          [Confirm]         │
└─────────────────────────────────────┘
```

### Completed Screening Badge
```
┌─────────────────────────────────────┐
│ ✓ Screening completed and report    │
│   generated                          │
│                                      │
│ Screening is closed. Report         │
│ available for IC review.             │
└─────────────────────────────────────┘
```

### Rejected Deals Archive
```
┌─────────────────────────────────────┐
│ Rejected Deals                       │
│ Archive of deals rejected during     │
│ screening. 5 total.                  │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Acme Corp          [Rejected]   │ │
│ │ FinTech • SF                     │ │
│ │ Seed • $2M • Rejected 12/13/25  │ │
│ │ View screening report →          │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## 📊 Report Structure

### Report Data (JSON)
```json
{
  "deal": {
    "id": "uuid",
    "startup_name": "Acme Corp",
    "sector": "FinTech",
    "round_type": "Seed",
    "target_amount": 2000000,
    "valuation": 10000000
  },
  "screening": {
    "scores": [
      {
        "criterion": {"name": "Market Opportunity", "weight": 1.5},
        "score": 4,
        "note": "Large addressable market..."
      }
    ],
    "overall_score": 3.85,
    "decision": "approve",
    "summary_memo": "Strong team and market..."
  },
  "flags": {
    "green_flags": [
      {
        "flag": "Exceptional team",
        "note": "2 prior exits..."
      }
    ],
    "red_flags": [
      {
        "flag": "Limited traction",
        "note": "Only 10 users..."
      }
    ]
  },
  "metadata": {
    "manager_user_id": "uuid",
    "decided_at": "2025-12-13T...",
    "final_decision": "approve"
  }
}
```

### Database Schema

**screening_reports**:
```sql
CREATE TABLE screening_reports (
  id UUID PRIMARY KEY,
  deal_id UUID REFERENCES deals(id),
  manager_user_id UUID REFERENCES profiles(id),
  report_type TEXT CHECK (report_type IN ('approved', 'rejected')),
  report_data JSONB,
  pdf_storage_path TEXT,
  decision_rationale TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  UNIQUE(deal_id)
);
```

**deals table updates**:
```sql
ALTER TABLE deals ADD COLUMN screening_completed_at TIMESTAMPTZ;
ALTER TABLE deals ADD COLUMN screening_decision TEXT;
```

## 🔒 Security & Permissions

### RLS Policies

**screening_reports**:
- Internal roles can view all reports
- Dealflow managers can create reports
- One report per deal (unique constraint)

**Access Matrix**:
| Role              | View Approved | View Rejected | Create Reports |
|-------------------|---------------|---------------|----------------|
| Founder           | No            | No            | No             |
| Investor          | No            | No            | No             |
| Dealflow Manager  | Yes           | Yes           | Yes            |
| IC Member         | Yes           | Yes           | No             |
| IC Chair          | Yes           | Yes           | No             |
| Admin             | Yes           | Yes           | Yes            |

### Data Privacy
- Reports are internal-only
- Not visible to founders
- Not visible to regular investors
- Rejected deals fully archived
- No public access to reports

## 🚀 Edge Function Details

### finalize-screening Function

**Input**:
```json
{
  "deal_id": "uuid",
  "decision": "approve" | "reject"
}
```

**Process**:
1. Validate request and permissions
2. Fetch complete deal data
3. Fetch all screening scores
4. Fetch screening review (memo, decision)
5. Fetch red/green flags
6. Compile report data (JSON)
7. Store in screening_reports table
8. Update deal status
9. Mark screening as completed
10. Return success response

**Output**:
```json
{
  "ok": true,
  "decision": "approve",
  "new_status": "ic_in_review",
  "report_generated": true,
  "pdf_path": null
}
```

**Error Handling**:
- Validates deal exists
- Checks user permissions
- Ensures screening data exists
- Prevents duplicate finalization
- Returns detailed error messages

## 🎯 Best Practices

### Before Finalizing

**Checklist**:
- ✅ All 7 criteria scored
- ✅ Notes written for each criterion
- ✅ Summary memo completed
- ✅ Red/green flags identified
- ✅ Decision matches analysis
- ✅ Data saved before finalizing

**Quality Checks**:
- Are scores justified by notes?
- Do flags match the decision?
- Is memo comprehensive?
- Are all concerns documented?

### Decision Guidelines

**Approve to IC when**:
- Overall score ≥ 3.5
- More green flags than red
- Strong team + market
- Clear path to returns
- Risks are manageable

**Reject when**:
- Overall score < 3.0
- Critical red flags present
- Fundamental concerns
- Poor team/market fit
- Unacceptable risk level

### Report Quality

**Good Reports**:
- ✅ Specific scores with evidence
- ✅ Detailed notes per criterion
- ✅ Clear flag descriptions
- ✅ Comprehensive memo
- ✅ Actionable for IC

**Avoid**:
- ❌ Generic scores without notes
- ❌ Vague flag descriptions
- ❌ Missing memo
- ❌ Incomplete analysis

## 📈 Metrics to Track

**Screening Efficiency**:
- Time from start to finalization
- Approve vs reject rate
- AI usage rate
- Report quality scores

**IC Effectiveness**:
- IC decision time on reports
- Report read rates
- IC questions per deal
- Pass-through rate

**Quality Metrics**:
- Screening accuracy (IC alignment)
- Flag relevance scores
- Report completeness
- IC feedback ratings

## 🔧 Troubleshooting

### "Failed to finalize screening"
**Possible causes**:
1. Screening data not saved
2. Network error
3. Edge function not deployed

**Fix**:
1. Click "Save screening" first
2. Check browser console
3. Verify edge function: `npx supabase functions list`

### Buttons don't appear
**Cause**: Screening already finalized

**Check**:
```sql
SELECT screening_completed_at, screening_decision
FROM deals
WHERE id = 'DEAL_ID';
```

### Report not showing
**Cause**: Report generation failed

**Check**:
```sql
SELECT * FROM screening_reports WHERE deal_id = 'DEAL_ID';
```

### Can't access rejected deals
**Cause**: Wrong role

**Fix**: User must be dealflow_manager, IC member, or admin

## 🆕 Future Enhancements

**Planned**:
- [ ] PDF generation for rejected deals
- [ ] Email notifications on finalization
- [ ] Bulk export of reports
- [ ] Report templates
- [ ] Comparison reports
- [ ] Historical trend analysis

**PDF Generation**:
- Use library like puppeteer or wkhtmltopdf
- Generate from markdown template
- Upload to `screening-reports` bucket
- Store path in `pdf_storage_path`
- Download link in rejected deals page

## 📚 Related Documentation

- `AI_SCREENING_SETUP.md` - AI pitch deck screening
- `DEALFLOW_MANAGER_FEATURES.md` - YC flags and deal creation
- `SCREENING_CRITERIA_MAPPING.md` - 7 criteria details
- `003_screening_reports.sql` - Database migration

## 🎓 Training Guide

### For Dealflow Managers

**Week 1**: Screening basics
- Learn 7 criteria scoring
- Practice using AI screening
- Understand red/green flags

**Week 2**: Decision making
- Practice approve/reject decisions
- Learn report quality standards
- Understand IC needs

**Week 3**: Full workflow
- Complete end-to-end screening
- Make final decisions
- Review generated reports

### For IC Members

**Session 1**: Report structure
- Understand report sections
- Learn to read scores/flags
- Navigate rejected archive

**Session 2**: Using reports
- Prepare for IC meetings
- Ask better questions
- Make faster decisions
