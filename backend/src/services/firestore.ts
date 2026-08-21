import { getFirestore, isFirebaseAdminInitialized } from '../config/firebaseAdmin';

export interface FirestoreUserProfile {
  uid: string;
  email?: string | null;
  displayName: string;
  photoURL?: string | null;
  isGuest: boolean;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

export async function saveUserProfileToFirestore(profile: FirestoreUserProfile): Promise<void> {
  if (!isFirebaseAdminInitialized) {
    console.log(`[Dev Firestore Sync] Saved profile for ${profile.displayName} (${profile.uid})`);
    return;
  }

  try {
    const db = getFirestore();
    await db.collection('users').doc(profile.uid).set(
      {
        ...profile,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log(`🔥 Firestore Profile updated for ${profile.displayName} (${profile.uid})`);
  } catch (error: any) {
    console.error('Firestore save error:', error.message);
  }
}

export async function getUserProfileFromFirestore(uid: string): Promise<FirestoreUserProfile | null> {
  if (!isFirebaseAdminInitialized) return null;

  try {
    const db = getFirestore();
    const doc = await db.collection('users').doc(uid).get();
    if (doc.exists) {
      return doc.data() as FirestoreUserProfile;
    }
    return null;
  } catch (error: any) {
    console.error('Firestore get error:', error.message);
    return null;
  }
}
