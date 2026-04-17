import { doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase";
import type { FormField } from "@eazque/shared";

interface BusinessSettingsUpdate {
  name?: string;
  logo?: string;
  primaryColor?: string;
  whatsappNumber?: string;
  whatsappApiKey?: string;
  whatsappPhoneNumberId?: string;
  defaultEstimatedTimePerCustomer?: number;
  approachingThreshold?: number;
  formFields?: FormField[];
}

export async function updateBusinessSettings(
  businessId: string,
  updates: BusinessSettingsUpdate
) {
  const { whatsappApiKey, whatsappPhoneNumberId, ...publicUpdates } = updates;

  const writes: Promise<void>[] = [
    updateDoc(doc(db, "businesses", businessId), {
      ...publicUpdates,
      updatedAt: serverTimestamp(),
    }),
  ];

  if (whatsappApiKey !== undefined || whatsappPhoneNumberId !== undefined) {
    const secretsUpdate: Record<string, string> = {};
    if (whatsappApiKey !== undefined) secretsUpdate.whatsappApiKey = whatsappApiKey;
    if (whatsappPhoneNumberId !== undefined) secretsUpdate.whatsappPhoneNumberId = whatsappPhoneNumberId;
    writes.push(
      setDoc(
        doc(db, "businesses", businessId, "secrets", "whatsapp"),
        secretsUpdate,
        { merge: true }
      )
    );
  }

  await Promise.all(writes);
}

export async function uploadBusinessLogo(
  businessId: string,
  file: File
): Promise<string> {
  const storageRef = ref(storage, `logos/${businessId}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateBusinessSettings(businessId, { logo: url });
  return url;
}
