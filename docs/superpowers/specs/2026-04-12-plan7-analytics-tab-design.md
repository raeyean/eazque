# Plan 7 Design: Analytics Tab

## Goal

Build the Analytics tab for the mobile app. Shows queue performance metrics for today (live, client-side) and multi-day aggregates (precomputed by a scheduled Cloud Function). Includes summary stat cards, a bar chart of daily served counts, and a busiest hours breakdown.

## Scope

### In scope
- AnalyticsScreen replacing the Analytics tab placeholder
- Date range selector: "Today", "7 Days", "30 Days", "Custom" (text input start/end)
- Metrics: total served, avg service time, avg wait time, skip rate, remove rate, total joined
- Bar chart: customers served per day (react-native-chart-kit), hidden for "Today"
- Busiest hours: top 3 hours by customer count
- Scheduled Cloud Function: `generateDailyStats` runs daily at midnight
- `computeDailyStats` pure function (TDD tested)
- `StatCard` component (TDD tested)
- `DailyStats` shared type

### Out of scope
- Peak queue length (no historical queue length data tracked)
- Customer return rate (cross-day phone matching — privacy/cost concerns)
- Chart type toggle (always customers served)
- Push notifications or alerts based on analytics
- Export / CSV download

## Architecture

### Hybrid Data Strategy

- **Today tab:** client-side computation. `useTodayStats` reads today's live queue + all entries via `onSnapshot`, computes `DailyStats` in memory. Always current.
- **Multi-day tabs:** precomputed. `useDateRangeStats` reads `dailyStats` docs from Firestore. The `generateDailyStats` Cloud Function runs at midnight and writes one doc per business per day.

### Firestore Structure

New subcollection: `businesses/{businessId}/dailyStats/{date}`

One document per day, keyed by YYYY-MM-DD date string.

## Shared Types

Add to `packages/shared/src/types.ts`:

```ts
export interface DailyStats {
  date: string;                               // YYYY-MM-DD
  totalJoined: number;                        // all entries regardless of status
  completedCount: number;                     // status === "completed"
  skippedCount: number;                       // status === "skipped"
  removedCount: number;                       // status === "removed"
  avgServiceTime: number;                     // mean of (completedAt - servedAt) in minutes, for completed entries
  avgWaitTime: number;                        // mean of (servedAt - joinedAt) in minutes, for completed entries
  hourlyDistribution: Record<string, number>; // hour string (0–23) → customer count based on joinedAt
}
```

## Cloud Function

**`generateDailyStats`** — scheduled, runs daily at midnight UTC.

**Pure logic function** (extracted for testability): `computeDailyStats(date: string, entries: QueueEntry[]): DailyStats`

- `totalJoined` = entries.length
- `completedCount` = entries filtered by status "completed"
- `skippedCount` = entries filtered by status "skipped"
- `removedCount` = entries filtered by status "removed"
- `avgWaitTime` = mean of `(servedAt - joinedAt)` in minutes for completed entries with both timestamps; 0 if none
- `avgServiceTime` = mean of `(completedAt - servedAt)` in minutes for completed entries with both timestamps; 0 if none
- `hourlyDistribution` = group all entries by `joinedAt.getHours()`, count per hour

**Scheduled function steps:**
1. Compute yesterday = today - 1 day (YYYY-MM-DD)
2. Query `businesses` collection — get all business IDs
3. For each business, query `queues` where `date == yesterday`, limit 1
4. If queue exists, read all entries from subcollection
5. Call `computeDailyStats(yesterday, entries)`
6. Write result to `businesses/{businessId}/dailyStats/{yesterday}` (upsert — idempotent)

**New files:**
- `firebase/functions/src/generate-daily-stats.ts` — Cloud Function + `computeDailyStats`
- Update `firebase/functions/src/index.ts` to export it

## Mobile Hooks

**`useTodayStats(businessId)`**
- Uses `useQueueByDate(businessId, today)` internally (already exists)
- Reads all entries (all statuses) via `onSnapshot` on today's queue entries subcollection — no status filter
- Computes `DailyStats` from entries using same logic as `computeDailyStats`
- Returns `{ stats: DailyStats | null, loading: boolean }`
- Returns `null` stats when no queue exists for today

