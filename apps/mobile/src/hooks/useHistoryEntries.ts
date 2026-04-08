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
