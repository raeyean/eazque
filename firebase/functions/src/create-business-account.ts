import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { db } from "./config";
import { paths } from "./paths";
import {
  createBusinessAccountSchema,
  PRIMARY_COLOR_DEFAULT,
  DEFAULT_ESTIMATED_TIME_PER_CUSTOMER,
  APPROACHING_THRESHOLD_DEFAULT,
} from "@eazque/shared";

export async function createBusinessAccountHandler(
  data: unknown
): Promise<{ uid: string; businessId: string }> {
  const parsed = createBusinessAccountSchema.safeParse(data);
  if (!parsed.success) {
    throw new HttpsError(
      "invalid-argument",
      parsed.error.issues[0]?.message ?? "Invalid input"
    );
  }

  const {
    email,
    password,
    ownerName,
    businessName,
    whatsappNumber,
    estimatedTime,
    approachingThreshold,
    primaryColor,
    formFields,
  } = parsed.data;

  let uid: string | null = null;
  try {
    const user = await getAuth().createUser({
      email,
      password,
      displayName: ownerName,
    });
    uid = user.uid;

    const batch = db.batch();

    batch.set(db.doc(paths.business(uid)), {
      id: uid,
      name: businessName,
      logo: "",
      primaryColor: primaryColor ?? PRIMARY_COLOR_DEFAULT,
      whatsappNumber,
      defaultEstimatedTimePerCustomer:
        estimatedTime ?? DEFAULT_ESTIMATED_TIME_PER_CUSTOMER,
      approachingThreshold: approachingThreshold ?? APPROACHING_THRESHOLD_DEFAULT,
      formFields,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    batch.set(db.doc(paths.staffMember(uid, uid)), {
      id: uid,
      businessId: uid,
      name: ownerName,
      role: "owner",
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
    });

    batch.set(db.doc(paths.staffProfile(uid)), { businessId: uid });

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const queueRef = db.collection(paths.queues(uid)).doc();
    batch.set(queueRef, {
      name: "Main Queue",
      status: "active",
      currentNumber: 0,
      nextNumber: 1,
      date: today,
      avgServiceTime: 0,
      completedCount: 0,
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    logger.info("Business account created", { uid });
    return { uid, businessId: uid };
  } catch (err: any) {
    if (uid) {
      try {
        await getAuth().deleteUser(uid);
        logger.warn("Rolled back Auth user after batch failure", { uid });
      } catch {
        /* best-effort rollback */
      }
    }
    if (err instanceof HttpsError) throw err;
    if (
      err?.code === "auth/email-already-exists" ||
      err?.code === "auth/email-already-in-use"
    ) {
      throw new HttpsError("already-exists", "Email already registered");
    }
    throw new HttpsError(
      "internal",
      err?.message ?? "Failed to create business account"
    );
  }
}

// Public endpoint — App Check / rate-limiting to be added before production scale
export const createBusinessAccount = onCall(
  { cors: true, invoker: "public" },
  async (request) => {
    return createBusinessAccountHandler(request.data);
  }
);
