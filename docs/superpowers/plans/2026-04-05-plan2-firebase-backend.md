# Plan 2: Firebase Backend — Cloud Functions + Firestore Rules

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Firebase Cloud Functions for queue management (join, status changes, daily reset, WhatsApp notifications) and Firestore security rules.

**Architecture:** Firebase Cloud Functions v2 handle all server-side logic. Business logic is extracted into pure functions (`queue-logic.ts`) for testability — handlers are thin wrappers. esbuild bundles functions with `@eazque/shared` code inlined, externalizing only `firebase-admin` and `firebase-functions`. Firestore security rules enforce read/write permissions per the design spec.

**Tech Stack:** Firebase Functions v2, Firebase Admin SDK, esbuild, Vitest, Zod (from @eazque/shared)

---

## File Structure

### New files to create:

```
firebase.json                                    # Firebase project config (emulators, functions source, rules)
.firebaserc                                      # Firebase project aliases
firebase/firestore.rules                         # Firestore security rules
firebase/firestore.indexes.json                  # Composite indexes (empty for now)
firebase/functions/package.json                  # Functions dependencies
firebase/functions/tsconfig.json                 # TypeScript config (type-checking only; esbuild builds)
firebase/functions/.gitignore                    # Ignore lib/ build output
firebase/functions/vitest.config.ts              # Test config
firebase/functions/src/index.ts                  # Entry point — re-exports all Cloud Functions
firebase/functions/src/config.ts                 # Admin SDK initialization, exports db
firebase/functions/src/paths.ts                  # Firestore collection/document path helpers
firebase/functions/src/queue-logic.ts            # Pure business logic (no Firebase deps, fully testable)
firebase/functions/src/on-customer-join.ts       # HTTPS callable — atomic queue join via transaction
firebase/functions/src/on-entry-status-change.ts # Firestore trigger — rolling avg + serving notification
firebase/functions/src/on-current-number-advance.ts # Firestore trigger — approaching notifications
firebase/functions/src/daily-queue-reset.ts      # Scheduled function — midnight counter reset
firebase/functions/src/whatsapp.ts               # WhatsApp Business API notification helper
firebase/functions/__tests__/queue-logic.test.ts # Unit tests for pure business logic
firebase/functions/__tests__/whatsapp.test.ts    # Unit tests for WhatsApp helper (mocked fetch)
```

### Files to modify:

```
package.json              # Add firebase/functions to workspaces, add firebase-related scripts
.gitignore                # Add firebase/functions/lib/
```

### Responsibilities:

| File | Responsibility |
|------|---------------|
| `config.ts` | Initialize Firebase Admin SDK, export `db` Firestore instance |
| `paths.ts` | Type-safe Firestore collection/document path builders |
| `queue-logic.ts` | Pure functions: entry data creation, rolling average, approaching detection, reset data |
| `on-customer-join.ts` | Validate input (Zod), run Firestore transaction, assign queue number atomically, return response |
| `on-entry-status-change.ts` | React to entry status → "completed" (update rolling average) and → "serving"/"skipped" (WhatsApp notify) |
| `on-current-number-advance.ts` | React to currentNumber increase: find approaching customers, send WhatsApp notifications |
| `daily-queue-reset.ts` | Reset all queue counters (currentNumber, nextNumber, completedCount, avgServiceTime) at midnight |
| `whatsapp.ts` | WhatsApp Business API wrapper: build template message, POST to Meta API, fail silently if unconfigured |

---

## Task 1: Firebase Project & Cloud Functions Scaffold

**Files:**
- Create: `firebase.json`, `.firebaserc`, `firebase/firestore.rules`, `firebase/firestore.indexes.json`, `firebase/functions/package.json`, `firebase/functions/tsconfig.json`, `firebase/functions/.gitignore`, `firebase/functions/vitest.config.ts`, `firebase/functions/src/config.ts`, `firebase/functions/src/paths.ts`, `firebase/functions/src/index.ts`
- Modify: `package.json`, `.gitignore`
- Delete: `firebase/.gitkeep`

- [ ] **Step 1: Create `firebase.json` at project root**

