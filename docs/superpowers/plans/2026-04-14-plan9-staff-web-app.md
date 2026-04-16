# Staff Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full mobile-responsive staff web interface inside `apps/web` at `/staff/*` routes, replacing the mobile app for staff day-to-day use.

**Architecture:** Add a `/staff/*` section to the existing React + Vite `apps/web` app. A `StaffAuthContext` wraps all staff routes and resolves `businessId` from a new `staffProfiles/{uid}` Firestore collection after Firebase Auth sign-in. Two new Cloud Functions (`createStaffAccount`, `removeStaffAccount`) handle Firebase Auth account lifecycle via Admin SDK. Five staff pages mirror the mobile app screens.

**Tech Stack:** React + Vite, Firebase Auth (new to web), Firebase Firestore, Firebase Storage (logo upload), Firebase Functions v2 `onCall`, recharts (bar chart), Vitest + React Testing Library

---

### Task 1: Feature branch, recharts install, Firebase Auth + Storage init

**Files:**
- Modify: `apps/web/src/firebase.ts`

- [ ] **Step 1: Create feature branch**

```bash
git checkout -b feat/staff-web-app
```

- [ ] **Step 2: Install recharts**

```bash
npm install recharts --workspace=apps/web
```

Expected: recharts appears in `apps/web/package.json` dependencies.

- [ ] **Step 3: Add Auth and Storage to the web Firebase config**

Replace `apps/web/src/firebase.ts` entirely:

```ts
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

if (import.meta.env.DEV) {
  try {
    connectFirestoreEmulator(db, "localhost", 8080);
    connectFunctionsEmulator(functions, "localhost", 5001);
    connectAuthEmulator(auth, "http://localhost:9099");
    connectStorageEmulator(storage, "localhost", 9199);
  } catch {
    // Already connected — safe to ignore during HMR
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run typecheck --workspace=apps/web
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/firebase.ts apps/web/package.json package-lock.json
git commit -m "feat(web): add recharts, Firebase Auth and Storage to web config"
```

---

### Task 2: StaffAuthContext — TDD

**Files:**
- Create: `apps/web/src/staff/StaffAuthContext.tsx`
- Create: `apps/web/src/staff/StaffAuthContext.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/staff/StaffAuthContext.test.tsx`:

```tsx
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StaffAuthProvider, useStaffAuth } from "./StaffAuthContext";

let capturedCallback: ((user: any) => void) | null = null;
const mockGetDoc = vi.fn();

vi.mock("../firebase", () => ({ auth: {}, db: {} }));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (_: any, cb: any) => {
    capturedCallback = cb;
    return () => {};
  },
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db: any, ...path: string[]) => path.join("/")),
  getDoc: (...args: any[]) => mockGetDoc(...args),
}));

function Consumer() {
  const { user, businessId, loading } = useStaffAuth();
  if (loading) return <div>loading</div>;
  return (
    <>
      <span data-testid="uid">{user?.uid ?? "null"}</span>
      <span data-testid="biz">{businessId ?? "null"}</span>
    </>
  );
}

beforeEach(() => {
  capturedCallback = null;
  mockGetDoc.mockReset();
});

describe("StaffAuthContext", () => {
  it("shows loading state before auth resolves", () => {
    render(
      <StaffAuthProvider>
        <Consumer />
      </StaffAuthProvider>
    );
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("provides null user and businessId when signed out", async () => {
    render(
      <StaffAuthProvider>
        <Consumer />
      </StaffAuthProvider>
    );
    await act(async () => {
      capturedCallback!(null);
    });
    expect(screen.getByTestId("uid")).toHaveTextContent("null");
    expect(screen.getByTestId("biz")).toHaveTextContent("null");
  });

  it("provides user and businessId when signed in with staffProfiles doc", async () => {
    mockGetDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ businessId: "biz1" }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: "Alice", role: "staff" }),
      });

    render(
      <StaffAuthProvider>
        <Consumer />
      </StaffAuthProvider>
    );
    await act(async () => {
      capturedCallback!({ uid: "user1" });
    });
    expect(screen.getByTestId("uid")).toHaveTextContent("user1");
    expect(screen.getByTestId("biz")).toHaveTextContent("biz1");
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (module not found)**

```bash
npm run test --workspace=apps/web
```

Expected: FAIL — `Cannot find module './StaffAuthContext'`

- [ ] **Step 3: Implement StaffAuthContext**

Create `apps/web/src/staff/StaffAuthContext.tsx`:

```tsx
import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { auth, db } from "../firebase";

interface StaffProfile {
  name: string;
  email: string;
  role: string;
  status: string;
}

interface StaffAuthContextValue {
  user: User | null;
  businessId: string | null;
  staffProfile: StaffProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const StaffAuthContext = createContext<StaffAuthContextValue>({
  user: null,
  businessId: null,
  staffProfile: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function StaffAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setBusinessId(null);
        setStaffProfile(null);
        setLoading(false);
        return;
      }
      try {
        const profileSnap = await getDoc(
          doc(db, "staffProfiles", firebaseUser.uid)
        );
        if (profileSnap.exists()) {
          const bId = profileSnap.data().businessId as string;
          setBusinessId(bId);
          const staffSnap = await getDoc(
            doc(db, `businesses/${bId}/staff/${firebaseUser.uid}`)
          );
          if (staffSnap.exists()) {
            setStaffProfile(staffSnap.data() as StaffProfile);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <StaffAuthContext.Provider
      value={{ user, businessId, staffProfile, loading, signIn, signOut }}
    >
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  return useContext(StaffAuthContext);
}
```

- [ ] **Step 4: Run tests — expect PASS (3 tests)**

```bash
npm run test --workspace=apps/web
```

Expected: 3 new StaffAuthContext tests PASS. All web tests pass (14 total).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/staff/StaffAuthContext.tsx apps/web/src/staff/StaffAuthContext.test.tsx
git commit -m "feat(web): add StaffAuthContext with TDD"
```

---

### Task 3: StaffRoute — TDD

**Files:**
- Create: `apps/web/src/staff/StaffRoute.tsx`
- Create: `apps/web/src/staff/StaffRoute.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/staff/StaffRoute.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import StaffRoute from "./StaffRoute";
import * as Auth from "./StaffAuthContext";

const mockUseStaffAuth = vi.spyOn(Auth, "useStaffAuth");

describe("StaffRoute", () => {
  it("redirects to /staff/login when not authenticated", () => {
    mockUseStaffAuth.mockReturnValue({
      user: null,
      businessId: null,
      staffProfile: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={["/staff/queue"]}>
        <Routes>
          <Route path="/staff/login" element={<div>Login</div>} />
          <Route element={<StaffRoute />}>
            <Route path="/staff/queue" element={<div>Queue</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    mockUseStaffAuth.mockReturnValue({
      user: { uid: "u1" } as any,
      businessId: "b1",
      staffProfile: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={["/staff/queue"]}>
        <Routes>
          <Route path="/staff/login" element={<div>Login</div>} />
          <Route element={<StaffRoute />}>
            <Route path="/staff/queue" element={<div>Queue</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("Queue")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test --workspace=apps/web
```

Expected: FAIL — `Cannot find module './StaffRoute'`

- [ ] **Step 3: Implement StaffRoute**

Create `apps/web/src/staff/StaffRoute.tsx`:

```tsx
import { Navigate, Outlet } from "react-router-dom";
import { useStaffAuth } from "./StaffAuthContext";

export default function StaffRoute() {
  const { user, loading } = useStaffAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/staff/login" replace />;
  return <Outlet />;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test --workspace=apps/web
```

Expected: 2 new StaffRoute tests PASS. All 16 web tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/staff/StaffRoute.tsx apps/web/src/staff/StaffRoute.test.tsx
git commit -m "feat(web): add StaffRoute auth guard with TDD"
```

---

### Task 4: StaffLayout, stub pages, App.tsx routing, and CSS

**Files:**
- Create: `apps/web/src/staff/StaffLayout.tsx`
- Create: `apps/web/src/staff/staff.css`
- Create: `apps/web/src/staff/pages/LoginPage.tsx` (stub)
- Create: `apps/web/src/staff/pages/QueuePage.tsx` (stub)
- Create: `apps/web/src/staff/pages/HistoryPage.tsx` (stub)
- Create: `apps/web/src/staff/pages/AnalyticsPage.tsx` (stub)
- Create: `apps/web/src/staff/pages/SettingsPage.tsx` (stub)
- Create: `apps/web/src/staff/pages/StaffPage.tsx` (stub)
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Create staff CSS**

Create `apps/web/src/staff/staff.css`:

```css
/* Layout */
.staff-layout {
  display: flex;
  min-height: 100vh;
}

.staff-sidebar {
  width: 200px;
  background: #5a4430;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 0;
  flex-shrink: 0;
}

.staff-sidebar-logo {
  color: #fff;
  font-size: 1.25rem;
  font-weight: 700;
  padding: 0 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.15);
  margin-bottom: 0.75rem;
}

.staff-sidebar .staff-nav-link {
  display: block;
  padding: 0.75rem 1.25rem;
  color: rgba(255,255,255,0.75);
  text-decoration: none;
  font-size: 0.95rem;
}

.staff-sidebar .staff-nav-link.active,
.staff-sidebar .staff-nav-link:hover {
  color: #fff;
  background: rgba(255,255,255,0.1);
}

.staff-signout {
  margin-top: auto;
  margin: auto 1.25rem 0;
  background: none;
  border: 1px solid rgba(255,255,255,0.4);
  color: rgba(255,255,255,0.75);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}

.staff-main {
  flex: 1;
  overflow-y: auto;
  background: #fbf8f4;
}

.staff-bottom-tabs {
  display: none;
}

/* Page content */
.staff-page {
  padding: 1.5rem;
  max-width: 900px;
}

.staff-page h1 {
  font-size: 1.5rem;
  margin-bottom: 1.25rem;
  color: #5a4430;
}

/* Now serving */
.staff-now-serving {
  background: #fff;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.staff-now-serving-label {
  font-size: 0.95rem;
  color: #8b6f47;
}

.staff-now-serving-number {
  font-size: 2.5rem;
  font-weight: 800;
  color: #b8926a;
  line-height: 1;
}

.staff-queue-stats {
  font-size: 0.9rem;
  color: #8b6f47;
  margin-bottom: 1rem;
}

/* Next button */
.staff-next-button {
  width: 100%;
  padding: 1rem;
  background: #b8926a;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  margin-bottom: 1.25rem;
}

.staff-next-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Entry cards */
.staff-entry-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.staff-entry-card {
  background: #fff;
  border-radius: 10px;
  padding: 1rem;
}

.staff-entry-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.staff-entry-number {
  font-size: 1.1rem;
  font-weight: 700;
  color: #b8926a;
}

.staff-entry-name {
  font-size: 1rem;
  color: #5a4430;
}

.staff-entry-phone,
.staff-entry-notes {
  font-size: 0.85rem;
  color: #8b6f47;
  margin-bottom: 0.25rem;
}

.staff-entry-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.staff-entry-actions button {
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  border: 1px solid #d4b896;
  background: #f5ede3;
  color: #5a4430;
  font-size: 0.85rem;
  cursor: pointer;
}

.staff-serving-banner {
  background: #e8d5be;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  color: #5a4430;
  margin-top: 1rem;
}

/* Modal */
.staff-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1.5rem;
}

.staff-modal {
  background: #fff;
  border-radius: 16px;
  padding: 1.5rem;
  width: 100%;
  max-width: 480px;
}

.staff-modal h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #5a4430;
}

.staff-modal textarea,
.staff-modal input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d4b896;
  border-radius: 8px;
  background: #f5ede3;
  font-size: 1rem;
  color: #5a4430;
  margin-bottom: 1rem;
  resize: vertical;
}

