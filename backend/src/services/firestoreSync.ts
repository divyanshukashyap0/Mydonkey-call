import { getFirestore as getAdminFirestore, isFirebaseAdminInitialized } from '../config/firebaseAdmin';

const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDdjInDRvVolSiunR50aK7TZlFDpUOJd3I';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'mydonkey-call';

function valueToFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(valueToFirestoreValue) } };
  if (typeof val === 'object') {
    const fields: any = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = valueToFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

/**
 * Writes/updates a document in Cloud Firestore via Admin SDK or REST API
 */
export async function setFirestoreDoc(collectionPath: string, docId: string, data: Record<string, any>) {
  // 1. Try Firebase Admin SDK if service account is configured
  if (isFirebaseAdminInitialized) {
    try {
      const db = getAdminFirestore();
      await db.collection(collectionPath).doc(docId).set(data, { merge: true });
      return;
    } catch (e) {
      // Fallback to Firestore REST API
    }
  }

  // 2. Fallback: Firestore REST API (Works directly using Web API key)
  try {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        fields[k] = valueToFirestoreValue(v);
      }
    }

    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionPath}/${docId}?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Firestore REST Warning] ${collectionPath}/${docId} (${res.status}):`, errText);
    }
  } catch (err: any) {
    console.warn(`[Firestore REST Error] ${collectionPath}/${docId}:`, err.message);
  }
}

/**
 * Deletes a document in Cloud Firestore via REST API
 */
export async function deleteFirestoreDoc(collectionPath: string, docId: string) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionPath}/${docId}?key=${FIREBASE_API_KEY}`;
    await fetch(url, { method: 'DELETE' });
  } catch (err: any) {
    console.warn(`[Firestore REST Delete Error] ${collectionPath}/${docId}:`, err.message);
  }
}

export async function syncUserToFirestore(user: {
  id: string;
  displayName: string;
  email?: string | null;
  avatarUrl?: string | null;
  isGuest: boolean;
  role?: string;
}) {
  await setFirestoreDoc('users', user.id, {
    id: user.id,
    displayName: user.displayName,
    email: user.email || null,
    avatarUrl: user.avatarUrl || null,
    isGuest: user.isGuest,
    role: user.role || 'user',
    updatedAt: new Date().toISOString(),
  });
}

export async function syncRoomToFirestore(room: {
  id: string;
  roomCode: string;
  name: string;
  hostId: string;
  currentVideoId?: string | null;
  currentVideo?: any;
  isLocked: boolean;
  controlMode: string;
  playbackState: string;
  playbackPosition: number;
  playbackRate: number;
  sequenceNumber: number;
  maxParticipants: number;
  expiresAt: Date | string;
  createdAt: Date | string;
}) {
  await setFirestoreDoc('rooms', room.roomCode, {
    id: room.id,
    roomCode: room.roomCode,
    name: room.name,
    hostId: room.hostId,
    currentVideoId: room.currentVideoId || null,
    isLocked: room.isLocked,
    controlMode: room.controlMode,
    playbackState: room.playbackState,
    playbackPosition: room.playbackPosition,
    playbackRate: room.playbackRate,
    sequenceNumber: room.sequenceNumber,
    maxParticipants: room.maxParticipants,
    expiresAt: room.expiresAt instanceof Date ? room.expiresAt.toISOString() : room.expiresAt,
    createdAt: room.createdAt instanceof Date ? room.createdAt.toISOString() : room.createdAt,
    updatedAt: new Date().toISOString(),
  });
}

export async function syncParticipantToFirestore(
  roomCode: string,
  participant: {
    userId: string;
    role: string;
    isMuted?: boolean;
    isVideoOff?: boolean;
    isOnline?: boolean;
    joinedAt?: Date | string;
    user?: any;
  }
) {
  await setFirestoreDoc(`rooms/${roomCode}/participants`, participant.userId, {
    userId: participant.userId,
    role: participant.role,
    isMuted: participant.isMuted ?? false,
    isVideoOff: participant.isVideoOff ?? false,
    isOnline: participant.isOnline ?? true,
    joinedAt: participant.joinedAt ? (participant.joinedAt instanceof Date ? participant.joinedAt.toISOString() : participant.joinedAt) : new Date().toISOString(),
    displayName: participant.user?.displayName || 'User',
  });
}

