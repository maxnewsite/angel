# AI-Powered Deal Screening - Quick Summary

## ✅ Features Implemented

### 1. PDF Upload for Founders
- **Location**: `/app/founder/deals/new`
- **Features**:
  - Drag-and-drop upload interface
  - Max 10MB PDF files
  - File validation (type + size)
  - Visual feedback with file info
  - Remove/replace functionality
- **Storage**: Supabase `deal-docs` bucket (private)

### 2. AI Screening for Dealflow Managers
- **Location**: Deal detail page `/app/deals/[id]`
- **Features**:
  - "AI Screen Pitch Deck" button
  - Analyzes PDF content automatically
  - Populates all 7 criteria with scores (1-5)
  - Generates notes for each criterion
  - Creates overall assessment summary
- **AI Providers**: Anthropic Claude (primary), OpenAI (fallback)

## 📋 Setup Checklist

- [ ] **Deploy database migrations** (if not done):
  ```bash
  # Run in Supabase SQL Editor
  supabase/migrations/002_incremental_update.sql
  ```

- [ ] **Create storage bucket** (if not exists):
  - Dashboard → Storage → Create bucket `deal-docs` (private)

- [ ] **Set AI API key** (choose one or both):
  ```bash
  # Anthropic (recommended)
  supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key

  # OR OpenAI
  supabase secrets set OPENAI_API_KEY=sk-your-key
  ```

- [ ] **Deploy edge function**:
  ```bash
  supabase functions deploy ai-screen-deal
  ```

- [ ] **Test the feature**:
  1. As founder: Upload a pitch deck
  2. As dealflow manager: Click "AI Screen Pitch Deck"
  3. Verify scores populate automatically

## 🚀 Quick Start

### Get API Keys

**Anthropic Claude** (Recommended):
1. Go to https://console.anthropic.com/
2. Sign up / Sign in
3. Create API key
4. Set in Supabase: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`

**OpenAI** (Alternative):
1. Go to https://platform.openai.com/api-keys
2. Sign up / Sign in
3. Create API key
4. Set in Supabase: `supabase secrets set OPENAI_API_KEY=sk-...`

### Deploy Function

```bash
# From project root
supabase functions deploy ai-screen-deal

# Verify deployment
supabase functions list
# Should show: ai-screen-deal | ACTIVE
```

### Test It!

1. **As Founder**:
   - Navigate to `/app/founder/deals/new`
   - Fill in deal information
   - Upload pitch deck PDF (< 10MB)
   - Submit deal

2. **As Dealflow Manager**:
   - Go to `/app/dealflow/inbox`
   - Click on the deal
   - Scroll to "Screening (7 criteria)"
   - Click "AI Screen Pitch Deck" button
   - Wait 10-30 seconds
   - Review auto-populated scores
   - Adjust if needed and save

## 📁 Files Modified/Created

### Frontend
- ✅ `app/app/founder/deals/new/page.tsx` - Added PDF upload UI
- ✅ `app/app/deals/[id]/page.tsx` - Added AI screening button

### Backend
- ✅ `supabase/functions/ai-screen-deal/index.ts` - AI analysis edge function
- ✅ `supabase/functions/ai-screen-deal/deno.json` - Deno config
- ✅ `supabase/functions/ai-screen-deal/.npmrc` - npm config
- ✅ `supabase/config.toml` - Added function config

### Documentation
- ✅ `AI_SCREENING_SETUP.md` - Comprehensive setup guide
- ✅ `AI_SCREENING_SUMMARY.md` - This file

## 💰 Cost Estimate

**Per deal screening**:
- Anthropic Claude: ~$0.007
- OpenAI GPT-4: ~$0.020

**For 100 deals/month**:
- Anthropic: ~$0.70/month
- OpenAI: ~$2.00/month

Very affordable! 🎉

## 🎯 How It Works

```
Founder uploads PDF
    ↓
Stored in Supabase Storage
    ↓
Manager clicks "AI Screen"
    ↓
Edge function downloads PDF
    ↓
Extracts text from PDF
    ↓
Sends to AI with prompt:
  - Deal info
  - PDF content
  - 7 criteria descriptions
    ↓
AI returns structured JSON:
  - Score (1-5) for each criterion
  - Reasoning note for each
  - Overall assessment
    ↓
UI populates screening form
    ↓
Manager reviews & saves
```

## ⚠️ Important Notes

### For Dealflow Managers

✅ **DO**: Use AI as a starting point
✅ **DO**: Review and adjust AI scores
✅ **DO**: Apply your domain expertise

❌ **DON'T**: Blindly trust AI scores
❌ **DON'T**: Skip manual review
❌ **DON'T**: Use for highly specialized deals without review

### Security

- PDFs stored in private bucket (RLS protected)
- Only authorized roles can view
- AI providers don't train on your data
- API keys stored as secrets (never exposed)

## 🐛 Common Issues

**"No AI API key configured"**
→ Set `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` in Supabase secrets

**"No pitch deck found"**
→ Upload a PDF when creating the deal

**"AI screening takes too long"**
→ Large PDFs may take 30-60 seconds, be patient

**"Failed to download pitch deck"**
→ Check `deal-docs` bucket exists and has proper RLS policies

## 📚 Full Documentation

See `AI_SCREENING_SETUP.md` for:
- Detailed setup instructions
- Troubleshooting guide
- Best practices
- Security & privacy info
- Advanced configuration
- Monitoring & logs

## 🎉 You're Ready!

The AI screening feature is ready to use. Just:
1. Set your API key
2. Deploy the function
3. Upload a pitch deck
4. Click "AI Screen Pitch Deck"

Happy screening! ⚡️
