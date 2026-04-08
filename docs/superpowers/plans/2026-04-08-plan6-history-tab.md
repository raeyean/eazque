# History Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the History tab showing resolved queue entries (completed, skipped, removed) with date navigation to browse past days.

**Architecture:** Two new hooks (`useQueueByDate`, `useHistoryEntries`) fetch a specific day's queue and its resolved entries via Firestore `onSnapshot`. Two TDD-tested display components (`HistoryEntryCard`, `HistoryEntryList`) render the data. `HistoryScreen` composes everything with date navigation arrows and summary counts.

**Tech Stack:** React Native, Firestore (onSnapshot), Jest + React Native Testing Library

---

## Task 1: Hooks — useQueueByDate + useHistoryEntries

**Files:**
- Create: `apps/mobile/src/hooks/useQueueByDate.ts`
- Create: `apps/mobile/src/hooks/useHistoryEntries.ts`

- [ ] **Step 1: Create useQueueByDate hook**

Create `apps/mobile/src/hooks/useQueueByDate.ts`:

```ts
import { useState, useEffect } from "react";
import { collection, query, where, limit, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
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

- [ ] **Step 2: Create useHistoryEntries hook**

Create `apps/mobile/src/hooks/useHistoryEntries.ts`:

```ts
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import type { QueueEntry } from "@eazque/shared";

