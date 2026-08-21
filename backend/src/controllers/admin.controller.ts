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

    const { getBandwidthStats } = await import('../utils/bandwidthTracker');
    const bw = getBandwidthStats();

    const statsPayload = {
      totalUsers,
      totalRooms,
      totalVideos,
      totalWatchEvents,
      totalStorageBytes,
      totalHttpBytesServed: bw.totalHttpBytesServed,
      totalHttpRequestsServed: bw.totalHttpRequestsServed,
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

export async function getAdminRooms(req: AuthRequest, res: Response) {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        host: {
          select: { id: true, displayName: true, email: true },
        },
        currentVideo: {
          select: { id: true, title: true, sourceType: true, manifestUrl: true, youtubeUrl: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, displayName: true, email: true },
            },
          },
        },
      },
    });

    const formattedRooms = rooms.map((r) => ({
      id: r.id,
      roomCode: r.roomCode,
      name: r.name,
      hostId: r.hostId,
      hostDisplayName: r.host?.displayName || 'Unknown Host',
      hostEmail: r.host?.email || 'N/A',
      controlMode: r.controlMode,
      isLocked: r.isLocked,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      currentVideo: r.currentVideo ? {
        id: r.currentVideo.id,
        title: r.currentVideo.title,
        sourceType: r.currentVideo.sourceType,
      } : null,
      activeParticipantCount: r.participants.filter(p => p.isOnline).length,
      totalParticipantCount: r.participants.length,
      participants: r.participants.map((p) => ({
        userId: p.userId,
        displayName: p.user?.displayName || 'Guest User',
        role: p.role,
        isOnline: p.isOnline,
      })),
    }));

    return res.json({ rooms: formattedRooms });
  } catch (error: any) {
    console.error('Admin rooms error:', error);
    return res.status(500).json({ error: 'Failed to fetch rooms details' });
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
      take: 50,
      select: {
        id: true,
        ownerId: true,
        sourceType: true,
        title: true,
        youtubeUrl: true,
        youtubeVideoId: true,
        originalFileName: true,
        fileSize: true,
        duration: true,
        mimeType: true,
        status: true,
        manifestUrl: true,
        thumbnailUrl: true,
        createdAt: true,
        updatedAt: true,
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

export async function deleteAdminRoom(req: AuthRequest, res: Response) {
  try {
    const { roomId } = req.params;
    if (!roomId) {
      return res.status(400).json({ error: 'roomId is required' });
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Emit room:ended via Socket.IO to connected participants
    try {
      const { getIO } = await import('../websocket/socketHandler');
      const io = getIO();
      if (io) {
        io.to(`room:${room.roomCode}`).emit('room:ended');
      }
    } catch {
      // Ignore socket emit error
    }

    await prisma.room.delete({ where: { id: roomId } });
    console.log(`🛡️ Admin deleted & expired room ${room.roomCode} (${room.name})`);

    return res.json({ success: true, message: `Room ${room.roomCode} expired and deleted successfully` });
  } catch (error: any) {
    console.error('Delete admin room error:', error);
    return res.status(500).json({ error: 'Failed to delete/expire room' });
  }
}
