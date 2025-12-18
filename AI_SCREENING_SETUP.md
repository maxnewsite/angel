# AI-Powered Deal Screening Setup Guide

This guide explains how to set up and use the AI-powered pitch deck screening feature that automatically analyzes PDFs and populates the 7 screening criteria.

## Features Added

### 1. ✅ PDF Upload for Founders
- Upload pitch deck during deal submission (max 10MB)
- Drag-and-drop interface with validation
- Automatic upload to Supabase Storage (`deal-docs` bucket)
- Files visible to dealflow managers

### 2. ✅ AI Screening for Dealflow Managers
- One-click "AI Screen Pitch Deck" button
- Automatically analyzes PDF content using LLM APIs
- Populates all 7 criteria with scores (1-5) and notes
- Generates overall assessment summary
- Supports multiple AI providers (Anthropic Claude, OpenAI, Llama)

### 3. ✅ Improved Deal Submission UX
- Clean, modern PDF upload interface
- File size indicator and validation
- Remove/replace file functionality
- Loading states during upload

## Prerequisites

Before setting up AI screening, ensure:

1. ✅ Database schema deployed (from `supabase/migrations/002_incremental_update.sql`)
2. ✅ `deal-docs` storage bucket created in Supabase
3. ✅ 7 screening criteria seeded in database
4. ✅ API key for at least one AI provider

## Setup Instructions

### Step 1: Configure AI API Keys

You need to set up at least one AI provider API key as an environment variable in Supabase.

#### Option A: Anthropic Claude (Recommended)

1. **Get API Key**:
   - Go to https://console.anthropic.com/
   - Create an account or sign in
   - Generate an API key

2. **Add to Supabase**:
   ```bash
   # Dashboard → Project Settings → Edge Functions → Add secret
   Name: ANTHROPIC_API_KEY
   Value: sk-ant-...your-key-here...
   ```

   Or using CLI:
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...your-key-here...
   ```

#### Option B: OpenAI (Alternative)

1. **Get API Key**:
   - Go to https://platform.openai.com/api-keys
   - Create an account or sign in
   - Generate an API key

2. **Add to Supabase**:
   ```bash
   # Dashboard → Project Settings → Edge Functions → Add secret
   Name: OPENAI_API_KEY
   Value: sk-...your-key-here...
   ```

   Or using CLI:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-...your-key-here...
   ```

#### Option C: Both APIs (Fallback Support)

Set both keys to have Anthropic as primary with OpenAI as fallback:
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set OPENAI_API_KEY=sk-...
```

### Step 2: Deploy Edge Function

Deploy the AI screening edge function:

```bash
# From project root directory
supabase functions deploy ai-screen-deal
```

Verify deployment:
```bash
# Check function appears in list
supabase functions list

# Expected output:
# ┌─────────────────────┬──────────┬─────────────┐
# │ NAME                │ STATUS   │ UPDATED_AT  │
# ├─────────────────────┼──────────┼─────────────┤
# │ ai-screen-deal      │ ACTIVE   │ ...         │
# │ dealflow-transition │ ACTIVE   │ ...         │
# │ ...                 │          │             │
# └─────────────────────┴──────────┴─────────────┘
```

### Step 3: Verify Storage Bucket

Ensure the `deal-docs` bucket exists and has proper policies:

1. **Create Bucket** (if not exists):
   - Dashboard → Storage → Create bucket
   - Name: `deal-docs`
   - Public: `false` (private)

2. **Storage Policies** (should already be set from migration):
   ```sql
   -- Allow authenticated users to upload
   CREATE POLICY "Authenticated users can upload files"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'deal-docs');

   -- Allow users to download based on access rights
   CREATE POLICY "Users can download accessible files"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (
     bucket_id = 'deal-docs' AND
     (
       -- Internal roles can access all
       EXISTS (
         SELECT 1 FROM profiles
         WHERE id = auth.uid()
         AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
       )
       OR
       -- Founders can access their own deal files
       EXISTS (
         SELECT 1 FROM documents
         JOIN deals ON deals.id = documents.deal_id
         JOIN startups ON startups.id = deals.startup_id
         WHERE documents.storage_path = storage.objects.name
         AND startups.owner_user_id = auth.uid()
       )
     )
   );
   ```

### Step 4: Test the Feature

#### As a Founder:

1. Go to `/app/founder/deals/new`
2. Fill in startup and deal information
3. Upload a pitch deck PDF (max 10MB)
4. Submit the deal
5. Verify file appears in deal detail page

#### As a Dealflow Manager:

1. Go to `/app/dealflow/inbox`
2. Click on a submitted deal with pitch deck
3. Scroll to "Screening (7 criteria)" section
4. Click "AI Screen Pitch Deck" button
5. Wait for AI analysis (10-30 seconds)
6. Review auto-populated scores and notes
7. Adjust if needed and save

## How It Works

### Architecture Flow

```
Founder uploads PDF
       ↓