.staff-modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.staff-modal-buttons button {
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  font-size: 0.95rem;
  cursor: pointer;
}

.staff-modal-buttons .btn-primary {
  background: #b8926a;
  color: #fff;
  border: none;
}

.staff-modal-buttons .btn-secondary {
  background: none;
  border: 1px solid #d4b896;
  color: #5a4430;
}

/* Forms */
.staff-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 480px;
}

.staff-form label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #5a4430;
  display: block;
  margin-bottom: 0.25rem;
}

.staff-form input,
.staff-form select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d4b896;
  border-radius: 8px;
  background: #f5ede3;
  font-size: 1rem;
  color: #5a4430;
}

.staff-btn {
  padding: 0.75rem 1.5rem;
  background: #b8926a;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.staff-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.staff-btn-danger {
  background: #c0392b;
}

.staff-section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #5a4430;
  margin: 1.5rem 0 0.75rem;
}

/* History */
.staff-date-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.staff-date-nav input[type="date"] {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d4b896;
  border-radius: 8px;
  background: #f5ede3;
  font-size: 0.95rem;
  color: #5a4430;
}

.staff-history-summary {
  font-size: 0.9rem;
  color: #8b6f47;
  margin-bottom: 1rem;
}

.staff-history-entry {
  background: #fff;
  border-radius: 10px;
  padding: 0.875rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.staff-history-entry-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.staff-history-number {
  font-weight: 700;
  color: #b8926a;
}

.staff-history-status {
  font-size: 0.8rem;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-weight: 600;
}

.staff-history-status.completed { background: #d4f5e2; color: #1a7a44; }
.staff-history-status.skipped { background: #fde8c0; color: #8b5e00; }
.staff-history-status.removed { background: #fde2e2; color: #c0392b; }

/* Analytics */
.staff-range-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.staff-range-tab {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  border: none;
  background: #f5ede3;
  color: #5a4430;
  font-size: 0.9rem;
  cursor: pointer;
}

.staff-range-tab.active {
  background: #b8926a;
  color: #fff;
  font-weight: 700;
}

.staff-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.staff-stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 1rem;
}

.staff-stat-value {
  font-size: 1.75rem;
  font-weight: 800;
  color: #b8926a;
  line-height: 1.1;
}

.staff-stat-label {
  font-size: 0.8rem;
  color: #8b6f47;
  margin-top: 0.25rem;
}

.staff-chart-section {
  background: #fff;
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.25rem;
}

.staff-hours-list {
  background: #fff;
  border-radius: 12px;
  padding: 1rem;
}

.staff-hour-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f5ede3;
  font-size: 0.9rem;
}

/* Staff member list */
.staff-member-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.staff-member-card {
  background: #fff;
  border-radius: 10px;
  padding: 0.875rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.staff-member-info .staff-member-name {
  font-weight: 600;
  color: #5a4430;
}

.staff-member-info .staff-member-email {
  font-size: 0.85rem;
  color: #8b6f47;
}

.staff-member-role {
  font-size: 0.8rem;
  background: #f5ede3;
  color: #8b6f47;
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
}

/* Settings */
.staff-logo-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.staff-logo-preview {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
}

.staff-logo-initials {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.75rem;
  font-weight: 700;
}

.staff-field-item {
  background: #fff;
  border-radius: 10px;
  padding: 0.875rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.staff-inline-form {
  background: #fff;
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 1rem;
}

/* Login */
.staff-login-page {
  max-width: 400px;
  margin: 4rem auto;
  padding: 0 1rem;
}

.staff-login-page h1 {
  text-align: center;
  margin-bottom: 2rem;
  color: #5a4430;
}

/* Mobile: hide sidebar, show bottom tabs */
@media (max-width: 767px) {
  .staff-sidebar {
    display: none;
  }

  .staff-bottom-tabs {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #5a4430;
    z-index: 50;
    border-top: 1px solid rgba(255,255,255,0.1);
  }

  .staff-bottom-tabs .staff-nav-link {
    flex: 1;
    text-align: center;
    padding: 0.75rem 0.25rem;
    font-size: 0.7rem;
    color: rgba(255,255,255,0.65);
    text-decoration: none;
    display: block;
  }

  .staff-bottom-tabs .staff-nav-link.active {
    color: #fff;
    font-weight: 700;
  }

  .staff-main {
    padding-bottom: 60px;
  }
}
```

- [ ] **Step 2: Create StaffLayout**

Create `apps/web/src/staff/StaffLayout.tsx`:

```tsx
import { NavLink, Outlet } from "react-router-dom";
import { useStaffAuth } from "./StaffAuthContext";
import "./staff.css";

const NAV_ITEMS = [
  { to: "/staff/queue", label: "Queue" },
  { to: "/staff/history", label: "History" },
  { to: "/staff/analytics", label: "Analytics" },
  { to: "/staff/settings", label: "Settings" },
  { to: "/staff/staff", label: "Staff" },
];

export default function StaffLayout() {
  const { staffProfile, signOut } = useStaffAuth();

  return (
    <div className="staff-layout">
      <nav className="staff-sidebar">
        <div className="staff-sidebar-logo">Eazque</div>
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              "staff-nav-link" + (isActive ? " active" : "")
            }
          >
            {label}
          </NavLink>
        ))}
        <div style={{ marginTop: "auto", padding: "1rem 1.25rem" }}>
          {staffProfile && (
            <div
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: "0.8rem",
                marginBottom: "0.5rem",
              }}
            >
              {staffProfile.name}
            </div>
          )}
          <button className="staff-signout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </nav>

      <main className="staff-main">
        <Outlet />
      </main>

      <nav className="staff-bottom-tabs">
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              "staff-nav-link" + (isActive ? " active" : "")
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
```

- [ ] **Step 3: Create stub page files**

Create `apps/web/src/staff/pages/LoginPage.tsx`:
```tsx
export default function LoginPage() {
  return <div className="staff-login-page"><h1>Staff Login</h1></div>;
}
```

Create `apps/web/src/staff/pages/QueuePage.tsx`:
```tsx
export default function QueuePage() {
  return <div className="staff-page"><h1>Queue</h1></div>;
}
```

Create `apps/web/src/staff/pages/HistoryPage.tsx`:
```tsx
export default function HistoryPage() {
  return <div className="staff-page"><h1>History</h1></div>;
}
```

Create `apps/web/src/staff/pages/AnalyticsPage.tsx`:
```tsx
export default function AnalyticsPage() {
  return <div className="staff-page"><h1>Analytics</h1></div>;
}
```

Create `apps/web/src/staff/pages/SettingsPage.tsx`:
```tsx
export default function SettingsPage() {
  return <div className="staff-page"><h1>Settings</h1></div>;
}
```

Create `apps/web/src/staff/pages/StaffPage.tsx`:
```tsx
export default function StaffPage() {
  return <div className="staff-page"><h1>Staff</h1></div>;
}
```

- [ ] **Step 4: Update App.tsx with all staff routes**

Replace `apps/web/src/App.tsx`:

```tsx
import { Routes, Route, Navigate } from "react-router-dom";
import JoinQueuePage from "./pages/JoinQueuePage";
import QueueStatusPage from "./pages/QueueStatusPage";
import { StaffAuthProvider } from "./staff/StaffAuthContext";
import StaffRoute from "./staff/StaffRoute";
import StaffLayout from "./staff/StaffLayout";
import LoginPage from "./staff/pages/LoginPage";
import QueuePage from "./staff/pages/QueuePage";
import HistoryPage from "./staff/pages/HistoryPage";
import AnalyticsPage from "./staff/pages/AnalyticsPage";
import SettingsPage from "./staff/pages/SettingsPage";
import StaffPage from "./staff/pages/StaffPage";

