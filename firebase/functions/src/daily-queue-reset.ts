import { onSchedule } from "firebase-functions/v2/scheduler";
import { db } from "./config";
import { buildQueueResetData } from "./queue-logic";

const TIMEZONE = process.env.DAILY_RESET_TIMEZONE ?? "UTC";

export const dailyQueueReset = onSchedule(
  { schedule: "every day 00:00", timeZone: TIMEZONE },
  async () => {
    // Use the same timezone for the date string so "today" matches the local midnight
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());
    const resetData = buildQueueResetData(today);

    const businessesSnap = await db.collection("businesses").get();

    for (const businessDoc of businessesSnap.docs) {
      const queuesSnap = await db
        .collection(`businesses/${businessDoc.id}/queues`)
        .get();

      if (queuesSnap.empty) continue;

      const batch = db.batch();
      for (const queueDoc of queuesSnap.docs) {
        batch.update(queueDoc.ref, resetData);
      }
      await batch.commit();
    }
  }
);
