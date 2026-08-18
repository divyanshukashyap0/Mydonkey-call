import { Response } from 'express';
import { prisma } from '../db/prisma';
import { generateRoomCode } from '../utils/roomCode';
import { AuthRequest } from '../middleware/auth';
import { serializeVideo } from '../websocket/socketHandler';
import { syncRoomToFirestore, syncParticipantToFirestore } from '../services/firestoreSync';

export async function createRoom(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User must be authenticated to create a room' });
    }

    const { name, controlMode } = req.body;
    const roomName = name?.trim() || `${req.user.displayName}'s Cinema`;
    
    // Generate unique room code
    let roomCode = generateRoomCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const existing = await prisma.room.findUnique({ where: { roomCode } });
      if (!existing) {
        isUnique = true;
      } else {
        roomCode = generateRoomCode();
        attempts++;
      }
    }

    if (!isUnique) {
      return res.status(500).json({ error: 'Failed to generate unique room code' });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Hours

    const room = await prisma.room.create({
      data: {
        roomCode,
        name: roomName,
        hostId: req.user.id,
        controlMode: controlMode === 'EVERYONE' ? 'EVERYONE' : 'HOST_ONLY',
        playbackState: 'PAUSED',
        playbackPosition: 0.0,
        playbackRate: 1.0,
        expiresAt,
        participants: {
          create: {
            userId: req.user.id,
            role: 'HOST',
            isOnline: true,
          },
        },
      },
      include: {
        host: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        participants: {
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true, isGuest: true } },
          },
        },
      },
    });

    syncRoomToFirestore(room).catch(() => {});

    return res.status(201).json({ room });
  } catch (error: any) {
    console.error('Create Room Error:', error);
    return res.status(500).json({ error: 'Failed to create room' });
  }
}

export async function getRoomByCode(req: AuthRequest, res: Response) {
  try {
    const { roomCode } = req.params;
    const normalizedCode = roomCode.toUpperCase().trim();

    const room = await prisma.room.findUnique({
      where: { roomCode: normalizedCode },
      include: {
        host: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        currentVideo: true,
        participants: {
          where: { isOnline: true },
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true, isGuest: true } },
          },
        },
      },
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (new Date() > room.expiresAt) {
      return res.status(410).json({ error: 'Room has expired' });
    }

    const formattedRoom = {
      ...room,
      currentVideo: serializeVideo(room.currentVideo),
    };

    return res.json({ room: formattedRoom });
  } catch (error: any) {
    console.error('Get Room Error:', error);
    return res.status(500).json({ error: 'Failed to fetch room details' });
  }
}

export async function joinRoom(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User must be authenticated' });
    }

    const { roomCode } = req.params;
    const normalizedCode = roomCode.toUpperCase().trim();

    const room = await prisma.room.findUnique({
      where: { roomCode: normalizedCode },
      include: {
        participants: { where: { isOnline: true } },
      },
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.isLocked && room.hostId !== req.user.id) {
      return res.status(403).json({ error: 'Room is locked by the host' });
    }

    if (room.participants.length >= room.maxParticipants) {
      return res.status(403).json({ error: 'Room is full' });
    }

    // Upsert participant status
    const participant = await prisma.roomParticipant.upsert({
      where: {
        roomId_userId: {
          roomId: room.id,
          userId: req.user.id,
        },
      },
      update: {
        isOnline: true,
      },
      create: {
        roomId: room.id,
        userId: req.user.id,
        role: room.hostId === req.user.id ? 'HOST' : 'PARTICIPANT',
        isOnline: true,
      },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true, isGuest: true } },
      },
    });

    return res.json({ room, participant });
  } catch (error: any) {
    console.error('Join Room Error:', error);
    return res.status(500).json({ error: 'Failed to join room' });
  }
}
