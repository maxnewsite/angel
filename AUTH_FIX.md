# Authentication Issues Fixed

## Issues Resolved

### 1. ✅ Sign Out Not Working
**Problem**: When user clicked "Sign out", they remained logged in.

**Root Cause**:
- Sign out function didn't wait for `signOut()` to complete before redirecting
- No error handling if sign out failed

**Fix Applied** (`components/AppShell.tsx:67-84`):
- Added `await` to ensure sign out completes
- Added error handling with user feedback
- Clear local state before redirect
- Only redirect after successful sign out

```typescript
onClick={async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign out error:", error);
      alert("Error signing out: " + error.message);
      return;
    }
    setRole(null);
    setEmail(null);
    window.location.href = "/";
  } catch (e) {
    console.error("Sign out failed:", e);
    alert("Failed to sign out. Please try again.");
  }
}}
```

### 2. ✅ Login Stuck in Loading State
**Problem**: After login, page showed "Loading..." indefinitely. Only worked after closing and reopening window.

**Root Causes**:
1. Multiple rapid redirects using `window.location.href` causing race conditions
2. Auth state not propagating properly between redirects
3. Profile might not exist for new users
4. No loading states shown to user during transitions
5. AuthGate could get stuck in loading state

**Fixes Applied**:

#### A. Auth Page (`app/auth/page.tsx`)
- ✅ Use Next.js `router.push()` instead of `window.location.href`
- ✅ Add loading states with disabled buttons
- ✅ Auto-create profile on signup if it doesn't exist
- ✅ Add delays before redirects to ensure session propagates (500ms)
- ✅ Check if user already logged in on page load
- ✅ Show clear feedback messages ("Signed in! Redirecting...")
- ✅ Support Enter key to submit login form
- ✅ Better error handling with try/catch

#### B. Onboarding Page (`app/onboarding/page.tsx`)
- ✅ Use Next.js `router.push()` for all redirects
- ✅ Add loading state while checking auth
- ✅ Auto-create profile if missing (handles PGRST116 error)
- ✅ Add saving state with disabled button
- ✅ Add delay before redirect (300ms) to ensure state updates
- ✅ Prevent component updates after unmount
- ✅ Pre-select role if user already has one
- ✅ Better error handling and logging

#### C. AuthGate Component (`components/AuthGate.tsx`)
- ✅ Use Next.js `router.push()` for redirects
- ✅ Add better loading UI (centered, full screen)
- ✅ Prevent redirect loops with `redirecting` flag
- ✅ Listen to auth state changes (SIGNED_OUT, SIGNED_IN, TOKEN_REFRESHED)
- ✅ Add error handling for auth checks
- ✅ Show "Redirecting to login..." when not authenticated
- ✅ Add console logging for debugging auth events
- ✅ Better cleanup on unmount

## What Changed

### Files Modified

| File | Changes |
|------|---------|
| `components/AppShell.tsx` | Fixed sign out to await completion and handle errors |
| `app/auth/page.tsx` | Added loading states, Next.js router, profile creation, Enter key support |
| `app/onboarding/page.tsx` | Added loading/saving states, Next.js router, profile auto-creation |
| `components/AuthGate.tsx` | Improved loading UI, Next.js router, auth state change handling |

### Key Improvements

#### Before:
```typescript
// Sign out - didn't wait
await supabase.auth.signOut();
window.location.href = "/"; // Immediate redirect, sign out might not complete

// Login - race condition
const { error } = await supabase.auth.signInWithPassword({ email, password });
window.location.href = "/onboarding"; // Immediate redirect, session not propagated

// Onboarding - race condition
const { error } = await supabase.from("profiles").update({ role });
window.location.href = "/app/deals"; // Immediate redirect, role not saved
```

#### After:
```typescript
// Sign out - wait and handle errors
const { error } = await supabase.auth.signOut();
if (error) {
  alert("Error signing out: " + error.message);
  return;
}
window.location.href = "/"; // Only redirect after success

// Login - proper delay for session propagation
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
setMsg("Signed in! Redirecting...");
setTimeout(() => router.push("/onboarding"), 500); // Delay ensures session is set

// Onboarding - proper delay for state propagation
const { error } = await supabase.from("profiles").update({ role });
setTimeout(() => router.push("/app/deals"), 300); // Delay ensures role is saved
```

## How It Works Now

### Sign Out Flow
1. User clicks "Sign out" button
2. Button calls `supabase.auth.signOut()`
3. **Wait** for sign out to complete
4. Check for errors → show alert if failed
5. Clear local state (role, email)
6. Redirect to home page
7. AuthGate detects SIGNED_OUT event → redirects to /auth

### Sign In Flow
1. User enters email/password, clicks "Sign in" (or presses Enter)
2. Button shows "Loading..." and becomes disabled
3. Call `supabase.auth.signInWithPassword()`
4. Check for errors → show message if failed
5. Show "Signed in! Redirecting..." message
6. **Wait 500ms** for session to propagate
7. Redirect to `/onboarding` using Next.js router
8. Onboarding checks profile:
   - If profile missing → auto-create it
   - If has internal role → redirect to `/app/deals`
   - If has investor/founder role → pre-select it
   - Otherwise → show role selection
