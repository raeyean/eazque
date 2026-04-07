import { addDoc, deleteDoc, doc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";

export async function addStaffMember(
  businessId: string,
  email: string,
  name: string
) {
  await addDoc(collection(db, `businesses/${businessId}/staff`), {
    email,
    name,
    role: "staff",
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export async function removeStaffMember(
  businessId: string,
  staffId: string
) {
  await deleteDoc(doc(db, `businesses/${businessId}/staff/${staffId}`));
}
