# Analytics Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Analytics tab showing today's live queue stats and multi-day precomputed aggregates with stat cards, a bar chart of daily served counts, and a busiest hours breakdown.

**Architecture:** Hybrid data strategy — "Today" tab computes stats client-side from live Firestore entries; multi-day ranges read from a `dailyStats` subcollection populated by a new `generateDailyStats` scheduled Cloud Function. A `computeDailyStats` pure function is shared between the Cloud Function and the mobile `useTodayStats` hook.

**Tech Stack:** React Native, Firestore (onSnapshot + range queries), Firebase Functions v2 scheduler, react-native-chart-kit (BarChart), Jest + React Native Testing Library, Vitest

---

## File Map

**New — shared:**
- `packages/shared/src/types.ts` — add `DailyStats` interface

**New — functions:**
- `firebase/functions/src/generate-daily-stats.ts` — `computeDailyStats` pure function + `generateDailyStats` scheduled Cloud Function
- `firebase/functions/__tests__/generate-daily-stats.test.ts` — TDD tests for `computeDailyStats`

**Modified — functions:**
- `firebase/functions/src/paths.ts` — add `dailyStatDoc` path helper
- `firebase/functions/src/index.ts` — export `generateDailyStats`

**New — mobile:**
- `apps/mobile/src/components/StatCard.tsx`
- `apps/mobile/src/components/StatCard.test.tsx`
- `apps/mobile/src/hooks/useTodayStats.ts`
- `apps/mobile/src/hooks/useDateRangeStats.ts`
- `apps/mobile/src/screens/AnalyticsScreen.tsx`

**Modified — mobile:**
- `apps/mobile/src/navigation/MainTabs.tsx` — swap PlaceholderScreen for AnalyticsScreen on Analytics tab

---

## Task 1: DailyStats Shared Type + Paths Update

**Files:**
- Modify: `packages/shared/src/types.ts`
- Modify: `firebase/functions/src/paths.ts`

- [ ] **Step 1: Add DailyStats to shared types**

In `packages/shared/src/types.ts`, add after the `QueueEntry` interface:

```ts
export interface DailyStats {
  date: string;                                // YYYY-MM-DD
  totalJoined: number;                         // all entries regardless of status
  completedCount: number;                      // status === "completed"
  skippedCount: number;                        // status === "skipped"
  removedCount: number;                        // status === "removed"
  avgServiceTime: number;                      // mean of (completedAt - servedAt) in minutes
  avgWaitTime: number;                         // mean of (servedAt - joinedAt) in minutes
  hourlyDistribution: Record<string, number>;  // hour string "0"–"23" → customer count
}
```

- [ ] **Step 2: Add dailyStatDoc path helper**

In `firebase/functions/src/paths.ts`, add after the `entry` path:

```ts
  dailyStatDoc: (businessId: string, date: string) =>
    `businesses/${businessId}/dailyStats/${date}`,
```

Full updated file:

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
  dailyStatDoc: (businessId: string, date: string) =>
    `businesses/${businessId}/dailyStats/${date}`,
} as const;
```

- [ ] **Step 3: Run shared tests to verify no regressions**

```bash
npm run test:shared
```

Expected: 21 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types.ts firebase/functions/src/paths.ts
git commit -m "feat(shared): add DailyStats type and dailyStatDoc path helper

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: computeDailyStats Pure Function (TDD)

**Files:**
- Create: `firebase/functions/__tests__/generate-daily-stats.test.ts`
- Create: `firebase/functions/src/generate-daily-stats.ts` (pure function only — no Cloud Function yet)

- [ ] **Step 1: Write failing tests**

Create `firebase/functions/__tests__/generate-daily-stats.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeDailyStats } from "../src/generate-daily-stats";
import type { QueueEntry } from "@eazque/shared";

function makeEntry(overrides: Partial<QueueEntry> = {}): QueueEntry {
  return {
    id: "e1",
    queueNumber: 1,
    displayNumber: "Q-001",
    status: "completed",
    customerName: "Alice",
    phone: "+60123456789",
    formData: {},
    notes: "",
    sessionToken: "tok1",
    joinedAt: new Date("2026-04-12T09:00:00"),
    servedAt: new Date("2026-04-12T09:10:00"),
    completedAt: new Date("2026-04-12T09:15:00"),
    ...overrides,
  };
}

