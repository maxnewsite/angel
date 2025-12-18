# Dealflow Manager Upload & Retrieve System

## ✅ What's Been Added

### 1. **Upload Section for Dealflow Managers**
- Dealflow managers can now upload pitch decks directly from the deal page
- Upload form appears in the "Data room" section
- Validates file type (PDF only) and size (max 10MB)
- Shows upload progress and success messages

### 2. **Document Download System**
- All documents now have a "Download" button
- Uses signed URLs for secure access to private files
- URLs valid for 1 hour
- Opens PDFs in new browser tab

### 3. **AI Integration Ready**
- AI edge function already configured to:
  - Fetch latest uploaded document
  - Download PDF from storage
  - Extract text using pdf-parse
  - Send to Anthropic/OpenAI for analysis
  - Return structured scores for all 7 criteria

## 🚀 Deployment Steps

### Step 1: Update RLS Policies

Run this in **Supabase SQL Editor**:

```sql
-- Drop old policy
DROP POLICY IF EXISTS "Founders can manage own deal docs" ON documents;
DROP POLICY IF EXISTS "Internal roles can view documents" ON documents;
DROP POLICY IF EXISTS "Internal roles can upload documents" ON documents;

-- Create updated policies with proper INSERT permissions
CREATE POLICY "Founders can manage own deal docs" ON documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deals
      JOIN startups ON startups.id = deals.startup_id
      WHERE deals.id = documents.deal_id
      AND startups.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals
      JOIN startups ON startups.id = deals.startup_id
      WHERE deals.id = documents.deal_id
      AND startups.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Internal roles can view documents" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager', 'ic_member', 'ic_chair')
    )
  );

CREATE POLICY "Internal roles can upload documents" ON documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dealflow_manager')
    )
  );
```

### Step 2: Verify Edge Function is Deployed

```bash
# Check if ai-screen-deal is deployed
supabase functions list

# If not deployed, deploy it
supabase functions deploy ai-screen-deal

# Also deploy the transition function with updated status logic
supabase functions deploy dealflow-transition
```

### Step 3: Set AI API Keys (if not already set)

```bash
# Anthropic (recommended)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key

# OR OpenAI
supabase secrets set OPENAI_API_KEY=sk-your-key
```

## 📋 How It Works

### For Dealflow Managers:

1. **View Deal Page**:
   - Navigate to any deal: `/app/deals/[deal-id]`
   - Scroll to "Data room" section

2. **Upload Document**:
   - Click "Choose PDF (max 10MB)" button
   - Select PDF file from computer
   - Review file details (name, size)
   - Click "Upload Document"
   - Wait for success message
   - Document appears in list below

3. **Download Documents**:
   - See all uploaded documents in list
   - Each shows: PDF icon, filename, visibility, upload date
   - Click "Download" button
   - PDF opens in new browser tab

4. **AI Screen the PDF**:
   - Scroll to "Screening (7 criteria)" section
   - Click "AI Screen Pitch Deck" button
   - Wait 10-30 seconds for AI analysis
   - All 7 criteria scores auto-populate
   - Overall assessment appears in memo
   - Review and adjust if needed
   - Click "Save screening"

### How AI Retrieves the PDF:

The edge function (`ai-screen-deal`) automatically:

1. **Fetches Document Record**:
```typescript
const { data: docs } = await adminClient
  .from("documents")
  .select("storage_path,file_name")
  .eq("deal_id", dealId)
  .eq("visibility", "internal")
  .order("created_at", { ascending: false })
  .limit(1);
```

2. **Downloads PDF from Storage**:
```typescript
const { data: pdfData } = await adminClient.storage
  .from("deal-docs")
  .download(doc.storage_path);
```

3. **Extracts Text**:
```typescript
const pdfBuffer = await pdfData.arrayBuffer();
const pdfParsed = await PdfParse(Buffer.from(pdfBuffer));
const pdfText = pdfParsed.text;
```

4. **Sends to AI**:
```typescript
// Sends to Anthropic Claude or OpenAI
// Prompt includes: deal info + PDF text + 7 criteria
// Returns structured JSON with scores + notes
```

## 🔍 Verification

### Check Documents Table:

