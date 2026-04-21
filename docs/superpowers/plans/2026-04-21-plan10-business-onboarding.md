# Business Onboarding Flow — Plan 10

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Steps use `- [ ]` checkbox syntax.

## Context

**Problem:** No self-serve web business signup. Mobile signup has a bug: it never writes `staffProfiles/{uid}`, so mobile-created owners cannot log into the staff web app.

**Outcome:** `/staff/signup` page on web + unified `createBusinessAccount` Cloud Function that writes Auth user + business + owner staff + staffProfiles atomically. Mobile refactored to use same callable.

**Confirmed scope:** Web + fix mobile bug, full fields at signup, no email verification.

## Architecture

- New callable `createBusinessAccount` (Admin SDK, batched writes)
- Web: `/staff/signup` — single page with Account / Business / Branding / Customer Form Fields sections
- Mobile: `AuthContext.signUp` calls callable instead of 3 client-side writes
- Logo upload runs post-auth (Storage rules require auth)
- `FormFieldEditor` extracted from SettingsPage, shared with SignUpPage

## File Map

New functions: `firebase/functions/src/create-business-account.ts`, `__tests__/create-business-account.test.ts`
Modified functions: `firebase/functions/src/index.ts`, `firebase/functions/src/paths.ts`
New shared: `createBusinessAccountSchema` in `packages/shared/src/schemas.ts`
New web: `apps/web/src/staff/pages/SignUpPage.tsx`, `SignUpPage.test.tsx`, `apps/web/src/staff/services/signupActions.ts`, `apps/web/src/staff/components/FormFieldEditor.tsx`
Modified web: `apps/web/src/App.tsx`, `apps/web/src/staff/StaffAuthContext.tsx`, `apps/web/src/staff/pages/LoginPage.tsx`, `apps/web/src/staff/pages/SettingsPage.tsx`
Modified mobile: `apps/mobile/src/contexts/AuthContext.tsx`
Modified rules: `firebase/firestore.rules`

## Tasks

- [x] Task 0: Feature branch + save plan
- [ ] Task 1: createBusinessAccount Cloud Function (TDD)
- [ ] Task 2: Web SignUpPage + routing (TDD)
- [ ] Task 3: Fix mobile signup (staffProfiles bug)
- [ ] Task 4: Tighten Firestore rules
- [ ] Task 5: Final verification + PR
