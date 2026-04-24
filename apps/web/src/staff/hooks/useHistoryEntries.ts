import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import type { QueueEntry } from "@eazque/shared";

export const HISTORY_LIMIT = 200;

export function useHistoryEntries(businessId: string, queueId: string | null) {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [capped, setCapped] = useState(false);

  useEffect(() => {
    if (!queueId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, `businesses/${businessId}/queues/${queueId}/entries`),
      where("status", "in", ["completed", "skipped", "removed"]),
      orderBy("queueNumber"),
      limit(HISTORY_LIMIT)
    );
    const unsub = onSnapshot(q, (snap) => {
      setCapped(snap.docs.length >= HISTORY_LIMIT);
      setEntries(
        snap.docs.map((d) => {
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
      );
      setLoading(false);
    });
    return unsub;
  }, [businessId, queueId]);

  return { entries, loading, capped };
}