export function useHistoryEntries(
  businessId: string,
  queueId: string | null
) {
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

- [ ] **Step 3: Run mobile tests**

```bash
npm run test:mobile
```

Expected: 22 tests PASS (no new test files in this task).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/hooks/useQueueByDate.ts apps/mobile/src/hooks/useHistoryEntries.ts
git commit -m "feat(mobile): add useQueueByDate and useHistoryEntries hooks

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: HistoryEntryCard Component (TDD)

**Files:**
- Create: `apps/mobile/src/components/HistoryEntryCard.test.tsx`
- Create: `apps/mobile/src/components/HistoryEntryCard.tsx`

- [ ] **Step 1: Write HistoryEntryCard tests**

Create `apps/mobile/src/components/HistoryEntryCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";
import { describe, it, expect } from "@jest/globals";
import HistoryEntryCard from "./HistoryEntryCard";
import type { QueueEntry } from "@eazque/shared";

const baseEntry: QueueEntry = {
  id: "e1",
  queueNumber: 1,
  displayNumber: "A001",
  status: "completed",
  customerName: "Alice",
  phone: "+60123456789",
  formData: {},
  notes: "",
  sessionToken: "tok1",
  joinedAt: new Date("2026-04-08T09:30:00"),
  servedAt: new Date("2026-04-08T09:45:00"),
  completedAt: new Date("2026-04-08T09:50:00"),
};

describe("HistoryEntryCard", () => {
  it("displays display number and customer name", () => {
    render(<HistoryEntryCard entry={baseEntry} />);
    expect(screen.getByText("A001")).toBeTruthy();
    expect(screen.getByText("Alice")).toBeTruthy();
  });

  it("displays formatted join time", () => {
    render(<HistoryEntryCard entry={baseEntry} />);
    expect(screen.getByText(/9:30/)).toBeTruthy();
  });

  it("displays Completed badge for completed status", () => {
    render(<HistoryEntryCard entry={baseEntry} />);
    expect(screen.getByText("Completed")).toBeTruthy();
  });

  it("displays Skipped badge for skipped status", () => {
    const skipped: QueueEntry = { ...baseEntry, status: "skipped" };
    render(<HistoryEntryCard entry={skipped} />);
    expect(screen.getByText("Skipped")).toBeTruthy();
  });

  it("displays Removed badge for removed status", () => {
    const removed: QueueEntry = { ...baseEntry, status: "removed" };
    render(<HistoryEntryCard entry={removed} />);
    expect(screen.getByText("Removed")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:mobile
```

Expected: HistoryEntryCard tests FAIL — module not found.

- [ ] **Step 3: Implement HistoryEntryCard**

Create `apps/mobile/src/components/HistoryEntryCard.tsx`:

```tsx
import { View, Text, StyleSheet } from "react-native";
import type { QueueEntry, EntryStatus } from "@eazque/shared";
import { colors } from "../theme";

interface HistoryEntryCardProps {
  entry: QueueEntry;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  completed: { label: "Completed", color: "#27AE60" },
  skipped: { label: "Skipped", color: colors.skip },
  removed: { label: "Removed", color: colors.remove },
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function HistoryEntryCard({ entry }: HistoryEntryCardProps) {
  const config = STATUS_CONFIG[entry.status] ?? {
    label: entry.status,
    color: colors.secondary,
  };

  return (
    <View style={styles.card}>
      <Text style={styles.displayNumber}>{entry.displayNumber}</Text>
      <View style={styles.middle}>
        <Text style={styles.customerName}>{entry.customerName}</Text>
        <Text style={styles.time}>{formatTime(entry.joinedAt)}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: config.color }]}>
        <Text style={styles.badgeText}>{config.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  displayNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
    width: 56,
  },
  middle: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    color: colors.textDark,
  },
  time: {
    fontSize: 13,
    color: colors.secondary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "600",
  },
});
```

- [ ] **Step 4: Run all tests**

```bash
npm run test:mobile
```

Expected: All 27 tests PASS (22 existing + 5 HistoryEntryCard).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/HistoryEntryCard.tsx apps/mobile/src/components/HistoryEntryCard.test.tsx
git commit -m "feat(mobile): add HistoryEntryCard with status badges and TDD

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: HistoryEntryList Component (TDD)

**Files:**
- Create: `apps/mobile/src/components/HistoryEntryList.test.tsx`
- Create: `apps/mobile/src/components/HistoryEntryList.tsx`

- [ ] **Step 1: Write HistoryEntryList tests**

Create `apps/mobile/src/components/HistoryEntryList.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";
import { describe, it, expect } from "@jest/globals";
import HistoryEntryList from "./HistoryEntryList";
import type { QueueEntry } from "@eazque/shared";

const mockEntries: QueueEntry[] = [
  {
    id: "e1",
    queueNumber: 1,
    displayNumber: "A001",
    status: "completed",
    customerName: "Alice",
    phone: "+60123456789",
    formData: {},
    notes: "",
    sessionToken: "tok1",
    joinedAt: new Date("2026-04-08T09:30:00"),
    servedAt: new Date("2026-04-08T09:45:00"),
    completedAt: new Date("2026-04-08T09:50:00"),
  },
  {
    id: "e2",
    queueNumber: 2,
    displayNumber: "A002",
    status: "skipped",
    customerName: "Bob",
    phone: "+60198765432",
    formData: {},
    notes: "",
    sessionToken: "tok2",
    joinedAt: new Date("2026-04-08T09:35:00"),
    servedAt: null,
    completedAt: null,
  },
];

describe("HistoryEntryList", () => {
  it("renders entry cards", () => {
    render(<HistoryEntryList entries={mockEntries} />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("shows empty state when no entries", () => {
    render(<HistoryEntryList entries={[]} />);
    expect(screen.getByText("No entries for this date")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:mobile
```

Expected: HistoryEntryList tests FAIL — module not found.

- [ ] **Step 3: Implement HistoryEntryList**

Create `apps/mobile/src/components/HistoryEntryList.tsx`:

```tsx
import { FlatList, View, Text, StyleSheet } from "react-native";
import type { QueueEntry } from "@eazque/shared";
import HistoryEntryCard from "./HistoryEntryCard";
import { colors } from "../theme";

interface HistoryEntryListProps {
  entries: QueueEntry[];
}

export default function HistoryEntryList({ entries }: HistoryEntryListProps) {
  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No entries for this date</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <HistoryEntryCard entry={item} />}
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: "hidden",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: colors.secondary,
    fontStyle: "italic",
  },
});
```

- [ ] **Step 4: Run all tests**

```bash
npm run test:mobile
```

Expected: All 29 tests PASS (22 existing + 5 HistoryEntryCard + 2 HistoryEntryList).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/HistoryEntryList.tsx apps/mobile/src/components/HistoryEntryList.test.tsx
git commit -m "feat(mobile): add HistoryEntryList with empty state and TDD

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: HistoryScreen Implementation

**Files:**
- Create: `apps/mobile/src/screens/HistoryScreen.tsx`

- [ ] **Step 1: Implement HistoryScreen**

Create `apps/mobile/src/screens/HistoryScreen.tsx`:

```tsx
import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { useQueueByDate } from "../hooks/useQueueByDate";
import { useHistoryEntries } from "../hooks/useHistoryEntries";
import HistoryEntryList from "../components/HistoryEntryList";
import { colors, common } from "../theme";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDateLabel(dateStr: string): string {
  if (dateStr === getToday()) return "Today";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function HistoryScreen() {
  const { businessId } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getToday);

  const { queue, queueId, loading: queueLoading } = useQueueByDate(
    businessId!,
    selectedDate
  );
  const { entries, loading: entriesLoading } = useHistoryEntries(
    businessId!,
    queueId
  );

  const isToday = selectedDate === getToday();
  const loading = queueLoading || entriesLoading;

  const completedCount = entries.filter((e) => e.status === "completed").length;
  const skippedCount = entries.filter((e) => e.status === "skipped").length;
  const removedCount = entries.filter((e) => e.status === "removed").length;

  return (
    <View style={common.screen}>
      <View style={styles.dateNav}>
        <Pressable
          onPress={() => setSelectedDate((d) => shiftDate(d, -1))}
          style={styles.arrowButton}
          accessibilityLabel="Previous day"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textDark} />
        </Pressable>
        <Text style={styles.dateLabel}>{formatDateLabel(selectedDate)}</Text>
        <Pressable
          onPress={() => setSelectedDate((d) => shiftDate(d, 1))}
          style={[styles.arrowButton, isToday && styles.arrowDisabled]}
          disabled={isToday}
          accessibilityLabel="Next day"
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={isToday ? colors.lightAccent : colors.textDark}
          />
        </Pressable>
      </View>

      {loading ? (
        <View style={[common.screen, styles.center]}>
          <Text style={common.subtitle}>Loading history...</Text>
        </View>
      ) : !queue ? (
        <View style={[common.screen, styles.center]}>
          <Text style={common.subtitle}>No queue found for this date</Text>
        </View>
      ) : (
        <>
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              {completedCount} completed, {skippedCount} skipped, {removedCount} removed
            </Text>
          </View>
          <View style={common.container}>
            <HistoryEntryList entries={entries} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  dateNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  arrowButton: {
    padding: 8,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  dateLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textDark,
  },
  summary: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: colors.secondary,
  },
});
```

- [ ] **Step 2: Run tests**

```bash
npm run test:mobile
```

Expected: 29 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/HistoryScreen.tsx
git commit -m "feat(mobile): implement HistoryScreen with date navigation and summary counts

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Wire Up Navigation + Final Verification

**Files:**
- Modify: `apps/mobile/src/navigation/MainTabs.tsx`

- [ ] **Step 1: Update MainTabs to use HistoryScreen**

In `apps/mobile/src/navigation/MainTabs.tsx`, add the import at the top (after the existing imports):

```tsx
import HistoryScreen from "../screens/HistoryScreen";
```

Then replace the History tab line:

```tsx
<Tab.Screen name="History" component={PlaceholderScreen} />
```

with:

```tsx
<Tab.Screen name="History" component={HistoryScreen} />
```

- [ ] **Step 2: Run all mobile tests**

```bash
npm run test:mobile
```

Expected: 29 tests PASS.

- [ ] **Step 3: Run all project tests**

```bash
npm run test:shared && npm run test:functions && npm run test:web && npm run test:mobile
```

Expected:
- shared: 21 pass
- functions: 18 pass
- web: 11 pass
- mobile: 29 pass
- **Total: 79 tests pass**

- [ ] **Step 4: Verify git log**

```bash
git log --oneline -6
```

Expected: 4 new commits from this plan (Tasks 1-4) plus the navigation update.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/navigation/MainTabs.tsx
git commit -m "feat(mobile): wire HistoryScreen into History tab navigation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