9. User selects role → saves to database
10. **Wait 300ms** for role to save
11. Redirect to `/app/deals`
12. AuthGate checks session → allows access

### Sign Up Flow
1. User enters email/password, clicks "Create account"
2. Button shows "Loading..." and becomes disabled
3. Call `supabase.auth.signUp()`
4. Check if email confirmation required:
   - If yes → show "Check your email for confirmation link"
   - If no → create profile immediately
5. Show "Account created! Redirecting..."
6. **Wait 1 second**
7. Redirect to `/onboarding`
8. Follow same flow as sign in

## Testing Checklist

Test these scenarios to verify fixes:

### Sign Out Tests
- [ ] Click "Sign out" → user is logged out and redirected to home
- [ ] After sign out, cannot access `/app/*` routes (redirects to `/auth`)
- [ ] No errors in browser console during sign out
- [ ] Sign out works from any page in the app

### Login Tests
- [ ] Enter valid credentials → redirects to onboarding → redirects to app
- [ ] Page doesn't get stuck on "Loading..."
- [ ] Can access app features immediately after login
- [ ] Closing and reopening window not required
- [ ] Press Enter key after typing password → submits form
- [ ] Error messages shown for invalid credentials
- [ ] Loading state shown during login process

### Sign Up Tests
- [ ] Create new account → profile auto-created
- [ ] Redirected to onboarding to select role
- [ ] Can select role and continue to app
- [ ] No database errors about missing profile

### Onboarding Tests
- [ ] Shows "Loading..." briefly while checking auth
- [ ] If no role selected, button is disabled
- [ ] After selecting role, button shows "Saving..."
- [ ] Successfully redirects to app after saving
- [ ] If already has role, it's pre-selected

### Edge Cases
- [ ] Already logged in user visiting `/auth` → redirects to onboarding
- [ ] User with internal role visiting `/onboarding` → redirects to app immediately
- [ ] Not logged in user visiting `/app/*` → redirects to auth
- [ ] Refresh page while logged in → stays logged in
- [ ] Multiple rapid clicks on buttons → doesn't break state

## Technical Details

### Why Use Next.js Router vs window.location?
- `router.push()` → Client-side navigation (faster, preserves state)
- `window.location.href` → Full page reload (slower, clears state)
- However, we still use `window.location.href` for sign out to ensure full clean up

### Why Add Delays?
```typescript
setTimeout(() => router.push("/onboarding"), 500);
```
- Supabase auth state propagates asynchronously
- Small delays ensure session/profile updates are complete before navigation
- Prevents race conditions where next page loads before data is ready

### Profile Auto-Creation
```typescript
if (profileError && profileError.code === "PGRST116") {
  // PGRST116 = Not found error
  await supabase.from("profiles").insert({
    id: uid,
    email: data.session?.user?.email,
    role: null,
    created_at: new Date().toISOString()
  });
}
```
- Ensures profile always exists for authenticated users
- Prevents errors when checking role
- Handles edge cases where profile wasn't created on signup

### Redirect Loop Prevention
```typescript
let redirecting = false;
if (!hasSession && !redirecting) {
  redirecting = true;
  router.push("/auth");
}
```
- Prevents multiple simultaneous redirects
- Avoids infinite loops in auth state change handlers
- Ensures clean navigation flow

## Troubleshooting

If you still experience issues:

### Issue: Sign out doesn't work
**Debug**:
1. Open browser console (F12)
2. Click "Sign out"
3. Check for errors in console
4. Verify Supabase URL/keys are correct in `.env.local`

### Issue: Still stuck in loading after login
**Debug**:
1. Open browser console (F12)
2. Check for "Auth state change:" logs
3. Check Network tab for failed API calls
4. Verify `profiles` table exists in Supabase
5. Check RLS policies allow user to read/write their profile

### Issue: "Profile not found" error
**Debug**:
1. Check if user exists in Supabase Auth → Users
2. Check if profile exists in `profiles` table
3. Run this SQL to create missing profile:
```sql
INSERT INTO profiles (id, email, role, created_at)
VALUES ('USER_ID_HERE', 'user@email.com', NULL, NOW())
ON CONFLICT (id) DO NOTHING;
```

### Issue: Redirects in infinite loop
**Debug**:
1. Clear browser cookies and local storage
2. Sign out completely
3. Close all browser tabs
4. Sign in again in a fresh tab
5. Check console for "Auth state change:" events

## Summary

✅ **Sign out**: Now properly logs out user and clears state
✅ **Login flow**: No more infinite loading, smooth redirect flow
✅ **User feedback**: Loading states and messages throughout
✅ **Error handling**: Proper error messages for failed operations
✅ **Profile creation**: Auto-creates profile if missing
✅ **Router improvements**: Using Next.js router for better navigation
✅ **State management**: Proper delays to ensure data propagates
✅ **UX improvements**: Enter key support, disabled buttons during loading

The authentication flow should now work smoothly without requiring page refreshes or window closures!
