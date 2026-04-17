import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";
import { joinQueueRequestSchema, estimateWaitMinutes } from "@eazque/shared";
import { db } from "./config";
import { paths } from "./paths";
import { createQueueEntryData } from "./queue-logic";

export const onCustomerJoin = onCall(async (request) => {
  const parsed = joinQueueRequestSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid request data",
      parsed.error.flatten()
    );
  }

  const { businessId, queueId, customerName, phone, formData } = parsed.data;
  const businessRef = db.doc(paths.business(businessId));
  const queueRef = db.doc(paths.queue(businessId, queueId));
  const entriesCol = db.collection(paths.entries(businessId, queueId));

  const result = await db.runTransaction(async (transaction) => {
    const [businessSnap, queueSnap] = await Promise.all([
      transaction.get(businessRef),
      transaction.get(queueRef),
    ]);

    if (!businessSnap.exists) {
      throw new HttpsError("not-found", "Business not found");
    }
    if (!queueSnap.exists) {
      throw new HttpsError("not-found", "Queue not found");
    }

    const business = businessSnap.data()!;
    const queue = queueSnap.data()!;

    if (queue.status === "paused") {
      throw new HttpsError("failed-precondition", "Queue is currently paused");
    }

    const nextNumber: number = queue.nextNumber;
    const sessionToken = crypto.randomUUID();

    const entryData = createQueueEntryData(
      nextNumber,
      customerName,
      phone,
      formData,
      sessionToken
    );

    const entryRef = entriesCol.doc();
    transaction.set(entryRef, {
      ...entryData,
      joinedAt: FieldValue.serverTimestamp(),
    });

    // Mirror public fields to publicEntries (no PII)
    const publicEntryRef = db.doc(
      paths.publicEntry(businessId, queueId, entryRef.id)
    );
    transaction.set(publicEntryRef, {
      queueNumber: nextNumber,
      displayNumber: entryData.displayNumber,
      status: "waiting",
      sessionToken,
    });

    transaction.update(queueRef, { nextNumber: nextNumber + 1 });

    const positionInQueue = nextNumber - queue.currentNumber;
    const estimatedWaitMinutes = estimateWaitMinutes({
      positionInQueue,
      avgServiceTime: queue.avgServiceTime,
      completedCount: queue.completedCount,
      defaultEstimatedTime: business.defaultEstimatedTimePerCustomer,
    });

    return {
      entryId: entryRef.id,
      queueNumber: nextNumber,
      displayNumber: entryData.displayNumber,
      sessionToken,
      currentNumber: queue.currentNumber,
      estimatedWaitMinutes,
    };
  });

  return result;
});
