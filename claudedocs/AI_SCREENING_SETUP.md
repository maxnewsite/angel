# AI Screening Setup & Testing Guide

## Overview
The AI screening feature uses Claude 3.5 Sonnet to automatically analyze pitch deck PDFs and score them against 7 predefined criteria.

## Components Fixed

### 1. Edge Function (`ai-screen-deal`)
**Location**: `supabase/functions/ai-screen-deal/index.ts`

**Fixed Issues**:
- ✅ Removed broken `pdf-parse` library (caused stack overflow)
- ✅ Implemented chunked base64 encoding for large PDFs
- ✅ Direct PDF upload to Claude API (native PDF support)
- ✅ Enhanced error handling and logging
- ✅ Flexible criterion name matching
- ✅ JSON extraction from markdown code blocks

**How it Works**:
1. Downloads PDF from Supabase storage
2. Converts PDF to base64 in chunks (prevents stack overflow)
3. Sends PDF + startup info + criteria to Claude 3.5 Sonnet
4. Parses JSON response with fallback for markdown-wrapped JSON
5. Maps AI scores to database criteria (with fuzzy matching)
6. Returns scored criteria + overall assessment

### 2. Frontend Integration
**Location**: `app/app/deals/[id]/page.tsx`

**Features**:
- ✅ "AI Screen Pitch Deck" button in screening editor
- ✅ Comprehensive error messages
- ✅ Auto-populates scores and notes
- ✅ Sets overall assessment as memo
- ✅ Detailed console logging for debugging

## Prerequisites

### 1. Anthropic API Key
The API key is already configured in your Supabase secrets:

```bash
npx supabase secrets list
```

Should show:
```
ANTHROPIC_API_KEY: sk-ant-api03-...
```

### 2. Screening Criteria
Run verification script to check:

```bash
# In Supabase SQL Editor, run:
scripts/verify-ai-screening.sql
```

Expected: 7 active criteria:
1. Market Opportunity (weight: 1.5)
2. Team Quality (weight: 2.0)
3. Product/Technology (weight: 1.5)
4. Traction (weight: 2.0)
5. Business Model (weight: 1.0)
6. Competition (weight: 1.0)
7. Valuation (weight: 1.0)

## Testing Steps

### Step 1: Verify Edge Function Deployment
```bash
npx supabase functions list
```

Look for `ai-screen-deal` with status `ACTIVE`.

### Step 2: Test CORS
```bash
curl --ssl-no-revoke -X OPTIONS "https://bqofvmremrxlbipqonhx.supabase.co/functions/v1/ai-screen-deal" \
  -H "Content-Type: application/json"
```

Expected: `ok` response

### Step 3: Create Test Deal
1. Log in as `dealflow_manager` or `admin`
2. Navigate to a deal or create new one
3. Upload a pitch deck PDF (must be PDF format, max 10MB)
4. Deal must have status allowing screening

### Step 4: Run AI Screening
1. Scroll to "Screening (7 criteria)" section
2. Click "AI Screen Pitch Deck" button
3. Wait 10-30 seconds (depends on PDF size)
4. Check browser console for detailed logs

**Expected Console Logs**:
```
Supabase URL from env: https://bqofvmremrxlbipqonhx.supabase.co
JWT token present: true
Calling AI function: https://bqofvmremrxlbipqonhx.supabase.co/functions/v1/ai-screen-deal
AI function response status: 200
AI function success: {ok: true, overall_score: 3.8, criteria_scores: [...], ...}
```

**Edge Function Logs** (check in Supabase Dashboard):
```
Using Anthropic API with key: sk-ant-api...
PDF size: 245678 characters
Calling Anthropic API...
Anthropic response status: 200
Anthropic response received, content blocks: 1
Successfully parsed AI response
Scored criteria count: 7
```

### Step 5: Verify Results
After successful screening:
- ✅ All 7 criteria sliders auto-populated with scores (1-5)
- ✅ Each criterion has detailed analysis notes (2-3 sentences)
- ✅ Overall weighted score calculated
- ✅ Overall assessment populated in memo field
- ✅ Alert: "AI screening complete! Review and adjust scores as needed."

## Common Issues & Solutions

### Issue: "Maximum call stack size exceeded"
**Cause**: Large PDF causing base64 encoding to overflow
**Status**: ✅ FIXED - Implemented chunked encoding