export default function App() {
  return (
    <StaffAuthProvider>
      <Routes>
        {/* Customer routes */}
        <Route path="/q/:businessId" element={<JoinQueuePage />} />
        <Route
          path="/q/:businessId/status/:sessionToken"
          element={<QueueStatusPage />}
        />

        {/* Staff routes */}
        <Route path="/staff/login" element={<LoginPage />} />
        <Route element={<StaffRoute />}>
          <Route element={<StaffLayout />}>
            <Route path="/staff/queue" element={<QueuePage />} />
            <Route path="/staff/history" element={<HistoryPage />} />
            <Route path="/staff/analytics" element={<AnalyticsPage />} />
            <Route path="/staff/settings" element={<SettingsPage />} />
            <Route path="/staff/staff" element={<StaffPage />} />
            <Route
              path="/staff"
              element={<Navigate to="/staff/queue" replace />}
            />
          </Route>
        </Route>
      </Routes>
    </StaffAuthProvider>
  );
}
```

- [ ] **Step 5: Verify TypeScript and tests pass**

```bash
npm run typecheck --workspace=apps/web && npm run test --workspace=apps/web
```

Expected: no type errors, 16 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/staff/ apps/web/src/App.tsx
git commit -m "feat(web): add StaffLayout, stub pages, and /staff/* routing"
```

---

### Task 5: Cloud Functions — createStaffAccount + removeStaffAccount + Firestore rules

**Files:**
- Modify: `firebase/functions/src/paths.ts`
- Create: `firebase/functions/src/create-staff-account.ts`
- Create: `firebase/functions/src/remove-staff-account.ts`
- Modify: `firebase/functions/src/index.ts`
- Modify: `firebase/firestore.rules`

- [ ] **Step 1: Add staffProfile path to paths.ts**

In `firebase/functions/src/paths.ts`, add `staffProfile` after `dailyStat`:

```ts
export const paths = {
  business: (businessId: string) =>
    `businesses/${businessId}`,
  staff: (businessId: string) =>
    `businesses/${businessId}/staff`,
  staffMember: (businessId: string, staffId: string) =>
    `businesses/${businessId}/staff/${staffId}`,
  staffProfile: (uid: string) =>
    `staffProfiles/${uid}`,
  queues: (businessId: string) =>
    `businesses/${businessId}/queues`,
  queue: (businessId: string, queueId: string) =>
    `businesses/${businessId}/queues/${queueId}`,
  entries: (businessId: string, queueId: string) =>
    `businesses/${businessId}/queues/${queueId}/entries`,
  entry: (businessId: string, queueId: string, entryId: string) =>
    `businesses/${businessId}/queues/${queueId}/entries/${entryId}`,
  dailyStat: (businessId: string, date: string) =>
    `businesses/${businessId}/dailyStats/${date}`,
} as const;
```

- [ ] **Step 2: Create createStaffAccount Cloud Function**

Create `firebase/functions/src/create-staff-account.ts`:

```ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "./config";
import { paths } from "./paths";

export const createStaffAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const { businessId, name, email, password } = request.data as {
    businessId: string;
    name: string;
    email: string;
    password: string;
  };

  if (request.auth.uid !== businessId) {
    throw new HttpsError(
      "permission-denied",
      "Only the business owner can add staff"
    );
  }

  if (!name || !email || !password) {
    throw new HttpsError(
      "invalid-argument",
      "name, email, and password are required"
    );
  }

  let newUser: { uid: string };
  try {
    newUser = await getAuth().createUser({
      email,
      password,
      displayName: name,
    });
  } catch (err: any) {
    throw new HttpsError("already-exists", err.message);
  }

  const batch = db.batch();
  batch.set(db.doc(paths.staffMember(businessId, newUser.uid)), {
    name,
    email,
    role: "staff",
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(db.doc(paths.staffProfile(newUser.uid)), { businessId });
  await batch.commit();

  return { uid: newUser.uid };
});
```

- [ ] **Step 3: Create removeStaffAccount Cloud Function**

Create `firebase/functions/src/remove-staff-account.ts`:

```ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { db } from "./config";
import { paths } from "./paths";

export const removeStaffAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const { businessId, staffId } = request.data as {
    businessId: string;
    staffId: string;
  };

  if (request.auth.uid !== businessId) {
    throw new HttpsError(
      "permission-denied",
      "Only the business owner can remove staff"
    );
  }

  if (!staffId) {
    throw new HttpsError("invalid-argument", "staffId is required");
  }

  try {
    await getAuth().deleteUser(staffId);
  } catch {
    // ignore — user may not exist in Auth
  }

  const batch = db.batch();
  batch.delete(db.doc(paths.staffMember(businessId, staffId)));
  batch.delete(db.doc(paths.staffProfile(staffId)));
  await batch.commit();
});
```

- [ ] **Step 4: Export both functions from index.ts**

Replace `firebase/functions/src/index.ts`:

```ts
export { onCustomerJoin } from "./on-customer-join";
export { onEntryStatusChange } from "./on-entry-status-change";
export { onCurrentNumberAdvance } from "./on-current-number-advance";
export { dailyQueueReset } from "./daily-queue-reset";
export { generateDailyStats } from "./generate-daily-stats";
export { createStaffAccount } from "./create-staff-account";
export { removeStaffAccount } from "./remove-staff-account";
```

- [ ] **Step 5: Add staffProfiles Firestore rule**

In `firebase/firestore.rules`, add BEFORE the final catch-all rule:

```
    // Staff profiles — maps uid → businessId, written only by Cloud Functions
    match /staffProfiles/{uid} {
      allow read: if request.auth.uid == uid;
      allow write: if false;
    }
```

