# Plan 3: Customer Web App — Vite + React

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the customer-facing web app where customers scan a QR code, fill a short form to join a queue, and see real-time queue status with WhatsApp integration.

**Architecture:** Vite + React single-page app with two routes: a join form page and a live status page. Firebase client SDK provides real-time Firestore listeners for queue updates and callable functions for joining. Business logic (validation, wait time estimation) is imported from `@eazque/shared`. Components are pure and testable; Firebase integration lives in custom hooks.

**Tech Stack:** Vite 6, React 19, React Router 6, Firebase JS SDK 11, Vitest + React Testing Library, @eazque/shared

---

## File Structure

### New files to create:

```
apps/web/package.json                         # Dependencies and scripts
apps/web/tsconfig.json                        # TypeScript config extending root
apps/web/vite.config.ts                       # Vite + Vitest config with @eazque/shared alias
apps/web/index.html                           # HTML entry point
apps/web/.env.example                         # Firebase config template
apps/web/src/main.tsx                         # ReactDOM.createRoot entry
apps/web/src/App.tsx                          # React Router route definitions
apps/web/src/index.css                        # Global styles + Warm Sand theme variables
apps/web/src/test-setup.ts                    # Vitest DOM matchers setup
apps/web/src/firebase.ts                      # Firebase client SDK init + emulator connection
apps/web/src/components/DynamicForm.tsx        # Renders FormField[] as form inputs
apps/web/src/components/DynamicForm.test.tsx   # Tests for DynamicForm
apps/web/src/components/QueuePosition.tsx      # Your number, serving, ahead count, wait time
apps/web/src/components/QueuePosition.test.tsx # Tests for QueuePosition
apps/web/src/components/QueueList.tsx          # Public entry list (number + status)
apps/web/src/components/WhatsAppButton.tsx     # Green button with WhatsApp deep link
apps/web/src/hooks/useBusinessData.ts          # Firestore listener for business doc
apps/web/src/hooks/useActiveQueue.ts           # Firestore listener for first queue
apps/web/src/hooks/useQueueEntries.ts          # Firestore listener for queue entries
apps/web/src/hooks/useMyEntry.ts               # Firestore query by sessionToken
apps/web/src/pages/JoinQueuePage.tsx           # Join form + callable submission
apps/web/src/pages/QueueStatusPage.tsx         # Live queue status view
```

### Files to modify:

```
package.json                                   # Add dev:web script
.gitignore                                     # Add .env*.local if not already present
```

### Files to delete:

```
apps/web/.gitkeep
```

### Responsibilities:

| File | Responsibility |
|------|---------------|
| `firebase.ts` | Initialize Firebase app, export `db` and `functions`, connect to emulators in dev mode |
| `DynamicForm.tsx` | Pure component: renders name + phone (always) + dynamic FormField[] from business config |
| `QueuePosition.tsx` | Pure component: displays queue number, serving number, people ahead, estimated wait |
| `QueueList.tsx` | Pure component: list of entries with status, highlights customer's own entry |
| `WhatsAppButton.tsx` | Pure component: green button linking to `wa.me` with pre-filled message |
| `useBusinessData.ts` | Hook: real-time Firestore listener on `businesses/{id}`, returns BusinessPublic data |
| `useActiveQueue.ts` | Hook: queries first queue for a business, listens for real-time updates |
| `useQueueEntries.ts` | Hook: real-time listener on entries with status "waiting"/"serving", sorts by queueNumber |
| `useMyEntry.ts` | Hook: queries entries by sessionToken, returns customer's own entry data |
| `JoinQueuePage.tsx` | Page: shows business branding + DynamicForm, calls onCustomerJoin, navigates to status on success |
| `QueueStatusPage.tsx` | Page: combines QueuePosition + WhatsAppButton + QueueList with real-time data from hooks |

---

## Task 1: Vite + React Project Scaffold

