import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { db } from "./config";
import { paths } from "./paths";

const schema = z.object({
  businessId: z.string().min(1),
  queueId: z.string().min(1),
  entryId: z.string().min(1),
  sessionToken: z.string().uuid(),
});

export const customerRemoveSelf = onCall({ cors: true, invoker: "public" }, async (request) => {
  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data");
  }

  const { businessId, queueId, entryId, sessionToken } = parsed.data;

  // Read the private entry (admin SDK bypasses Firestore rules). The private
  // `entries` collection is staff-only readable, so the token it holds cannot
  // be harvested by an unauthenticated attacker.
  const entryRef = db.doc(paths.entry(businessId, queueId, entryId));
  const entrySnap = await entryRef.get();

  if (!entrySnap.exists) {
    throw new HttpsError("not-found", "Queue entry not found");
  }

  const entry = entrySnap.data()!;
  if (entry.sessionToken !== sessionToken) {
    // Do not leak whether the entry exists vs. the token mismatched.
    throw new HttpsError("not-found", "Queue entry not found");
  }

  if (entry.status !== "waiting") {
    throw new HttpsError("failed-precondition", "Entry cannot be removed in its current state");
  }

  const batch = db.batch();
  batch.update(entryRef, { status: "removed" });
  batch.update(db.doc(paths.publicEntry(businessId, queueId, entryId)), { status: "removed" });
  await batch.commit();

  return { success: true };
});
