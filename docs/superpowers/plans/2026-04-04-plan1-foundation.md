# Plan 1: Foundation — Monorepo + Shared Package

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the existing Expo project into a monorepo with npm workspaces, and create the shared package with all types, Zod validation schemas, constants, and utility functions.

**Architecture:** npm workspaces monorepo with three packages: `apps/mobile` (existing Expo app, relocated), `apps/web` (placeholder for Plan 3), `packages/shared` (types, schemas, utils). The shared package is a TypeScript library consumed by both apps and by Firebase Cloud Functions (Plan 2).

**Tech Stack:** TypeScript, Zod, Vitest, npm workspaces

---

## File Structure

```
eazque/
├── apps/
│   ├── mobile/                    # Existing Expo app relocated here
│   │   ├── App.tsx
│   │   ├── app.json
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── index.ts
│   │   └── assets/
│   └── web/                       # Placeholder — built in Plan 3
│       └── .gitkeep
├── packages/
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── src/
│           ├── index.ts           # Barrel export
│           ├── types.ts           # All Firestore document types
│           ├── schemas.ts         # Zod validation schemas
│           ├── constants.ts       # Field types, queue statuses, defaults
│           └── utils.ts           # displayNumber, estimateWaitTime
├── packages/
│   └── shared/
│       └── __tests__/
│           ├── schemas.test.ts
│           └── utils.test.ts
���── firebase/                      # Placeholder — built in Plan 2
│   └── .gitkeep
├── package.json                   # Workspace root
├── tsconfig.base.json             # Shared TS config
└── .gitignore
```

---

### Task 1: Restructure into monorepo with npm workspaces

**Files:**
- Create: `package.json` (root, replaces existing)
- Create: `tsconfig.base.json`
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/tsconfig.json`
- Move: `App.tsx`, `index.ts`, `app.json`, `assets/` → `apps/mobile/`
- Create: `apps/web/.gitkeep`
- Create: `firebase/.gitkeep`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Modify: `.gitignore`

- [ ] **Step 1: Create the root workspace package.json**

Replace the existing `package.json` with a workspace root:

```json
{
  "name": "eazque",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "test:shared": "npm run test --workspace=packages/shared",
    "lint": "echo \"No linter configured yet\""
  }
}
```

- [ ] **Step 2: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 3: Move existing Expo app into apps/mobile/**

```bash
mkdir -p apps/mobile apps/web firebase
mv App.tsx index.ts app.json assets apps/mobile/
mv tsconfig.json apps/mobile/tsconfig.json
touch apps/web/.gitkeep firebase/.gitkeep
```

- [ ] **Step 4: Create apps/mobile/package.json**

```json
{
  "name": "@eazque/mobile",
  "version": "1.0.0",
  "private": true,
  "main": "index.ts",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "@eazque/shared": "*",
    "expo": "~54.0.33",
    "expo-status-bar": "~3.0.9",
    "react": "19.1.0",
    "react-native": "0.81.5"
  },
  "devDependencies": {
    "@types/react": "~19.1.0",
    "typescript": "~5.9.2"
  }
}
```

- [ ] **Step 5: Update apps/mobile/tsconfig.json**

Replace the Expo-inherited config with one that extends the base:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "paths": {
      "@eazque/shared": ["../../packages/shared/src"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 6: Create packages/shared/package.json**

```json
{
  "name": "@eazque/shared",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "vitest": "^3.1.0",
    "typescript": "~5.9.2"
  }
}
```

- [ ] **Step 7: Create packages/shared/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts", "__tests__/**/*.ts"]
}
```

- [ ] **Step 8: Update .gitignore**

Append these lines to the existing `.gitignore`:

```
# Monorepo
node_modules/
dist/
.superpowers/

# Firebase
firebase/functions/lib/
```

- [ ] **Step 9: Delete old root node_modules and reinstall**

```bash
rm -rf node_modules package-lock.json
npm install
```

Expected: installs all workspaces, creates hoisted `node_modules` at root.

- [ ] **Step 10: Verify Expo app still works**

```bash
cd apps/mobile && npx expo doctor
```

Expected: no critical errors. Some warnings about missing native modules are fine.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor: restructure into npm workspaces monorepo"
```

---

### Task 2: Define shared types

**Files:**
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/constants.ts`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Create packages/shared/src/constants.ts**

```typescript
export const FIELD_TYPES = ["text", "number", "phone", "dropdown", "checkbox"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const ENTRY_STATUSES = ["waiting", "serving", "completed", "skipped", "removed"] as const;
export type EntryStatus = (typeof ENTRY_STATUSES)[number];

export const QUEUE_STATUSES = ["active", "paused"] as const;
export type QueueStatus = (typeof QUEUE_STATUSES)[number];

export const STAFF_ROLES = ["owner", "staff"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const APPROACHING_THRESHOLD_DEFAULT = 3;
export const ROLLING_AVERAGE_WINDOW = 20;
export const DATA_DRIVEN_THRESHOLD = 5;
export const DEFAULT_ESTIMATED_TIME_PER_CUSTOMER = 10; // minutes
```