The full `firestore.rules` should look like:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // === Helper functions ===

    function isAuth() {
      return request.auth != null;
    }

    function isBusinessStaff(businessId) {
      return isAuth() &&
        exists(/databases/$(database)/documents/businesses/$(businessId)/staff/$(request.auth.uid));
    }

    function isBusinessOwner(businessId) {
      return isAuth() &&
        get(/databases/$(database)/documents/businesses/$(businessId)/staff/$(request.auth.uid)).data.role == "owner";
    }

    // === Business documents ===
    match /businesses/{businessId} {
      allow read: if true;
      allow create: if isAuth();
      allow update: if isBusinessOwner(businessId);
      allow delete: if false;

      match /staff/{staffId} {
        allow read: if isBusinessStaff(businessId);
        allow create: if isBusinessOwner(businessId) ||
          (isAuth() && staffId == request.auth.uid &&
           request.resource.data.role == "owner" &&
           businessId == request.auth.uid);
        allow update: if isBusinessOwner(businessId);
        allow delete: if isBusinessOwner(businessId);
      }

      match /queues/{queueId} {
        allow read: if true;
        allow write: if isBusinessStaff(businessId);

        match /entries/{entryId} {
          allow read: if true;
          allow create: if false;
          allow update: if isBusinessStaff(businessId);
          allow delete: if isBusinessOwner(businessId);
        }
      }
    }

    // Staff profiles — maps uid → businessId, written only by Cloud Functions
    match /staffProfiles/{uid} {
      allow read: if request.auth.uid == uid;
      allow write: if false;
    }

    // Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 6: Verify functions TypeScript compiles**

```bash
npm run build --workspace=firebase/functions
```

Expected: no errors, `lib/` directory updated.

- [ ] **Step 7: Commit**

```bash
git add firebase/functions/src/paths.ts \
        firebase/functions/src/create-staff-account.ts \
        firebase/functions/src/remove-staff-account.ts \
        firebase/functions/src/index.ts \
        firebase/firestore.rules
git commit -m "feat(functions): add createStaffAccount and removeStaffAccount callable functions"
```

---

### Task 6: Web data hooks

**Files:**
- Create: `apps/web/src/staff/hooks/useQueue.ts`
- Create: `apps/web/src/staff/hooks/useQueueEntries.ts`
- Create: `apps/web/src/staff/hooks/useQueueByDate.ts`
- Create: `apps/web/src/staff/hooks/useHistoryEntries.ts`
- Create: `apps/web/src/staff/hooks/useBusinessSettings.ts`
- Create: `apps/web/src/staff/hooks/useStaff.ts`
- Create: `apps/web/src/staff/hooks/useTodayStats.ts`
- Create: `apps/web/src/staff/hooks/useDateRangeStats.ts`

- [ ] **Step 1: Create useQueue.ts**

```ts
import { useState, useEffect } from "react";
import { collection, query, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import type { Queue } from "@eazque/shared";

export function useQueue(businessId: string) {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, `businesses/${businessId}/queues`),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        setQueue({ id: d.id, ...d.data() } as Queue);
        setQueueId(d.id);
      }
      setLoading(false);
    });
    return unsub;
  }, [businessId]);

  return { queue, queueId, loading };
}
```

- [ ] **Step 2: Create useQueueEntries.ts**

```ts
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import type { QueueEntry } from "@eazque/shared";

export function useQueueEntries(businessId: string, queueId: string | null) {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!queueId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, `businesses/${businessId}/queues/${queueId}/entries`),
      where("status", "in", ["waiting", "serving"])
    );
    const unsub = onSnapshot(q, (snap) => {
      const sorted = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            queueNumber: data.queueNumber,
            displayNumber: data.displayNumber,
            status: data.status,
            customerName: data.customerName,
            phone: data.phone,
            formData: data.formData ?? {},
            notes: data.notes ?? "",
            sessionToken: data.sessionToken,
            joinedAt: data.joinedAt?.toDate() ?? new Date(),
            servedAt: data.servedAt?.toDate() ?? null,
            completedAt: data.completedAt?.toDate() ?? null,
          } as QueueEntry;
        })
        .sort((a, b) => a.queueNumber - b.queueNumber);
      setEntries(sorted);
      setLoading(false);
    });
    return unsub;
  }, [businessId, queueId]);

  return { entries, loading };
}
```

- [ ] **Step 3: Create useQueueByDate.ts**

```ts
import { useState, useEffect } from "react";
import { collection, query, where, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import type { Queue } from "@eazque/shared";

export function useQueueByDate(businessId: string, date: string) {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setQueue(null);
    setQueueId(null);
    const q = query(
      collection(db, `businesses/${businessId}/queues`),
      where("date", "==", date),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        setQueue({ id: d.id, ...d.data() } as Queue);
        setQueueId(d.id);
      }
      setLoading(false);
    });
    return unsub;
  }, [businessId, date]);

  return { queue, queueId, loading };
}
```

- [ ] **Step 4: Create useHistoryEntries.ts**

```ts
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import type { QueueEntry } from "@eazque/shared";

export function useHistoryEntries(businessId: string, queueId: string | null) {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!queueId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, `businesses/${businessId}/queues/${queueId}/entries`),
      where("status", "in", ["completed", "skipped", "removed"])
    );
    const unsub = onSnapshot(q, (snap) => {
      const sorted = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            queueNumber: data.queueNumber,
            displayNumber: data.displayNumber,
            status: data.status,
            customerName: data.customerName,
            phone: data.phone,
            formData: data.formData ?? {},
            notes: data.notes ?? "",
            sessionToken: data.sessionToken,
            joinedAt: data.joinedAt?.toDate() ?? new Date(),
            servedAt: data.servedAt?.toDate() ?? null,
            completedAt: data.completedAt?.toDate() ?? null,
          } as QueueEntry;
        })
        .sort((a, b) => a.queueNumber - b.queueNumber);
      setEntries(sorted);
      setLoading(false);
    });
    return unsub;
  }, [businessId, queueId]);

  return { entries, loading };
}
```

- [ ] **Step 5: Create useBusinessSettings.ts**

```ts
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import type { Business } from "@eazque/shared";

export function useBusinessSettings(businessId: string) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "businesses", businessId), (snap) => {
      if (snap.exists()) {
        setBusiness({ id: snap.id, ...snap.data() } as Business);
      }
      setLoading(false);
    });
    return unsub;
  }, [businessId]);

  return { business, loading };
}
```

- [ ] **Step 6: Create useStaff.ts**

```ts
import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import type { Staff } from "@eazque/shared";

export function useStaff(businessId: string) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, `businesses/${businessId}/staff`),
      (snap) => {
        const members = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() ?? new Date(),
        })) as Staff[];
        setStaff(members);
        setLoading(false);
      }
    );
    return unsub;
  }, [businessId]);

  return { staff, loading };
}
```

- [ ] **Step 7: Create useTodayStats.ts**

```ts
import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import type { QueueEntry, DailyStats } from "@eazque/shared";
import { useQueueByDate } from "./useQueueByDate";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function computeStats(date: string, entries: QueueEntry[]): DailyStats {
  const totalJoined = entries.length;
  const completedEntries = entries.filter((e) => e.status === "completed");
  const completedCount = completedEntries.length;
  const skippedCount = entries.filter((e) => e.status === "skipped").length;
  const removedCount = entries.filter((e) => e.status === "removed").length;

  const waitTimes = completedEntries
    .filter((e) => e.servedAt !== null)
    .map((e) => (e.servedAt!.getTime() - e.joinedAt.getTime()) / 60000);
  const avgWaitTime =
    waitTimes.length > 0
      ? Math.round((waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length) * 10) / 10
      : 0;

  const serviceTimes = completedEntries
    .filter((e) => e.servedAt !== null && e.completedAt !== null)
    .map((e) => (e.completedAt!.getTime() - e.servedAt!.getTime()) / 60000);
  const avgServiceTime =
    serviceTimes.length > 0
      ? Math.round((serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length) * 10) / 10
      : 0;

  const hourlyDistribution: Record<string, number> = {};
  for (const entry of entries) {
    const hour = String(entry.joinedAt.getHours());
    hourlyDistribution[hour] = (hourlyDistribution[hour] ?? 0) + 1;
  }

  return { date, totalJoined, completedCount, skippedCount, removedCount, avgServiceTime, avgWaitTime, hourlyDistribution };
}

export function useTodayStats(businessId: string) {
  const today = getToday();
  const { queueId, loading: queueLoading } = useQueueByDate(businessId, today);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [entriesLoading, setEntriesLoading] = useState(true);

  useEffect(() => {
    if (queueLoading) return;
    if (!queueId) {
      setStats(null);
      setEntriesLoading(false);
      return;
    }
    setEntriesLoading(true);
    const unsub = onSnapshot(
      collection(db, `businesses/${businessId}/queues/${queueId}/entries`),
      (snap) => {
        const entries: QueueEntry[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            queueNumber: data.queueNumber,
            displayNumber: data.displayNumber,
            status: data.status,
            customerName: data.customerName,
            phone: data.phone,
            formData: data.formData ?? {},
            notes: data.notes ?? "",
            sessionToken: data.sessionToken,
            joinedAt: data.joinedAt?.toDate() ?? new Date(),
            servedAt: data.servedAt?.toDate() ?? null,
            completedAt: data.completedAt?.toDate() ?? null,
          } as QueueEntry;
        });
        setStats(computeStats(today, entries));
        setEntriesLoading(false);
      }
    );
    return unsub;
  }, [businessId, queueId, queueLoading]);

  return { stats, loading: queueLoading || entriesLoading };
}
```