export async function removeParticipantFromFirestore(roomCode: string, userId: string) {
  await deleteFirestoreDoc(`rooms/${roomCode}/participants`, userId);
}

export async function syncVideoMetadataToFirestore(video: {
  id: string;
  ownerId: string;
  sourceType: string;
  title: string;
  youtubeUrl?: string | null;
  youtubeVideoId?: string | null;
  originalFileName?: string | null;
  fileSize?: bigint | number | null;
  duration?: number | null;
  mimeType?: string | null;
  status: string;
  manifestUrl?: string | null;
  thumbnailUrl?: string | null;
  createdAt: Date | string;
}) {
  await setFirestoreDoc('videos', video.id, {
    id: video.id,
    ownerId: video.ownerId,
    sourceType: video.sourceType,
    title: video.title,
    youtubeUrl: video.youtubeUrl || null,
    youtubeVideoId: video.youtubeVideoId || null,
    originalFileName: video.originalFileName || null,
    fileSize: video.fileSize ? Number(video.fileSize) : null,
    duration: video.duration || null,
    mimeType: video.mimeType || null,
    status: video.status,
    manifestUrl: video.manifestUrl || null,
    thumbnailUrl: video.thumbnailUrl || null,
    createdAt: video.createdAt instanceof Date ? video.createdAt.toISOString() : video.createdAt,
    updatedAt: new Date().toISOString(),
  });
}

export async function syncChatMessageToFirestore(
  roomCode: string,
  message: {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    createdAt: Date | string;
  }
) {
  await setFirestoreDoc(`rooms/${roomCode}/messages`, message.id, {
    id: message.id,
    senderId: message.senderId,
    senderName: message.senderName,
    content: message.content,
    createdAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt,
  });
}

export async function syncFriendRequestToFirestore(request: {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  createdAt?: Date | string;
}) {
  await setFirestoreDoc('friends', request.id, {
    id: request.id,
    senderId: request.senderId,
    receiverId: request.receiverId,
    status: request.status,
    createdAt: request.createdAt ? (request.createdAt instanceof Date ? request.createdAt.toISOString() : request.createdAt) : new Date().toISOString(),
  });
}

function firestoreFieldsToJSON(fields: Record<string, any> | undefined): Record<string, any> {
  if (!fields) return {};
  const res: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue !== undefined) res[k] = v.stringValue;
    else if (v.integerValue !== undefined) res[k] = Number(v.integerValue);
    else if (v.doubleValue !== undefined) res[k] = v.doubleValue;
    else if (v.booleanValue !== undefined) res[k] = v.booleanValue;
    else if (v.nullValue !== undefined) res[k] = null;
    else if (v.mapValue?.fields) res[k] = firestoreFieldsToJSON(v.mapValue.fields);
  }
  return res;
}

export async function getFirestoreDoc(collectionPath: string, docId: string): Promise<Record<string, any> | null> {
  if (!docId) return null;
  if (isFirebaseAdminInitialized) {
    try {
      const db = getAdminFirestore();
      const snap = await db.collection(collectionPath).doc(docId).get();
      if (snap.exists) return snap.data() || null;
    } catch (e) {
      // Fallback
    }
  }

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionPath}/${encodeURIComponent(docId)}?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return firestoreFieldsToJSON(json.fields);
  } catch {
    return null;
  }
}

export async function isUserAdminInFirestore(userId: string, email?: string | null): Promise<boolean> {
  try {
    // 1. Check users/{userId} document
    const userDoc = await getFirestoreDoc('users', userId);
    if (userDoc && (userDoc.role === 'admin' || userDoc.isAdmin === true)) {
      return true;
    }

    // 2. Check admins/{userId} document
    const adminDoc = await getFirestoreDoc('admins', userId);
    if (adminDoc && (adminDoc.role === 'admin' || adminDoc.isAdmin === true || Object.keys(adminDoc).length > 0)) {
      return true;
    }

    // 3. Check admins/{email} document if email provided
    if (email) {
      const emailAdminDoc = await getFirestoreDoc('admins', email.toLowerCase());
      if (emailAdminDoc && (emailAdminDoc.role === 'admin' || emailAdminDoc.isAdmin === true || Object.keys(emailAdminDoc).length > 0)) {
        return true;
      }
    }
  } catch (err: any) {
    console.warn('Firestore admin check notice:', err.message);
  }
  return false;
}
