import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { db } from "./config";
import { paths } from "./paths";

export const removeStaffAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const { businessId, staffId } = request.data as {
    businessId: string;
    staffId: string;
  };

  if (request.auth.uid !== businessId) {
    throw new HttpsError(
      "permission-denied",
      "Only the business owner can remove staff"
    );
  }

  if (!staffId) {
    throw new HttpsError("invalid-argument", "staffId is required");
  }

  try {
    await getAuth().deleteUser(staffId);
  } catch {
    // ignore — user may not exist in Auth
  }

  const batch = db.batch();
  batch.delete(db.doc(paths.staffMember(businessId, staffId)));
  batch.delete(db.doc(paths.staffProfile(staffId)));
  await batch.commit();
});
