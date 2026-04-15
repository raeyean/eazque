import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

export async function addStaffMember(
  businessId: string,
  email: string,
  name: string,
  password: string
): Promise<void> {
  await httpsCallable(functions, "createStaffAccount")({
    businessId,
    name,
    email,
    password,
  });
}

export async function removeStaffMember(
  businessId: string,
  staffId: string
): Promise<void> {
  await httpsCallable(functions, "removeStaffAccount")({ businessId, staffId });
}
