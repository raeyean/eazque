import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { QueueEntryPublic } from "@eazque/shared";

export function useQueueEntries(
  businessId: string,
  queueId: string | null
) {
  const [entries, setEntries] = useState<QueueEntryPublic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!queueId) return;

    const q = query(
      collection(db, `businesses/${businessId}/queues/${queueId}/entries`),
      where("status", "in", ["waiting", "serving"])
    );
    const unsub = onSnapshot(q, (snap) => {
      const sorted = snap.docs
        .map((d) => ({
          id: d.id,
          queueNumber: d.data().queueNumber as number,
          displayNumber: d.data().displayNumber as string,
          status: d.data().status,
        }))
        .sort((a, b) => a.queueNumber - b.queueNumber);
      setEntries(sorted);
      setLoading(false);
    });
    return unsub;
  }, [businessId, queueId]);

  return { entries, loading };
}
