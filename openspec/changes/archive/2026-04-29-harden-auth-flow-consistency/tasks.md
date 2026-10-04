## 1. Spec and product decisions

- [x] 1.1 Choose the second-version scope: delete `记住我`, add password reset, hide WeChat, add Google, fix sign-up mode, fix `signUp()` session branching, and add tests
- [x] 1.2 Create proposal, design, auth delta spec, tasks, and module maps
- [x] 1.3 Confirm Supabase dashboard settings needed for Google provider, password reset redirect URLs, and local/preview origins before live OAuth verification

## 2. Test first

- [x] 2.1 Add `LoginPage` tests for email login success and failure
- [x] 2.2 Add `LoginPage` tests for sign-up with returned session and sign-up requiring email confirmation
- [x] 2.3 Add `LoginPage` tests for anonymous login success and failure
- [x] 2.4 Add `LoginPage` tests for password reset success and failure without leaking account existence
- [x] 2.5 Add `LoginPage` or focused handler tests for Google OAuth invocation
- [x] 2.6 Add `LoginPageView` tests that sign-up mode changes title, dialog label, submit button, and footer mode switch text together
- [x] 2.7 Add `LoginPageView` tests that `记住我` and WeChat do not render in the active scope
- [x] 2.8 Add `AuthProvider` tests for session restore, auth state change, and signOut
- [x] 2.9 Add persistence-level test coverage that patient inserts use the current user id as `patients.user_id`
- [x] 2.10 Add Google OAuth regression coverage for public `/auth/callback` callback redirect

## 3. UI consistency

- [x] 3.1 Drive auth card title, dialog label, submit label, secondary link, and feedback copy from a single auth mode
- [x] 3.2 Add password reset mode with email-only input and neutral success copy
- [x] 3.3 Remove `记住我`
- [x] 3.4 Hide WeChat login
- [x] 3.5 Keep Google as the only visible social login in this scope
- [x] 3.6 Update anonymous session copy to explain anonymous Supabase identity and uid-bound data
- [x] 3.7 Preserve privacy link, theme toggle, language toggle, and unified overlay behavior

## 4. Auth logic

- [x] 4.1 Keep Supabase client as the single auth client
- [x] 4.2 Branch `signUp()` feedback based on returned session
- [x] 4.3 Add `resetPasswordForEmail()` with configured redirect target
- [x] 4.4 Add `signInWithOAuth({ provider: 'google' })`
- [x] 4.5 Keep anonymous login on `signInAnonymously()`
- [x] 4.6 Keep auth state propagation through `AuthProvider` and `AppRoutes`, not manual route mutation in the login form
- [x] 4.7 Send Google OAuth callbacks to public `/auth/callback` so Supabase can restore session before `/app` guard runs

## 5. Documentation sync

- [x] 5.1 Update `src/routes/CLAUDE.md` if `login-page.tsx` responsibility changes
- [x] 5.2 Update `src/components/CLAUDE.md` if `login-page-view.tsx` responsibility changes
- [x] 5.3 Update `src/lib/CLAUDE.md` if auth/supabase helpers change
- [x] 5.4 Update baseline `openspec/specs/auth/spec.md` only when the change is completed and archived

## 6. Verification

- [x] 6.1 Run `npm test`
- [x] 6.2 Run `npm run lint`
- [x] 6.3 Run `npm run build`
- [x] 6.4 Browser-verify logged-out `/login` default intro and auth overlay
- [x] 6.5 Browser-verify sign-up mode no longer shows login title
- [x] 6.6 Browser-verify password reset request feedback
- [x] 6.7 Browser-verify Google OAuth starts the Supabase OAuth path after provider configuration
  - Fixed after external Supabase dashboard config: the app starts `/auth/v1/authorize?provider=google&redirect_to=.../auth/callback`, and Supabase redirects to Google.
- [x] 6.8 Browser-verify anonymous login reaches `/app`
- [x] 6.9 Live Supabase verification: test email registration
- [x] 6.10 Live Supabase verification: saved patient row binds to current uid
- [x] 6.11 Live Supabase verification: RLS isolates another user from that row
- [x] 6.12 Browser-verify Google OAuth redirect target is the public `/auth/callback` callback path
