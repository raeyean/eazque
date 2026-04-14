import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import type { DailyStats } from "@eazque/shared";

export function useDateRangeStats(
  businessId: string,
  startDate: string,
  endDate: string
) {
  const [statsByDate, setStatsByDate] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!startDate || !endDate) {
      setStatsByDate([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setStatsByDate([]);
    const q = query(
      collection(db, `businesses/${businessId}/dailyStats`),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setStatsByDate(snap.docs.map((d) => d.data() as DailyStats));
      setLoading(false);
    });
    return unsub;
  }, [businessId, startDate, endDate]);

  return { statsByDate, loading };
}
