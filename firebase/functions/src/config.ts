import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = initializeApp();
export const db = getFirestore(app, process.env.FIRESTORE_DATABASE_ID || "ezque-dev-db");
