import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { db } from "./config";
import { paths } from "./paths";

const schema = z.object({
  businessId: z.string().min(1),
  queueId: z.string().min(1),
  sessionToken: z.string().uuid(),
});

export const customerRemoveSelf = onCall({ cors: true, invoker: "public" }, async (request) => {
  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data");
  }

  const { businessId, queueId, sessionToken } = parsed.data;

  const snap = await db
    .collection(paths.publicEntries(businessId, queueId))
    .where("sessionToken", "==", sessionToken)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new HttpsError("not-found", "Queue entry not found");
  }

  const publicEntryDoc = snap.docs[0];
  if (publicEntryDoc.data().status !== "waiting") {
    throw new HttpsError("failed-precondition", "Entry cannot be removed in its current state");
  }

  const entryId = publicEntryDoc.id;
  const batch = db.batch();
  batch.update(db.doc(paths.entry(businessId, queueId, entryId)), { status: "removed" });
  batch.update(db.doc(paths.publicEntry(businessId, queueId, entryId)), { status: "removed" });
  await batch.commit();

  return { success: true };
});