**Files:**
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/vite.config.ts`, `apps/web/index.html`, `apps/web/.env.example`, `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/src/index.css`, `apps/web/src/test-setup.ts`, `apps/web/src/firebase.ts`
- Modify: `package.json` (root)
- Delete: `apps/web/.gitkeep`

- [ ] **Step 1: Delete `apps/web/.gitkeep`**

```bash
rm apps/web/.gitkeep
```

- [ ] **Step 2: Create `apps/web/package.json`**

```json
{
  "name": "@eazque/web",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.28.0",
    "firebase": "^11.0.0",
    "@eazque/shared": "*"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.4.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "~5.9.2",
    "vite": "^6.0.0",
    "vitest": "^3.1.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/user-event": "^14.6.0",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 3: Create `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "paths": {
      "@eazque/shared": ["../../packages/shared/src"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `apps/web/vite.config.ts`**

```ts
/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@eazque/shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    passWithNoTests: true,
  },
});
```

- [ ] **Step 5: Create `apps/web/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>eazque</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `apps/web/.env.example`**

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

- [ ] **Step 7: Create `apps/web/src/test-setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 8: Create `apps/web/src/firebase.ts`**

```ts
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

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

if (import.meta.env.DEV) {
  connectFirestoreEmulator(db, "localhost", 8080);
  connectFunctionsEmulator(functions, "localhost", 5001);
}
```

- [ ] **Step 9: Create `apps/web/src/index.css`**

```css
:root {
  --color-primary: #b8926a;
  --color-secondary: #d4b896;
  --color-light-accent: #e8d5be;
  --color-surface: #f5ede3;
  --color-background: #fbf8f4;
  --color-text-dark: #5a4430;
  --color-whatsapp: #25d366;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: var(--color-background);
  color: var(--color-text-dark);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.page-container {
  max-width: 480px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

.page-container h1 {
  text-align: center;
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.business-logo {
  display: block;
  max-width: 80px;
  max-height: 80px;
  margin: 0 auto 0.75rem;
  border-radius: 12px;
}

.loading {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-secondary);
  font-size: 1.1rem;
}

.error {
  text-align: center;
  padding: 3rem 1rem;
  color: #c0392b;
}

.error-message {
  background: #fdecea;
  color: #c0392b;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

/* DynamicForm */
.dynamic-form .form-field {
  margin-bottom: 1rem;
}

.dynamic-form .form-field label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
}

.dynamic-form .form-field input[type="text"],
.dynamic-form .form-field input[type="number"],
.dynamic-form .form-field input[type="tel"],
.dynamic-form .form-field select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-secondary);
  border-radius: 8px;
  background: var(--color-surface);
  font-size: 1rem;
  color: var(--color-text-dark);
}

.dynamic-form .form-field input:focus,
.dynamic-form .form-field select:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: -1px;
}

.dynamic-form .checkbox-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dynamic-form .checkbox-field input[type="checkbox"] {
  width: 1.25rem;
  height: 1.25rem;
  accent-color: var(--color-primary);
}

.submit-button {
  width: 100%;
  padding: 1rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 0.5rem;
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* QueuePosition */
.queue-position {
  text-align: center;
  padding: 1.5rem 0;
}

.queue-position .my-number {
  font-size: 4rem;
  font-weight: 800;
  color: var(--color-primary);
  line-height: 1;
}

.queue-position .your-turn {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-top: 0.5rem;
}

.queue-position .serving-info {
  font-size: 1.1rem;
  margin-top: 0.75rem;
}

.queue-position .ahead-count {
  font-size: 1rem;
  color: var(--color-secondary);
  margin-top: 0.25rem;
}

.queue-position .wait-time {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 0.5rem;
}

/* WhatsAppButton */
.whatsapp-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1rem;
  background: var(--color-whatsapp);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  text-decoration: none;
  margin: 1rem 0;
}

/* QueueList */
.queue-list {
  margin-top: 1.5rem;
}

.queue-list h3 {
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.queue-list ul {
  list-style: none;
}

.queue-list .queue-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  margin-bottom: 0.25rem;
  font-size: 0.95rem;
}

