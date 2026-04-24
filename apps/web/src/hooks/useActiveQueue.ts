import { useState, useEffect } from "react";
import { collection, query, where, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { Queue } from "@eazque/shared";
import { localDateString } from "@eazque/shared";

export function useActiveQueue(businessId: string) {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = localDateString();
    const q = query(
      collection(db, `businesses/${businessId}/queues`),
      where("date", "==", today),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        setQueue({ id: d.id, ...d.data() } as Queue);
        setQueueId(d.id);
      } else {
        setQueue(null);
        setQueueId(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [businessId]);

  return { queue, queueId, loading };
}
