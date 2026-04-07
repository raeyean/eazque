import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import type { Staff } from "@eazque/shared";

export function useStaff(businessId: string) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, `businesses/${businessId}/staff`),
      (snap) => {
        const members = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() ?? new Date(),
        })) as Staff[];
        setStaff(members);
        setLoading(false);
      }
    );
    return unsub;
  }, [businessId]);

  return { staff, loading };
}
