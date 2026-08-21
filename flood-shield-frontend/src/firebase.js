import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
// Fallbacks are provided from the user request configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAjGur5bC32aIE0S1rJU2cLzXdsQ0sZvL4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "simple-firebase-project-ccb52.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "simple-firebase-project-ccb52",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "simple-firebase-project-ccb52.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "673704912573",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:673704912573:web:2d76f37f47858952c3b9d4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