### Issue: "Failed to fetch" or "Network error"
**Possible Causes**:
- Edge function not deployed
- CORS issue
- API timeout

**Solution**:
```bash
# Redeploy function
npx supabase functions deploy ai-screen-deal

# Check function logs in Supabase Dashboard
```

### Issue: "No pitch deck found"
**Cause**: No PDF uploaded or wrong visibility
**Solution**:
- Upload PDF to deal's data room
- PDF must have `visibility = 'internal'`

### Issue: "No active screening criteria found"
**Cause**: Database not seeded
**Solution**:
```sql
-- Run in Supabase SQL Editor
INSERT INTO screening_criteria (name, description, weight, is_active) VALUES
  ('Market Opportunity', 'Size and growth potential of target market', 1.5, true),
  ('Team Quality', 'Experience and execution capability of founding team', 2.0, true),
  ('Product/Technology', 'Innovation and competitive advantage of solution', 1.5, true),
  ('Traction', 'Customer adoption and revenue metrics', 2.0, true),
  ('Business Model', 'Revenue model and unit economics viability', 1.0, true),
  ('Competition', 'Competitive landscape and differentiation', 1.0, true),
  ('Valuation', 'Deal terms and valuation reasonableness', 1.0, true)
ON CONFLICT DO NOTHING;
```

### Issue: AI returns empty or partial scores
**Possible Causes**:
- Claude couldn't read PDF (corrupted/encrypted)
- Prompt doesn't match criteria names
- JSON parsing failed

**Solution**: Check edge function logs for details

## Model Configuration

**Current Model**: `claude-haiku-4-5-20251001` (Claude Haiku 4.5)
**Why this model**:
- Native PDF support (reads images, charts, formatting)
- Fast and cost-effective
- Reliable JSON output
- Latest Haiku model with excellent performance

## API Costs

Using Claude Haiku 4.5:
- **Input**: ~$1 per million tokens
- **Output**: ~$5 per million tokens

Estimated cost per pitch deck:
- 10-page PDF: ~50K input tokens + 2K output tokens = **~$0.06**
- 20-page PDF: ~100K input tokens + 2K output tokens = **~$0.11**

**Much more cost-effective than Sonnet!**

## Code References

### Edge Function
`supabase/functions/ai-screen-deal/index.ts:76-85` - Base64 encoding
`supabase/functions/ai-screen-deal/index.ts:147-195` - Anthropic API call
`supabase/functions/ai-screen-deal/index.ts:224-243` - JSON parsing
`supabase/functions/ai-screen-deal/index.ts:245-275` - Criteria mapping

### Frontend
`app/app/deals/[id]/page.tsx:608-670` - AI screening function
`app/app/deals/[id]/page.tsx:642-650` - Score population
`app/app/deals/[id]/page.tsx:733-743` - AI button UI

## Monitoring

### Check Recent Screenings
```sql
SELECT
  sr.id,
  d.id as deal_id,
  s.name as startup_name,
  sr.overall_score,
  sr.decision,
  sr.created_at,
  COUNT(ss.id) as criteria_scored
FROM screening_reviews sr
JOIN deals d ON sr.deal_id = d.id
JOIN startups s ON d.startup_id = s.id
LEFT JOIN screening_scores ss ON sr.deal_id = ss.deal_id AND sr.manager_user_id = ss.manager_user_id
GROUP BY sr.id, d.id, s.name, sr.overall_score, sr.decision, sr.created_at
ORDER BY sr.created_at DESC
LIMIT 10;
```

### View Detailed Scores
```sql
SELECT
  c.name as criterion,
  ss.score,
  ss.note,
  ss.created_at
FROM screening_scores ss
JOIN screening_criteria c ON ss.criterion_id = c.id
WHERE ss.deal_id = 'DEAL_ID_HERE'
ORDER BY c.created_at;
```

## Next Steps

1. ✅ Edge function deployed and working
2. ✅ CORS configured
3. ✅ API key connected
4. ✅ Prompts optimized for criteria matching
5. 🔄 **TEST**: Upload a pitch deck and run AI screening
6. 📊 Monitor costs and adjust model if needed (can downgrade to Haiku for lower cost)

## Support

If issues persist:
1. Check browser console for frontend errors
2. Check Supabase Dashboard → Edge Functions → ai-screen-deal → Logs
3. Verify API key: `npx supabase secrets list`
4. Run verification script: `scripts/verify-ai-screening.sql`
