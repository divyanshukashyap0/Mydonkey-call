import { Response } from 'express';
import { prisma } from '../db/prisma';
import { serializeVideo } from '../websocket/socketHandler';
import { AuthRequest } from '../middleware/auth';
import { getFirestore, isFirebaseAdminInitialized } from '../config/firebaseAdmin';

// Helper to sync admin stats & records to Firestore
async function syncToFirestore(collectionName: string, docId: string, data: any) {
  if (!isFirebaseAdminInitialized) return;
  try {
    const db = getFirestore();
    await db.collection(collectionName).doc(docId).set(data, { merge: true });
  } catch (err: any) {
    console.warn(`Firestore sync warning [${collectionName}/${docId}]:`, err.message);
  }
}

export async function getAdminStats(req: AuthRequest, res: Response) {
  try {
    const totalUsers = await prisma.user.count();
    const totalRooms = await prisma.room.count();
    const totalVideos = await prisma.video.count();
    const watchHistoryModel = (prisma as any).watchHistory;
    const totalWatchEvents = watchHistoryModel ? await watchHistoryModel.count() : 0;

    const videos = await prisma.video.findMany({ select: { fileSize: true } });
    const totalStorageBytes = videos.reduce((acc, v) => acc + (v.fileSize ? Number(v.fileSize) : 0), 0);

    const statsPayload = {
      totalUsers,
      totalRooms,
      totalVideos,
      totalWatchEvents,
      totalStorageBytes,
      updatedAt: new Date().toISOString(),
    };

    // Sync stats payload into Firestore
    await syncToFirestore('admin', 'system_stats', statsPayload);

    return res.json({ stats: statsPayload });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
}

export async function getAdminUsers(req: AuthRequest, res: Response) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            rooms: true,
            participants: true,
            videos: true,
          },
        },
      },
    });

    const formattedUsers = users.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      email: u.email || 'N/A',
      avatarUrl: u.avatarUrl,
      isGuest: u.isGuest,
      role: (u as any).role || 'user',
      createdAt: u.createdAt.toISOString(),
      roomsCreated: u._count.rooms,
      videosUploaded: u._count.videos,
    }));

    // Sync users array into Firestore for admin access
    for (const u of formattedUsers) {
      await syncToFirestore('users', u.id, u);
    }

    return res.json({ users: formattedUsers });
  } catch (error: any) {
    console.error('Admin users error:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

export async function updateUserRole(req: AuthRequest, res: Response) {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!userId || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Valid userId and role ("admin" | "user") required' });
    }

    const updatedUser = await (prisma.user as any).update({
      where: { id: userId },
      data: { role },
    });

    // Sync role to Firestore document
    await syncToFirestore('users', userId, { role, updatedAt: new Date().toISOString() });

    return res.json({
      message: `User role updated to ${role}`,
      user: {
        id: updatedUser.id,
        displayName: updatedUser.displayName,
        role: updatedUser.role,
      },
    });
  } catch (error: any) {
    console.error('Update user role error:', error);
    return res.status(500).json({ error: 'Failed to update user role' });
  }
}

export async function toggleAdminSelf(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const targetRole = req.user.role === 'admin' ? 'user' : 'admin';

    const updatedUser = await (prisma.user as any).update({
      where: { id: req.user.id },
      data: { role: targetRole },
    });

    await syncToFirestore('users', req.user.id, { role: targetRole, updatedAt: new Date().toISOString() });

    return res.json({
      message: `Your role is now ${targetRole}`,
      role: targetRole,
      user: {
        id: updatedUser.id,
        displayName: updatedUser.displayName,
        role: updatedUser.role,
      },
    });
  } catch (error: any) {
    console.error('Toggle admin self error:', error);
    return res.status(500).json({ error: 'Failed to toggle role' });
  }
}

export async function getAdminWatchHistory(req: AuthRequest, res: Response) {
  try {
    const watchHistoryModel = (prisma as any).watchHistory;
    if (!watchHistoryModel) {
      return res.json({ watchHistory: [] });
    }

    const history = await watchHistoryModel.findMany({
      orderBy: { watchedAt: 'desc' },
      take: 100,
      include: {
        user: {
          select: { id: true, displayName: true, email: true, isGuest: true, role: true },
        },
      },
    });

    const formattedHistory = history.map((item: any) => ({
      id: item.id,
      userId: item.userId,
      userDisplayName: item.user?.displayName || 'Unknown User',
      userEmail: item.user?.email || (item.user?.isGuest ? 'Guest User' : 'N/A'),
      roomCode: item.roomCode,
      videoTitle: item.videoTitle,
      sourceType: item.sourceType,
      youtubeUrl: item.youtubeUrl,
      thumbnail: item.thumbnail,
      watchedAt: item.watchedAt instanceof Date ? item.watchedAt.toISOString() : item.watchedAt,
    }));

    return res.json({ watchHistory: formattedHistory });
  } catch (error: any) {
    console.error('Admin watch history error:', error);
    return res.status(500).json({ error: 'Failed to fetch watch history' });
  }
}

export async function getAdminVideos(req: AuthRequest, res: Response) {
  try {
    const videos = await prisma.video.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });

    const formattedVideos = videos.map((v) => ({
      ...serializeVideo(v),
      ownerDisplayName: v.owner?.displayName || 'Unknown',
      ownerEmail: v.owner?.email || 'N/A',
    }));

    return res.json({ videos: formattedVideos });
  } catch (error: any) {
    console.error('Admin videos error:', error);
    return res.status(500).json({ error: 'Failed to fetch video metadata' });
  }
}