**`useDateRangeStats(businessId, startDate, endDate)`**
- Queries `businesses/{businessId}/dailyStats` with `where("date", ">=", startDate)` and `where("date", "<=", endDate)`
- Returns `{ statsByDate: DailyStats[], loading: boolean }` — sorted ascending by date
- Days with no queue (no `dailyStats` doc) are absent from the array

Both hooks use `onSnapshot`.

## Components

### StatCard (TDD tested)

`apps/mobile/src/components/StatCard.tsx`

Props:
- `label: string` — e.g. "Avg Wait Time"
- `value: string | number` — e.g. `4.2` or `"32%"`
- `unit?: string` — e.g. `"min"`, shown after value if provided

Displays label above, value (+ unit) below in a card. Used in a 2-column grid layout.

### AnalyticsScreen

`apps/mobile/src/screens/AnalyticsScreen.tsx`

**Layout (top to bottom):**

1. **Range selector row** — 4 chip buttons: "Today" | "7 Days" | "30 Days" | "Custom". Active chip highlighted with primary color.

2. **Custom date inputs** (visible only when "Custom" selected) — two text inputs: Start date and End date (YYYY-MM-DD format). A "Load" button triggers the range query.

3. **Summary stat cards** — 2-column grid using `StatCard`:
   - Total Served (`completedCount`)
   - Avg Service Time (`avgServiceTime` min)
   - Avg Wait Time (`avgWaitTime` min)
   - Skip Rate (`skippedCount / totalJoined * 100`, rounded to 1 decimal, `%`)
   - Remove Rate (`removedCount / totalJoined * 100`, rounded to 1 decimal, `%`)
   - Total Joined (`totalJoined`)
   - For multi-day: values are aggregated across all days in range. `avgServiceTime` and `avgWaitTime` are weighted means (weighted by completedCount per day). Rates are computed from summed raw counts.

4. **Bar chart** (hidden for "Today" — single data point has no trend value):
   - `react-native-chart-kit` `BarChart`
   - X axis: abbreviated date labels (e.g. "Apr 7", "Apr 8")
   - Y axis: customers served (`completedCount` per day)
   - For 30-day range: wrapped in horizontal `ScrollView`

5. **Busiest hours** — "Busiest Hours" section title, then top 3 hours sorted by count descending, e.g. "10 AM — 24 customers". Aggregated across all days in range.

**States:**
- Loading: "Loading analytics..." while hooks load
- No data: "No data for this period" when no queues found in range
- Empty today: stats all zero (queue exists but no entries yet)

## Navigation

Update `apps/mobile/src/navigation/MainTabs.tsx`:
- Import `AnalyticsScreen`
- Replace `PlaceholderScreen` on the Analytics tab

## New Files Summary

```
packages/shared/src/types.ts                              # add DailyStats interface
firebase/functions/src/generate-daily-stats.ts            # Cloud Function + computeDailyStats
firebase/functions/src/index.ts                           # export generateDailyStats
firebase/functions/__tests__/generate-daily-stats.test.ts # TDD for computeDailyStats
apps/mobile/src/hooks/useTodayStats.ts
apps/mobile/src/hooks/useDateRangeStats.ts
apps/mobile/src/components/StatCard.tsx
apps/mobile/src/components/StatCard.test.tsx
apps/mobile/src/screens/AnalyticsScreen.tsx
apps/mobile/src/navigation/MainTabs.tsx                   # swap placeholder
```

## Dependencies

**New:**
- `react-native-chart-kit` — bar chart rendering
- `react-native-svg` — peer dependency (already bundled with Expo, no install needed)

Install in mobile app:
```bash
npm install react-native-chart-kit --workspace=apps/mobile
```

## Testing

**TDD tested:**
- `StatCard` — renders label, value, value with unit, value without unit (~4 tests)
- `computeDailyStats` (pure function) — empty entries, completed only, mixed statuses, avg wait time, avg service time, hourly distribution bucketing (~6 tests)

**Not tested (Firebase wrappers / screen composition):**
- `useTodayStats`
- `useDateRangeStats`
- `AnalyticsScreen`

**Expected test counts after implementation:**
- shared: 21 (unchanged)
- functions: ~24 (18 existing + ~6 new)
- web: 11 (unchanged)
- mobile: ~33 (29 existing + ~4 StatCard)
- Total: ~89
