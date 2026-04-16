import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "./config";
import { paths } from "./paths";

export const createStaffAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const { businessId, name, email, password } = request.data as {
    businessId: string;
    name: string;
    email: string;
    password: string;
  };

  if (request.auth.uid !== businessId) {
    throw new HttpsError(
      "permission-denied",
      "Only the business owner can add staff"
    );
  }

  if (!name || !email || !password) {
    throw new HttpsError(
      "invalid-argument",
      "name, email, and password are required"
    );
  }

  let newUser: { uid: string };
  try {
    newUser = await getAuth().createUser({
      email,
      password,
      displayName: name,
    });
  } catch (err: any) {
    throw new HttpsError("already-exists", err.message);
  }

  const batch = db.batch();
  batch.set(db.doc(paths.staffMember(businessId, newUser.uid)), {
    name,
    email,
    role: "staff",
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(db.doc(paths.staffProfile(newUser.uid)), { businessId });
  await batch.commit();

  return { uid: newUser.uid };
});