.queue-list .queue-entry.my-entry {
  background: var(--color-light-accent);
  font-weight: 600;
}

.queue-list .queue-entry.serving {
  background: var(--color-surface);
}

.queue-list .entry-status {
  font-size: 0.85rem;
  color: var(--color-secondary);
}

.queue-info {
  text-align: center;
  color: var(--color-secondary);
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}
```

- [ ] **Step 10: Create `apps/web/src/main.tsx`**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

- [ ] **Step 11: Create `apps/web/src/App.tsx`**

```tsx
import { Routes, Route } from "react-router-dom";
import JoinQueuePage from "./pages/JoinQueuePage";
import QueueStatusPage from "./pages/QueueStatusPage";

export default function App() {
  return (
    <Routes>
      <Route path="/q/:businessId" element={<JoinQueuePage />} />
      <Route
        path="/q/:businessId/status/:sessionToken"
        element={<QueueStatusPage />}
      />
    </Routes>
  );
}
```

> JoinQueuePage and QueueStatusPage don't exist yet — create empty placeholder files so the build doesn't fail.

- [ ] **Step 12: Create placeholder pages**

Create `apps/web/src/pages/JoinQueuePage.tsx`:

```tsx
export default function JoinQueuePage() {
  return <div className="page-container">Join Queue (coming soon)</div>;
}
```

Create `apps/web/src/pages/QueueStatusPage.tsx`:

```tsx
export default function QueueStatusPage() {
  return <div className="page-container">Queue Status (coming soon)</div>;
}
```

- [ ] **Step 13: Add root scripts**

Update root `package.json` to add web dev script. Add to the `"scripts"` object:

```json
"dev:web": "npm run dev --workspace=apps/web",
"build:web": "npm run build --workspace=apps/web",
"test:web": "npm run test --workspace=apps/web"
```

- [ ] **Step 14: Install dependencies**

```bash
npm install
```

Expected: installs react, react-dom, react-router-dom, firebase, testing libraries, vite.

- [ ] **Step 15: Verify dev server starts**

```bash
npm run dev:web -- --port 5173 &
sleep 3
curl -s http://localhost:5173 | head -5
kill %1
```

Expected: HTML response containing `<div id="root">`. Kill the dev server after verifying.

Alternatively, just verify the build:

```bash
npm run test:web
```

Expected: Passes (no test files yet, passWithNoTests).

- [ ] **Step 16: Commit**

```bash
git add apps/web/ package.json
git commit -m "feat(web): scaffold Vite + React project with Firebase client SDK, router, and Warm Sand theme"
```

---

## Task 2: DynamicForm Component — TDD

**Files:**
- Create: `apps/web/src/components/DynamicForm.tsx`, `apps/web/src/components/DynamicForm.test.tsx`

- [ ] **Step 1: Write all DynamicForm tests**

Create `apps/web/src/components/DynamicForm.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import DynamicForm from "./DynamicForm";
import type { FormField } from "@eazque/shared";

const defaultProps = {
  fields: [] as FormField[],
  primaryColor: "#B8926A",
  loading: false,
  onSubmit: vi.fn(),
};

