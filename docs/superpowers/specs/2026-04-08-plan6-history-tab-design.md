# Plan 6 Design: History Tab

## Goal

Build the History tab for the mobile app. Shows resolved queue entries (completed, skipped, removed) for the current day by default, with date navigation arrows to browse past days.

## Scope

### In scope
- HistoryScreen replacing the History tab placeholder
- Date navigation (prev/next day arrows) with today as default
- Summary counts (completed, skipped, removed)
- Read-only entry list with status badges
- Two new hooks for date-based queue lookup and history entries
- TDD for pure display components

### Out of scope
- Calendar date picker (future enhancement — MVP uses prev/next arrows only)
- Filtering or sorting by status
- Tap-to-view entry detail screen
- Search across dates by customer name
- Export or download history

## Architecture

### Data Flow

The existing data model supports this feature without changes. Queues have a `date` field (YYYY-MM-DD) and entries have a `status` field. We query for resolved entries within a specific day's queue.

Two-step lookup:
1. `useQueueByDate(businessId, date)` — finds the queue doc for the given date
2. `useHistoryEntries(businessId, queueId)` — loads entries where status is completed, skipped, or removed

Both hooks use `onSnapshot` for real-time updates, matching existing patterns (`useQueue`, `useQueueEntries`).

### Hooks

**`useQueueByDate(businessId, date)`**
- Firestore query: `where("date", "==", date)` on `businesses/{businessId}/queues`
- Returns `{ queue: Queue | null, queueId: string | null, loading: boolean }`
- Similar to existing `useQueue` hook but parameterized by date

**`useHistoryEntries(businessId, queueId)`**
- Firestore query: `where("status", "in", ["completed", "skipped", "removed"])` on entries subcollection
- Returns `{ entries: QueueEntry[], loading: boolean }`
- Sorted by `queueNumber` ascending (chronological service order)
- Same timestamp mapping pattern as `useQueueEntries` (toDate() on Firestore Timestamps)

### Components

**`HistoryEntryCard.tsx`** (TDD tested)
- Pure display component
- Props: `entry: QueueEntry`
- Shows: display number, customer name, status badge (color-coded), absolute time (e.g. "2:35 PM")
- Status badge colors: green for completed, orange for skipped, red for removed
- No swipe actions — read-only

**`HistoryEntryList.tsx`** (TDD tested)
- FlatList wrapper
- Props: `entries: QueueEntry[]`
- Empty state: "No entries for this date"

### HistoryScreen

**`HistoryScreen.tsx`** — replaces PlaceholderScreen in History tab.

**Layout (top to bottom):**
- Date header row: left arrow button, date label, right arrow button
  - Date label shows "Today" when viewing today, otherwise formatted date (e.g. "7 Apr 2026")
  - Right arrow disabled when viewing today (cannot navigate to future)
- Summary line: "X completed, Y skipped, Z removed" — counts derived from loaded entries
- HistoryEntryList filling remaining space

**States:**
- Loading: "Loading history..." while hooks load
- No queue: "No queue found for this date" when selected date has no queue doc
- Empty queue: "No entries for this date" when queue exists but no resolved entries (handled by HistoryEntryList)

**Date state:** `selectedDate` as YYYY-MM-DD string, initialized to today. Arrow buttons increment/decrement by one day.

### Navigation Changes

Minimal — swap `PlaceholderScreen` for `HistoryScreen` in MainTabs.tsx on the History tab. No new routes needed.

### New File Structure

```
apps/mobile/src/
├── components/
│   ├── HistoryEntryCard.tsx          # Entry display with status badge
│   ├── HistoryEntryCard.test.tsx     # TDD tests
│   ├── HistoryEntryList.tsx          # FlatList wrapper
│   └── HistoryEntryList.test.tsx     # TDD tests
├── hooks/
│   ├── useQueueByDate.ts            # Queue lookup by date
│   └── useHistoryEntries.ts         # Resolved entries listener
└── screens/
    └── HistoryScreen.tsx             # Replaces placeholder
```

### Modified Files

```
apps/mobile/src/navigation/MainTabs.tsx  # Import HistoryScreen, replace PlaceholderScreen
```

### Dependencies

None. No new packages required.

### Testing

**TDD tested:**
- `HistoryEntryCard` — display number, name, status badge (text + color) for each of 3 statuses, formatted time
- `HistoryEntryList` — renders entries, empty state

**Not tested (Firebase wrappers / screens):**
- `useQueueByDate` hook
- `useHistoryEntries` hook
- `HistoryScreen`

### Firestore Rules

No changes needed. Existing rules already grant staff read access to queue and entry documents.
