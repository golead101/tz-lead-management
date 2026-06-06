import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAFTmI2biNBtFEwGJV-8VRZmnzA_zc3Qb0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "tz-lead-management.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "tz-lead-management",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "tz-lead-management.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "529280013393",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:529280013393:web:1b8ed047dec4e587465470",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-7H2WRZJZ1Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app);
const auth = getAuth(app);

// Analytics is only initialized if supported in the user browser environment
let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (err) {
  console.warn("Firebase Analytics initialization skipped or failed: ", err);
}

export { app, db, auth, analytics };
