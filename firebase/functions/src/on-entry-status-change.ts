import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { db } from "./config";
import { paths } from "./paths";
import { calculateNewAverage } from "./queue-logic";
import { sendWhatsAppNotification } from "./whatsapp";

export const onEntryStatusChange = onDocumentUpdated(
  "businesses/{businessId}/queues/{queueId}/entries/{entryId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after || before.status === after.status) return;

    const { businessId, queueId } = event.params;
    const newStatus: string = after.status;

    // Status → "completed": update rolling average on queue
    if (newStatus === "completed" && after.servedAt && after.completedAt) {
      const servedAt = after.servedAt.toDate();
      const completedAt = after.completedAt.toDate();
      const durationMinutes =
        (completedAt.getTime() - servedAt.getTime()) / 60000;

      const queueRef = db.doc(paths.queue(businessId, queueId));
      const queueSnap = await queueRef.get();
      if (!queueSnap.exists) return;
      const queue = queueSnap.data()!;

      const { newAvg, newCount } = calculateNewAverage(
        queue.avgServiceTime,
        queue.completedCount,
        durationMinutes
      );

      await queueRef.update({
        avgServiceTime: newAvg,
        completedCount: newCount,
      });
    }

    // Status → "serving" or "skipped": send WhatsApp notification
    if (newStatus === "serving" || newStatus === "skipped") {
      const businessSnap = await db.doc(paths.business(businessId)).get();
      const business = businessSnap.data();
      if (!business?.whatsappApiKey || !business?.whatsappPhoneNumberId) return;
      if (!after.phone) return;

      const template = newStatus === "serving" ? "your_turn" : "skipped";
      await sendWhatsAppNotification({
        apiKey: business.whatsappApiKey,
        phoneNumberId: business.whatsappPhoneNumberId,
        to: after.phone,
        template,
        params: {
          businessName: business.name,
          displayNumber: after.displayNumber,
        },
      });
    }
  }
);
