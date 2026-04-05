import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { db } from "./config";
import { paths } from "./paths";
import { findApproachingEntries } from "./queue-logic";
import { sendWhatsAppNotification } from "./whatsapp";

export const onCurrentNumberAdvance = onDocumentUpdated(
  "businesses/{businessId}/queues/{queueId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    // Only react to currentNumber increases (not resets or other updates)
    if (after.currentNumber <= before.currentNumber) return;

    const { businessId, queueId } = event.params;

    const businessSnap = await db.doc(paths.business(businessId)).get();
    const business = businessSnap.data();
    if (!business?.whatsappApiKey || !business?.whatsappPhoneNumberId) return;

    // Get all waiting entries
    const entriesSnap = await db
      .collection(paths.entries(businessId, queueId))
      .where("status", "==", "waiting")
      .get();

    const waitingEntries = entriesSnap.docs.map((doc) => ({
      queueNumber: doc.data().queueNumber as number,
      phone: doc.data().phone as string,
      displayNumber: doc.data().displayNumber as string,
    }));

    const approaching = findApproachingEntries(
      after.currentNumber,
      business.approachingThreshold ?? 3,
      waitingEntries
    );

    await Promise.all(
      approaching.map((entry) =>
        sendWhatsAppNotification({
          apiKey: business.whatsappApiKey,
          phoneNumberId: business.whatsappPhoneNumberId,
          to: entry.phone,
          template: "approaching",
          params: {
            businessName: business.name,
            displayNumber: entry.displayNumber,
          },
        })
      )
    );
  }
);
