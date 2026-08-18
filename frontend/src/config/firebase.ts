import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDdjInDRvVolSiunR50aK7TZlFDpUOJd3I',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'mydonkey-call.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mydonkey-call',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'mydonkey-call.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '242301161039',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:242301161039:web:050f8a71c5d58e6487243a',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-GX5L2PC2EM',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
