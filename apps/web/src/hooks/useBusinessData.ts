import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { BusinessPublic } from "@eazque/shared";

export function useBusinessData(businessId: string) {
  const [business, setBusiness] = useState<BusinessPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "businesses", businessId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setBusiness({
            id: snap.id,
            name: data.name,
            logo: data.logo,
            primaryColor: data.primaryColor,
            whatsappNumber: data.whatsappNumber,
            formFields: data.formFields ?? [],
            defaultEstimatedTimePerCustomer: data.defaultEstimatedTimePerCustomer,
          });
        } else {
          setError("Business not found");
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [businessId]);

  return { business, loading, error };
}
