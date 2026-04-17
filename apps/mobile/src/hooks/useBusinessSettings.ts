import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import type { Business, BusinessSecrets } from "@eazque/shared";

export function useBusinessSettings(businessId: string) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [secrets, setSecrets] = useState<BusinessSecrets | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let businessLoaded = false;
    let secretsLoaded = false;

    const checkDone = () => {
      if (businessLoaded && secretsLoaded) setLoading(false);
    };

    const unsubBusiness = onSnapshot(
      doc(db, "businesses", businessId),
      (snap) => {
        if (snap.exists()) {
          setBusiness({ id: snap.id, ...snap.data() } as Business);
        }
        businessLoaded = true;
        checkDone();
      }
    );

    const unsubSecrets = onSnapshot(
      doc(db, "businesses", businessId, "secrets", "whatsapp"),
      (snap) => {
        if (snap.exists()) {
          setSecrets(snap.data() as BusinessSecrets);
        }
        secretsLoaded = true;
        checkDone();
      }
    );

    return () => {
      unsubBusiness();
      unsubSecrets();
    };
  }, [businessId]);

  return { business, secrets, loading };
}