Stored in Supabase Storage (deal-docs bucket)
       ↓
Document record created in database
       ↓
Dealflow manager clicks "AI Screen Pitch Deck"
       ↓
Edge function triggered (ai-screen-deal)
       ↓
Function downloads PDF from storage
       ↓
Extracts text using pdf-parse
       ↓
Sends to AI API (Anthropic/OpenAI) with prompt
       ↓
AI analyzes against 7 criteria
       ↓
Returns structured JSON with scores + notes
       ↓
UI populates screening form
       ↓
Manager reviews and saves
```

### AI Prompt Structure

The edge function sends this information to the AI:

```
1. Startup Information
   - Company name, sector, description
   - Round type, target amount, valuation
   - Highlights, risks, use of funds

2. Pitch Deck Content (extracted text)
   - Full PDF text (up to 50k characters)

3. Screening Criteria
   - All 7 criteria with descriptions and weights

4. Instructions
   - Score each criterion 1-5
   - Provide reasoning notes
   - Return structured JSON
```

### AI Model Selection

**Priority Order**:
1. **Anthropic Claude 3.5 Sonnet** (if `ANTHROPIC_API_KEY` set)
   - Model: `claude-3-5-sonnet-20241022`
   - Best for investment analysis
   - Excellent at understanding business context

2. **OpenAI GPT-4 Turbo** (if `OPENAI_API_KEY` set)
   - Model: `gpt-4-turbo-preview`
   - Good alternative
   - Structured JSON output

The function automatically tries Anthropic first, then falls back to OpenAI if Anthropic key is not available.

## File Structure

### New Files Created

```
app/app/founder/deals/new/page.tsx (updated)
  └─ Added PDF upload component with validation

app/app/deals/[id]/page.tsx (updated)
  └─ Added AI screening button to ScreeningEditor
  └─ Added aiScreen() function

supabase/functions/ai-screen-deal/
  ├─ index.ts (main edge function)
  ├─ deno.json (Deno configuration)
  └─ .npmrc (npm registry config)

supabase/config.toml (updated)
  └─ Added [functions.ai-screen-deal] config
```

## Troubleshooting

### Issue: "No AI API key configured"

**Solution**: Set either `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` in Supabase secrets:
```bash
supabase secrets set ANTHROPIC_API_KEY=your-key-here
```

### Issue: "No pitch deck found for this deal"

**Causes**:
1. No PDF was uploaded during deal submission
2. PDF upload failed (check file size < 10MB)
3. Document record not created in database

**Solution**:
- Re-upload the pitch deck
- Check `documents` table for the deal_id
- Verify file exists in `deal-docs` storage bucket

### Issue: "Failed to download pitch deck"

**Causes**:
1. Storage bucket doesn't exist
2. Storage policies blocking access
3. File was deleted

**Solution**:
```sql
-- Check if file exists
SELECT * FROM documents WHERE deal_id = 'your-deal-id';

-- Check storage bucket
SELECT * FROM storage.objects WHERE bucket_id = 'deal-docs';

