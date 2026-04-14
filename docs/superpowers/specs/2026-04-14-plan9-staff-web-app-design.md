# Plan 9 Design: Staff Web App

## Goal

Build a full mobile-responsive web interface for staff to manage the queue, replacing the mobile app for staff day-to-day use. Feature parity with the existing mobile app: Queue, History, Analytics, Settings, and Staff management.

## Scope

### In scope
- Staff section inside `apps/web/` at `/staff/*` routes
- `StaffAuthContext` — Firebase Auth + `businessId` resolution for staff
- `StaffRoute` auth guard — redirects unauthenticated users to `/staff/login`
- `StaffLayout` — sidebar nav (desktop) / bottom tab bar (mobile)
- Five staff pages: LoginPage, QueuePage, HistoryPage, AnalyticsPage, SettingsPage, StaffPage
- `createStaffAccount` Cloud Function (callable) — creates Firebase Auth user + Firestore docs
- `removeStaffAccount` Cloud Function (callable) — deletes Firebase Auth user + Firestore docs
- `staffProfiles/{uid}` Firestore collection — maps uid → businessId
- Firebase Auth added to `apps/web/src/config/firebase.ts`
- Firestore rules update for `staffProfiles`
- Mobile `StaffScreen` / `staffActions.ts` updated to call new Cloud Function (replaces pending-doc flow)

### Out of scope
- Moving hooks to `packages/shared/` (hooks duplicated in `apps/web/src/staff/hooks/`)
- Disabling Firebase Auth account on staff removal (Firestore doc deletion only)
- Role-based access differences between staff and owner in the web app (all staff get full access)
- Customer-facing routes untouched

## Architecture

### Folder structure

```
apps/web/src/staff/
  StaffAuthContext.tsx      — Firebase Auth + businessId lookup
  StaffRoute.tsx            — auth guard component
  StaffLayout.tsx           — responsive layout: sidebar (desktop), bottom tabs (mobile)
  hooks/
    useQueue.ts             — live queue via onSnapshot
    useQueueEntries.ts      — entries for a queue
    useTodayStats.ts        — client-side today stats
    useDateRangeStats.ts    — precomputed dailyStats range query
    useBusinessSettings.ts  — business doc subscription
    useStaff.ts             — staff subcollection subscription
  services/
    queueActions.ts         — serve/skip/complete write operations
    settingsActions.ts      — update business settings + logo upload
    staffActions.ts         — createStaffAccount call, removeStaffMember
  pages/
    LoginPage.tsx
    QueuePage.tsx
    HistoryPage.tsx
    AnalyticsPage.tsx
    SettingsPage.tsx
    StaffPage.tsx
```

### Routing

Routes added to `apps/web/src/App.tsx`:

| Path | Component | Auth |
|------|-----------|------|
| `/staff/login` | `LoginPage` | Public |
| `/staff/queue` | `QueuePage` | `StaffRoute` |
| `/staff/history` | `HistoryPage` | `StaffRoute` |
| `/staff/analytics` | `AnalyticsPage` | `StaffRoute` |
| `/staff/settings` | `SettingsPage` | `StaffRoute` |
| `/staff/staff` | `StaffPage` | `StaffRoute` |

Default redirect: `/staff` → `/staff/queue`.

Customer routes (`/`, `/status/*`) are unchanged.

## Auth & Account Creation

### createStaffAccount Cloud Function

