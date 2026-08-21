import { getFirestore, isFirebaseAdminInitialized } from '../config/firebaseAdmin';
import { prisma } from '../db/prisma';

export interface FriendProfile {
  friendUid: string;
  friendDisplayName: string;
  friendEmail?: string | null;
  friendPhotoURL?: string | null;
  addedAt: string;
}

export interface FriendRequest {
  senderUid: string;
  senderDisplayName: string;
  senderEmail?: string | null;
  senderPhotoURL?: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  sentAt: string;
}

export async function sendFriendRequest(senderUid: string, senderName: string, targetEmail: string): Promise<{ success: boolean; message: string }> {
  try {
    // Find target user by email in Prisma DB or Firestore
    const targetUser = await prisma.user.findUnique({ where: { email: targetEmail.trim() } });
    if (!targetUser) {
      return { success: false, message: 'No user found with this email address.' };
    }

    if (targetUser.id === senderUid) {
      return { success: false, message: 'You cannot send a friend request to yourself.' };
    }

    if (!isFirebaseAdminInitialized) {
      return { success: true, message: `Friend request sent to ${targetUser.displayName}!` };
    }

    const db = getFirestore();
    const reqRef = db.collection('users').doc(targetUser.id).collection('friendRequests').doc(senderUid);

    await reqRef.set({
      senderUid,
      senderDisplayName: senderName,
      senderEmail: targetUser.email,
      status: 'PENDING',
      sentAt: new Date().toISOString(),
    });

    return { success: true, message: `Friend request sent to ${targetUser.displayName}!` };
  } catch (error: any) {
    console.error('Send friend request error:', error.message);
    return { success: false, message: 'Failed to send friend request.' };
  }
}

export async function respondToFriendRequest(recipientUid: string, recipientName: string, senderUid: string, action: 'accept' | 'decline'): Promise<boolean> {
  if (!isFirebaseAdminInitialized) return true;

  try {
    const db = getFirestore();
    const reqRef = db.collection('users').doc(recipientUid).collection('friendRequests').doc(senderUid);

    if (action === 'decline') {
      await reqRef.delete();
      return true;
    }

    const reqDoc = await reqRef.get();
    if (!reqDoc.exists) return false;

    const requestData = reqDoc.data() as FriendRequest;
    const now = new Date().toISOString();

    // Add friend to recipient's friends collection
    await db.collection('users').doc(recipientUid).collection('friends').doc(senderUid).set({
      friendUid: senderUid,
      friendDisplayName: requestData.senderDisplayName,
      friendEmail: requestData.senderEmail || null,
      addedAt: now,
    });

    // Add friend to sender's friends collection
    await db.collection('users').doc(senderUid).collection('friends').doc(recipientUid).set({
      friendUid: recipientUid,
      friendDisplayName: recipientName,
      addedAt: now,
    });

    // Remove pending request
    await reqRef.delete();
    return true;
  } catch (error: any) {
    console.error('Respond to friend request error:', error.message);
    return false;
  }
}

export async function getUserFriends(uid: string): Promise<FriendProfile[]> {
  const friendsMap = new Map<string, FriendProfile>();

  // 1. Fetch past room companions from Prisma DB
  try {
    const userRooms = await prisma.roomParticipant.findMany({
      where: { userId: uid },
      select: { roomId: true },
    });

    const roomIds = userRooms.map((r) => r.roomId);

    if (roomIds.length > 0) {
      const roomCompanions = await prisma.roomParticipant.findMany({
        where: {
          roomId: { in: roomIds },
          userId: { not: uid },
        },
        include: {
          user: {
            select: { id: true, displayName: true, email: true, avatarUrl: true, isGuest: true },
          },
          room: {
            select: { roomCode: true, name: true, createdAt: true },
          },
        },
        orderBy: { joinedAt: 'desc' },
        take: 100,
      });

      for (const comp of roomCompanions) {
        if (comp.user && !friendsMap.has(comp.userId)) {
          friendsMap.set(comp.userId, {
            friendUid: comp.user.id,
            friendDisplayName: comp.user.displayName || 'Room Member',
            friendEmail: comp.user.email || (comp.user.isGuest ? `Room companion in #${comp.room.roomCode}` : `Shared Room #${comp.room.roomCode}`),
            friendPhotoURL: comp.user.avatarUrl || null,
            addedAt: comp.joinedAt ? comp.joinedAt.toISOString() : new Date().toISOString(),
          });
        }
      }
    }
  } catch (err: any) {
    console.warn('Prisma room companions fetch notice:', err.message);
  }

  // 2. Fetch explicit friends from Firestore if initialized
  if (isFirebaseAdminInitialized) {
    try {
      const db = getFirestore();
      const snapshot = await db.collection('users').doc(uid).collection('friends').get();
      snapshot.docs.forEach((doc) => {
        const data = doc.data() as FriendProfile;
        if (data && data.friendUid) {
          friendsMap.set(data.friendUid, data);
        }
      });
    } catch (error: any) {
      console.error('Get user friends error:', error.message);
    }
  }

  return Array.from(friendsMap.values());
}

export async function getPendingFriendRequests(uid: string): Promise<FriendRequest[]> {
  if (!isFirebaseAdminInitialized) return [];

  try {
    const db = getFirestore();
    const snapshot = await db.collection('users').doc(uid).collection('friendRequests').get();
    return snapshot.docs.map((doc) => doc.data() as FriendRequest);
  } catch (error: any) {
    console.error('Get pending friend requests error:', error.message);
    return [];
  }
}
