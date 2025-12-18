# User Registration & Onboarding System

Complete user registration system with email verification, comprehensive profile data collection, and onboarding completion tracking.

## Overview

The User Registration System provides a structured onboarding flow similar to the expert classification system. New users go through email verification, role selection, and detailed profile completion before accessing the platform.

## Features Implemented

### 1. Database Schema
**File**: `supabase/migrations/011_user_registration_onboarding.sql`

#### Extended Profile Fields:

**Basic Information** (matching expert system):
- `full_name` - User's full name
- `phone` - Contact phone number
- `linkedin_url` - LinkedIn profile URL
- `location` - City, State/Country
- `company` - Current company
- `title` - Professional title
- `bio` - Professional background

**Onboarding Tracking**:
- `onboarding_completed` - Boolean flag
- `onboarding_completed_at` - Completion timestamp
- `email_verified` - Email verification status (synced from Supabase Auth)
- `email_verified_at` - Verification timestamp
- `profile_completeness` - 0-100 score calculated automatically

**Investor-Specific Fields**:
- `investor_type` - Type: angel, vc, family_office, institutional, corporate, syndicate, individual
- `accredited_investor` - Boolean for compliance
- `investment_experience_years` - Years of investment experience
- `portfolio_size` - Current portfolio size (0-5, 5-10, 10-25, 25-50, 50+)
- `preferred_sectors[]` - Array of sectors (Fintech, AI, Healthcare, etc.)
- `preferred_stages[]` - Array of stages (Pre-Seed, Seed, Series A, etc.)
- `preferred_geographies[]` - Array of geographies
- `min_ticket_size`, `max_ticket_size`, `typical_ticket_size` - Investment amounts
- `annual_investment_capacity` - Total annual capacity

**Founder-Specific Fields**:
- `founder_experience` - Type: first_time, serial, previously_exited
- `previous_exits` - Number of previous exits
- `previous_fundraising_rounds` - Number of rounds raised
- `specializations[]` - Array of specializations (Product, Engineering, Sales, etc.)
- `education[]` - Array of education (Bachelor's, Master's, MBA, PhD, etc.)

**Compliance & Privacy**:
- `terms_accepted`, `terms_accepted_at`
- `privacy_policy_accepted`, `privacy_policy_accepted_at`
- `kyc_verified`, `kyc_verified_at`, `kyc_documents`

**Network & References**:
- `referral_source` - How they heard about the platform
- `referred_by_user_id` - Referrer profile ID

#### Additional Tables:

**investor_preferences** - Detailed investment criteria:
- Sector preferences (interests and exclusions)
- Stage preferences
- Deal characteristics (min/max revenue, team size, etc.)
- Geographic preferences
- Investment thesis and strategy
- Value-add areas
- Engagement preferences (board seats, advisory, etc.)
- Follow-on strategy

**onboarding_steps** - Multi-step progress tracking:
- Tracks each step completion
- Stores step-specific data
- Enables resumable onboarding

**email_verification_tokens** - Manual verification tracking:
- Token generation and validation
- Expiry management
- Verification status

### 2. Helper Functions

**calculate_profile_completeness(user_id)** - Calculates 0-100 score:
- Basic fields: 40 points (name, email, phone, location, LinkedIn, bio)
- Professional fields: 20 points (company, title)
- Role-specific fields: 40 points (investor type/preferences or founder experience/specializations)

**complete_onboarding(user_id)** - Marks onboarding complete:
- Sets `onboarding_completed = true`
- Sets timestamp
- Calculates final profile completeness

**verify_email(user_id)** - Marks email verified:
- Sets `email_verified = true`
- Sets verification timestamp

**Auto-trigger**: `update_profile_completeness_trigger`
- Automatically recalculates profile completeness when profile is updated
- Updates `profile_completeness` field
- Updates `updated_at` timestamp

### 3. UI Components
**File**: `app/onboarding/page_new.tsx`

#### Multi-Step Onboarding Flow:

**Step 1: Email Verification**
- Checks if email is verified via Supabase Auth
- Shows verification instructions
- Resend email button
- Cannot proceed until verified

**Step 2: Role Selection**
- Choose between Investor or Founder
- Shows role descriptions and icons
- Saves role to profile

**Step 3: Basic Information**
- Full name (required)
- Email (auto-filled, read-only)
- Phone
- Location (required)
- Company
- Title
- LinkedIn URL
- Bio

**Step 4a: Investor Profile** (if investor):
- Investor type (required): angel, VC, family office, institutional, etc.
- Investment experience (years)
- Portfolio size
- Typical ticket size
- Accredited investor checkbox
- Preferred sectors (multi-select, required)
- Preferred stages (multi-select)
- Preferred geographies (multi-select)

**Step 4b: Founder Profile** (if founder):
- Founder experience (required): first-time, serial, previously exited
- Previous exits count
- Specializations (multi-select): Product, Engineering, Sales, etc.
- Education (multi-select): Bachelor's, Master's, MBA, PhD, etc.

**Step 5: Terms & Completion**
- Terms of Service acceptance (required)
- Privacy Policy acceptance (required)
- Complete registration button
- Redirects to platform