describe("DynamicForm", () => {
  it("renders name and phone inputs always", () => {
    render(<DynamicForm {...defaultProps} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
  });

  it("renders text input for text field type", () => {
    const fields: FormField[] = [
      { id: "notes", type: "text", label: "Notes", required: false },
    ];
    render(<DynamicForm {...defaultProps} fields={fields} />);
    const input = screen.getByLabelText(/notes/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
  });

  it("renders select for dropdown field with options", () => {
    const fields: FormField[] = [
      {
        id: "service",
        type: "dropdown",
        label: "Service Type",
        required: true,
        options: ["Haircut", "Shave", "Trim"],
      },
    ];
    render(<DynamicForm {...defaultProps} fields={fields} />);
    const select = screen.getByLabelText(/service type/i);
    expect(select.tagName).toBe("SELECT");
    expect(screen.getByText("Haircut")).toBeInTheDocument();
    expect(screen.getByText("Shave")).toBeInTheDocument();
    expect(screen.getByText("Trim")).toBeInTheDocument();
  });

  it("renders checkbox for checkbox field type", () => {
    const fields: FormField[] = [
      { id: "vip", type: "checkbox", label: "VIP Customer", required: false },
    ];
    render(<DynamicForm {...defaultProps} fields={fields} />);
    expect(screen.getByLabelText(/vip customer/i)).toHaveAttribute(
      "type",
      "checkbox"
    );
  });

  it("calls onSubmit with collected form data", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const fields: FormField[] = [
      { id: "notes", type: "text", label: "Notes", required: false },
    ];
    render(
      <DynamicForm {...defaultProps} fields={fields} onSubmit={onSubmit} />
    );

    await user.type(screen.getByLabelText(/name/i), "John");
    await user.type(screen.getByLabelText(/phone/i), "+60123");
    await user.type(screen.getByLabelText(/notes/i), "Window seat");
    await user.click(screen.getByRole("button", { name: /join queue/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      customerName: "John",
      phone: "+60123",
      formData: { notes: "Window seat" },
    });
  });

  it("shows loading state when submitting", () => {
    render(<DynamicForm {...defaultProps} loading={true} />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Joining...");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:web
```

Expected: FAIL — cannot find module `./DynamicForm`.

- [ ] **Step 3: Implement DynamicForm**

Create `apps/web/src/components/DynamicForm.tsx`:

```tsx
import { useState, type FormEvent } from "react";
import type { FormField } from "@eazque/shared";

interface DynamicFormProps {
  fields: FormField[];
  primaryColor: string;
  loading: boolean;
  onSubmit: (data: {
    customerName: string;
    phone: string;
    formData: Record<string, string | number | boolean>;
  }) => void;
}

export default function DynamicForm({
  fields,
  primaryColor,
  loading,
  onSubmit,
}: DynamicFormProps) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [formData, setFormData] = useState<
    Record<string, string | number | boolean>
  >({});

  const handleFieldChange = (
    fieldId: string,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ customerName, phone, formData });
  };

  return (
    <form onSubmit={handleSubmit} className="dynamic-form">
      <div className="form-field">
        <label htmlFor="customerName">Name *</label>
        <input
          id="customerName"
          type="text"
          required
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Your name"
        />
      </div>

      <div className="form-field">
        <label htmlFor="phone">Phone *</label>
        <input
          id="phone"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Your phone number"
        />
      </div>

      {fields.map((field) => (
        <div key={field.id} className="form-field">
          <label htmlFor={field.id}>
            {field.label}
            {field.required ? " *" : ""}
          </label>
          {renderField(field, formData[field.id], (val) =>
            handleFieldChange(field.id, val)
          )}
        </div>
      ))}

      <button
        type="submit"
        className="submit-button"
        style={{ backgroundColor: primaryColor }}
        disabled={loading}
      >
        {loading ? "Joining..." : "Join Queue"}
      </button>
    </form>
  );
}

function renderField(
  field: FormField,
  value: string | number | boolean | undefined,
  onChange: (val: string | number | boolean) => void
) {
  switch (field.type) {
    case "text":
      return (
        <input
          id={field.id}
          type="text"
          required={field.required}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "number":
      return (
        <input
          id={field.id}
          type="number"
          required={field.required}
          value={(value as number) ?? ""}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      );
    case "phone":
      return (
        <input
          id={field.id}
          type="tel"
          required={field.required}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "dropdown":
      return (
        <select
          id={field.id}
          required={field.required}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select...</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case "checkbox":
      return (
        <div className="checkbox-field">
          <input
            id={field.id}
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />
        </div>
      );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:web
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/DynamicForm.tsx apps/web/src/components/DynamicForm.test.tsx
git commit -m "feat(web): add DynamicForm component with TDD — renders all field types from business config"
```

---

## Task 3: Firebase Hooks

**Files:**
- Create: `apps/web/src/hooks/useBusinessData.ts`, `apps/web/src/hooks/useActiveQueue.ts`, `apps/web/src/hooks/useQueueEntries.ts`, `apps/web/src/hooks/useMyEntry.ts`

- [ ] **Step 1: Create `useBusinessData` hook**

Create `apps/web/src/hooks/useBusinessData.ts`:

```ts
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { BusinessPublic } from "@eazque/shared";

export function useBusinessData(businessId: string) {
  const [business, setBusiness] = useState<BusinessPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "businesses", businessId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setBusiness({
            id: snap.id,
            name: data.name,
            logo: data.logo,
            primaryColor: data.primaryColor,
            whatsappNumber: data.whatsappNumber,
            formFields: data.formFields ?? [],
          });
        } else {
          setError("Business not found");
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [businessId]);

  return { business, loading, error };
}
```

- [ ] **Step 2: Create `useActiveQueue` hook**

Create `apps/web/src/hooks/useActiveQueue.ts`:

```ts
import { useState, useEffect } from "react";
import { collection, query, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { Queue } from "@eazque/shared";

export function useActiveQueue(businessId: string) {
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

- [ ] **Step 3: Create `useQueueEntries` hook**

Create `apps/web/src/hooks/useQueueEntries.ts`:

```ts
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { QueueEntryPublic } from "@eazque/shared";

export function useQueueEntries(
  businessId: string,
  queueId: string | null
) {
  const [entries, setEntries] = useState<QueueEntryPublic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!queueId) return;

    const q = query(
      collection(db, `businesses/${businessId}/queues/${queueId}/entries`),
      where("status", "in", ["waiting", "serving"])
    );
    const unsub = onSnapshot(q, (snap) => {
      const sorted = snap.docs
        .map((d) => ({
          id: d.id,
          queueNumber: d.data().queueNumber as number,
          displayNumber: d.data().displayNumber as string,
          status: d.data().status,
        }))
        .sort((a, b) => a.queueNumber - b.queueNumber);
      setEntries(sorted);
      setLoading(false);
    });
    return unsub;
  }, [businessId, queueId]);

  return { entries, loading };
}
```

- [ ] **Step 4: Create `useMyEntry` hook**

Create `apps/web/src/hooks/useMyEntry.ts`:

```ts
import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

export interface MyEntryData {
  id: string;
  queueNumber: number;
  displayNumber: string;
  status: string;
}

export function useMyEntry(
  businessId: string,
  queueId: string | null,
  sessionToken: string
) {
  const [entry, setEntry] = useState<MyEntryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!queueId) return;

    const q = query(
      collection(db, `businesses/${businessId}/queues/${queueId}/entries`),
      where("sessionToken", "==", sessionToken),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = d.data();
        setEntry({
          id: d.id,
          queueNumber: data.queueNumber,
          displayNumber: data.displayNumber,
          status: data.status,
        });
      }
      setLoading(false);
    });
    return unsub;
  }, [businessId, queueId, sessionToken]);

  return { entry, loading };
}
```

- [ ] **Step 5: Verify typecheck passes**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: No TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/hooks/
git commit -m "feat(web): add Firebase hooks — real-time listeners for business, queue, entries, and customer entry"
```

---

## Task 4: Join Queue Page + WhatsApp Button

**Files:**
- Create: `apps/web/src/components/WhatsAppButton.tsx`, `apps/web/src/pages/JoinQueuePage.tsx` (replace placeholder)

- [ ] **Step 1: Create WhatsAppButton component**

Create `apps/web/src/components/WhatsAppButton.tsx`:

```tsx
interface WhatsAppButtonProps {
  whatsappNumber: string;
  businessName: string;
  displayNumber: string;
}

export default function WhatsAppButton({
  whatsappNumber,
  businessName,
  displayNumber,
}: WhatsAppButtonProps) {
  const message = encodeURIComponent(
    `Hi! I've joined the queue at ${businessName}. My queue number is ${displayNumber}.`
  );
  const href = `https://wa.me/${whatsappNumber}?text=${message}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-button"
    >
      Connect on WhatsApp
    </a>
  );
}
```

- [ ] **Step 2: Implement JoinQueuePage**

Replace `apps/web/src/pages/JoinQueuePage.tsx`:

```tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { useBusinessData } from "../hooks/useBusinessData";
import { useActiveQueue } from "../hooks/useActiveQueue";
import DynamicForm from "../components/DynamicForm";
import type { JoinQueueResponse } from "@eazque/shared";

export default function JoinQueuePage() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { business, loading: bizLoading, error: bizError } = useBusinessData(
    businessId!
  );
  const { queueId, queue, loading: queueLoading } = useActiveQueue(
    businessId!
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (bizLoading || queueLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (bizError || !business) {
    return <div className="error">{bizError || "Business not found"}</div>;
  }

  if (!queue || !queueId) {
    return <div className="error">No active queue found</div>;
  }

  if (queue.status === "paused") {
    return (
      <div className="page-container">
        <h1>{business.name}</h1>
        <p className="queue-info">
          The queue is currently paused. Please check back later.
        </p>
      </div>
    );
  }

  const handleSubmit = async (data: {
    customerName: string;
    phone: string;
    formData: Record<string, string | number | boolean>;
  }) => {
    setSubmitting(true);
    setError(null);
    try {
      const joinQueue = httpsCallable<unknown, JoinQueueResponse>(
        functions,
        "onCustomerJoin"
      );
      const result = await joinQueue({
        businessId,
        queueId,
        ...data,
      });
      navigate(`/q/${businessId}/status/${result.data.sessionToken}`, {
        state: {
          ...result.data,
          businessName: business.name,
          whatsappNumber: business.whatsappNumber,
          primaryColor: business.primaryColor,
        },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to join queue";
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <div
      className="page-container"
      style={
        { "--color-primary": business.primaryColor } as React.CSSProperties
      }
    >
      {business.logo && (
        <img src={business.logo} alt={business.name} className="business-logo" />
      )}
      <h1>{business.name}</h1>
      <p className="queue-info">
        Now serving: Q-{String(queue.currentNumber).padStart(3, "0")} ·{" "}
        {queue.nextNumber - queue.currentNumber - 1} waiting
      </p>
      {error && <div className="error-message">{error}</div>}
      <DynamicForm
        fields={business.formFields}
        primaryColor={business.primaryColor}
        loading={submitting}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify typecheck passes**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: No TypeScript errors.

- [ ] **Step 4: Run existing tests to confirm no regressions**

```bash
npm run test:web
```

Expected: 6 DynamicForm tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/WhatsAppButton.tsx apps/web/src/pages/JoinQueuePage.tsx
git commit -m "feat(web): add JoinQueuePage with DynamicForm submission and WhatsApp button"
```

---

## Task 5: Queue Status Components — TDD

**Files:**
- Create: `apps/web/src/components/QueuePosition.tsx`, `apps/web/src/components/QueuePosition.test.tsx`, `apps/web/src/components/QueueList.tsx`

- [ ] **Step 1: Write QueuePosition tests**

Create `apps/web/src/components/QueuePosition.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import QueuePosition from "./QueuePosition";

const defaultProps = {
  myDisplayNumber: "Q-005",
  myQueueNumber: 5,
  currentNumber: 2,
  avgServiceTime: 10,
  completedCount: 10,
  defaultEstimatedTime: 10,
  myStatus: "waiting",
};

describe("QueuePosition", () => {
  it("displays queue number prominently", () => {
    render(<QueuePosition {...defaultProps} />);
    expect(screen.getByText("Q-005")).toBeInTheDocument();
  });

  it("shows currently serving number", () => {
    render(<QueuePosition {...defaultProps} />);
    expect(screen.getByText(/Q-002/)).toBeInTheDocument();
  });

  it("shows people ahead count", () => {
    render(<QueuePosition {...defaultProps} />);
    // 5 - 2 = 3 ahead
    expect(screen.getByText(/3 ahead of you/)).toBeInTheDocument();
  });

  it("shows estimated wait time", () => {
    render(<QueuePosition {...defaultProps} />);
    // 3 * 10 = 30 min (data-driven, completedCount >= 5)
    expect(screen.getByText(/30 min wait/)).toBeInTheDocument();
  });

  it("shows your turn message when status is serving", () => {
    render(<QueuePosition {...defaultProps} myStatus="serving" />);
    expect(screen.getByText(/your turn/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:web
```

Expected: QueuePosition tests FAIL — module not found.

- [ ] **Step 3: Implement QueuePosition**

Create `apps/web/src/components/QueuePosition.tsx`:

```tsx
import { estimateWaitMinutes, formatDisplayNumber } from "@eazque/shared";

interface QueuePositionProps {
  myDisplayNumber: string;
  myQueueNumber: number;
  currentNumber: number;
  avgServiceTime: number;
  completedCount: number;
  defaultEstimatedTime: number;
  myStatus: string;
}

export default function QueuePosition({
  myDisplayNumber,
  myQueueNumber,
  currentNumber,
  avgServiceTime,
  completedCount,
  defaultEstimatedTime,
  myStatus,
}: QueuePositionProps) {
  const positionInQueue = myQueueNumber - currentNumber;
  const waitMinutes = estimateWaitMinutes({
    positionInQueue,
    avgServiceTime,
    completedCount,
    defaultEstimatedTime,
  });

  const isMyTurn = myStatus === "serving" || positionInQueue <= 0;

  return (
    <div className="queue-position">
      <div className="my-number">{myDisplayNumber}</div>
      {isMyTurn ? (
        <div className="your-turn">It's your turn!</div>
      ) : (
        <>
          <div className="serving-info">
            Now serving: <strong>{formatDisplayNumber(currentNumber)}</strong>
          </div>
          <div className="ahead-count">{positionInQueue} ahead of you</div>
          <div className="wait-time">~{waitMinutes} min wait</div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:web
```

Expected: All 11 tests PASS (6 DynamicForm + 5 QueuePosition).

- [ ] **Step 5: Implement QueueList**

Create `apps/web/src/components/QueueList.tsx`:

```tsx
import type { QueueEntryPublic } from "@eazque/shared";

interface QueueListProps {
  entries: QueueEntryPublic[];
  myQueueNumber: number;
}

export default function QueueList({ entries, myQueueNumber }: QueueListProps) {
  if (entries.length === 0) return null;

  return (
    <div className="queue-list">
      <h3>Queue</h3>
      <ul>
        {entries.map((entry) => (
          <li
            key={entry.id}
            className={`queue-entry${entry.queueNumber === myQueueNumber ? " my-entry" : ""}${entry.status === "serving" ? " serving" : ""}`}
          >
            <span className="entry-number">{entry.displayNumber}</span>
            <span className="entry-status">
              {entry.status === "serving" ? "Serving" : "Waiting"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 6: Verify typecheck**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/QueuePosition.tsx apps/web/src/components/QueuePosition.test.tsx apps/web/src/components/QueueList.tsx
git commit -m "feat(web): add QueuePosition and QueueList components with TDD — position display, wait estimation, entry list"
```

---

## Task 6: Queue Status Page & Final Verification

**Files:**
- Modify: `apps/web/src/pages/QueueStatusPage.tsx` (replace placeholder)

- [ ] **Step 1: Implement QueueStatusPage**

Replace `apps/web/src/pages/QueueStatusPage.tsx`:

```tsx
import { useParams, useLocation } from "react-router-dom";
import { useBusinessData } from "../hooks/useBusinessData";
import { useActiveQueue } from "../hooks/useActiveQueue";
import { useQueueEntries } from "../hooks/useQueueEntries";
import { useMyEntry } from "../hooks/useMyEntry";
import QueuePosition from "../components/QueuePosition";
import QueueList from "../components/QueueList";
import WhatsAppButton from "../components/WhatsAppButton";

interface NavigationState {
  displayNumber?: string;
  queueNumber?: number;
  currentNumber?: number;
  businessName?: string;
  whatsappNumber?: string;
  primaryColor?: string;
  estimatedWaitMinutes?: number;
}

export default function QueueStatusPage() {
  const { businessId, sessionToken } = useParams<{
    businessId: string;
    sessionToken: string;
  }>();
  const location = useLocation();
  const navState = (location.state ?? {}) as NavigationState;

  const { business, loading: bizLoading } = useBusinessData(businessId!);
  const { queue, queueId, loading: queueLoading } = useActiveQueue(
    businessId!
  );
  const { entry, loading: entryLoading } = useMyEntry(
    businessId!,
    queueId,
    sessionToken!
  );
  const { entries } = useQueueEntries(businessId!, queueId);

  const loading = bizLoading || queueLoading || entryLoading;

  if (loading && !navState.displayNumber) {
    return <div className="loading">Loading your queue status...</div>;
  }

  const displayNumber =
    entry?.displayNumber ?? navState.displayNumber ?? "...";
  const queueNumber = entry?.queueNumber ?? navState.queueNumber ?? 0;
  const currentNumber =
    queue?.currentNumber ?? navState.currentNumber ?? 0;
  const myStatus = entry?.status ?? "waiting";
  const whatsappNumber =
    business?.whatsappNumber ?? navState.whatsappNumber ?? "";
  const businessName = business?.name ?? navState.businessName ?? "";
  const primaryColor =
    business?.primaryColor ?? navState.primaryColor ?? "#B8926A";
  const defaultEstimatedTime = 10;

  return (
    <div
      className="page-container"
      style={{ "--color-primary": primaryColor } as React.CSSProperties}
    >
      <h1>{businessName}</h1>
      <QueuePosition
        myDisplayNumber={displayNumber}
        myQueueNumber={queueNumber}
        currentNumber={currentNumber}
        avgServiceTime={queue?.avgServiceTime ?? 0}
        completedCount={queue?.completedCount ?? 0}
        defaultEstimatedTime={defaultEstimatedTime}
        myStatus={myStatus}
      />
      {whatsappNumber && (
        <WhatsAppButton
          whatsappNumber={whatsappNumber}
          businessName={businessName}
          displayNumber={displayNumber}
        />
      )}
      <QueueList entries={entries} myQueueNumber={queueNumber} />
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: No TypeScript errors.

- [ ] **Step 3: Run all web tests**

```bash
npm run test:web
```

Expected: All 11 tests PASS (6 DynamicForm + 5 QueuePosition).

- [ ] **Step 4: Run all project tests to confirm no regressions**

```bash
npm run test:shared && npm run test:functions && npm run test:web
```

Expected:
- shared: 21/21 pass
- functions: 18/18 pass
- web: 11/11 pass

- [ ] **Step 5: Verify web app builds for production**

```bash
npm run build:web
```

Expected: Vite produces `apps/web/dist/` with bundled HTML, JS, and CSS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/QueueStatusPage.tsx
git commit -m "feat(web): add QueueStatusPage with real-time queue status, position display, and WhatsApp integration"
```

---

## Summary

| Task | Tests Added | Components Created | Key Deliverable |
|------|-------------|-------------------|-----------------|
| 1 | 0 | 2 (placeholders) | Vite project scaffold, Firebase client SDK, router, Warm Sand CSS |
| 2 | 6 | 1 | `DynamicForm` — renders all field types from business config |
| 3 | 0 | 0 | 4 Firebase hooks — real-time listeners for business, queue, entries, customer entry |
| 4 | 0 | 2 | `WhatsAppButton` + `JoinQueuePage` — form submission via callable |
| 5 | 5 | 2 | `QueuePosition` + `QueueList` — position display, entry list |
| 6 | 0 | 1 | `QueueStatusPage` — combines all components with live data |

**Total: 11 component tests, 6 React components, 4 custom hooks, 6 commits**

**Routes:**
- `/q/:businessId` → Join queue form with business branding
- `/q/:businessId/status/:sessionToken` → Live queue status with real-time updates
