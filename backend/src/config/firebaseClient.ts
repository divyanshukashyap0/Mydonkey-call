import { getFirestore, isFirebaseAdminInitialized } from './firebaseAdmin';

export const firestore = isFirebaseAdminInitialized ? getFirestore() : null;
