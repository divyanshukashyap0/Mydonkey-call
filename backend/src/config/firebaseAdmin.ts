import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let isFirebaseAdminInitialized = false;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const googleCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (getApps().length === 0) {
    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      isFirebaseAdminInitialized = true;
      console.log('🔥 Firebase Admin SDK initialized with Service Account credentials.');
    } else if (googleCredentials) {
      initializeApp({ projectId });
      isFirebaseAdminInitialized = true;
      console.log('🔥 Firebase Admin SDK initialized with Application Default Credentials.');
    } else {
      isFirebaseAdminInitialized = false;
      console.log(`ℹ️ Firebase Project ID "${projectId}" configured for Cloud Firestore REST API sync.`);
    }
  } else {
    isFirebaseAdminInitialized = true;
  }
} catch (error: any) {
  console.warn('⚠️ Firebase Admin initialization notice:', error.message);
  isFirebaseAdminInitialized = false;
}

export { getAuth, getFirestore, isFirebaseAdminInitialized };
