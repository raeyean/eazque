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
