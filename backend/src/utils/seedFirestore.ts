import { prisma } from '../db/prisma';
import {
  syncUserToFirestore,
  syncRoomToFirestore,
  syncParticipantToFirestore,
  syncVideoMetadataToFirestore,
  syncChatMessageToFirestore,
} from '../services/firestoreSync';

async function seed() {
  console.log('🚀 Starting Cloud Firestore Data Synchronization from SQLite...');

  // 1. Sync Users
  const users = await prisma.user.findMany();
  console.log(`👤 Syncing ${users.length} Users to Firestore...`);
  for (const u of users) {
    await syncUserToFirestore({
      id: u.id,
      displayName: u.displayName,
      email: u.email,
      avatarUrl: u.avatarUrl,
      isGuest: u.isGuest,
      role: (u as any).role || 'user',
    });
  }

  // 2. Sync Rooms
  const rooms = await prisma.room.findMany({
    include: {
      participants: {
        include: { user: { select: { displayName: true } } },
      },
      messages: {
        include: { sender: { select: { displayName: true } } },
      },
    },
  });

  console.log(`🏠 Syncing ${rooms.length} Rooms to Firestore...`);
  for (const r of rooms) {
    await syncRoomToFirestore(r);

    for (const p of r.participants) {
      await syncParticipantToFirestore(r.roomCode, p);
    }

    for (const m of r.messages) {
      await syncChatMessageToFirestore(r.roomCode, {
        id: m.id,
        senderId: m.senderId,
        senderName: m.sender?.displayName || 'User',
        content: m.content,
        createdAt: m.createdAt,
      });
    }
  }

  // 3. Sync Video Metadata
  const videos = await prisma.video.findMany();
  console.log(`🎬 Syncing ${videos.length} Videos Metadata to Firestore...`);
  for (const v of videos) {
    await syncVideoMetadataToFirestore(v);
  }

  // 4. Sync Watch History
  const watchHistoryModel = (prisma as any).watchHistory;
  if (watchHistoryModel) {
    const history = await watchHistoryModel.findMany();
    console.log(`📜 Syncing ${history.length} Watch History items to Firestore...`);
    for (const h of history) {
      await syncUserToFirestore({ id: h.userId, displayName: 'User', isGuest: false });
    }
  }

  console.log('🎉 Cloud Firestore Data Population Complete!');
}

seed()
  .catch((err) => console.error('Seed error:', err))
  .finally(() => process.exit(0));
