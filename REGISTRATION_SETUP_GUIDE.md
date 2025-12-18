# User Registration System - Setup Guide

Quick installation and setup guide for the comprehensive user registration and onboarding system.

## What's New

The platform now has a complete user registration system similar to the expert classification workflow:

✅ **Email Verification Required** - Users must verify their email before accessing the platform
✅ **Comprehensive Profile Data Collection** - Detailed user information similar to expert profiles
✅ **Role-Specific Onboarding** - Different forms for investors vs founders
✅ **Progress Tracking** - Multi-step flow with progress bar and resume capability
✅ **Profile Completeness Scoring** - Automatic calculation of profile completion (0-100%)
✅ **Terms & Compliance** - Terms of Service and Privacy Policy acceptance tracking

## Installation Steps

### Step 1: Apply Database Migration

**Go to Supabase Dashboard → SQL Editor**

Copy and paste the entire contents of:
```
supabase/migrations/011_user_registration_onboarding.sql
```

Click **Run** to execute the migration.

This creates:
- Extended profile fields (full_name, phone, linkedin_url, location, company, title, bio, etc.)
- Investor-specific fields (investor_type, accredited_investor, preferred_sectors, etc.)
- Founder-specific fields (founder_experience, specializations, education, etc.)
- Onboarding tracking fields (onboarding_completed, email_verified, profile_completeness)
- Helper tables (investor_preferences, onboarding_steps, email_verification_tokens)
- Helper functions (calculate_profile_completeness, complete_onboarding, verify_email)
- Automatic triggers for profile completeness calculation
- Performance indexes
- RLS policies

### Step 2: Configure Email Verification in Supabase

**Go to Supabase Dashboard → Authentication → Settings**

1. **Email Templates → Confirm signup**:
   - Ensure "Confirm email" is enabled
   - Customize the email template if desired
   - Default template works fine

2. **URL Configuration**:
   - **Site URL**: Set to your production URL (e.g., `https://yourdomain.com`)
   - **Redirect URLs**: Add your app URL to allowed list

### Step 3: Test the New Registration Flow

The new onboarding page is already active at `/onboarding`.

**Test with a new user account**:

1. **Sign Up** with a new email address
2. **Check Email** for verification link
3. **Click Verification Link** in email
4. **Return to App** - you'll see the onboarding page
5. **Complete Onboarding Steps**:
   - ✅ Email Verification (auto-detected)
   - ✅ Role Selection (Investor or Founder)
   - ✅ Basic Information (name, location, professional info)
   - ✅ Role-Specific Profile (investor preferences OR founder background)
   - ✅ Terms & Completion (accept terms and complete)
6. **Access Platform** - automatically redirected to deals page

## What Happens on Sign Up

### Registration Flow

```
1. User Signs Up
   ↓
2. Supabase Sends Verification Email
   ↓
3. User Clicks Verification Link
   ↓
4. Email Verified in Supabase Auth
   ↓
5. User Lands on Onboarding Page
   ↓
6. Step 1: Email Verification Check (auto-pass if verified)
   ↓
7. Step 2: Role Selection (Investor or Founder)
   ↓
8. Step 3: Basic Information Form
   ↓
9. Step 4a: Investor Profile Form (if investor)
   OR
   Step 4b: Founder Profile Form (if founder)
   ↓
10. Step 5: Terms & Completion
   ↓
11. Onboarding Marked Complete
   ↓
12. Redirect to Platform (Deals Page)
```

### Data Collected

**For All Users**:
- Full name (required)
- Email (auto-filled from auth)
- Phone (optional)
- Location (required)
- Company (optional)
- Title (optional)
- LinkedIn URL (optional)
- Bio (optional)

**Additional for Investors**:
- Investor type (required): angel, VC, family office, institutional, corporate, syndicate, individual
- Accredited investor status (checkbox)
- Investment experience (years)
- Portfolio size
- Typical ticket size
- Preferred sectors (multi-select, required)
- Preferred stages (multi-select)
- Preferred geographies (multi-select)

**Additional for Founders**:
- Founder experience (required): first-time, serial, previously exited
- Previous exits count
- Specializations (multi-select): Product, Engineering, Sales, Marketing, etc.
- Education (multi-select): Bachelor's, Master's, MBA, PhD, Bootcamp, Self-taught

**Compliance**:
- Terms of Service acceptance (required)
- Privacy Policy acceptance (required)

## Profile Completeness

The system automatically calculates profile completeness (0-100%):

- **Basic fields** (40 points): name, email, phone, location, LinkedIn, bio
- **Professional fields** (20 points): company, title
- **Role-specific fields** (40 points): investor preferences OR founder background

Score is recalculated automatically when profile is updated.

## Access Control

Users **cannot access the platform** until:
1. ✅ Email is verified
2. ✅ Role is selected
3. ✅ Basic information is provided
4. ✅ Role-specific profile is completed
5. ✅ Terms are accepted
6. ✅ `onboarding_completed = true`

## Files Modified/Created

### New Files
- ✅ `supabase/migrations/011_user_registration_onboarding.sql` - Database schema
- ✅ `USER_REGISTRATION_SYSTEM.md` - Complete documentation
- ✅ `REGISTRATION_SETUP_GUIDE.md` - This file

### Modified Files
- ✅ `app/onboarding/page.tsx` - Replaced with new comprehensive onboarding flow
- ✅ `app/onboarding/page_old_backup.tsx` - Backup of old simple onboarding

## Troubleshooting

### Email Not Received
- Check spam folder
- Use "Resend Email" button in onboarding
- Verify email settings in Supabase Dashboard → Authentication → Settings

### Cannot Access Platform After Completing Onboarding
- Verify `onboarding_completed = true` in database:
  ```sql
  SELECT onboarding_completed, email_verified
  FROM profiles
  WHERE id = 'USER_ID';
  ```
- If false, manually complete:
  ```sql
  SELECT complete_onboarding('USER_ID');
  ```

### Profile Completeness Shows 0%
- Trigger may not be created. Re-run migration
- Manually calculate:
  ```sql
  SELECT calculate_profile_completeness('USER_ID');
  ```

### Email Verification Not Working
- Check Supabase Auth configuration
- Verify Site URL and Redirect URLs are set
- Check email confirmation is enabled

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] Email verification enabled in Supabase
- [ ] Can sign up with new email
- [ ] Verification email received
- [ ] Verification link works
- [ ] Onboarding page loads
- [ ] Cannot skip email verification
- [ ] Role selection works
- [ ] Basic info form validates correctly
- [ ] Investor profile form works (all fields)
- [ ] Founder profile form works (all fields)
- [ ] Terms acceptance required
- [ ] Onboarding completion works
- [ ] Redirect to platform works
- [ ] Cannot access platform without completing onboarding
- [ ] Can resume interrupted onboarding
- [ ] Profile completeness calculates correctly
- [ ] Mobile responsive

## Support

For issues:
1. Check Supabase logs (Dashboard → Logs)
2. Check browser console for errors
3. Verify RLS policies are enabled
4. Check user session is valid
5. Refer to `USER_REGISTRATION_SYSTEM.md` for detailed documentation

## Next Steps

After testing:
1. Customize email templates in Supabase Dashboard
2. Add your own Terms of Service and Privacy Policy pages
3. Consider adding profile photo upload
4. Set up KYC verification workflow (if needed)
5. Configure investor preferences matching for deal recommendations