-- Verify policies
SELECT * FROM pg_policies WHERE tablename = 'objects';
```

### Issue: "AI screening takes too long"

**Causes**:
1. Large PDF file (many pages)
2. API rate limits or slow response

**Solutions**:
- Wait up to 60 seconds for large files
- Check AI provider status page
- Retry if timeout occurs

### Issue: "Anthropic API error" or "OpenAI API error"

**Causes**:
1. Invalid API key
2. Insufficient credits
3. Rate limit exceeded

**Solutions**:
- Verify API key is correct
- Check account has credits
- Wait before retrying (rate limit)

## Cost Estimation

### AI API Costs

**Anthropic Claude 3.5 Sonnet**:
- Input: $3 / million tokens (~$0.0015 per deck)
- Output: $15 / million tokens (~$0.005 per analysis)
- **Estimated**: ~$0.007 per deal screening

**OpenAI GPT-4 Turbo**:
- Input: $10 / million tokens (~$0.005 per deck)
- Output: $30 / million tokens (~$0.015 per analysis)
- **Estimated**: ~$0.020 per deal screening

### Storage Costs

**Supabase Storage**:
- First 1GB free
- Additional: $0.021/GB/month
- **Estimated**: Negligible for PDF storage

## Best Practices

### For Founders

1. **Upload High-Quality Pitch Decks**:
   - Include all key information
   - Clear, readable text (not just images)
   - 10-20 pages ideal

2. **File Size**:
   - Keep under 10MB
   - Compress images if needed
   - Remove unnecessary pages

3. **Content Checklist**:
   - ✅ Problem & Solution
   - ✅ Market Size & Opportunity
   - ✅ Business Model
   - ✅ Team backgrounds
   - ✅ Traction metrics
   - ✅ Competition analysis
   - ✅ Financials & Use of Funds

### For Dealflow Managers

1. **Review AI Scores**:
   - AI provides initial analysis
   - **Always review and adjust** based on domain expertise
   - AI may miss nuanced context

2. **When to Use AI Screening**:
   - ✅ Initial screening of new deals
   - ✅ Deals with comprehensive pitch decks
   - ✅ When you need quick first impression

3. **When to Manual Screen**:
   - ❌ No pitch deck available
   - ❌ Pitch deck is mostly images
   - ❌ Highly specialized/technical deals
   - ❌ Deals requiring deep domain knowledge

4. **AI as Assistant, Not Replacement**:
   - Use AI to speed up initial review
   - Apply human judgment for final decision
   - Consider factors AI can't assess (team dynamics, market timing)

## Security & Privacy

### Data Handling

1. **PDF Storage**:
   - Stored in private Supabase bucket
   - Access controlled by RLS policies
   - Only authorized roles can view

2. **AI Processing**:
   - PDF text extracted in edge function
   - Sent to AI provider via HTTPS
   - Not stored by AI provider (per their policies)
   - No training on your data (both Anthropic & OpenAI)

3. **API Keys**:
   - Stored as Supabase secrets
   - Never exposed to frontend
   - Accessed only by edge functions

### Access Control

**Who can upload PDFs**: Founders (deal creators)
**Who can view PDFs**: Dealflow managers, IC members, admins, deal owner
**Who can trigger AI screening**: Dealflow managers, admins
**Who can see AI results**: Same as who can view deal screening

## Advanced Configuration

### Customizing AI Prompt

Edit `supabase/functions/ai-screen-deal/index.ts`:

```typescript
const prompt = `You are an expert venture capital analyst...

# Custom Instructions
Add your specific criteria or focus areas here...

# Instructions
Analyze the pitch deck against each criterion...
`;
```

### Changing AI Model

```typescript
// For Anthropic (in index.ts)
model: "claude-3-5-sonnet-20241022" // or claude-3-opus-20240229

// For OpenAI (in index.ts)
model: "gpt-4-turbo-preview" // or gpt-4, gpt-3.5-turbo
```

### Adjusting Token Limits

```typescript
// Anthropic
max_tokens: 4096 // Increase for longer analysis

// PDF text limit
pdfText.substring(0, 50000) // Increase if needed
```

## Monitoring & Logs

### Check Edge Function Logs

```bash
# View logs
supabase functions logs ai-screen-deal

# Follow logs in real-time
supabase functions logs ai-screen-deal --follow
```

### Or in Dashboard:
- Dashboard → Edge Functions → ai-screen-deal → Logs
- Filter by time range
- Search for errors or specific deal IDs

## Next Steps

After setup, you can:

1. **Test with Sample Deals**:
   - Create test deals with various pitch decks
   - Compare AI scores with manual evaluation
   - Refine prompts if needed

2. **Train Team**:
   - Show dealflow managers how to use AI screening
   - Emphasize AI as assistant tool
   - Establish review guidelines

3. **Monitor Usage**:
   - Track API costs
   - Review AI accuracy over time
   - Gather feedback from managers

4. **Optimize**:
   - Adjust prompts based on results
   - Fine-tune scoring criteria
   - Add domain-specific context

## Support

**Issues with AI providers**:
- Anthropic: https://support.anthropic.com
- OpenAI: https://help.openai.com

**Supabase Edge Functions**:
- Docs: https://supabase.com/docs/guides/functions
- Community: https://supabase.com/discord

**GitHub Issues**:
- For bugs or feature requests, create an issue in your repo

---

**Ready to start!** Upload a pitch deck and click "AI Screen Pitch Deck" to see the magic happen. 🎯✨
