import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";
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

    const [businessSnap, secretsSnap] = await Promise.all([
      db.doc(paths.business(businessId)).get(),
      db.doc(paths.businessSecrets(businessId)).get(),
    ]);
    const business = businessSnap.data();
    const secrets = secretsSnap.data();
    if (!secrets?.whatsappApiKey || !secrets?.whatsappPhoneNumberId) return;

    // Get all waiting entries (real entries — Cloud Functions have admin access)
    const entriesSnap = await db
      .collection(paths.entries(businessId, queueId))
      .where("status", "==", "waiting")
      .get();

    const waitingEntries = entriesSnap.docs
      .filter((doc) => !doc.data().approachingNotifiedAt)
      .map((doc) => ({
        id: doc.id,
        queueNumber: doc.data().queueNumber as number,
        phone: doc.data().phone as string,
        displayNumber: doc.data().displayNumber as string,
      }));

    const approaching = findApproachingEntries(
      after.currentNumber,
      business?.approachingThreshold ?? 3,
      waitingEntries
    );

    if (approaching.length === 0) return;

    await Promise.all(
      approaching.map((entry) =>
        sendWhatsAppNotification({
          apiKey: secrets.whatsappApiKey,
          phoneNumberId: secrets.whatsappPhoneNumberId,
          to: entry.phone,
          template: "approaching",
          params: {
            businessName: business?.name ?? "",
            displayNumber: entry.displayNumber,
          },
        })
      )
    );

    const batch = db.batch();
    for (const entry of approaching) {
      batch.update(db.doc(paths.entry(businessId, queueId, entry.id)), {
        approachingNotifiedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }
);
