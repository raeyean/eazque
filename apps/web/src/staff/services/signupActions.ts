import { httpsCallable } from "firebase/functions";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, functions } from "../../firebase";
import { uploadBusinessLogo } from "./settingsActions";
import type { CreateBusinessAccountInput } from "@eazque/shared";

export async function createBusinessAndSignIn(
  input: CreateBusinessAccountInput,
  logoFile: File | null,
): Promise<{ businessId: string }> {
  const callable = httpsCallable<CreateBusinessAccountInput, { uid: string; businessId: string }>(
    functions,
    "createBusinessAccount",
  );
  const { data } = await callable(input);
  await signInWithEmailAndPassword(auth, input.email, input.password);
  if (logoFile) {
    await uploadBusinessLogo(data.businessId, logoFile);
  }
  return { businessId: data.businessId };
}
