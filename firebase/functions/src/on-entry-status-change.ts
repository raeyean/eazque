import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/logger";
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
    logger.info("Entry status changed", { businessId, queueId, entryId: event.params.entryId, from: before.status, to: newStatus });

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
      const [businessSnap, secretsSnap] = await Promise.all([
        db.doc(paths.business(businessId)).get(),
        db.doc(paths.businessSecrets(businessId)).get(),
      ]);
      const business = businessSnap.data();
      const secrets = secretsSnap.data();
      if (!secrets?.whatsappApiKey || !secrets?.whatsappPhoneNumberId) return;
      if (!after.phone) return;

      const template = newStatus === "serving" ? "your_turn" : "skipped";
      await sendWhatsAppNotification({
        apiKey: secrets.whatsappApiKey,
        phoneNumberId: secrets.whatsappPhoneNumberId,
        to: after.phone,
        template,
        params: {
          businessName: business?.name ?? "",
          displayNumber: after.displayNumber,
        },
      });
    }

    // Mirror status change to publicEntries
    try {
      await db.doc(paths.publicEntry(businessId, queueId, event.params.entryId))
        .update({ status: after.status });
    } catch {
      // publicEntry may not exist for entries created before this migration
    }
  }
);
