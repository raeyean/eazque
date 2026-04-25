import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export interface MyEntryData {
  id: string;
  queueNumber: number;
  displayNumber: string;
  status: string;
}

export function useMyEntry(
  businessId: string,
  queueId: string | null,
  entryId: string
) {
  const [entry, setEntry] = useState<MyEntryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!queueId || !entryId) {
      setLoading(false);
      return;
    }

    const ref = doc(
      db,
      `businesses/${businessId}/queues/${queueId}/publicEntries/${entryId}`
    );
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setEntry({
          id: snap.id,
          queueNumber: data.queueNumber,
          displayNumber: data.displayNumber,
          status: data.status,
        });
      } else {
        setEntry(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [businessId, queueId, entryId]);

  return { entry, loading };
}