#### UI Features:
- **Progress Bar**: Visual indicator showing completion percentage
- **Step Indicators**: Current step highlighted
- **Form Validation**: Required fields checked before proceeding
- **Auto-Save**: Data saved at each step
- **Resume Support**: Can leave and return to continue where left off
- **Responsive Design**: Works on mobile and desktop
- **Loading States**: Shows saving/loading indicators

## Installation Steps

### Step 1: Apply Database Migration

Go to **Supabase Dashboard → SQL Editor** and execute the SQL script:
`supabase/migrations/011_user_registration_onboarding.sql`

This will:
1. Add all extended profile fields to `profiles` table
2. Create `investor_preferences` table
3. Create `onboarding_steps` table
4. Create `email_verification_tokens` table
5. Create helper functions
6. Create auto-update triggers
7. Create indexes for performance
8. Set up RLS policies

### Step 2: Enable Email Verification in Supabase

Go to **Supabase Dashboard → Authentication → Settings**:

1. **Email Settings**:
   - Enable "Confirm email"
   - Customize verification email template
   - Set redirect URL to your app

2. **URL Configuration**:
   - Site URL: `https://yourdomain.com`
   - Redirect URLs: Add your app URL

### Step 3: Replace Onboarding Page

Backup the old onboarding page and replace it with the new comprehensive version:

```bash
# Backup old version
mv app/onboarding/page.tsx app/onboarding/page_old.tsx

# Use new version
mv app/onboarding/page_new.tsx app/onboarding/page.tsx
```

### Step 4: Test the Complete Flow

1. Sign up with a new email address
2. Check inbox for verification email
3. Click verification link
4. Return to app and complete onboarding
5. Verify all data is saved correctly
6. Check profile completeness score

## User Workflows

### New User Registration Flow

**1. Sign Up** (Supabase Auth):
- User enters email and password
- Supabase sends verification email
- Profile created with basic info

**2. Email Verification**:
- User clicks link in email
- Email marked as verified in Supabase Auth
- Can proceed with onboarding

**3. Role Selection**:
- Choose Investor or Founder
- Role saved to profile

**4. Basic Information**:
- Fill in name, location, professional info
- Optional: phone, LinkedIn, company, title, bio
- Data saved, proceeds to role-specific section

**5. Role-Specific Profile**:

**If Investor**:
- Select investor type
- Indicate accredited status
- Choose preferred sectors (required)
- Choose preferred stages
- Choose geographies
- Enter typical ticket size
- Data saved, proceeds to terms

**If Founder**:
- Select founder experience level
- Enter previous exits count
- Choose specializations
- Choose education background
- Data saved, proceeds to terms

**6. Terms & Completion**:
- Accept Terms of Service (required)
- Accept Privacy Policy (required)
- Click "Complete Registration"
- Onboarding marked complete
- Redirected to platform

## Profile Completeness Scoring

### Scoring Breakdown

**Basic Fields** (40 points):
- Full name: 10 points
- Email: 10 points
- Phone: 5 points
- Location: 5 points
- LinkedIn URL: 5 points
- Bio: 5 points

**Professional Fields** (20 points):
- Company: 10 points
- Title: 10 points

**Role-Specific Fields** (40 points):

**For Investors**:
- Investor type: 10 points
- Accredited investor status: 5 points
- Preferred sectors (at least one): 10 points
- Preferred stages (at least one): 10 points
- Typical ticket size: 5 points

**For Founders**:
- Founder experience: 10 points
- Specializations (at least one): 15 points
- Education (at least one): 15 points

**Maximum Score**: 100 points

### Profile Completeness Levels

- **0-30%**: Basic - Minimal information provided
- **31-60%**: Moderate - Some key information provided
- **61-80%**: Good - Most information provided
- **81-100%**: Excellent - Comprehensive profile

## Email Verification

### Supabase Auth Integration

The system uses Supabase's built-in email verification:

1. **Sign Up**: Supabase automatically sends verification email
2. **Email Template**: Customizable in Supabase Dashboard
3. **Verification Link**: Redirects to your app
4. **Status Check**: `auth.user.email_confirmed_at` indicates verification

### Manual Verification Tracking

The `email_verification_tokens` table provides additional tracking:
- Custom token generation
- Expiry management
- Verification history

### Resend Verification Email

Users can request a new verification email:
```typescript
await supabase.auth.resend({
  type: 'signup',
  email: userEmail,
});
```

## Access Control

### Onboarding Gate

Users cannot access the platform until:
1. ✅ Email is verified
2. ✅ Role is selected
3. ✅ Basic information is completed
4. ✅ Role-specific profile is completed
5. ✅ Terms are accepted
6. ✅ Onboarding is marked complete

### RLS Policies

**Profiles**:
- Users can view and update their own profile
- Internal roles can view all profiles
- Admins can view all profiles

**Investor Preferences**:
- Users can manage their own preferences
- Internal roles can view all preferences (for deal matching)

**Onboarding Steps**:
- Users can manage their own steps
- No cross-user access

## API Usage Examples