A callable Cloud Function invoked by the business owner. Takes `{ businessId, name, email, password }`. Verifies the caller is the owner by checking `context.auth.uid === businessId` (the existing data model uses the owner's Firebase Auth UID as their businessId). Then:

1. Creates a Firebase Auth user: `admin.auth().createUser({ email, password, displayName: name })`
2. Writes `businesses/{businessId}/staff/{newUid}` — `{ name, email, role: "staff", status: "active", createdAt }`
3. Writes `staffProfiles/{newUid}` — `{ businessId }`

Replaces the current `addStaffMember` function (which created a `status: "pending"` doc with no Auth account).

### Staff login flow

1. Staff opens `/staff/login`, submits email + password
2. `signInWithEmailAndPassword(auth, email, password)`
3. `StaffAuthContext` reads `staffProfiles/{uid}` → extracts `businessId`
4. Loads `businesses/{businessId}/staff/{uid}` for role and name
5. All staff routes receive `{ user, businessId, staffProfile }` via context

### Firestore rules additions

```
match /staffProfiles/{uid} {
  allow read: if request.auth.uid == uid;
  allow write: if false; // written and deleted only by Cloud Functions (Admin SDK)
}
```

Staff members read their own `staffProfiles` doc after login to resolve their `businessId`. Owner access to `staffProfiles` docs is via Admin SDK inside the Cloud Functions only — not from the client.

## Staff Screens

### QueuePage
Live queue via Firestore `onSnapshot`. Displays NowServing number and list of waiting entries. Each entry has Serve / Skip / Complete action buttons. Same write operations as the mobile QueueScreen.

### HistoryPage
HTML `<input type="date">` date picker. Queries entries for the selected date. Filterable by status: completed / skipped / removed.

### AnalyticsPage
Same tabs as mobile: Today / 7 days / 30 days / custom date range. Stat cards for total customers, avg wait time, avg service time, completion rate. Bar chart using **recharts** (web equivalent of `react-native-chart-kit`). Top 3 busiest hours list. Today tab uses client-side computation via `useTodayStats`; multi-day uses precomputed `dailyStats` subcollection via `useDateRangeStats`.

### SettingsPage
Business name, primary color picker (`<input type="color">`), WhatsApp number, form field editor, logo upload. Logo upload uses `<input type="file" accept="image/*">` and the same Firebase Storage path (`logos/{businessId}`) as the mobile app.

### StaffPage
List of current staff members. "Add Staff" form: name, email, password → calls `createStaffAccount` Cloud Function. Remove button calls `removeStaffAccount` Cloud Function, which deletes the Firebase Auth user and both Firestore docs (`businesses/{businessId}/staff/{uid}` and `staffProfiles/{uid}`) via Admin SDK.

### StaffLayout responsive behavior
- Desktop (≥768px): fixed left sidebar with nav links
- Mobile (<768px): bottom tab bar with 5 icon tabs (Queue, History, Analytics, Settings, Staff)

## Data Layer

Hooks in `apps/web/src/staff/hooks/` duplicate the mobile hooks — same Firestore queries, no React Native dependencies. Service functions in `apps/web/src/staff/services/` similarly mirror mobile services. This is intentional for MVP; extracting to `packages/shared/` is deferred.

## Modified Files

```
apps/web/src/App.tsx                          — add /staff/* routes
apps/web/src/config/firebase.ts               — add getAuth, export auth
firebase/firestore.rules                      — add staffProfiles rules
firebase/functions/src/index.ts               — export createStaffAccount, removeStaffAccount
apps/mobile/src/screens/StaffScreen.tsx       — call createStaffAccount CF instead of addStaffMember
apps/mobile/src/services/staffActions.ts      — replace addStaffMember with CF call
```

## New Files

```
apps/web/src/staff/StaffAuthContext.tsx
apps/web/src/staff/StaffRoute.tsx
apps/web/src/staff/StaffLayout.tsx
apps/web/src/staff/hooks/useQueue.ts
apps/web/src/staff/hooks/useQueueEntries.ts
apps/web/src/staff/hooks/useTodayStats.ts
apps/web/src/staff/hooks/useDateRangeStats.ts
apps/web/src/staff/hooks/useBusinessSettings.ts
apps/web/src/staff/hooks/useStaff.ts
apps/web/src/staff/services/queueActions.ts
apps/web/src/staff/services/settingsActions.ts
apps/web/src/staff/services/staffActions.ts
apps/web/src/staff/pages/LoginPage.tsx
apps/web/src/staff/pages/QueuePage.tsx
apps/web/src/staff/pages/HistoryPage.tsx
apps/web/src/staff/pages/AnalyticsPage.tsx
apps/web/src/staff/pages/SettingsPage.tsx
apps/web/src/staff/pages/StaffPage.tsx
firebase/functions/src/create-staff-account.ts
firebase/functions/src/remove-staff-account.ts
apps/web/src/staff/StaffRoute.test.tsx
apps/web/src/staff/StaffAuthContext.test.tsx
```

## Dependencies

**New (apps/web):**
- `recharts` — bar chart for AnalyticsPage

```bash
npm install recharts --workspace=apps/web
```

No new dependencies for `firebase/functions` — Admin SDK already available.

## Testing

**TDD tested:**
- `StaffRoute.tsx` — 2 tests:
  - Redirects to `/staff/login` when no authenticated user
  - Renders children when authenticated
- `StaffAuthContext.tsx` — 3 tests:
  - Provides `null` user when signed out
  - Provides `{ user, businessId }` when signed in and `staffProfiles` doc exists
  - Shows loading state while resolving `businessId`

**Not tested:**
- `createStaffAccount` Cloud Function
- Page components (QueuePage, HistoryPage, etc.)
- recharts integration

**Expected test counts after implementation:**
- web: +5 new tests
- mobile: unchanged (37)
- functions: unchanged
- Total: 97
