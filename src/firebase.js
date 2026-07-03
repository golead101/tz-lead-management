import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBLgkzpLOXjk-cyhp5usY-S9NJFeYRYg3Q",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "leads-management-tz.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "leads-management-tz",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "leads-management-tz.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "415409819020",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:415409819020:web:0c94cf5514d099479d5aa9",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-J0HHE95DXB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app);

// Analytics is only initialized if supported in the user browser environment
let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (err) {
  console.warn("Firebase Analytics initialization skipped or failed: ", err);
}

export { app, db, auth, functions, analytics };
// Rebuild trigger: 2026-07-03T10:44:00Z