### Check if User Completed Onboarding
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('onboarding_completed, email_verified, profile_completeness')
  .eq('id', userId)
  .single();

if (!profile.email_verified) {
  // Redirect to email verification
}

if (!profile.onboarding_completed) {
  // Redirect to onboarding
}
```

### Get Profile Completeness
```typescript
const { data: completeness } = await supabase.rpc(
  'calculate_profile_completeness',
  { user_id: userId }
);

console.log(`Profile is ${completeness}% complete`);
```

### Mark Onboarding Complete
```typescript
await supabase.rpc('complete_onboarding', {
  user_id: userId
});
```

### Get Investor Preferences
```typescript
const { data: preferences } = await supabase
  .from('investor_preferences')
  .select('*')
  .eq('investor_user_id', userId)
  .single();
```

## Frontend Integration

### Onboarding Check in AppShell
```typescript
// In components/AppShell.tsx or layout

useEffect(() => {
  async function checkOnboarding() {
    const { data: session } = await supabase.auth.getSession();
    const uid = session?.user?.id;

    if (!uid) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('email_verified, onboarding_completed')
      .eq('id', uid)
      .single();

    if (!profile?.email_verified || !profile?.onboarding_completed) {
      router.push('/onboarding');
    }
  }

  checkOnboarding();
}, []);
```

### Show Profile Completeness Badge
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('profile_completeness')
  .eq('id', userId)
  .single();

<Badge>Profile: {profile.profile_completeness}%</Badge>
```

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Email verification email is sent on signup
- [ ] Email verification link works
- [ ] Cannot proceed without email verification
- [ ] Role selection saves correctly
- [ ] Basic information form validates required fields
- [ ] Investor profile form works (all checkboxes, dropdowns)
- [ ] Founder profile form works (all checkboxes)
- [ ] Terms acceptance is required
- [ ] Profile completeness calculates correctly
- [ ] Onboarding completion works
- [ ] User can resume interrupted onboarding
- [ ] Redirect to platform works after completion
- [ ] Cannot access platform without completing onboarding
- [ ] Profile data persists correctly
- [ ] Investor preferences save correctly
- [ ] RLS policies work as expected
- [ ] Progress bar shows correct percentages
- [ ] Mobile responsive design works
- [ ] Form validation shows helpful error messages

## Troubleshooting

### Email Not Received
**Cause**: Email provider filtering, wrong email, Supabase email not configured
**Solution**:
- Check spam folder
- Verify email settings in Supabase Dashboard
- Use "Resend Email" button
- Check Supabase logs for email send errors

### Onboarding Page Not Loading
**Cause**: Database migration not applied, RLS policies issue
**Solution**:
- Ensure migration 011 is applied
- Check browser console for errors
- Verify RLS policies are enabled
- Check user has valid session

### Profile Completeness Always 0%
**Cause**: Trigger not created, function error
**Solution**:
- Re-run migration to create trigger
- Check Supabase function logs
- Manually call `calculate_profile_completeness(user_id)`

### Cannot Complete Onboarding
**Cause**: Terms not accepted, required fields missing, function error
**Solution**:
- Ensure all required fields are filled
- Accept both terms checkboxes
- Check browser console for errors
- Verify `complete_onboarding` function exists

### User Stuck in Onboarding Loop
**Cause**: `onboarding_completed` not set, redirect logic issue
**Solution**:
- Manually set `onboarding_completed = true` in database
- Check redirect logic in onboarding page
- Verify session persistence

## Security Considerations

### Email Verification
- ✅ Required before platform access
- ✅ Prevents spam signups
- ✅ Confirms user ownership of email

### Data Privacy
- ✅ Users can only see their own profile data
- ✅ Sensitive fields (KYC documents) properly protected
- ✅ RLS policies enforce access control

### Compliance
- ✅ Terms acceptance tracked with timestamp
- ✅ Privacy policy acceptance tracked
- ✅ Accredited investor status for compliance

### Input Validation
- ✅ Required fields enforced
- ✅ Email format validated
- ✅ Phone number optional
- ✅ Arrays properly sanitized
- ✅ Numeric fields validated

## Future Enhancements

### Phase 2: Enhanced Profiles
- Profile photo upload
- Document verification (ID, accreditation docs)
- Video introduction
- Portfolio company showcase (for investors)
- Past startup showcase (for founders)

### Phase 3: AI-Powered Matching
- AI-suggested deals based on investor preferences
- Founder-investor matching algorithm
- Profile similarity scoring
- Automated deal recommendations

### Phase 4: Advanced Features
- Profile visibility controls
- Network graph visualization
- Endorsements and recommendations
- Profile badges and achievements
- Gamification elements

### Phase 5: Analytics
- Profile view tracking
- Engagement metrics
- Profile completeness impact on deal flow
- Conversion funnel analytics

## Files Reference

### Database
- `supabase/migrations/011_user_registration_onboarding.sql` - Complete schema and functions

### Frontend
- `app/onboarding/page_new.tsx` - New comprehensive onboarding flow
- `app/onboarding/page_old.tsx` - Old simple onboarding (backup)

### Documentation
- `USER_REGISTRATION_SYSTEM.md` - This file
