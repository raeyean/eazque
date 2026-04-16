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
