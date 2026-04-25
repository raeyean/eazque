import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

const app = initializeApp(firebaseConfig);

// App Check — attach a reCAPTCHA v3 token to every Firebase request so the
// backend can distinguish traffic from a real browser session vs. arbitrary
// callers. Gate on env so dev builds without a site key still work; flip
// enforceAppCheck on the public callables once volume looks healthy in the
// Firebase Console → App Check metrics tab.
const appCheckSiteKey = import.meta.env.VITE_APPCHECK_RECAPTCHA_KEY;
if (appCheckSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const db = getFirestore(app, import.meta.env.VITE_FIRESTORE_DATABASE_ID || "(default)");
export const functions = getFunctions(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === "true") {
  try {
    connectFirestoreEmulator(db, "localhost", 8080);
    connectFunctionsEmulator(functions, "localhost", 5001);
    connectAuthEmulator(auth, "http://localhost:9099");
    connectStorageEmulator(storage, "localhost", 9199);
  } catch {
    // Already connected — safe to ignore during HMR
  }
}