- [ ] **Step 8: Create useDateRangeStats.ts**

```ts
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import type { DailyStats } from "@eazque/shared";

export function useDateRangeStats(
  businessId: string,
  startDate: string,
  endDate: string
) {
  const [statsByDate, setStatsByDate] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!startDate || !endDate) {
      setStatsByDate([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setStatsByDate([]);
    const q = query(
      collection(db, `businesses/${businessId}/dailyStats`),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setStatsByDate(snap.docs.map((d) => d.data() as DailyStats));
      setLoading(false);
    });
    return unsub;
  }, [businessId, startDate, endDate]);

  return { statsByDate, loading };
}
```

- [ ] **Step 9: Verify TypeScript compiles**

```bash
npm run typecheck --workspace=apps/web
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/staff/hooks/
git commit -m "feat(web): add staff data hooks"
```

---

### Task 7: Web service functions

**Files:**
- Create: `apps/web/src/staff/services/queueActions.ts`
- Create: `apps/web/src/staff/services/settingsActions.ts`
- Create: `apps/web/src/staff/services/staffActions.ts`

- [ ] **Step 1: Create queueActions.ts**

```ts
import { doc, writeBatch, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import type { QueueEntry } from "@eazque/shared";

function entryRef(businessId: string, queueId: string, entryId: string) {
  return doc(db, `businesses/${businessId}/queues/${queueId}/entries/${entryId}`);
}

function queueRef(businessId: string, queueId: string) {
  return doc(db, `businesses/${businessId}/queues/${queueId}`);
}

export async function advanceQueue(
  businessId: string,
  queueId: string,
  waitingEntries: QueueEntry[],
  servingEntryId: string | null
) {
  if (waitingEntries.length === 0) return;
  const batch = writeBatch(db);
  const nextEntry = waitingEntries[0];

  if (servingEntryId) {
    batch.update(entryRef(businessId, queueId, servingEntryId), {
      status: "completed",
      completedAt: serverTimestamp(),
    });
  }
  batch.update(entryRef(businessId, queueId, nextEntry.id), {
    status: "serving",
    servedAt: serverTimestamp(),
  });
  batch.update(queueRef(businessId, queueId), {
    currentNumber: nextEntry.queueNumber,
  });
  await batch.commit();
}

export async function skipEntry(
  businessId: string,
  queueId: string,
  entryId: string
) {
  await updateDoc(entryRef(businessId, queueId, entryId), { status: "skipped" });
}

export async function removeEntry(
  businessId: string,
  queueId: string,
  entryId: string
) {
  await updateDoc(entryRef(businessId, queueId, entryId), { status: "removed" });
}

export async function addNote(
  businessId: string,
  queueId: string,
  entryId: string,
  note: string
) {
  await updateDoc(entryRef(businessId, queueId, entryId), { notes: note });
}
```

- [ ] **Step 2: Create settingsActions.ts**

```ts
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase";
import type { FormField } from "@eazque/shared";

interface BusinessSettingsUpdate {
  name?: string;
  logo?: string;
  primaryColor?: string;
  whatsappNumber?: string;
  whatsappApiKey?: string;
  defaultEstimatedTimePerCustomer?: number;
  approachingThreshold?: number;
  formFields?: FormField[];
}

export async function updateBusinessSettings(
  businessId: string,
  updates: BusinessSettingsUpdate
) {
  await updateDoc(doc(db, "businesses", businessId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function uploadBusinessLogo(
  businessId: string,
  file: File
): Promise<string> {
  const storageRef = ref(storage, `logos/${businessId}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateBusinessSettings(businessId, { logo: url });
  return url;
}
```

- [ ] **Step 3: Create staffActions.ts**

```ts
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";

export async function createStaffAccount(
  businessId: string,
  name: string,
  email: string,
  password: string
): Promise<void> {
  await httpsCallable(functions, "createStaffAccount")({
    businessId,
    name,
    email,
    password,
  });
}

