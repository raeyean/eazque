import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  limit,
  onSnapshot,
} from "firebase/firestore";
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
  sessionToken: string
) {
  const [entry, setEntry] = useState<MyEntryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!queueId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, `businesses/${businessId}/queues/${queueId}/publicEntries`),
      where("sessionToken", "==", sessionToken),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = d.data();
        setEntry({
          id: d.id,
          queueNumber: data.queueNumber,
          displayNumber: data.displayNumber,
          status: data.status,
        });
      }
      setLoading(false);
    });
    return unsub;
  }, [businessId, queueId, sessionToken]);

  return { entry, loading };
}
