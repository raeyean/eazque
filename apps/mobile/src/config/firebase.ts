import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import {
  getFunctions,
  connectFunctionsEmulator,
} from "firebase/functions";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "demo-key",
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
};

const app = initializeApp(firebaseConfig);

// TODO: App Check on React Native requires @react-native-firebase/app-check
// (Play Integrity on Android, DeviceCheck/AppAttest on iOS) which needs
// either a config plugin or a bare workflow — not compatible with Expo Go.
// The web client (apps/web) has reCAPTCHA v3 App Check wired up; once we
// move mobile to a dev client / EAS build, mirror it here and flip
// enforceAppCheck on the public callables.

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app, process.env.EXPO_PUBLIC_FIRESTORE_DATABASE_ID || "ezque-dev-db");
export const functions = getFunctions(app);
export const storage = getStorage(app);

if (__DEV__) {
  const host = Platform.OS === "android" ? "10.0.2.2" : "localhost";
  try {
    connectFirestoreEmulator(db, host, 8080);
    connectFunctionsEmulator(functions, host, 5001);
  } catch {
    // Already connected — safe to ignore during Fast Refresh
  }
}