- [ ] **Step 2: Create packages/shared/src/types.ts**

```typescript
import type { FieldType, EntryStatus, QueueStatus, StaffRole } from "./constants";

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[]; // only for "dropdown"
}

export interface Business {
  id: string;
  name: string;
  logo: string;
  primaryColor: string;
  whatsappNumber: string;
  whatsappApiKey: string;
  defaultEstimatedTimePerCustomer: number;
  approachingThreshold: number;
  formFields: FormField[];
  createdAt: Date;
  updatedAt: Date;
}

/** Fields safe to expose to unauthenticated customers */
export interface BusinessPublic {
  id: string;
  name: string;
  logo: string;
  primaryColor: string;
  whatsappNumber: string;
  formFields: FormField[];
}

export interface Staff {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  createdAt: Date;
}

export interface Queue {
  id: string;
  name: string;
  status: QueueStatus;
  currentNumber: number;
  nextNumber: number;
  date: string; // YYYY-MM-DD
  avgServiceTime: number;
  completedCount: number;
}

export interface QueueEntry {
  id: string;
  queueNumber: number;
  displayNumber: string;
  status: EntryStatus;
  customerName: string;
  phone: string;
  formData: Record<string, string | number | boolean>;
  notes: string;
  sessionToken: string;
  joinedAt: Date;
  servedAt: Date | null;
  completedAt: Date | null;
}

/** Fields safe to expose to other customers in the queue list */
export interface QueueEntryPublic {
  id: string;
  queueNumber: number;
  displayNumber: string;
  status: EntryStatus;
}

/** Response from onCustomerJoin callable */
export interface JoinQueueResponse {
  entryId: string;
  queueNumber: number;
  displayNumber: string;
  sessionToken: string;
  currentNumber: number;
  estimatedWaitMinutes: number;
}

/** Request payload for onCustomerJoin callable */
export interface JoinQueueRequest {
  businessId: string;
  queueId: string;
  customerName: string;
  phone: string;
  formData: Record<string, string | number | boolean>;
}
```

- [ ] **Step 3: Create packages/shared/src/index.ts barrel export**

```typescript
export * from "./types";
export * from "./constants";
export * from "./schemas";
export * from "./utils";
```

Note: `schemas.ts` and `utils.ts` don't exist yet — they'll be created in Tasks 3 and 4. For now, comment out those two lines:

```typescript
export * from "./types";
export * from "./constants";
// export * from "./schemas"; // Task 3
// export * from "./utils";   // Task 4
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd packages/shared && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/types.ts packages/shared/src/constants.ts packages/shared/src/index.ts
git commit -m "feat(shared): add Firestore types and constants"
```

---

### Task 3: Create Zod validation schemas with tests

**Files:**
- Create: `packages/shared/src/schemas.ts`
- Create: `packages/shared/__tests__/schemas.test.ts`
- Create: `packages/shared/vitest.config.ts`
- Modify: `packages/shared/src/index.ts` (uncomment schemas export)

- [ ] **Step 1: Create packages/shared/vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Write the failing tests for schemas**

