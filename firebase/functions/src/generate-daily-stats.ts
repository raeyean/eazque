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
