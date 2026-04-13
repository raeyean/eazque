import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase";
import { updateBusinessSettings } from "./settingsActions";

export async function uploadBusinessLogo(
  businessId: string,
  localUri: string
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const storageRef = ref(storage, `logos/${businessId}`);
  await uploadBytes(storageRef, blob);
  const url = await getDownloadURL(storageRef);
  await updateBusinessSettings(businessId, { logo: url });
  return url;
}