export async function removeStaffAccount(
  businessId: string,
  staffId: string
): Promise<void> {
  await httpsCallable(functions, "removeStaffAccount")({ businessId, staffId });
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run typecheck --workspace=apps/web
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/staff/services/
git commit -m "feat(web): add staff service functions"
```

---

### Task 8: LoginPage

**Files:**
- Modify: `apps/web/src/staff/pages/LoginPage.tsx`

- [ ] **Step 1: Replace stub with full LoginPage**

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStaffAuth } from "../StaffAuthContext";

export default function LoginPage() {
  const { signIn } = useStaffAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/staff/queue");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staff-login-page">
      <h1>Staff Login</h1>
      <form className="staff-form" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        {error && <div className="error-message">{error}</div>}
        <button className="staff-btn" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

```bash
npm run typecheck --workspace=apps/web
git add apps/web/src/staff/pages/LoginPage.tsx
git commit -m "feat(web): implement staff LoginPage"
```

---

### Task 9: QueuePage

**Files:**
- Modify: `apps/web/src/staff/pages/QueuePage.tsx`

- [ ] **Step 1: Replace stub with full QueuePage**

```tsx
import { useState } from "react";
import { useStaffAuth } from "../StaffAuthContext";
import { useQueue } from "../hooks/useQueue";
import { useQueueEntries } from "../hooks/useQueueEntries";
import { advanceQueue, skipEntry, removeEntry, addNote } from "../services/queueActions";
import { formatDisplayNumber } from "@eazque/shared";

export default function QueuePage() {
  const { businessId } = useStaffAuth();
  const { queue, queueId, loading: queueLoading } = useQueue(businessId!);
  const { entries, loading: entriesLoading } = useQueueEntries(
    businessId!,
    queueId
  );
  const [advancing, setAdvancing] = useState(false);
  const [noteEntryId, setNoteEntryId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const waitingEntries = entries.filter((e) => e.status === "waiting");
  const servingEntry = entries.find((e) => e.status === "serving");

  const handleNext = async () => {
    if (!queueId || waitingEntries.length === 0) return;
    setAdvancing(true);
    try {
      await advanceQueue(
        businessId!,
        queueId,
        waitingEntries,
        servingEntry?.id ?? null
      );
    } catch {
      alert("Failed to advance queue. Please try again.");
    } finally {
      setAdvancing(false);
    }
  };

  const handleSkip = (entryId: string) => {
    if (confirm("Move this customer to skipped?")) {
      skipEntry(businessId!, queueId!, entryId);
    }
  };

  const handleRemove = (entryId: string) => {
    if (confirm("Remove this customer from the queue?")) {
      removeEntry(businessId!, queueId!, entryId);
    }
  };

  const handleSaveNote = async () => {
    if (!noteEntryId || !queueId) return;
    await addNote(businessId!, queueId, noteEntryId, noteText.trim());
    setNoteEntryId(null);
    setNoteText("");
  };

  if (queueLoading || entriesLoading)
    return <div className="loading">Loading queue...</div>;
  if (!queue || !queueId)
    return <div className="error">No queue found</div>;

  return (
    <div className="staff-page">
      <div className="staff-now-serving">
        <span className="staff-now-serving-label">Now serving</span>
        <span className="staff-now-serving-number">
          {formatDisplayNumber(queue.currentNumber)}
        </span>
      </div>
      <div className="staff-queue-stats">
        {waitingEntries.length} waiting
      </div>
      <button
        className="staff-next-button"
        onClick={handleNext}
        disabled={advancing || waitingEntries.length === 0}
      >
        {advancing ? "Advancing..." : "Next →"}
      </button>

      {servingEntry && (
        <div className="staff-serving-banner">
          Now serving: {servingEntry.displayNumber} — {servingEntry.customerName}
        </div>
      )}

      <div className="staff-entry-list">
        {waitingEntries.map((entry) => (
          <div key={entry.id} className="staff-entry-card">
            <div className="staff-entry-header">
              <span className="staff-entry-number">{entry.displayNumber}</span>
              <span className="staff-entry-name">{entry.customerName}</span>
            </div>
            {entry.phone && (
              <div className="staff-entry-phone">{entry.phone}</div>
            )}
            {entry.notes && (
              <div className="staff-entry-notes">Note: {entry.notes}</div>
            )}
            <div className="staff-entry-actions">
              <button onClick={() => handleSkip(entry.id)}>Skip</button>
              <button onClick={() => handleRemove(entry.id)}>Remove</button>
              <button
                onClick={() => {
                  setNoteText(entry.notes ?? "");
                  setNoteEntryId(entry.id);
                }}
              >
                Note
              </button>
            </div>
          </div>
        ))}
      </div>

      {noteEntryId && (
        <div className="staff-modal-overlay">
          <div className="staff-modal">
            <h3>Add Note</h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              placeholder="Enter note..."
            />
            <div className="staff-modal-buttons">
              <button
                className="btn-secondary"
                onClick={() => setNoteEntryId(null)}
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveNote}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

```bash
npm run typecheck --workspace=apps/web
git add apps/web/src/staff/pages/QueuePage.tsx
git commit -m "feat(web): implement staff QueuePage"
```

---

### Task 10: HistoryPage

**Files:**
- Modify: `apps/web/src/staff/pages/HistoryPage.tsx`

- [ ] **Step 1: Replace stub with full HistoryPage**

```tsx
import { useState } from "react";
import { useStaffAuth } from "../StaffAuthContext";
import { useQueueByDate } from "../hooks/useQueueByDate";
import { useHistoryEntries } from "../hooks/useHistoryEntries";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export default function HistoryPage() {
  const { businessId } = useStaffAuth();
  const [selectedDate, setSelectedDate] = useState(getToday);
  const { queueId, loading: queueLoading } = useQueueByDate(
    businessId!,
    selectedDate
  );
  const { entries, loading: entriesLoading } = useHistoryEntries(
    businessId!,
    queueId
  );

  const loading = queueLoading || entriesLoading;
  const completedCount = entries.filter((e) => e.status === "completed").length;
  const skippedCount = entries.filter((e) => e.status === "skipped").length;
  const removedCount = entries.filter((e) => e.status === "removed").length;

  return (
    <div className="staff-page">
      <h1>History</h1>
      <div className="staff-date-nav">
        <label htmlFor="date-picker">Date</label>
        <input
          id="date-picker"
          type="date"
          value={selectedDate}
          max={getToday()}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">Loading history...</div>
      ) : !queueId ? (
        <div className="loading">No queue for this date.</div>
      ) : (
        <>
          <div className="staff-history-summary">
            {completedCount} completed · {skippedCount} skipped · {removedCount} removed
          </div>
          <div>
            {entries.map((entry) => (
              <div key={entry.id} className="staff-history-entry">
                <div className="staff-history-entry-left">
                  <span className="staff-history-number">
                    {entry.displayNumber}
                  </span>
                  <span>{entry.customerName}</span>
                </div>
                <span
                  className={`staff-history-status ${entry.status}`}
                >
                  {entry.status}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

```bash
npm run typecheck --workspace=apps/web
git add apps/web/src/staff/pages/HistoryPage.tsx
git commit -m "feat(web): implement staff HistoryPage"
```

---

### Task 11: AnalyticsPage

**Files:**
- Modify: `apps/web/src/staff/pages/AnalyticsPage.tsx`

- [ ] **Step 1: Replace stub with full AnalyticsPage**

```tsx
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useStaffAuth } from "../StaffAuthContext";
import { useTodayStats } from "../hooks/useTodayStats";
import { useDateRangeStats } from "../hooks/useDateRangeStats";
import type { DailyStats } from "@eazque/shared";

type RangeType = "today" | "7days" | "30days" | "custom";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatBarDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatHour(hour: number): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", hour12: true });
}

function aggregateStats(statsByDate: DailyStats[]) {
  const totalJoined = statsByDate.reduce((s, d) => s + d.totalJoined, 0);
  const completedCount = statsByDate.reduce((s, d) => s + d.completedCount, 0);
  const skippedCount = statsByDate.reduce((s, d) => s + d.skippedCount, 0);
  const removedCount = statsByDate.reduce((s, d) => s + d.removedCount, 0);
  const totalServiceWeight = statsByDate.reduce(
    (s, d) => s + d.avgServiceTime * d.completedCount,
    0
  );
  const totalWaitWeight = statsByDate.reduce(
    (s, d) => s + d.avgWaitTime * d.completedCount,
    0
  );
  const avgServiceTime =
    completedCount > 0
      ? Math.round((totalServiceWeight / completedCount) * 10) / 10
      : 0;
  const avgWaitTime =
    completedCount > 0
      ? Math.round((totalWaitWeight / completedCount) * 10) / 10
      : 0;
  const hourlyDistribution: Record<string, number> = {};
  for (const d of statsByDate) {
    for (const [hour, count] of Object.entries(d.hourlyDistribution)) {
      hourlyDistribution[hour] = (hourlyDistribution[hour] ?? 0) + count;
    }
  }
  return { totalJoined, completedCount, skippedCount, removedCount, avgServiceTime, avgWaitTime, hourlyDistribution };
}

function getTop3Hours(distribution: Record<string, number>) {
  return Object.entries(distribution)
    .map(([h, count]) => ({ hour: Number(h), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

const RANGES: Array<{ key: RangeType; label: string }> = [
  { key: "today", label: "Today" },
  { key: "7days", label: "7 Days" },
  { key: "30days", label: "30 Days" },
  { key: "custom", label: "Custom" },
];

export default function AnalyticsPage() {
  const { businessId } = useStaffAuth();
  const [range, setRange] = useState<RangeType>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [activeRange, setActiveRange] = useState({ start: "", end: "" });

  const today = getToday();
  const yesterday = shiftDate(today, -1);

  const rangeStart = useMemo(() => {
    switch (range) {
      case "7days": return shiftDate(today, -7);
      case "30days": return shiftDate(today, -30);
      case "custom": return activeRange.start;
      default: return "";
    }
  }, [range, today, activeRange.start]);

  const rangeEnd = useMemo(() => {
    switch (range) {
      case "7days":
      case "30days": return yesterday;
      case "custom": return activeRange.end;
      default: return "";
    }
  }, [range, yesterday, activeRange.end]);

  const { stats: todayStats, loading: todayLoading } = useTodayStats(businessId!);
  const { statsByDate, loading: rangeLoading } = useDateRangeStats(
    businessId!,
    rangeStart,
    rangeEnd
  );

  const loading = range === "today" ? todayLoading : rangeLoading;

  const aggregated = useMemo(() => {
    if (range === "today") return todayStats ?? null;
    return statsByDate.length > 0 ? aggregateStats(statsByDate) : null;
  }, [range, todayStats, statsByDate]);

  const skipRate =
    aggregated && aggregated.totalJoined > 0
      ? Math.round((aggregated.skippedCount / aggregated.totalJoined) * 1000) / 10
      : 0;
  const removeRate =
    aggregated && aggregated.totalJoined > 0
      ? Math.round((aggregated.removedCount / aggregated.totalJoined) * 1000) / 10
      : 0;

  const top3Hours = aggregated ? getTop3Hours(aggregated.hourlyDistribution) : [];

  const barData =
    range !== "today" && statsByDate.length > 0
      ? statsByDate.map((d) => ({
          date: formatBarDate(d.date),
          completed: d.completedCount,
        }))
      : null;

  return (
    <div className="staff-page">
      <h1>Analytics</h1>

      <div className="staff-range-tabs">
        {RANGES.map(({ key, label }) => (
          <button
            key={key}
            className={"staff-range-tab" + (range === key ? " active" : "")}
            onClick={() => setRange(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {range === "custom" && (
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <input
            type="date"
            value={customStart}
            max={today}
            onChange={(e) => setCustomStart(e.target.value)}
            style={{ padding: "0.5rem", border: "1px solid #d4b896", borderRadius: "8px", background: "#f5ede3" }}
          />
          <input
            type="date"
            value={customEnd}
            max={today}
            onChange={(e) => setCustomEnd(e.target.value)}
            style={{ padding: "0.5rem", border: "1px solid #d4b896", borderRadius: "8px", background: "#f5ede3" }}
          />
          <button
            className="staff-btn"
            onClick={() => setActiveRange({ start: customStart, end: customEnd })}
          >
            Load
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading analytics...</div>
      ) : !aggregated ? (
        <div className="loading">No data for this period.</div>
      ) : (
        <>
          <div className="staff-stats-grid">
            <div className="staff-stat-card">
              <div className="staff-stat-value">{aggregated.completedCount}</div>
              <div className="staff-stat-label">Total Served</div>
            </div>
            <div className="staff-stat-card">
              <div className="staff-stat-value">{aggregated.avgWaitTime} min</div>
              <div className="staff-stat-label">Avg Wait Time</div>
            </div>
            <div className="staff-stat-card">
              <div className="staff-stat-value">{aggregated.avgServiceTime} min</div>
              <div className="staff-stat-label">Avg Service Time</div>
            </div>
            <div className="staff-stat-card">
              <div className="staff-stat-value">{skipRate}%</div>
              <div className="staff-stat-label">Skip Rate</div>
            </div>
            <div className="staff-stat-card">
              <div className="staff-stat-value">{removeRate}%</div>
              <div className="staff-stat-label">Remove Rate</div>
            </div>
            <div className="staff-stat-card">
              <div className="staff-stat-value">{aggregated.totalJoined}</div>
              <div className="staff-stat-label">Total Joined</div>
            </div>
          </div>

          {barData && (
            <div className="staff-chart-section">
              <div className="staff-section-title">Customers Served Per Day</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5ede3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="completed" fill="#b8926a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {top3Hours.length > 0 && (
            <div className="staff-hours-list">
              <div className="staff-section-title">Busiest Hours</div>
              {top3Hours.map(({ hour, count }) => (
                <div key={hour} className="staff-hour-row">
                  <span>{formatHour(hour)}</span>
                  <span>{count} customers</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

```bash
npm run typecheck --workspace=apps/web
git add apps/web/src/staff/pages/AnalyticsPage.tsx
git commit -m "feat(web): implement staff AnalyticsPage with recharts"
```

---

### Task 12: SettingsPage

**Files:**
- Modify: `apps/web/src/staff/pages/SettingsPage.tsx`

- [ ] **Step 1: Replace stub with full SettingsPage**

```tsx
import { useState, useEffect } from "react";
import { useStaffAuth } from "../StaffAuthContext";
import { useBusinessSettings } from "../hooks/useBusinessSettings";
import { updateBusinessSettings, uploadBusinessLogo } from "../services/settingsActions";
import type { FormField } from "@eazque/shared";

const INITIALS_COLORS = [
  "#B8926A","#8B6F47","#A0845C","#C4A882","#6B5240","#D4956A",
];

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0][0]?.toUpperCase() ?? "?";
  return (words[0][0]?.toUpperCase() ?? "") + (words[1][0]?.toUpperCase() ?? "");
}

function getInitialsColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return INITIALS_COLORS[Math.abs(hash) % INITIALS_COLORS.length];
}

type FieldType = "text" | "number" | "dropdown" | "checkbox";

export default function SettingsPage() {
  const { businessId } = useStaffAuth();
  const { business, loading } = useBusinessSettings(businessId!);

  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappApiKey, setWhatsappApiKey] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [threshold, setThreshold] = useState("");
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [logoUri, setLogoUri] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Field editor state
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editorLabel, setEditorLabel] = useState("");
  const [editorType, setEditorType] = useState<FieldType>("text");
  const [editorRequired, setEditorRequired] = useState(false);
  const [editorOptions, setEditorOptions] = useState("");

  useEffect(() => {
    if (business) {
      setName(business.name);
      setPrimaryColor(business.primaryColor);
      setWhatsappNumber(business.whatsappNumber);
      setWhatsappApiKey(business.whatsappApiKey);
      setEstimatedTime(String(business.defaultEstimatedTimePerCustomer));
      setThreshold(String(business.approachingThreshold));
      setFormFields(business.formFields ?? []);
      setLogoUri(business.logo ?? "");
      setDirty(false);
    }
  }, [business]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previousUri = logoUri;
    setLogoUri(URL.createObjectURL(file));
    setUploading(true);
    try {
      const url = await uploadBusinessLogo(businessId!, file);
      setLogoUri(url);
    } catch {
      alert("Failed to upload logo. Please try again.");
      setLogoUri(previousUri);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const parsedTime = Number(estimatedTime);
    const parsedThreshold = Number(threshold);
    if (!name.trim()) { alert("Business name is required."); return; }
    if (isNaN(parsedTime) || parsedTime <= 0) { alert("Estimated time must be a positive number."); return; }
    if (isNaN(parsedThreshold) || parsedThreshold < 1 || !Number.isInteger(parsedThreshold)) {
      alert("Approaching threshold must be a positive whole number."); return;
    }
    setSaving(true);
    try {
      await updateBusinessSettings(businessId!, {
        name: name.trim(),
        primaryColor: primaryColor.trim(),
        whatsappNumber: whatsappNumber.trim(),
        whatsappApiKey: whatsappApiKey.trim(),
        defaultEstimatedTimePerCustomer: parsedTime,
        approachingThreshold: parsedThreshold,
        formFields,
      });
      setDirty(false);
      alert("Settings saved.");
    } catch {
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const openAddField = () => {
    setEditingField(null);
    setEditorLabel("");
    setEditorType("text");
    setEditorRequired(false);
    setEditorOptions("");
    setShowFieldEditor(true);
  };

  const openEditField = (field: FormField) => {
    setEditingField(field);
    setEditorLabel(field.label);
    setEditorType(field.type as FieldType);
    setEditorRequired(field.required);
    setEditorOptions(field.options?.join(", ") ?? "");
    setShowFieldEditor(true);
  };

  const handleFieldSave = () => {
    if (!editorLabel.trim()) { alert("Label is required."); return; }
    const field: FormField = {
      id: editingField?.id ?? crypto.randomUUID(),
      label: editorLabel.trim(),
      type: editorType,
      required: editorRequired,
      options: editorType === "dropdown"
        ? editorOptions.split(",").map((o) => o.trim()).filter(Boolean)
        : undefined,
    };
    setFormFields((prev) => {
      const idx = prev.findIndex((f) => f.id === field.id);
      if (idx >= 0) {
        const next = [...prev]; next[idx] = field; return next;
      }
      return [...prev, field];
    });
    setDirty(true);
    setShowFieldEditor(false);
  };

  const handleFieldDelete = (fieldId: string) => {
    if (confirm("Remove this form field?")) {
      setFormFields((prev) => prev.filter((f) => f.id !== fieldId));
      setDirty(true);
    }
  };

  if (loading || !business) return <div className="loading">Loading settings...</div>;

  return (
    <div className="staff-page" style={{ maxWidth: 600 }}>
      <h1>Settings</h1>

      {/* Logo */}
      <div className="staff-section-title">Business Profile</div>
      <div className="staff-logo-section">
        {logoUri ? (
          <img src={logoUri} alt={name} className="staff-logo-preview" />
        ) : (
          <div
            className="staff-logo-initials"
            style={{ backgroundColor: getInitialsColor(name || business.name) }}
          >
            {getInitials(name || business.name)}
          </div>
        )}
        <div>
          <label className="staff-btn" style={{ cursor: "pointer" }}>
            {uploading ? "Uploading..." : "Change Photo"}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleLogoChange}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      <div className="staff-form">
        <div>
          <label htmlFor="biz-name">Business Name</label>
          <input id="biz-name" value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} />
        </div>
        <div>
          <label htmlFor="primary-color">Primary Color</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input type="color" value={primaryColor} onChange={(e) => { setPrimaryColor(e.target.value); setDirty(true); }} style={{ width: 48, height: 36, padding: 2, border: "1px solid #d4b896", borderRadius: 6 }} />
            <input id="primary-color" value={primaryColor} onChange={(e) => { setPrimaryColor(e.target.value); setDirty(true); }} style={{ flex: 1 }} />
          </div>
        </div>
        <div>
          <label htmlFor="whatsapp-number">WhatsApp Number</label>
          <input id="whatsapp-number" value={whatsappNumber} onChange={(e) => { setWhatsappNumber(e.target.value); setDirty(true); }} />
        </div>
        <div>
          <label htmlFor="whatsapp-key">WhatsApp API Key</label>
          <input id="whatsapp-key" type="password" value={whatsappApiKey} onChange={(e) => { setWhatsappApiKey(e.target.value); setDirty(true); }} />
        </div>
      </div>

      <div className="staff-section-title">Queue Defaults</div>
      <div className="staff-form">
        <div>
          <label htmlFor="est-time">Estimated Time per Customer (min)</label>
          <input id="est-time" type="number" min={1} value={estimatedTime} onChange={(e) => { setEstimatedTime(e.target.value); setDirty(true); }} />
        </div>
        <div>
          <label htmlFor="threshold">Approaching Threshold</label>
          <input id="threshold" type="number" min={1} value={threshold} onChange={(e) => { setThreshold(e.target.value); setDirty(true); }} />
        </div>
      </div>

      <div className="staff-section-title">Customer Form Fields</div>
      {formFields.map((field) => (
        <div key={field.id} className="staff-field-item">
          <span>{field.label} <em style={{ fontSize: "0.8rem", color: "#8b6f47" }}>({field.type})</em></span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={() => openEditField(field)} style={{ background: "none", border: "1px solid #d4b896", padding: "0.25rem 0.75rem", borderRadius: 6, cursor: "pointer" }}>Edit</button>
            <button onClick={() => handleFieldDelete(field.id)} style={{ background: "none", border: "1px solid #fde2e2", color: "#c0392b", padding: "0.25rem 0.75rem", borderRadius: 6, cursor: "pointer" }}>Delete</button>
          </div>
        </div>
      ))}
      <button onClick={openAddField} style={{ background: "none", border: "none", color: "#b8926a", fontWeight: 600, cursor: "pointer", marginBottom: "1.5rem" }}>
        + Add Field
      </button>

      {showFieldEditor && (
        <div className="staff-inline-form" style={{ marginBottom: "1rem" }}>
          <div style={{ fontWeight: 700, marginBottom: "0.75rem" }}>{editingField ? "Edit Field" : "Add Field"}</div>
          <div className="staff-form">
            <div>
              <label>Label</label>
              <input value={editorLabel} onChange={(e) => setEditorLabel(e.target.value)} />
            </div>
            <div>
              <label>Type</label>
              <select value={editorType} onChange={(e) => setEditorType(e.target.value as FieldType)}>
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="dropdown">Dropdown</option>
                <option value="checkbox">Checkbox</option>
              </select>
            </div>
            {editorType === "dropdown" && (
              <div>
                <label>Options (comma-separated)</label>
                <input value={editorOptions} onChange={(e) => setEditorOptions(e.target.value)} placeholder="e.g. Option A, Option B" />
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" id="field-required" checked={editorRequired} onChange={(e) => setEditorRequired(e.target.checked)} />
              <label htmlFor="field-required">Required</label>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="staff-btn" onClick={handleFieldSave}>Save</button>
              <button onClick={() => setShowFieldEditor(false)} style={{ background: "none", border: "1px solid #d4b896", padding: "0.6rem 1.25rem", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <button
        className="staff-btn"
        onClick={handleSave}
        disabled={saving || !dirty}
        style={{ width: "100%", marginTop: "1rem" }}
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

```bash
npm run typecheck --workspace=apps/web
git add apps/web/src/staff/pages/SettingsPage.tsx
git commit -m "feat(web): implement staff SettingsPage"
```

---

### Task 13: StaffPage

**Files:**
- Modify: `apps/web/src/staff/pages/StaffPage.tsx`

- [ ] **Step 1: Replace stub with full StaffPage**

```tsx
import { useState } from "react";
import { useStaffAuth } from "../StaffAuthContext";
import { useStaff } from "../hooks/useStaff";
import { createStaffAccount, removeStaffAccount } from "../services/staffActions";

export default function StaffPage() {
  const { businessId, user } = useStaffAuth();
  const { staff, loading } = useStaff(businessId!);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    const email = newEmail.trim().toLowerCase();
    const password = newPassword;

    if (!name || !email || !password) {
      alert("All fields are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    if (staff.some((s) => s.email === email)) {
      alert("A staff member with this email already exists.");
      return;
    }

    setAdding(true);
    try {
      await createStaffAccount(businessId!, name, email, password);
      setShowAddForm(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
    } catch {
      alert("Failed to add staff member. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (staffId: string) => {
    const member = staff.find((s) => s.id === staffId);
    if (!confirm(`Remove ${member?.name ?? "this staff member"}?`)) return;
    try {
      await removeStaffAccount(businessId!, staffId);
    } catch {
      alert("Failed to remove staff member. Please try again.");
    }
  };

  if (loading) return <div className="loading">Loading staff...</div>;

  return (
    <div className="staff-page">
      <h1>Staff</h1>

      <div className="staff-member-list">
        {staff.map((member) => (
          <div key={member.id} className="staff-member-card">
            <div className="staff-member-info">
              <div className="staff-member-name">{member.name}</div>
              <div className="staff-member-email">{member.email}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span className="staff-member-role">{member.role}</span>
              {member.id !== user?.uid && (
                <button
                  className="staff-btn staff-btn-danger"
                  style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}
                  onClick={() => handleRemove(member.id)}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!showAddForm ? (
        <button className="staff-btn" onClick={() => setShowAddForm(true)}>
          + Add Staff Member
        </button>
      ) : (
        <form className="staff-inline-form" onSubmit={handleAdd}>
          <div style={{ fontWeight: 700, marginBottom: "0.75rem" }}>Add Staff Member</div>
          <div className="staff-form">
            <div>
              <label htmlFor="staff-name">Name</label>
              <input
                id="staff-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="staff-email">Email</label>
              <input
                id="staff-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="staff-password">Password</label>
              <input
                id="staff-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="staff-btn" type="submit" disabled={adding}>
                {adding ? "Adding..." : "Add"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{ background: "none", border: "1px solid #d4b896", padding: "0.6rem 1.25rem", borderRadius: 8, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

```bash
npm run typecheck --workspace=apps/web
git add apps/web/src/staff/pages/StaffPage.tsx
git commit -m "feat(web): implement staff StaffPage"
```

---

### Task 14: Update mobile StaffScreen to use Cloud Functions

**Files:**
- Modify: `apps/mobile/src/services/staffActions.ts`
- Modify: `apps/mobile/src/screens/StaffScreen.tsx`

- [ ] **Step 1: Replace staffActions.ts with Cloud Function calls**

Replace `apps/mobile/src/services/staffActions.ts`:

```ts
import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

export async function addStaffMember(
  businessId: string,
  email: string,
  name: string,
  password: string
): Promise<void> {
  await httpsCallable(functions, "createStaffAccount")({
    businessId,
    name,
    email,
    password,
  });
}

export async function removeStaffMember(
  businessId: string,
  staffId: string
): Promise<void> {
  await httpsCallable(functions, "removeStaffAccount")({ businessId, staffId });
}
```

- [ ] **Step 2: Update StaffScreen to add password field**

In `apps/mobile/src/screens/StaffScreen.tsx`:

1. Add `newPassword` state after `newName`:
```tsx
const [newPassword, setNewPassword] = useState("");
```

2. Update `handleAdd` to pass `password` and validate it — replace the full `handleAdd` function:

```tsx
const handleAdd = async () => {
  const email = newEmail.trim().toLowerCase();
  const name = newName.trim();
  const password = newPassword;

  if (!email || !name || !password) {
    Alert.alert("Error", "Please enter name, email, and password.");
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    Alert.alert("Error", "Please enter a valid email address.");
    return;
  }

  if (password.length < 6) {
    Alert.alert("Error", "Password must be at least 6 characters.");
    return;
  }

  if (staff.some((s) => s.email === email)) {
    Alert.alert("Error", "A staff member with this email already exists.");
    return;
  }

  setAdding(true);
  try {
    await addStaffMember(businessId!, email, name, password);
    setShowAddModal(false);
    setNewEmail("");
    setNewName("");
    setNewPassword("");
  } catch {
    Alert.alert("Error", "Failed to add staff member. Please try again.");
  } finally {
    setAdding(false);
  }
};
```

3. Add password `TextInput` after the email input inside the Modal (after the email `TextInput`):

```tsx
<TextInput
  style={common.input}
  value={newPassword}
  onChangeText={setNewPassword}
  placeholder="Password (min 6 chars)"
  placeholderTextColor={colors.secondary}
  secureTextEntry
  accessibilityLabel="Staff password"
/>
```

4. Reset `newPassword` in the modal cancel handler — update `onRequestClose` and the Cancel button's `onPress`:

```tsx
onRequestClose={() => {
  setShowAddModal(false);
  setNewPassword("");
}}
```

And in the Cancel Pressable:
```tsx
onPress={() => {
  setShowAddModal(false);
  setNewPassword("");
}}
```

- [ ] **Step 3: Verify mobile TypeScript compiles**

```bash
npm run typecheck --workspace=apps/mobile
```

Expected: no errors.

- [ ] **Step 4: Run all tests**

```bash
npm run test --workspaces
```

Expected: 97 total tests pass (16 web + existing mobile + existing functions).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/services/staffActions.ts \
        apps/mobile/src/screens/StaffScreen.tsx
git commit -m "feat(mobile): update StaffScreen to create real Firebase Auth accounts via Cloud Function"
```
