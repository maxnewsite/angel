# Setup New Features - Quick Start Guide

## 🎯 Two New Features

1. **Dealflow Manager Deal Creation** - Create deals for 1:1 submissions
2. **YC Red/Green Flags** - Structured flag system with AI detection

## 📋 Setup Steps (5 minutes)

### Step 1: Run Database Migration

1. **Open Supabase Dashboard** → SQL Editor
2. **Copy and paste** contents of: `supabase/migrations/002_yc_flags.sql`
3. **Click "Run"**

**Expected**: Success message, 2 new tables created

### Step 2: Verify Tables

```sql
-- Run this to verify:
SELECT COUNT(*) FROM yc_flags_catalog;
-- Expected: ~30 rows
```

### Step 3: Verify Edge Functions

```bash
npx supabase functions list
```

**Expected output**:
```
ai-screen-deal      ✓ ACTIVE
ai-detect-flags     ✓ ACTIVE
```

If `ai-detect-flags` is missing:
```bash
npx supabase functions deploy ai-detect-flags
```

### Step 4: Test Features

#### Test 1: Dealflow Manager Deal Creation
1. Login as **dealflow_manager** or **admin**
2. Navigate to `/app/deals/new` (or click "New Deal" in nav)
3. Fill in startup information
4. Upload a pitch deck PDF
5. Click "Create deal"
6. ✅ Should redirect to deal page with status "screening"

#### Test 2: YC Flags
1. Open any deal in screening status
2. Scroll to "YC-Style Flags" section (below screening criteria)
3. Click "AI Detect Flags" button
4. Wait 10-20 seconds
5. ✅ Should see green and red flags auto-populated

## 🧪 Complete Test Checklist

### Deal Creation
- [ ] Dealflow manager can access `/app/deals/new`
- [ ] Regular investors cannot access (should see "Access denied")
- [ ] Startup info form is populated
- [ ] PDF upload works (max 10MB)
- [ ] Deal creates with status "screening"
- [ ] Deal shows created_by = dealflow manager user ID

### YC Flags
- [ ] Flags section appears in deal detail page
- [ ] "AI Detect Flags" button is visible
- [ ] AI detection completes in 10-30 seconds
- [ ] Green flags populate (3-5 flags with notes)
- [ ] Red flags populate (3-5 flags with notes)
- [ ] Can add custom flags manually
- [ ] Can browse flag catalog
- [ ] Flags save successfully
- [ ] Flags persist on page reload

## ⚠️ Troubleshooting

### Migration Fails
**Error**: `relation "deal_flags" already exists`
**Fix**: Table already created, skip migration

### Edge Function Not Found
**Error**: `Function ai-detect-flags not found`
**Fix**:
```bash
npx supabase functions deploy ai-detect-flags
```

### AI Detection Fails
**Error**: `No AI API key configured`
**Fix**: Verify API key exists:
```bash
npx supabase secrets list
# Should show ANTHROPIC_API_KEY
```

### Flags Don't Save
**Error**: `permission denied for table deal_flags`
**Fix**: RLS policies not applied, re-run migration

### Access Denied on /app/deals/new
**Error**: `Access denied. Only dealflow managers...`
**Fix**:
1. Check user role in database
2. User must be `dealflow_manager` or `admin`

## 📊 Quick Verification SQL

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('deal_flags', 'yc_flags_catalog');
-- Expected: 2 rows

-- Count catalog entries
SELECT flag_type, COUNT(*)
FROM yc_flags_catalog
GROUP BY flag_type;
-- Expected: green ~15, red ~15

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('deal_flags', 'yc_flags_catalog');
-- Expected: Both should have rowsecurity = true

-- List all edge functions
SELECT name, status, version
FROM _supabase_functions;
-- Expected: ai-screen-deal, ai-detect-flags
```

## 🎉 Success Criteria

✅ Database tables created and populated
✅ Edge functions deployed and active
✅ Dealflow manager can create deals
✅ AI flag detection works
✅ Manual flags can be added/saved
✅ Flags visible to IC members

## 📚 Next Steps

1. **Train dealflow managers** on new deal creation flow
2. **Set flag guidelines** for consistency
3. **Monitor AI accuracy** and adjust prompts if needed
4. **Gather IC feedback** on flag usefulness
5. **Track metrics** (adoption, time savings)

## 📖 Full Documentation

- **Complete Guide**: `claudedocs/DEALFLOW_MANAGER_FEATURES.md`
- **AI Screening**: `claudedocs/AI_SCREENING_SETUP.md`
- **Flag Mapping**: `claudedocs/SCREENING_CRITERIA_MAPPING.md`

## 🆘 Support

If issues persist:
1. Check browser console for errors
2. Check Supabase logs for edge function errors
3. Verify API key: `npx supabase secrets list`
4. Review RLS policies in Supabase Dashboard
