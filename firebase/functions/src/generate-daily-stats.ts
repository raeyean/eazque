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
    await db.doc(paths.dailyStat(businessId, date)).set(stats, { merge: true });
  }
});