```sql
SELECT
  d.id,
  d.file_name,
  d.storage_path,
  d.visibility,
  d.uploaded_by_user_id,
  d.created_at,
  deals.status,
  startups.name as startup_name
FROM documents d
JOIN deals ON deals.id = d.deal_id
JOIN startups ON startups.id = deals.startup_id
ORDER BY d.created_at DESC
LIMIT 10;
```

### Check Storage Files:

```sql
SELECT
  name as file_path,
  bucket_id,
  created_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'deal-docs'
ORDER BY created_at DESC
LIMIT 10;
```

### Test Upload:

1. Login as dealflow manager
2. Go to any deal page
3. Try uploading a small PDF
4. Check browser console for errors
5. Verify document appears in list
6. Try downloading it
7. Try AI screening

## 🎯 Complete Flow Example

### Scenario: Dealflow Manager Reviews New Deal

1. **Deal Submitted by Founder** (without PDF):
   - Founder creates deal
   - Doesn't upload PDF or upload fails
   - Deal appears in dealflow manager's inbox

2. **Dealflow Manager Uploads PDF**:
   - Opens deal page
   - Sees "No documents available"
   - Clicks "Choose PDF (max 10MB)"
   - Selects `startup-pitch-deck.pdf`
   - Clicks "Upload Document"
   - Success! PDF appears in list

3. **Dealflow Manager Downloads to Review**:
   - Clicks "Download" button
   - PDF opens in new tab
   - Reviews manually

4. **Dealflow Manager Uses AI**:
   - Scrolls to screening section
   - Clicks "AI Screen Pitch Deck"
   - Waits 20 seconds
   - AI populates all 7 scores with notes
   - Reviews AI suggestions
   - Adjusts Market Opportunity from 4 to 5
   - Adds custom notes
   - Clicks "Save screening"

5. **Dealflow Manager Transitions Deal**:
   - Clicks "Start screening" → Success
   - Reviews thoroughly
   - Clicks "Approve to IC" → Success
   - Deal moves to IC review stage

## 🐛 Troubleshooting

### Issue: "Failed to upload file"

**Check**:
- File is PDF format
- File size < 10MB
- User is logged in as dealflow_manager or admin
- Browser console for detailed error

**Fix**:
```sql
-- Verify user role
SELECT id, email, role FROM profiles WHERE email = 'your-email@example.com';

-- Check storage bucket exists
SELECT * FROM storage.buckets WHERE id = 'deal-docs';
```

### Issue: "Failed to create document record"

**Check**:
- RLS policy allows INSERT
- All required columns provided

**Fix**:
```sql
-- Check RLS policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'documents';

-- Should see:
-- "Internal roles can upload documents" with cmd = INSERT
```

### Issue: "Failed to download"

**Check**:
- Document record exists
- Storage file exists
- Storage RLS policies allow SELECT

**Fix**:
```sql
-- Verify document and file exist
SELECT d.storage_path, s.name
FROM documents d
LEFT JOIN storage.objects s ON s.name = d.storage_path
WHERE d.deal_id = 'your-deal-id';

-- Check storage policies
SELECT policyname FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects';
```

### Issue: "No pitch deck found for this deal"

**Cause**: AI can't find document in database

**Fix**:
```sql
-- Check if document exists
SELECT * FROM documents WHERE deal_id = 'your-deal-id';

-- If missing, upload one through the UI
```

### Issue: AI screening takes too long

**Causes**:
- Large PDF (many pages)
- Complex content
- API rate limiting

**Solutions**:
- Wait up to 60 seconds
- Retry once if timeout
- Check AI provider status
- Verify API key is valid

## 📊 Current Features

✅ Upload PDF from deal page (dealflow managers)
✅ Download any PDF with signed URLs
✅ AI automatically fetches latest PDF
✅ AI extracts text and analyzes
✅ AI returns structured scores
✅ Manual score adjustment
✅ RLS security on all operations
✅ File size validation (10MB)
✅ File type validation (PDF only)

## 🎉 You're Ready!

The complete upload, download, and AI screening system is now in place. Just:

1. Run the SQL to update policies
2. Verify edge functions are deployed
3. Test uploading a PDF as dealflow manager
4. Test AI screening
5. Start screening deals!