```json
{
  "functions": {
    "source": "firebase/functions",
    "predeploy": ["npm --prefix firebase/functions run build"]
  },
  "firestore": {
    "rules": "firebase/firestore.rules",
    "indexes": "firebase/firestore.indexes.json"
  },
  "emulators": {
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

- [ ] **Step 2: Create `.firebaserc` at project root**

```json
{
  "projects": {
    "default": "eazque-dev"
  }
}
```

> The project ID `eazque-dev` is a placeholder. Replace with the actual Firebase project ID when created.

- [ ] **Step 3: Create placeholder `firebase/firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

> Full rules are implemented in Task 7. This placeholder denies all access.

- [ ] **Step 4: Create `firebase/firestore.indexes.json`**

```json
{
  "indexes": [],
  "fieldOverrides": []
}
```

- [ ] **Step 5: Delete `firebase/.gitkeep`**

```bash
rm firebase/.gitkeep
```

- [ ] **Step 6: Create `firebase/functions/package.json`**

```json
{
  "name": "@eazque/functions",
  "version": "1.0.0",
  "private": true,
  "main": "lib/index.js",
  "engines": {
    "node": "20"
  },
  "scripts": {
    "build": "esbuild src/index.ts --bundle --platform=node --target=node20 --outdir=lib --format=cjs --sourcemap --external:firebase-admin --external:firebase-functions",
    "build:watch": "npm run build -- --watch",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0"
  },
  "devDependencies": {
    "esbuild": "^0.24.0",
    "typescript": "~5.9.2",
    "vitest": "^3.1.0",
    "@eazque/shared": "*"
  }
}
```