Create `packages/shared/__tests__/schemas.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  formFieldSchema,
  joinQueueRequestSchema,
  businessProfileSchema,
} from "../src/schemas";

describe("formFieldSchema", () => {
  it("accepts a valid text field", () => {
    const result = formFieldSchema.safeParse({
      id: "field-1",
      type: "text",
      label: "Your Name",
      required: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid dropdown field with options", () => {
    const result = formFieldSchema.safeParse({
      id: "field-2",
      type: "dropdown",
      label: "Service Type",
      required: false,
      options: ["General", "VIP"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown field type", () => {
    const result = formFieldSchema.safeParse({
      id: "field-3",
      type: "color-picker",
      label: "Color",
      required: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a field missing required properties", () => {
    const result = formFieldSchema.safeParse({
      id: "field-4",
      type: "text",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a dropdown field without options", () => {
    const result = formFieldSchema.safeParse({
      id: "field-5",
      type: "dropdown",
      label: "Pick one",
      required: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("options");
    }
  });
});

describe("joinQueueRequestSchema", () => {
  it("accepts a valid join request", () => {
    const result = joinQueueRequestSchema.safeParse({
      businessId: "biz-123",
      queueId: "queue-1",
      customerName: "Alice",
      phone: "+60123456789",
      formData: { "field-1": "2" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty customer name", () => {
    const result = joinQueueRequestSchema.safeParse({
      businessId: "biz-123",
      queueId: "queue-1",
      customerName: "",
      phone: "+60123456789",
      formData: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing phone", () => {
    const result = joinQueueRequestSchema.safeParse({
      businessId: "biz-123",
      queueId: "queue-1",
      customerName: "Alice",
      formData: {},
    });
    expect(result.success).toBe(false);
  });

  it("accepts an empty formData object", () => {
    const result = joinQueueRequestSchema.safeParse({
      businessId: "biz-123",
      queueId: "queue-1",
      customerName: "Bob",
      phone: "+60198765432",
      formData: {},
    });
    expect(result.success).toBe(true);
  });
});

describe("businessProfileSchema", () => {
  it("accepts a valid business profile", () => {
    const result = businessProfileSchema.safeParse({
      name: "Amy's Bakery",
      whatsappNumber: "+60123456789",
      defaultEstimatedTimePerCustomer: 10,
      approachingThreshold: 3,
      formFields: [
        { id: "f1", type: "number", label: "Number of Pax", required: false },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative estimated time", () => {
    const result = businessProfileSchema.safeParse({
      name: "Bad Cafe",
      whatsappNumber: "+60123456789",
      defaultEstimatedTimePerCustomer: -5,
      approachingThreshold: 3,
      formFields: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty business name", () => {
    const result = businessProfileSchema.safeParse({
      name: "",
      whatsappNumber: "+60123456789",
      defaultEstimatedTimePerCustomer: 10,
      approachingThreshold: 3,
      formFields: [],
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd packages/shared && npx vitest run
```

Expected: FAIL — `Cannot find module '../src/schemas'`

- [ ] **Step 4: Implement the schemas**

Create `packages/shared/src/schemas.ts`:

```typescript
import { z } from "zod";
import { FIELD_TYPES } from "./constants";

const fieldTypeEnum = z.enum(FIELD_TYPES);

export const formFieldSchema = z
  .object({
    id: z.string().min(1),
    type: fieldTypeEnum,
    label: z.string().min(1),
    required: z.boolean(),
    options: z.array(z.string().min(1)).optional(),
  })
  .refine(
    (field) => {
      if (field.type === "dropdown") {
        return field.options !== undefined && field.options.length > 0;
      }
      return true;
    },
    { message: "Dropdown fields must have options with at least one item" }
  );

export const joinQueueRequestSchema = z.object({
  businessId: z.string().min(1),
  queueId: z.string().min(1),
  customerName: z.string().min(1),
  phone: z.string().min(1),
  formData: z.record(z.union([z.string(), z.number(), z.boolean()])),
});

export const businessProfileSchema = z.object({
  name: z.string().min(1),
  whatsappNumber: z.string().min(1),
  defaultEstimatedTimePerCustomer: z.number().positive(),
  approachingThreshold: z.number().int().positive(),
  formFields: z.array(formFieldSchema),
});

export type FormFieldInput = z.infer<typeof formFieldSchema>;
export type JoinQueueRequestInput = z.infer<typeof joinQueueRequestSchema>;
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/shared && npx vitest run
```

Expected: all 10 tests PASS.

- [ ] **Step 6: Uncomment schemas export in index.ts**

In `packages/shared/src/index.ts`, change:

```typescript
// export * from "./schemas"; // Task 3
```

to:

```typescript
export * from "./schemas";
```

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/schemas.ts packages/shared/__tests__/schemas.test.ts packages/shared/vitest.config.ts packages/shared/src/index.ts
git commit -m "feat(shared): add Zod validation schemas with tests"
```

---

### Task 4: Create utility functions with tests

**Files:**
- Create: `packages/shared/src/utils.ts`
- Create: `packages/shared/__tests__/utils.test.ts`
- Modify: `packages/shared/src/index.ts` (uncomment utils export)

- [ ] **Step 1: Write the failing tests for utils**

Create `packages/shared/__tests__/utils.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { formatDisplayNumber, estimateWaitMinutes } from "../src/utils";

describe("formatDisplayNumber", () => {
  it("pads single digit numbers", () => {
    expect(formatDisplayNumber(1)).toBe("Q-001");
  });

  it("pads double digit numbers", () => {
    expect(formatDisplayNumber(42)).toBe("Q-042");
  });

  it("handles triple digit numbers", () => {
    expect(formatDisplayNumber(123)).toBe("Q-123");
  });

  it("handles numbers above 999", () => {
    expect(formatDisplayNumber(1234)).toBe("Q-1234");
  });

  it("handles zero", () => {
    expect(formatDisplayNumber(0)).toBe("Q-000");
  });
});