describe("computeDailyStats", () => {
  it("returns zeros and empty distribution for no entries", () => {
    const stats = computeDailyStats("2026-04-12", []);
    expect(stats.date).toBe("2026-04-12");
    expect(stats.totalJoined).toBe(0);
    expect(stats.completedCount).toBe(0);
    expect(stats.skippedCount).toBe(0);
    expect(stats.removedCount).toBe(0);
    expect(stats.avgServiceTime).toBe(0);
    expect(stats.avgWaitTime).toBe(0);
    expect(stats.hourlyDistribution).toEqual({});
  });

  it("counts entries by status correctly", () => {
    const entries = [
      makeEntry({ id: "e1", status: "completed" }),
      makeEntry({ id: "e2", status: "skipped", servedAt: null, completedAt: null }),
      makeEntry({ id: "e3", status: "removed", servedAt: null, completedAt: null }),
    ];
    const stats = computeDailyStats("2026-04-12", entries);
    expect(stats.totalJoined).toBe(3);
    expect(stats.completedCount).toBe(1);
    expect(stats.skippedCount).toBe(1);
    expect(stats.removedCount).toBe(1);
  });

  it("computes avgWaitTime as mean of (servedAt - joinedAt) for completed entries", () => {
    // entry1: 09:00 joined → 09:10 served = 10 min
    // entry2: 09:00 joined → 09:20 served = 20 min
    // avg = 15 min
    const entries = [
      makeEntry({
        id: "e1",
        joinedAt: new Date("2026-04-12T09:00:00"),
        servedAt: new Date("2026-04-12T09:10:00"),
        completedAt: new Date("2026-04-12T09:12:00"),
      }),
      makeEntry({
        id: "e2",
        joinedAt: new Date("2026-04-12T09:00:00"),
        servedAt: new Date("2026-04-12T09:20:00"),
        completedAt: new Date("2026-04-12T09:22:00"),
      }),
    ];
    const stats = computeDailyStats("2026-04-12", entries);
    expect(stats.avgWaitTime).toBe(15);
  });

  it("computes avgServiceTime as mean of (completedAt - servedAt) for completed entries", () => {
    // entry1: 09:10 served → 09:15 completed = 5 min
    // entry2: 09:20 served → 09:25 completed = 5 min
    // avg = 5 min
    const entries = [
      makeEntry({
        id: "e1",
        servedAt: new Date("2026-04-12T09:10:00"),
        completedAt: new Date("2026-04-12T09:15:00"),
      }),
      makeEntry({
        id: "e2",
        servedAt: new Date("2026-04-12T09:20:00"),
        completedAt: new Date("2026-04-12T09:25:00"),
      }),
    ];
    const stats = computeDailyStats("2026-04-12", entries);
    expect(stats.avgServiceTime).toBe(5);
  });

  it("groups entries into hourly distribution by joinedAt hour", () => {
    const entries = [
      makeEntry({ id: "e1", joinedAt: new Date("2026-04-12T09:00:00") }),
      makeEntry({ id: "e2", joinedAt: new Date("2026-04-12T09:30:00"), status: "skipped", servedAt: null, completedAt: null }),
      makeEntry({ id: "e3", joinedAt: new Date("2026-04-12T10:00:00"), status: "skipped", servedAt: null, completedAt: null }),
    ];
    const stats = computeDailyStats("2026-04-12", entries);
    expect(stats.hourlyDistribution["9"]).toBe(2);
    expect(stats.hourlyDistribution["10"]).toBe(1);
    expect(Object.keys(stats.hourlyDistribution)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:functions
```

Expected: `generate-daily-stats.test.ts` FAIL — module not found.

- [ ] **Step 3: Implement computeDailyStats**

Create `firebase/functions/src/generate-daily-stats.ts` (pure function only for now):

```ts
import type { QueueEntry, DailyStats } from "@eazque/shared";

export function computeDailyStats(date: string, entries: QueueEntry[]): DailyStats {
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

  return {
    date,
    totalJoined,
    completedCount,
    skippedCount,
    removedCount,
    avgServiceTime,
    avgWaitTime,
    hourlyDistribution,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:functions
```

Expected: All tests PASS including 5 new `generate-daily-stats` tests.

- [ ] **Step 5: Commit**

```bash
git add firebase/functions/__tests__/generate-daily-stats.test.ts firebase/functions/src/generate-daily-stats.ts
git commit -m "feat(functions): add computeDailyStats pure function with TDD

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: generateDailyStats Cloud Function

**Files:**
- Modify: `firebase/functions/src/generate-daily-stats.ts` (add scheduled function)
- Modify: `firebase/functions/src/index.ts` (export it)

- [ ] **Step 1: Add the scheduled Cloud Function**

Append to the bottom of `firebase/functions/src/generate-daily-stats.ts`:

```ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db } from "./config";
import { paths } from "./paths";

export const generateDailyStats = onSchedule("every day 00:00", async () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const date = d.toISOString().split("T")[0]; // yesterday YYYY-MM-DD

  const businessesSnap = await db.collection("businesses").get();

  for (const businessDoc of businessesSnap.docs) {
    const businessId = businessDoc.id;

    const queuesSnap = await db
      .collection(paths.queues(businessId))
      .where("date", "==", date)
      .limit(1)
      .get();

    if (queuesSnap.empty) continue;

    const queueId = queuesSnap.docs[0].id;

    const entriesSnap = await db
      .collection(paths.entries(businessId, queueId))
      .get();

    const entries: QueueEntry[] = entriesSnap.docs.map((d) => {
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

    const stats = computeDailyStats(date, entries);

    await db.doc(paths.dailyStatDoc(businessId, date)).set(stats, { merge: true });
  }
});
```

The complete `generate-daily-stats.ts` file should now look like this:

```ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db } from "./config";
import { paths } from "./paths";
import type { QueueEntry, DailyStats } from "@eazque/shared";

export function computeDailyStats(date: string, entries: QueueEntry[]): DailyStats {
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

  return {
    date,
    totalJoined,
    completedCount,
    skippedCount,
    removedCount,
    avgServiceTime,
    avgWaitTime,
    hourlyDistribution,
  };
}

export const generateDailyStats = onSchedule("every day 00:00", async () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const date = d.toISOString().split("T")[0];

  const businessesSnap = await db.collection("businesses").get();

  for (const businessDoc of businessesSnap.docs) {
    const businessId = businessDoc.id;

    const queuesSnap = await db
      .collection(paths.queues(businessId))
      .where("date", "==", date)
      .limit(1)
      .get();

    if (queuesSnap.empty) continue;

    const queueId = queuesSnap.docs[0].id;

    const entriesSnap = await db
      .collection(paths.entries(businessId, queueId))
      .get();

    const entries: QueueEntry[] = entriesSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
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

    const stats = computeDailyStats(date, entries);
    await db.doc(paths.dailyStatDoc(businessId, date)).set(stats, { merge: true });
  }
});
```

- [ ] **Step 2: Export from index.ts**

In `firebase/functions/src/index.ts`, add:

```ts
export { generateDailyStats } from "./generate-daily-stats";
```

Full updated `index.ts`:

```ts
export { onCustomerJoin } from "./on-customer-join";
export { onEntryStatusChange } from "./on-entry-status-change";
export { onCurrentNumberAdvance } from "./on-current-number-advance";
export { dailyQueueReset } from "./daily-queue-reset";
export { generateDailyStats } from "./generate-daily-stats";
```

- [ ] **Step 3: Run functions tests**

```bash
npm run test:functions
```

Expected: All 23 tests PASS (existing 18 + 5 new).

- [ ] **Step 4: Commit**

```bash
git add firebase/functions/src/generate-daily-stats.ts firebase/functions/src/index.ts
git commit -m "feat(functions): add generateDailyStats scheduled Cloud Function

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: StatCard Component (TDD) + Install Chart Library

**Files:**
- Create: `apps/mobile/src/components/StatCard.test.tsx`
- Create: `apps/mobile/src/components/StatCard.tsx`
- Modify: `apps/mobile/package.json` (add react-native-chart-kit)

- [ ] **Step 1: Install react-native-chart-kit**

```bash
npm install react-native-chart-kit --workspace=apps/mobile
```

- [ ] **Step 2: Write StatCard tests**

Create `apps/mobile/src/components/StatCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";
import { describe, it, expect } from "@jest/globals";
import StatCard from "./StatCard";

describe("StatCard", () => {
  it("renders label and numeric value", () => {
    render(<StatCard label="Total Served" value={42} />);
    expect(screen.getByText("Total Served")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
  });

  it("renders value with unit when unit provided", () => {
    render(<StatCard label="Avg Wait" value={4.2} unit="min" />);
    expect(screen.getByText("4.2 min")).toBeTruthy();
  });

  it("renders value without unit when unit not provided", () => {
    render(<StatCard label="Skip Rate" value="32%" />);
    expect(screen.getByText("32%")).toBeTruthy();
  });

  it("renders string value", () => {
    render(<StatCard label="Remove Rate" value="1.5%" />);
    expect(screen.getByText("1.5%")).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm run test:mobile
```

Expected: StatCard tests FAIL — module not found.

- [ ] **Step 4: Implement StatCard**

Create `apps/mobile/src/components/StatCard.tsx`:

```tsx
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme";

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
}

export default function StatCard({ label, value, unit }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>
        {value}{unit ? ` ${unit}` : ""}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: "45%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textDark,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: colors.secondary,
  },
});
```

- [ ] **Step 5: Run all mobile tests**

```bash
npm run test:mobile
```

Expected: All 33 tests PASS (29 existing + 4 new StatCard).

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/components/StatCard.tsx apps/mobile/src/components/StatCard.test.tsx apps/mobile/package.json package-lock.json
git commit -m "feat(mobile): add StatCard component with TDD and install react-native-chart-kit

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: useTodayStats + useDateRangeStats Hooks

**Files:**
- Create: `apps/mobile/src/hooks/useTodayStats.ts`
- Create: `apps/mobile/src/hooks/useDateRangeStats.ts`

- [ ] **Step 1: Create useTodayStats hook**

Create `apps/mobile/src/hooks/useTodayStats.ts`:

```ts
import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
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

  return {
    date,
    totalJoined,
    completedCount,
    skippedCount,
    removedCount,
    avgServiceTime,
    avgWaitTime,
    hourlyDistribution,
  };
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

- [ ] **Step 2: Create useDateRangeStats hook**

Create `apps/mobile/src/hooks/useDateRangeStats.ts`:

```ts
import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../config/firebase";
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

- [ ] **Step 3: Run mobile tests**

```bash
npm run test:mobile
```

Expected: 33 tests PASS (no new test files in this task).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/hooks/useTodayStats.ts apps/mobile/src/hooks/useDateRangeStats.ts
git commit -m "feat(mobile): add useTodayStats and useDateRangeStats hooks

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: AnalyticsScreen

**Files:**
- Create: `apps/mobile/src/screens/AnalyticsScreen.tsx`

- [ ] **Step 1: Implement AnalyticsScreen**

Create `apps/mobile/src/screens/AnalyticsScreen.tsx`:

```tsx
import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Dimensions,
  StyleSheet,
} from "react-native";
import { BarChart } from "react-native-chart-kit";
import { useAuth } from "../contexts/AuthContext";
import { useTodayStats } from "../hooks/useTodayStats";
import { useDateRangeStats } from "../hooks/useDateRangeStats";
import StatCard from "../components/StatCard";
import type { DailyStats } from "@eazque/shared";
import { colors, common } from "../theme";

type RangeType = "today" | "7days" | "30days" | "custom";

const SCREEN_WIDTH = Dimensions.get("window").width;

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

  return {
    totalJoined,
    completedCount,
    skippedCount,
    removedCount,
    avgServiceTime,
    avgWaitTime,
    hourlyDistribution,
  };
}

function getTop3Hours(
  distribution: Record<string, number>
): Array<{ hour: number; count: number }> {
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

export default function AnalyticsScreen() {
  const { businessId } = useAuth();
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
    if (range === "today") {
      return todayStats
        ? {
            totalJoined: todayStats.totalJoined,
            completedCount: todayStats.completedCount,
            skippedCount: todayStats.skippedCount,
            removedCount: todayStats.removedCount,
            avgServiceTime: todayStats.avgServiceTime,
            avgWaitTime: todayStats.avgWaitTime,
            hourlyDistribution: todayStats.hourlyDistribution,
          }
        : null;
    }
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

  const barData = useMemo(() => {
    if (range === "today" || statsByDate.length === 0) return null;
    return {
      labels: statsByDate.map((d) => formatBarDate(d.date)),
      datasets: [{ data: statsByDate.map((d) => d.completedCount) }],
    };
  }, [range, statsByDate]);

  return (
    <ScrollView style={common.screen} contentContainerStyle={styles.content}>
      {/* Range selector */}
      <View style={styles.rangeRow}>
        {RANGES.map(({ key, label }) => (
          <Pressable
            key={key}
            style={[styles.chip, range === key && styles.chipActive]}
            onPress={() => setRange(key)}
          >
            <Text style={[styles.chipText, range === key && styles.chipTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Custom date inputs */}
      {range === "custom" && (
        <View style={styles.customRow}>
          <TextInput
            style={[common.input, styles.dateInput]}
            value={customStart}
            onChangeText={setCustomStart}
            placeholder="Start YYYY-MM-DD"
            placeholderTextColor={colors.secondary}
            autoCapitalize="none"
          />
          <TextInput
            style={[common.input, styles.dateInput]}
            value={customEnd}
            onChangeText={setCustomEnd}
            placeholder="End YYYY-MM-DD"
            placeholderTextColor={colors.secondary}
            autoCapitalize="none"
          />
          <Pressable
            style={[common.button, styles.loadButton]}
            onPress={() => setActiveRange({ start: customStart, end: customEnd })}
          >
            <Text style={common.buttonText}>Load</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <Text style={common.subtitle}>Loading analytics...</Text>
        </View>
      ) : !aggregated ? (
        <View style={styles.center}>
          <Text style={common.subtitle}>No data for this period</Text>
        </View>
      ) : (
        <>
          {/* Stat cards grid */}
          <View style={styles.grid}>
            <StatCard label="Total Served" value={aggregated.completedCount} />
            <StatCard label="Avg Service Time" value={aggregated.avgServiceTime} unit="min" />
            <StatCard label="Avg Wait Time" value={aggregated.avgWaitTime} unit="min" />
            <StatCard label="Skip Rate" value={`${skipRate}%`} />
            <StatCard label="Remove Rate" value={`${removeRate}%`} />
            <StatCard label="Total Joined" value={aggregated.totalJoined} />
          </View>

          {/* Bar chart (multi-day only) */}
          {barData && (
            <View style={styles.chartSection}>
              <Text style={styles.sectionTitle}>Customers Served Per Day</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart
                  data={barData}
                  width={Math.max(SCREEN_WIDTH - 32, barData.labels.length * 52)}
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: colors.white,
                    backgroundGradientFrom: colors.white,
                    backgroundGradientTo: colors.white,
                    color: (opacity = 1) => `rgba(184, 146, 106, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(90, 68, 48, ${opacity})`,
                    barPercentage: 0.7,
                  }}
                  style={{ borderRadius: 8 }}
                  showValuesOnTopOfBars
                  fromZero
                />
              </ScrollView>
            </View>
          )}

          {/* Busiest hours */}
          {top3Hours.length > 0 && (
            <View style={styles.hoursSection}>
              <Text style={styles.sectionTitle}>Busiest Hours</Text>
              {top3Hours.map(({ hour, count }) => (
                <View key={hour} style={styles.hourRow}>
                  <Text style={styles.hourLabel}>{formatHour(hour)}</Text>
                  <Text style={styles.hourCount}>{count} customers</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    paddingVertical: 48,
    alignItems: "center",
  },
  rangeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.textDark,
    fontWeight: "500",
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
  customRow: {
    marginBottom: 16,
    gap: 8,
  },
  dateInput: {
    marginBottom: 0,
  },
  loadButton: {
    marginTop: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  chartSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textDark,
    marginBottom: 12,
  },
  hoursSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
  },
  hourRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  hourLabel: {
    fontSize: 14,
    color: colors.textDark,
  },
  hourCount: {
    fontSize: 14,
    color: colors.secondary,
  },
});
```

- [ ] **Step 2: Run mobile tests**

```bash
npm run test:mobile
```

Expected: 33 tests PASS (no new tests for this screen).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/AnalyticsScreen.tsx
git commit -m "feat(mobile): implement AnalyticsScreen with stat cards, bar chart, and busiest hours

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Wire Navigation + Final Verification

**Files:**
- Modify: `apps/mobile/src/navigation/MainTabs.tsx`

- [ ] **Step 1: Update MainTabs to use AnalyticsScreen**

In `apps/mobile/src/navigation/MainTabs.tsx`, add the import after the existing imports:

```tsx
import AnalyticsScreen from "../screens/AnalyticsScreen";
```

Then replace:

```tsx
<Tab.Screen name="Analytics" component={PlaceholderScreen} />
```

with:

```tsx
<Tab.Screen name="Analytics" component={AnalyticsScreen} />
```

- [ ] **Step 2: Run all mobile tests**

```bash
npm run test:mobile
```

Expected: 33 tests PASS.

- [ ] **Step 3: Run all project tests**

```bash
npm run test:shared && npm run test:functions && npm run test:web && npm run test:mobile
```

Expected:
- shared: 21 pass
- functions: 23 pass (18 existing + 5 new)
- web: 11 pass
- mobile: 33 pass (29 existing + 4 StatCard)
- **Total: 88 tests pass**

- [ ] **Step 4: Verify git log**

```bash
git log --oneline -8
```

Expected: 6 new commits from this plan (Tasks 1–6).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/navigation/MainTabs.tsx
git commit -m "feat(mobile): wire AnalyticsScreen into Analytics tab navigation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
