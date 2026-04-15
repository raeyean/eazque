import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";

export async function createStaffAccount(
  businessId: string,
  name: string,
  email: string,
  password: string
): Promise<void> {
  await httpsCallable(functions, "createStaffAccount")({
    businessId,
    name,
    email,
    password,
  });
}

export async function removeStaffAccount(
  businessId: string,
  staffId: string
): Promise<void> {
  await httpsCallable(functions, "removeStaffAccount")({ businessId, staffId });
}
