import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import type { Business } from "@eazque/shared";

export function useBusinessSettings(businessId: string) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "businesses", businessId),
      (snap) => {
        if (snap.exists()) {
          setBusiness({ id: snap.id, ...snap.data() } as Business);
        }
        setLoading(false);
      }
    );
    return unsub;
  }, [businessId]);

  return { business, loading };
}