> `@eazque/shared` is a workspace dependency (devDependencies because esbuild inlines it at build time — it's not needed at runtime in node_modules).

- [ ] **Step 7: Create `firebase/functions/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "lib",
    "rootDir": "src",
    "paths": {
      "@eazque/shared": ["../../packages/shared/src"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "lib", "__tests__"]
}
```

> Extends the root base config (ES2020, strict, bundler resolution). `paths` lets TypeScript resolve `@eazque/shared` for type-checking. esbuild handles the actual bundling.

- [ ] **Step 8: Create `firebase/functions/.gitignore`**

```
lib/
```

- [ ] **Step 9: Create `firebase/functions/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@eazque/shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
});
```

- [ ] **Step 10: Create `firebase/functions/src/config.ts`**

```ts
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = initializeApp();
export const db = getFirestore(app);
```

- [ ] **Step 11: Create `firebase/functions/src/paths.ts`**

```ts
export const paths = {
  business: (businessId: string) =>
    `businesses/${businessId}`,
  staff: (businessId: string) =>
    `businesses/${businessId}/staff`,
  staffMember: (businessId: string, staffId: string) =>
    `businesses/${businessId}/staff/${staffId}`,
  queues: (businessId: string) =>
    `businesses/${businessId}/queues`,
  queue: (businessId: string, queueId: string) =>
    `businesses/${businessId}/queues/${queueId}`,
  entries: (businessId: string, queueId: string) =>
    `businesses/${businessId}/queues/${queueId}/entries`,
  entry: (businessId: string, queueId: string, entryId: string) =>
    `businesses/${businessId}/queues/${queueId}/entries/${entryId}`,
} as const;
```

- [ ] **Step 12: Create `firebase/functions/src/index.ts`**

```ts
// Cloud Function exports — added as each function is implemented
```

- [ ] **Step 13: Update root `package.json` — add workspace and scripts**

Add `"firebase/functions"` to the `workspaces` array and add firebase-related scripts:

```json
{
  "name": "eazque",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*",
    "firebase/functions"
  ],
  "scripts": {
    "test:shared": "npm run test --workspace=packages/shared",
    "test:functions": "npm run test --workspace=firebase/functions",
    "build:functions": "npm run build --workspace=firebase/functions",
    "typecheck:functions": "npm run typecheck --workspace=firebase/functions",
    "lint": "echo \"No linter configured yet\""
  }
}
```

- [ ] **Step 14: Update `.gitignore` — add functions build output**

Append to the `# Firebase` section:

```
# Firebase
firebase/functions/lib/
```

> `firebase/functions/lib/` was already covered conceptually by `firebase/functions/.gitignore`, but adding it here ensures root-level coverage.

- [ ] **Step 15: Install dependencies and verify**

```bash
npm install
```

Expected: installs firebase-admin, firebase-functions, esbuild in firebase/functions, symlinks @eazque/shared.

```bash
npm run build:functions
```

Expected: esbuild creates `firebase/functions/lib/index.js` (nearly empty — just the comment).

```bash
npm run typecheck:functions
```

Expected: `tsc --noEmit` passes with no errors.

- [ ] **Step 16: Commit**

```bash
git add firebase.json .firebaserc firebase/ package.json .gitignore
git commit -m "feat(firebase): scaffold Cloud Functions project with esbuild build pipeline"
```

---

## Task 2: Queue Business Logic — TDD

**Files:**
- Create: `firebase/functions/src/queue-logic.ts`, `firebase/functions/__tests__/queue-logic.test.ts`

- [ ] **Step 1: Write failing tests for `createQueueEntryData`**

Create `firebase/functions/__tests__/queue-logic.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  createQueueEntryData,
  calculateNewAverage,
  findApproachingEntries,
  buildQueueResetData,
} from "../src/queue-logic";

describe("createQueueEntryData", () => {
  it("creates entry with correct queue number and display number", () => {
    const entry = createQueueEntryData(
      1,
      "John Doe",
      "+60123456789",
      {},
      "session-abc-123"
    );

    expect(entry.queueNumber).toBe(1);
    expect(entry.displayNumber).toBe("Q-001");
    expect(entry.status).toBe("waiting");
    expect(entry.customerName).toBe("John Doe");
    expect(entry.phone).toBe("+60123456789");
    expect(entry.sessionToken).toBe("session-abc-123");
    expect(entry.servedAt).toBeNull();
    expect(entry.completedAt).toBeNull();
    expect(entry.notes).toBe("");
  });

  it("formats multi-digit queue numbers correctly", () => {
    const entry = createQueueEntryData(42, "Jane", "+1", {}, "t");
    expect(entry.displayNumber).toBe("Q-042");
  });

  it("formats queue numbers beyond 3 digits", () => {
    const entry = createQueueEntryData(1234, "Test", "+1", {}, "t");
    expect(entry.displayNumber).toBe("Q-1234");
  });

  it("preserves form data", () => {
    const formData = { field1: "value1", field2: 42, field3: true };
    const entry = createQueueEntryData(1, "Test", "+1", formData, "t");
    expect(entry.formData).toEqual(formData);
  });
});
```

- [ ] **Step 2: Write failing tests for `calculateNewAverage`**

Append to the same test file:

```ts
describe("calculateNewAverage", () => {
  it("returns duration as average for first completion", () => {
    const result = calculateNewAverage(0, 0, 5);
    expect(result.newAvg).toBe(5);
    expect(result.newCount).toBe(1);
  });

  it("calculates weighted average for subsequent completions", () => {
    // (10 * 4 + 5) / 5 = 45 / 5 = 9
    const result = calculateNewAverage(10, 4, 5);
    expect(result.newAvg).toBe(9);
    expect(result.newCount).toBe(5);
  });

  it("caps count at rolling window size of 20", () => {
    // effectiveCount = min(20, 20) = 20
    // (10 * 20 + 30) / 21 = 230 / 21 ≈ 10.95
    const result = calculateNewAverage(10, 20, 30);
    expect(result.newAvg).toBeCloseTo(10.95, 1);
    expect(result.newCount).toBe(20);
  });

  it("handles zero duration service", () => {
    // (10 * 5 + 0) / 6 = 50 / 6 ≈ 8.33
    const result = calculateNewAverage(10, 5, 0);
    expect(result.newAvg).toBeCloseTo(8.33, 1);
    expect(result.newCount).toBe(6);
  });

  it("handles count already beyond window", () => {
    // Same as at window — effectiveCount capped at 20
    const result = calculateNewAverage(10, 25, 10);
    expect(result.newAvg).toBe(10);
    expect(result.newCount).toBe(20);
  });
});
```

- [ ] **Step 3: Write failing tests for `findApproachingEntries`**

Append to the same test file:

```ts
describe("findApproachingEntries", () => {
  const entries = [
    { queueNumber: 3, phone: "+1" },
    { queueNumber: 5, phone: "+2" },
    { queueNumber: 6, phone: "+3" },
    { queueNumber: 7, phone: "+4" },
    { queueNumber: 10, phone: "+5" },
  ];

  it("returns entries within threshold of current number", () => {
    // currentNumber = 4, threshold = 3 → entries with queueNumber 5, 6, 7
    const result = findApproachingEntries(4, 3, entries);
    expect(result).toEqual([
      { queueNumber: 5, phone: "+2" },
      { queueNumber: 6, phone: "+3" },
      { queueNumber: 7, phone: "+4" },
    ]);
  });

  it("excludes entries at or below current number", () => {
    const result = findApproachingEntries(5, 2, entries);
    expect(result).toEqual([
      { queueNumber: 6, phone: "+3" },
      { queueNumber: 7, phone: "+4" },
    ]);
  });

  it("returns empty array when no entries are approaching", () => {
    const result = findApproachingEntries(10, 3, entries);
    expect(result).toEqual([]);
  });

  it("returns empty array for empty entries list", () => {
    const result = findApproachingEntries(1, 3, []);
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 4: Write failing test for `buildQueueResetData`**

Append to the same test file:

```ts
describe("buildQueueResetData", () => {
  it("returns correct reset values with date", () => {
    const result = buildQueueResetData("2026-04-05");
    expect(result).toEqual({
      currentNumber: 0,
      nextNumber: 1,
      completedCount: 0,
      avgServiceTime: 0,
      date: "2026-04-05",
    });
  });
});
```

- [ ] **Step 5: Run tests to verify they fail**

```bash
cd firebase/functions && npx vitest run
```

Expected: All tests FAIL with `"queue-logic" is not a module` or similar import error.

- [ ] **Step 6: Implement `queue-logic.ts`**

Create `firebase/functions/src/queue-logic.ts`:

```ts
import { formatDisplayNumber, ROLLING_AVERAGE_WINDOW } from "@eazque/shared";

export function createQueueEntryData(
  nextNumber: number,
  customerName: string,
  phone: string,
  formData: Record<string, string | number | boolean>,
  sessionToken: string
) {
  return {
    queueNumber: nextNumber,
    displayNumber: formatDisplayNumber(nextNumber),
    status: "waiting" as const,
    customerName,
    phone,
    formData,
    notes: "",
    sessionToken,
    servedAt: null,
    completedAt: null,
  };
}

export interface RollingAverageResult {
  newAvg: number;
  newCount: number;
}

export function calculateNewAverage(
  currentAvg: number,
  completedCount: number,
  serviceDurationMinutes: number
): RollingAverageResult {
  const effectiveCount = Math.min(completedCount, ROLLING_AVERAGE_WINDOW);
  const total = currentAvg * effectiveCount + serviceDurationMinutes;
  const newAvg = Math.round((total / (effectiveCount + 1)) * 100) / 100;
  const newCount = Math.min(completedCount + 1, ROLLING_AVERAGE_WINDOW);
  return { newAvg, newCount };
}

export function findApproachingEntries<
  T extends { queueNumber: number; phone: string },
>(currentNumber: number, threshold: number, waitingEntries: T[]): T[] {
  return waitingEntries.filter(
    (entry) =>
      entry.queueNumber > currentNumber &&
      entry.queueNumber <= currentNumber + threshold
  );
}

export function buildQueueResetData(date: string) {
  return {
    currentNumber: 0,
    nextNumber: 1,
    completedCount: 0,
    avgServiceTime: 0,
    date,
  };
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd firebase/functions && npx vitest run
```

Expected: All 14 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add firebase/functions/src/queue-logic.ts firebase/functions/__tests__/queue-logic.test.ts
git commit -m "feat(functions): add queue business logic with TDD — entry creation, rolling average, approaching detection, reset"
```

---

## Task 3: WhatsApp Notification Helper — TDD

**Files:**
- Create: `firebase/functions/src/whatsapp.ts`, `firebase/functions/__tests__/whatsapp.test.ts`

- [ ] **Step 1: Write failing tests for `sendWhatsAppNotification`**

Create `firebase/functions/__tests__/whatsapp.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendWhatsAppNotification } from "../src/whatsapp";

describe("sendWhatsAppNotification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends POST request to WhatsApp API with correct template", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    await sendWhatsAppNotification({
      apiKey: "test-api-key",
      phoneNumberId: "12345",
      to: "+60123456789",
      template: "your_turn",
      params: { businessName: "Test Cafe", displayNumber: "Q-001" },
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("graph.facebook.com");
    expect(url).toContain("12345");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer test-api-key");

    const body = JSON.parse(options.body);
    expect(body.messaging_product).toBe("whatsapp");
    expect(body.to).toBe("+60123456789");
    expect(body.template.name).toBe("your_turn");
    expect(body.template.components[0].parameters).toEqual([
      { type: "text", text: "Test Cafe" },
      { type: "text", text: "Q-001" },
    ]);
  });

  it("does not throw on API error response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      sendWhatsAppNotification({
        apiKey: "bad-key",
        phoneNumberId: "12345",
        to: "+1",
        template: "your_turn",
        params: { businessName: "Test", displayNumber: "Q-001" },
      })
    ).resolves.toBeUndefined();
  });

  it("does not throw on network error", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      sendWhatsAppNotification({
        apiKey: "key",
        phoneNumberId: "12345",
        to: "+1",
        template: "approaching",
        params: { businessName: "Test", displayNumber: "Q-001" },
      })
    ).resolves.toBeUndefined();
  });

  it("supports all three template types", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    for (const template of ["your_turn", "approaching", "skipped"] as const) {
      await sendWhatsAppNotification({
        apiKey: "key",
        phoneNumberId: "12345",
        to: "+1",
        template,
        params: { businessName: "Cafe", displayNumber: "Q-005" },
      });
    }

    expect(mockFetch).toHaveBeenCalledTimes(3);
    const templateNames = mockFetch.mock.calls.map(
      ([, opts]: [string, RequestInit]) =>
        JSON.parse(opts.body as string).template.name
    );
    expect(templateNames).toEqual(["your_turn", "approaching", "skipped"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd firebase/functions && npx vitest run __tests__/whatsapp.test.ts
```

Expected: FAIL — module `../src/whatsapp` not found.

- [ ] **Step 3: Implement `whatsapp.ts`**

Create `firebase/functions/src/whatsapp.ts`:

```ts
export interface WhatsAppNotificationParams {
  apiKey: string;
  phoneNumberId: string;
  to: string;
  template: "your_turn" | "approaching" | "skipped";
  params: {
    businessName: string;
    displayNumber: string;
  };
}

export async function sendWhatsAppNotification(
  notification: WhatsAppNotificationParams
): Promise<void> {
  const { apiKey, phoneNumberId, to, template, params } = notification;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: template,
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: params.businessName },
                  { type: "text", text: params.displayNumber },
                ],
              },
            ],
          },
        }),
      }
    );

    if (!response.ok) {
      console.error(
        `WhatsApp API error: ${response.status} ${await response.text()}`
      );
    }
  } catch (error) {
    // Fail silently — WhatsApp notifications are optional (Layer 2)
    console.error("WhatsApp notification failed:", error);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd firebase/functions && npx vitest run __tests__/whatsapp.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
cd firebase/functions && npx vitest run
```

Expected: All 18 tests PASS (14 queue-logic + 4 whatsapp).

- [ ] **Step 6: Commit**

```bash
git add firebase/functions/src/whatsapp.ts firebase/functions/__tests__/whatsapp.test.ts
git commit -m "feat(functions): add WhatsApp notification helper with TDD — template messages, silent failure"
```

---

## Task 4: `onCustomerJoin` Callable Function

**Files:**
- Create: `firebase/functions/src/on-customer-join.ts`
- Modify: `firebase/functions/src/index.ts`

- [ ] **Step 1: Implement `on-customer-join.ts`**

Create `firebase/functions/src/on-customer-join.ts`:

```ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";
import { joinQueueRequestSchema, estimateWaitMinutes } from "@eazque/shared";
import { db } from "./config";
import { paths } from "./paths";
import { createQueueEntryData } from "./queue-logic";

export const onCustomerJoin = onCall(async (request) => {
  const parsed = joinQueueRequestSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid request data",
      parsed.error.flatten()
    );
  }

  const { businessId, queueId, customerName, phone, formData } = parsed.data;
  const businessRef = db.doc(paths.business(businessId));
  const queueRef = db.doc(paths.queue(businessId, queueId));
  const entriesCol = db.collection(paths.entries(businessId, queueId));

  const result = await db.runTransaction(async (transaction) => {
    const [businessSnap, queueSnap] = await Promise.all([
      transaction.get(businessRef),
      transaction.get(queueRef),
    ]);

    if (!businessSnap.exists) {
      throw new HttpsError("not-found", "Business not found");
    }
    if (!queueSnap.exists) {
      throw new HttpsError("not-found", "Queue not found");
    }

    const business = businessSnap.data()!;
    const queue = queueSnap.data()!;

    if (queue.status === "paused") {
      throw new HttpsError("failed-precondition", "Queue is currently paused");
    }

    const nextNumber: number = queue.nextNumber;
    const sessionToken = crypto.randomUUID();

    const entryData = createQueueEntryData(
      nextNumber,
      customerName,
      phone,
      formData,
      sessionToken
    );

    const entryRef = entriesCol.doc();
    transaction.set(entryRef, {
      ...entryData,
      joinedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(queueRef, { nextNumber: nextNumber + 1 });

    const positionInQueue = nextNumber - queue.currentNumber;
    const estimatedWaitMinutes = estimateWaitMinutes({
      positionInQueue,
      avgServiceTime: queue.avgServiceTime,
      completedCount: queue.completedCount,
      defaultEstimatedTime: business.defaultEstimatedTimePerCustomer,
    });

    return {
      entryId: entryRef.id,
      queueNumber: nextNumber,
      displayNumber: entryData.displayNumber,
      sessionToken,
      currentNumber: queue.currentNumber,
      estimatedWaitMinutes,
    };
  });

  return result;
});
```

- [ ] **Step 2: Export from `index.ts`**

Replace `firebase/functions/src/index.ts` contents:

```ts
export { onCustomerJoin } from "./on-customer-join";
```

- [ ] **Step 3: Verify build succeeds**

```bash
npm run build:functions
```

Expected: esbuild produces `firebase/functions/lib/index.js` containing the bundled function code. No errors.

- [ ] **Step 4: Verify type-checking passes**

```bash
npm run typecheck:functions
```

Expected: `tsc --noEmit` passes with no errors.

- [ ] **Step 5: Commit**

```bash
git add firebase/functions/src/on-customer-join.ts firebase/functions/src/index.ts
git commit -m "feat(functions): add onCustomerJoin callable — atomic queue number assignment via Firestore transaction"
```

---

## Task 5: Firestore Trigger Functions

**Files:**
- Create: `firebase/functions/src/on-entry-status-change.ts`, `firebase/functions/src/on-current-number-advance.ts`
- Modify: `firebase/functions/src/index.ts`

- [ ] **Step 1: Implement `on-entry-status-change.ts`**

Create `firebase/functions/src/on-entry-status-change.ts`:

```ts
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { db } from "./config";
import { paths } from "./paths";
import { calculateNewAverage } from "./queue-logic";
import { sendWhatsAppNotification } from "./whatsapp";

export const onEntryStatusChange = onDocumentUpdated(
  "businesses/{businessId}/queues/{queueId}/entries/{entryId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after || before.status === after.status) return;

    const { businessId, queueId } = event.params;
    const newStatus: string = after.status;

    // Status → "completed": update rolling average on queue
    if (newStatus === "completed" && after.servedAt && after.completedAt) {
      const servedAt = after.servedAt.toDate();
      const completedAt = after.completedAt.toDate();
      const durationMinutes =
        (completedAt.getTime() - servedAt.getTime()) / 60000;

      const queueRef = db.doc(paths.queue(businessId, queueId));
      const queueSnap = await queueRef.get();
      if (!queueSnap.exists) return;
      const queue = queueSnap.data()!;

      const { newAvg, newCount } = calculateNewAverage(
        queue.avgServiceTime,
        queue.completedCount,
        durationMinutes
      );

      await queueRef.update({
        avgServiceTime: newAvg,
        completedCount: newCount,
      });
    }

    // Status → "serving" or "skipped": send WhatsApp notification
    if (newStatus === "serving" || newStatus === "skipped") {
      const businessSnap = await db.doc(paths.business(businessId)).get();
      const business = businessSnap.data();
      if (!business?.whatsappApiKey || !business?.whatsappPhoneNumberId) return;
      if (!after.phone) return;

      const template = newStatus === "serving" ? "your_turn" : "skipped";
      await sendWhatsAppNotification({
        apiKey: business.whatsappApiKey,
        phoneNumberId: business.whatsappPhoneNumberId,
        to: after.phone,
        template,
        params: {
          businessName: business.name,
          displayNumber: after.displayNumber,
        },
      });
    }
  }
);
```

- [ ] **Step 2: Implement `on-current-number-advance.ts`**

Create `firebase/functions/src/on-current-number-advance.ts`:

```ts
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { db } from "./config";
import { paths } from "./paths";
import { findApproachingEntries } from "./queue-logic";
import { sendWhatsAppNotification } from "./whatsapp";

export const onCurrentNumberAdvance = onDocumentUpdated(
  "businesses/{businessId}/queues/{queueId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    // Only react to currentNumber increases (not resets or other updates)
    if (after.currentNumber <= before.currentNumber) return;

    const { businessId, queueId } = event.params;

    const businessSnap = await db.doc(paths.business(businessId)).get();
    const business = businessSnap.data();
    if (!business?.whatsappApiKey || !business?.whatsappPhoneNumberId) return;

    // Get all waiting entries
    const entriesSnap = await db
      .collection(paths.entries(businessId, queueId))
      .where("status", "==", "waiting")
      .get();

    const waitingEntries = entriesSnap.docs.map((doc) => ({
      queueNumber: doc.data().queueNumber as number,
      phone: doc.data().phone as string,
      displayNumber: doc.data().displayNumber as string,
    }));

    const approaching = findApproachingEntries(
      after.currentNumber,
      business.approachingThreshold ?? 3,
      waitingEntries
    );

    await Promise.all(
      approaching.map((entry) =>
        sendWhatsAppNotification({
          apiKey: business.whatsappApiKey,
          phoneNumberId: business.whatsappPhoneNumberId,
          to: entry.phone,
          template: "approaching",
          params: {
            businessName: business.name,
            displayNumber: entry.displayNumber,
          },
        })
      )
    );
  }
);
```

- [ ] **Step 3: Update `index.ts` to export new functions**

Replace `firebase/functions/src/index.ts`:

```ts
export { onCustomerJoin } from "./on-customer-join";
export { onEntryStatusChange } from "./on-entry-status-change";
export { onCurrentNumberAdvance } from "./on-current-number-advance";
```

- [ ] **Step 4: Verify build succeeds**

```bash
npm run build:functions
```

Expected: esbuild produces `firebase/functions/lib/index.js` with all three functions. No errors.

- [ ] **Step 5: Verify type-checking passes**

```bash
npm run typecheck:functions
```

Expected: No TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add firebase/functions/src/on-entry-status-change.ts firebase/functions/src/on-current-number-advance.ts firebase/functions/src/index.ts
git commit -m "feat(functions): add Firestore triggers — rolling average on completion, WhatsApp notifications on serve/skip/approach"
```

---

## Task 6: Scheduled Reset & Function Index

**Files:**
- Create: `firebase/functions/src/daily-queue-reset.ts`
- Modify: `firebase/functions/src/index.ts`

- [ ] **Step 1: Implement `daily-queue-reset.ts`**

Create `firebase/functions/src/daily-queue-reset.ts`:

```ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db } from "./config";
import { buildQueueResetData } from "./queue-logic";

export const dailyQueueReset = onSchedule("every day 00:00", async () => {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const resetData = buildQueueResetData(today);

  const businessesSnap = await db.collection("businesses").get();

  for (const businessDoc of businessesSnap.docs) {
    const queuesSnap = await db
      .collection(`businesses/${businessDoc.id}/queues`)
      .get();

    if (queuesSnap.empty) continue;

    const batch = db.batch();
    for (const queueDoc of queuesSnap.docs) {
      batch.update(queueDoc.ref, resetData);
    }
    await batch.commit();
  }
});
```

- [ ] **Step 2: Update `index.ts` with all exports**

Replace `firebase/functions/src/index.ts`:

```ts
export { onCustomerJoin } from "./on-customer-join";
export { onEntryStatusChange } from "./on-entry-status-change";
export { onCurrentNumberAdvance } from "./on-current-number-advance";
export { dailyQueueReset } from "./daily-queue-reset";
```

- [ ] **Step 3: Verify build succeeds**

```bash
npm run build:functions
```

Expected: esbuild succeeds. All four functions bundled into `lib/index.js`.

- [ ] **Step 4: Verify type-checking passes**

```bash
npm run typecheck:functions
```

Expected: No TypeScript errors.

- [ ] **Step 5: Run all unit tests**

```bash
npm run test:functions
```

Expected: All 18 tests PASS (14 queue-logic + 4 whatsapp).

- [ ] **Step 6: Commit**

```bash
git add firebase/functions/src/daily-queue-reset.ts firebase/functions/src/index.ts
git commit -m "feat(functions): add daily queue reset scheduled function — midnight counter reset for all businesses"
```

---

## Task 7: Firestore Security Rules & Final Verification

**Files:**
- Modify: `firebase/firestore.rules`

- [ ] **Step 1: Implement Firestore security rules**

Replace `firebase/firestore.rules`:

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
      // Public read for customer-facing fields (name, logo, primaryColor, formFields, whatsappNumber)
      // Note: whatsappApiKey is in this doc — a known limitation for MVP.
      // Production should move sensitive fields to a private subcollection.
      allow read: if true;
      allow create: if isAuth();
      allow update: if isBusinessOwner(businessId);
      allow delete: if false;

      // Staff subcollection
      match /staff/{staffId} {
        allow read: if isBusinessStaff(businessId);
        allow create: if isBusinessOwner(businessId);
        allow update: if isBusinessOwner(businessId);
        allow delete: if isBusinessOwner(businessId);
      }

      // Queue subcollection
      match /queues/{queueId} {
        allow read: if true;
        allow write: if isBusinessStaff(businessId);

        // Entry subcollection
        match /entries/{entryId} {
          // Public read: allows customer web app to show queue list
          // Note: exposes customerName/phone — production should restrict to
          // staff + entry owner (via anonymous auth UID match).
          allow read: if true;
          // Only Cloud Functions can create entries (onCustomerJoin)
          allow create: if false;
          // Staff can update entries (status changes: serving, completed, skipped)
          allow update: if isBusinessStaff(businessId);
          // Only owner can delete entries
          allow delete: if isBusinessOwner(businessId);
        }
      }
    }

    // Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 2: Verify full build pipeline**

```bash
npm run build:functions && npm run typecheck:functions && npm run test:functions
```

Expected:
- esbuild: `lib/index.js` produced
- tsc: no type errors
- vitest: 18/18 tests pass

- [ ] **Step 3: Run shared package tests to confirm no regressions**

```bash
npm run test:shared
```

Expected: All 21 shared package tests pass (12 schemas + 9 utils).

- [ ] **Step 4: Verify the rules file is syntactically valid**

```bash
cat firebase/firestore.rules | head -5
```

Expected: Displays `rules_version = '2';` and the beginning of the rules.

> Full rules validation requires the Firebase emulator or `firebase deploy --only firestore:rules --dry-run`. For now, syntax verification is sufficient. Emulator-based rules testing is deferred to a later plan when the emulator environment is set up.

- [ ] **Step 5: Commit**

```bash
git add firebase/firestore.rules
git commit -m "feat(firebase): add Firestore security rules — public read, staff write, owner admin, entry creation via functions only"
```

---

## Security Notes

**Known MVP limitations (documented, to address in future plans):**

1. **`whatsappApiKey` in business doc**: Currently stored in the main business document which has public read. Production should move to `businesses/{id}/private/config` (admin SDK only).

2. **Entry PII publicly readable**: Customer name, phone, and form data are in entry documents with public read. Production should either:
   - Split into `entries/` (staff-only) and `publicEntries/` (public: queueNumber, displayNumber, status)
   - Or use Firebase Anonymous Auth with UID-based rules for entry owner access

3. **No rate limiting on `onCustomerJoin`**: The callable function has no rate limiting. Add per-IP or per-phone throttling before public launch.

These are intentional scope decisions for the MVP — the code is structured to support these improvements without major refactoring.

---

## Summary

| Task | Tests Added | Functions Created | Key Deliverable |
|------|-------------|-------------------|-----------------|
| 1 | 0 | 0 | Project scaffold, esbuild pipeline, Firestore path helpers |
| 2 | 14 | 4 | `queue-logic.ts` — all pure business logic, fully tested |
| 3 | 4 | 1 | `whatsapp.ts` — WhatsApp API wrapper, silent failure |
| 4 | 0 | 1 | `onCustomerJoin` — atomic queue join with Firestore transaction |
| 5 | 0 | 2 | `onEntryStatusChange` + `onCurrentNumberAdvance` triggers |
| 6 | 0 | 1 | `dailyQueueReset` scheduled function |
| 7 | 0 | 0 | Firestore security rules, full pipeline verification |

**Total: 18 unit tests, 5 Cloud Functions, 1 security rules file, 7 commits**
