import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import type { FormField } from "@eazque/shared";

interface BusinessSettingsUpdate {
  name?: string;
  logo?: string;
  primaryColor?: string;
  whatsappNumber?: string;
  whatsappApiKey?: string;
  defaultEstimatedTimePerCustomer?: number;
  approachingThreshold?: number;
  formFields?: FormField[];
}

export async function updateBusinessSettings(
  businessId: string,
  updates: BusinessSettingsUpdate
) {
  await updateDoc(doc(db, "businesses", businessId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}