describe("estimateWaitMinutes", () => {
  it("uses business default when completedCount < 5", () => {
    const result = estimateWaitMinutes({
      positionInQueue: 4,
      avgServiceTime: 8,
      completedCount: 3,
      defaultEstimatedTime: 10,
    });
    // completedCount (3) < DATA_DRIVEN_THRESHOLD (5), so uses default: 4 * 10 = 40
    expect(result).toBe(40);
  });

  it("uses rolling average when completedCount >= 5", () => {
    const result = estimateWaitMinutes({
      positionInQueue: 4,
      avgServiceTime: 8,
      completedCount: 5,
      defaultEstimatedTime: 10,
    });
    // completedCount (5) >= threshold, so uses avg: 4 * 8 = 32
    expect(result).toBe(32);
  });

  it("returns 0 when position is 0", () => {
    const result = estimateWaitMinutes({
      positionInQueue: 0,
      avgServiceTime: 8,
      completedCount: 10,
      defaultEstimatedTime: 10,
    });
    expect(result).toBe(0);
  });

  it("rounds to nearest integer", () => {
    const result = estimateWaitMinutes({
      positionInQueue: 3,
      avgServiceTime: 7.3,
      completedCount: 10,
      defaultEstimatedTime: 10,
    });
    // 3 * 7.3 = 21.9 → 22
    expect(result).toBe(22);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/shared && npx vitest run __tests__/utils.test.ts
```

Expected: FAIL — `Cannot find module '../src/utils'`

- [ ] **Step 3: Implement the utility functions**

Create `packages/shared/src/utils.ts`:

```typescript
import { DATA_DRIVEN_THRESHOLD } from "./constants";

export function formatDisplayNumber(num: number): string {
  const padded = num.toString().padStart(3, "0");
  return `Q-${padded}`;
}

export interface EstimateWaitParams {
  positionInQueue: number;
  avgServiceTime: number;
  completedCount: number;
  defaultEstimatedTime: number;
}

export function estimateWaitMinutes(params: EstimateWaitParams): number {
  const { positionInQueue, avgServiceTime, completedCount, defaultEstimatedTime } = params;

  if (positionInQueue === 0) return 0;

  const timePerCustomer =
    completedCount >= DATA_DRIVEN_THRESHOLD ? avgServiceTime : defaultEstimatedTime;

  return Math.round(positionInQueue * timePerCustomer);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/shared && npx vitest run
```

Expected: all 19 tests PASS (10 schema + 9 utils).

- [ ] **Step 5: Uncomment utils export in index.ts**

In `packages/shared/src/index.ts`, change:

```typescript
// export * from "./utils";   // Task 4
```

to:

```typescript
export * from "./utils";
```

- [ ] **Step 6: Verify full shared package compiles and exports**

```bash
cd packages/shared && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/utils.ts packages/shared/__tests__/utils.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): add display number formatting and wait time estimation utils"
```

---

### Task 5: Verify monorepo integration end-to-end

**Files:**
- Modify: `apps/mobile/App.tsx` (temporary import test, then revert)

- [ ] **Step 1: Verify shared package is resolvable from mobile app**

Add a temporary import to `apps/mobile/App.tsx` to verify the workspace link works:

```typescript
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { formatDisplayNumber } from '@eazque/shared';

export default function App() {
  const testNumber = formatDisplayNumber(1);
  return (
    <View style={styles.container}>
      <Text>eazque — {testNumber}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF8F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

- [ ] **Step 2: Verify TypeScript resolves the import**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: no errors (the `@eazque/shared` import resolves via workspace).

- [ ] **Step 3: Run all shared package tests one final time**

```bash
cd packages/shared && npx vitest run
```

Expected: all 19 tests PASS.

- [ ] **Step 4: Commit the integration verification**

```bash
git add apps/mobile/App.tsx
git commit -m "feat(mobile): verify shared package integration, update App with warm sand theme"
```

---

## Summary

After completing this plan you will have:

- A working npm workspaces monorepo with `apps/mobile`, `apps/web` (placeholder), `packages/shared`, `firebase/` (placeholder)
- Shared types for all Firestore documents (`Business`, `Queue`, `QueueEntry`, `Staff`, etc.)
- Public-safe types (`BusinessPublic`, `QueueEntryPublic`) for customer-facing reads
- Request/response types (`JoinQueueRequest`, `JoinQueueResponse`) for Cloud Functions
- Zod schemas for form fields, join queue requests, and business profiles — with 10 passing tests
- Utility functions for display number formatting and wait time estimation — with 9 passing tests
- The existing Expo app relocated and still functional

**Next:** Plan 2 (Firebase Backend — Cloud Functions, Firestore rules, emulator setup)
