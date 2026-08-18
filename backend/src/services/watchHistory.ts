import { prisma } from '../db/prisma';
import { getFirestore, isFirebaseAdminInitialized } from '../config/firebaseAdmin';

export interface WatchHistoryItem {
  id?: string;
  roomCode: string;
  videoTitle: string;
  sourceType: 'YOUTUBE' | 'UPLOADED';
  youtubeUrl?: string | null;
  thumbnail?: string | null;
  watchedAt: string;
}

export async function saveWatchHistoryItem(uid: string, item: WatchHistoryItem): Promise<void> {
  try {
    // 1. Save to SQLite database via Prisma
    const watchHistoryModel = (prisma as any).watchHistory;
    if (watchHistoryModel) {
      await watchHistoryModel.create({
        data: {
          userId: uid,
          roomCode: item.roomCode,
          videoTitle: item.videoTitle,
          sourceType: item.sourceType,
          youtubeUrl: item.youtubeUrl || null,
          thumbnail: item.thumbnail || null,
          watchedAt: item.watchedAt ? new Date(item.watchedAt) : new Date(),
        },
      });
      console.log(`🎬 Watch History saved to DB for user ${uid}: ${item.videoTitle}`);
    }

    // 2. Also save to Cloud Firestore if initialized
    if (isFirebaseAdminInitialized) {
      const db = getFirestore();
      const historyRef = db.collection('users').doc(uid).collection('watchHistory').doc();
      await historyRef.set({
        id: historyRef.id,
        ...item,
        watchedAt: item.watchedAt || new Date().toISOString(),
      });
    }
  } catch (error: any) {
    console.error('Save watch history error:', error.message);
  }
}

export async function getUserWatchHistory(uid: string, limit = 20): Promise<WatchHistoryItem[]> {
  try {
    const watchHistoryModel = (prisma as any).watchHistory;
    if (watchHistoryModel) {
      const records = await watchHistoryModel.findMany({
        where: { userId: uid },
        orderBy: { watchedAt: 'desc' },
        take: limit,
      });

      if (records.length > 0) {
        return records.map((r: any) => ({
          id: r.id,
          roomCode: r.roomCode,
          videoTitle: r.videoTitle,
          sourceType: r.sourceType as 'YOUTUBE' | 'UPLOADED',
          youtubeUrl: r.youtubeUrl,
          thumbnail: r.thumbnail,
          watchedAt: r.watchedAt.toISOString(),
        }));
      }
    }

    // Fallback to Firestore if DB record empty
    if (isFirebaseAdminInitialized) {
      const db = getFirestore();
      const snapshot = await db
        .collection('users')
        .doc(uid)
        .collection('watchHistory')
        .orderBy('watchedAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => doc.data() as WatchHistoryItem);
    }
  } catch (error: any) {
    console.error('Get watch history error:', error.message);
  }

  return [];
}
