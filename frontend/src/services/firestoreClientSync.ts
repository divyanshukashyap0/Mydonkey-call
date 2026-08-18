import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, Room, RoomParticipant, ChatMessage } from '../types';

export async function syncUserClient(user: User) {
  try {
    await setDoc(
      doc(db, 'users', user.id),
      {
        id: user.id,
        displayName: user.displayName,
        email: user.email || null,
        avatarUrl: user.avatarUrl || null,
        isGuest: user.isGuest,
        role: user.role || 'user',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err: any) {
    console.warn('[Firestore Client Sync User Notice]:', err.message);
  }
}

export async function syncRoomClient(room: Room) {
  try {
    await setDoc(
      doc(db, 'rooms', room.roomCode),
      {
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
        expiresAt: room.expiresAt,
        createdAt: room.createdAt,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err: any) {
    console.warn('[Firestore Client Sync Room Notice]:', err.message);
  }
}

export async function syncParticipantClient(roomCode: string, participant: RoomParticipant) {
  try {
    await setDoc(
      doc(db, 'rooms', roomCode, 'participants', participant.userId),
      {
        userId: participant.userId,
        role: participant.role,
        isMuted: participant.isMuted,
        isVideoOff: participant.isVideoOff,
        isOnline: participant.isOnline,
        joinedAt: participant.joinedAt,
        displayName: participant.user?.displayName || 'User',
      },
      { merge: true }
    );
  } catch (err: any) {
    console.warn('[Firestore Client Sync Participant Notice]:', err.message);
  }
}

export async function syncChatMessageClient(roomCode: string, message: ChatMessage) {
  try {
    await setDoc(doc(db, 'rooms', roomCode, 'messages', message.id), {
      id: message.id,
      senderId: message.senderId,
      senderName: message.senderName,
      content: message.content,
      createdAt: message.createdAt,
    });
  } catch (err: any) {
    console.warn('[Firestore Client Sync Message Notice]:', err.message);
  }
}
