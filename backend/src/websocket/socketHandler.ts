import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { AuthoritativePlaybackState, ChatMessage as ChatMessageType } from '../types';
import {
  syncUserToFirestore,
  syncRoomToFirestore,
  syncParticipantToFirestore,
  removeParticipantFromFirestore,
  syncVideoMetadataToFirestore,
  syncChatMessageToFirestore,
} from '../services/firestoreSync';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    displayName: string;
    isGuest: boolean;
  };
  currentRoomCode?: string;
}

// In-memory rate limiting map for chat messages: userId -> array of message timestamps
const userChatTimestamps = new Map<string, number[]>();

function sanitizeHTML(str: string): string {
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export function serializeVideo(video: any) {
  if (!video) return null;
  return {
    id: video.id,
    ownerId: video.ownerId,
    sourceType: video.sourceType,
    title: video.title,
    youtubeUrl: video.youtubeUrl || null,
    youtubeVideoId: video.youtubeVideoId || null,
    originalFileName: video.originalFileName || null,
    fileSize: video.fileSize !== null && video.fileSize !== undefined ? Number(video.fileSize) : null,
    duration: video.duration || 0,
    mimeType: video.mimeType || null,
    status: video.status,
    manifestUrl: video.manifestUrl || (video.id ? `/api/videos/stream/${video.id}/index.m3u8` : null),
    thumbnailUrl: video.thumbnailUrl || null,
    createdAt: video.createdAt instanceof Date ? video.createdAt.toISOString() : (video.createdAt ? new Date(video.createdAt).toISOString() : new Date().toISOString()),
    updatedAt: video.updatedAt instanceof Date ? video.updatedAt.toISOString() : (video.updatedAt ? new Date(video.updatedAt).toISOString() : new Date().toISOString()),
  };
}

export function setupSocketIO(io: SocketIOServer) {
  io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    let userId: string | null = null;
    let displayName = 'User';
    let isGuest = false;

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      userId = decoded.id || decoded.uid || decoded.sub || decoded.user_id;
      displayName = decoded.displayName || decoded.name || 'User';
      isGuest = !!decoded.isGuest;
    } catch (err) {
      const decoded = jwt.decode(token) as any;
      if (decoded) {
        userId = decoded.user_id || decoded.uid || decoded.sub || decoded.id || null;
        displayName = decoded.name || decoded.displayName || (decoded.email ? decoded.email.split('@')[0] : 'User');
        isGuest = decoded.firebase?.sign_in_provider === 'anonymous' || !!decoded.isGuest;
      }
    }

    if (!userId) {
      return next(new Error('Invalid socket authentication token'));
    }

    // Ensure User record exists in DB to satisfy foreign keys
    try {
      await prisma.user.upsert({
        where: { id: userId },
        update: { displayName },
        create: { id: userId, displayName, isGuest },
      });
    } catch (err) {
      console.error('Socket Auth User Sync Error:', err);
    }

    socket.user = {
      id: userId,
      displayName,
      isGuest,
    };
    syncUserToFirestore(socket.user).catch(() => {});
    socket.join(`user:${userId}`);
    next();
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`🔌 Socket connected: ${socket.id} (User: ${socket.user?.displayName} [${socket.user?.id}])`);

    socket.on('sync:ping', ({ clientTime }) => {
      socket.emit('sync:pong', {
        clientTime,
        serverTime: Date.now(),
      });
    });

    socket.on('room:join', async ({ roomCode }) => {
      try {
        if (!socket.user) return;
        const normalizedCode = roomCode.toUpperCase().trim();

        // Ensure user exists in database to satisfy foreign keys
        try {
          await prisma.user.upsert({
            where: { id: socket.user.id },
            update: { displayName: socket.user.displayName },
            create: {
              id: socket.user.id,
              displayName: socket.user.displayName,
              isGuest: socket.user.isGuest,
            },
          });
        } catch (userErr) {
          console.warn('User DB upsert warning during join:', userErr);
        }

        const room = await prisma.room.findUnique({
          where: { roomCode: normalizedCode },
          include: {
            currentVideo: true,
            host: { select: { id: true, displayName: true, avatarUrl: true } },
            participants: {
              include: { user: { select: { id: true, displayName: true, avatarUrl: true, isGuest: true } } },
            },
          },
        });

        if (!room) {
          socket.emit('error:message', { message: 'Room not found' });
          return;
        }

        if (room.isLocked && room.hostId !== socket.user.id) {
          socket.emit('error:message', { message: 'Room is locked by host' });
          return;
        }

        const roomSocketName = `room:${normalizedCode}`;
        socket.join(roomSocketName);
        socket.join(`user:${socket.user.id}`);
        socket.currentRoomCode = normalizedCode;

        let participant: any;
        try {
          participant = await prisma.roomParticipant.findFirst({
            where: { roomId: room.id, userId: socket.user.id },
            include: { user: { select: { id: true, displayName: true, avatarUrl: true, isGuest: true } } },
          });

          if (!participant) {
            participant = await prisma.roomParticipant.create({
              data: {
                roomId: room.id,
                userId: socket.user.id,
                role: room.hostId === socket.user.id ? 'HOST' : 'PARTICIPANT',
                isOnline: true,
              },
              include: { user: { select: { id: true, displayName: true, avatarUrl: true, isGuest: true } } },
            });
          } else {
            participant = await prisma.roomParticipant.update({
              where: { id: participant.id },
              data: { isOnline: true },
              include: { user: { select: { id: true, displayName: true, avatarUrl: true, isGuest: true } } },
            });
          }
        } catch (participantErr) {
          console.warn('Participant DB operation warning, using resilient fallback:', participantErr);
          participant = {
            id: `temp-${socket.user.id}`,
            roomId: room.id,
            userId: socket.user.id,
            role: room.hostId === socket.user.id ? 'HOST' : 'PARTICIPANT',
            joinedAt: new Date(),
            isMuted: false,
            isVideoOff: false,
            isOnline: true,
            user: {
              id: socket.user.id,
              displayName: socket.user.displayName,
              avatarUrl: null,
              isGuest: socket.user.isGuest,
            },
          };
        }

        // Sync Room & Participant state to Cloud Firestore
        syncRoomToFirestore(room).catch(() => {});
        syncParticipantToFirestore(normalizedCode, participant).catch(() => {});

        const authoritativeState: AuthoritativePlaybackState = {
          state: room.playbackState as any,
          position: room.playbackPosition,
          playbackRate: room.playbackRate,
          updatedAt: new Date(room.stateUpdatedAt).getTime(),
          sequenceNumber: room.sequenceNumber,
        };

        // Fetch recent 50 chat messages
        const dbMessages = await prisma.chatMessage.findMany({
          where: { roomId: room.id },
          orderBy: { createdAt: 'asc' },
          take: 50,
          include: { sender: { select: { displayName: true } } },
        }).catch(() => []);

        const chatHistory: ChatMessageType[] = dbMessages.map((m) => ({
          id: m.id,
          roomId: m.roomId,
          senderId: m.senderId,
          senderName: m.sender?.displayName || 'User',
          content: m.content,
          createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : new Date().toISOString(),
        }));

        const updatedParticipants = await prisma.roomParticipant.findMany({
          where: { roomId: room.id, isOnline: true },
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true, isGuest: true } },
          },
        }).catch(() => [participant]);

        const safeISO = (d: any) => {
          try {
            if (!d) return new Date().toISOString();
            if (d instanceof Date) return d.toISOString();
            return new Date(d).toISOString();
          } catch {
            return new Date().toISOString();
          }
        };

        socket.emit('room:joined', {
          room: {
            ...room,
            createdAt: safeISO(room.createdAt),
            expiresAt: safeISO(room.expiresAt),
            stateUpdatedAt: safeISO(room.stateUpdatedAt),
            currentVideo: serializeVideo(room.currentVideo),
          } as any,
          participant: { ...participant, joinedAt: safeISO(participant.joinedAt) } as any,
          participants: updatedParticipants.map((p) => ({ ...p, joinedAt: safeISO(p.joinedAt) })) as any,
          authoritativeState,
          chatHistory,
        });

        socket.to(roomSocketName).emit('room:user-joined', {
          participant: { ...participant, joinedAt: safeISO(participant.joinedAt) } as any,
        });

      } catch (err: any) {
        console.error('Socket room:join Error:', err);
        socket.emit('error:message', { message: 'Failed to join room via socket' });
      }
    });

    // Chat Message Handler with Rate Limiting & Sanitization
    socket.on('chat:send', async ({ content }) => {
      try {
        if (!socket.user || !socket.currentRoomCode) return;
        const userId = socket.user.id;
        const roomCode = socket.currentRoomCode;

        if (!content || !content.trim()) return;
        if (content.length > 500) {
          socket.emit('error:message', { message: 'Message exceeds maximum limit of 500 characters' });
          return;
        }

        // Rate Limiter: Max 3 messages per 5 seconds
        const now = Date.now();
        const timestamps = userChatTimestamps.get(userId) || [];
        const recentTimestamps = timestamps.filter((ts) => now - ts < 5000);

        if (recentTimestamps.length >= 3) {
          socket.emit('error:message', { message: 'Chat rate limit reached. Please wait a few seconds.' });
          return;
        }

        recentTimestamps.push(now);
        userChatTimestamps.set(userId, recentTimestamps);

        const room = await prisma.room.findUnique({ where: { roomCode } });
        if (!room) return;

        const cleanContent = sanitizeHTML(content.trim());

        const chatRecord = await prisma.chatMessage.create({
          data: {
            roomId: room.id,
            senderId: userId,
            content: cleanContent,
          },
        });

        const chatMessagePayload: ChatMessageType = {
          id: chatRecord.id,
          roomId: room.id,
          senderId: userId,
          senderName: socket.user.displayName,
          content: cleanContent,
          createdAt: chatRecord.createdAt.toISOString(),
        };

        io.to(`room:${roomCode}`).emit('chat:receive', chatMessagePayload);
        syncChatMessageToFirestore(roomCode, chatMessagePayload).catch(() => {});

      } catch (err: any) {
        console.error('Chat Send error:', err);
      }
    });

    // Playback Commands
    socket.on('playback:command', async ({ action, position, rate }) => {
      try {
        if (!socket.user || !socket.currentRoomCode) return;
        const roomCode = socket.currentRoomCode;

        const room = await prisma.room.findUnique({ where: { roomCode } });
        if (!room) return;

        if (room.controlMode === 'HOST_ONLY' && room.hostId !== socket.user.id) {
          socket.emit('error:message', { message: 'Only the room host can control playback.' });
          return;
        }

        let newPlaybackState = room.playbackState;
        if (action === 'PLAY') newPlaybackState = 'PLAYING';
        if (action === 'PAUSE') newPlaybackState = 'PAUSED';

        const newPosition = Math.max(0, position);
        const newRate = rate || room.playbackRate;
        const newSeq = room.sequenceNumber + 1;
        const nowTime = new Date();

        const updatedRoom = await prisma.room.update({
          where: { id: room.id },
          data: {
            playbackState: newPlaybackState,
            playbackPosition: newPosition,
            playbackRate: newRate,
            stateUpdatedAt: nowTime,
            sequenceNumber: newSeq,
          },
        });

        const authoritativeState: AuthoritativePlaybackState = {
          state: updatedRoom.playbackState as any,
          position: updatedRoom.playbackPosition,
          playbackRate: updatedRoom.playbackRate,
          updatedAt: nowTime.getTime(),
          sequenceNumber: newSeq,
        };

        io.to(`room:${roomCode}`).emit('playback:sync', {
          authoritativeState,
          actionBy: socket.user.displayName,
        });
        syncRoomToFirestore(updatedRoom).catch(() => {});

      } catch (err: any) {
        console.error('Playback command error:', err);
      }
    });

    // Participant Playback Telemetry
    socket.on('playback:telemetry', async ({ position, state }) => {
      try {
        if (!socket.user || !socket.currentRoomCode) return;
        const roomCode = socket.currentRoomCode;

        // Calculate current segment number (6s per segment)
        const segmentNumber = Math.floor(position / 6);

        const { segmentReferenceTracker } = await import('../services/segment/SegmentReferenceTracker');
        await segmentReferenceTracker.updateParticipantPosition({
          userId: socket.user.id,
          roomId: roomCode,
          segmentNumber,
          position,
          state: state || 'playing',
          lastActiveAt: Date.now(),
        });
      } catch (err: any) {
        console.error('Playback telemetry error:', err);
      }
    });

    // Change Video (YouTube or Uploaded)
    socket.on('video:change', async ({ youtubeUrl, videoId }) => {
      try {
        if (!socket.user || !socket.currentRoomCode) return;
        const roomCode = socket.currentRoomCode;

        const room = await prisma.room.findUnique({ where: { roomCode } });
        if (!room) return;

        if (room.hostId !== socket.user.id && room.controlMode === 'HOST_ONLY') {
          socket.emit('error:message', { message: 'Only the host can change the video' });
          return;
        }

        let video = null;

        if (videoId) {
          video = await prisma.video.findUnique({ where: { id: videoId } });
          if (!video) {
            socket.emit('error:message', { message: 'Uploaded video not found' });
            return;
          }
        } else if (youtubeUrl) {
          const ytId = extractYouTubeId(youtubeUrl);
          if (!ytId) {
            socket.emit('error:message', { message: 'Invalid YouTube URL provided' });
            return;
          }

          video = await prisma.video.create({
            data: {
              ownerId: socket.user.id,
              sourceType: 'YOUTUBE',
              title: `YouTube Video (${ytId})`,
              youtubeUrl,
              youtubeVideoId: ytId,
              status: 'READY',
            },
          });
        } else {
          socket.emit('error:message', { message: 'Please provide a YouTube URL or Video ID' });
          return;
        }

        const nowTime = new Date();
        const newSeq = room.sequenceNumber + 1;

        const updatedRoom = await prisma.room.update({
          where: { id: room.id },
          data: {
            currentVideoId: video.id,
            playbackState: 'PAUSED',
            playbackPosition: 0.0,
            stateUpdatedAt: nowTime,
            sequenceNumber: newSeq,
          },
        });

        const authoritativeState: AuthoritativePlaybackState = {
          state: 'PAUSED',
          position: 0.0,
          playbackRate: 1.0,
          updatedAt: nowTime.getTime(),
          sequenceNumber: newSeq,
        };

        io.to(`room:${roomCode}`).emit('video:changed', {
          video: serializeVideo(video),
          authoritativeState,
        });

        if (video) {
          syncVideoMetadataToFirestore(video).catch(() => {});
        }
        syncRoomToFirestore(updatedRoom).catch(() => {});

      } catch (err: any) {
        console.error('Video Change error:', err);
        socket.emit('error:message', { message: 'Failed to change room video' });
      }
    });

    socket.on('upload:progress', ({ progress, fileName }) => {
      if (!socket.currentRoomCode) return;
      socket.to(`room:${socket.currentRoomCode}`).emit('upload:progress', {
        progress,
        fileName,
        uploaderName: socket.user?.displayName || 'User',
      });
    });

    // --- Host Controls Handlers ---
    socket.on('room:toggle-lock', async () => {
      try {
        if (!socket.user || !socket.currentRoomCode) return;
        const room = await prisma.room.findUnique({ where: { roomCode: socket.currentRoomCode } });
        if (!room || room.hostId !== socket.user.id) return;

        const updatedRoom = await prisma.room.update({
          where: { id: room.id },
          data: { isLocked: !room.isLocked },
          include: { currentVideo: true },
        });

        io.to(`room:${socket.currentRoomCode}`).emit('room:updated', {
          room: {
            ...updatedRoom,
            createdAt: updatedRoom.createdAt.toISOString(),
            expiresAt: updatedRoom.expiresAt.toISOString(),
            stateUpdatedAt: updatedRoom.stateUpdatedAt.toISOString(),
          } as any,
        });
      } catch (err) {
        console.error('Toggle Lock error:', err);
      }
    });

    socket.on('room:set-control-mode', async ({ controlMode }) => {
      try {
        if (!socket.user || !socket.currentRoomCode) return;
        const room = await prisma.room.findUnique({ where: { roomCode: socket.currentRoomCode } });
        if (!room || room.hostId !== socket.user.id) return;

        const updatedRoom = await prisma.room.update({
          where: { id: room.id },
          data: { controlMode },
          include: { currentVideo: true },
        });

        io.to(`room:${socket.currentRoomCode}`).emit('room:updated', {
          room: {
            ...updatedRoom,
            createdAt: updatedRoom.createdAt.toISOString(),
            expiresAt: updatedRoom.expiresAt.toISOString(),
            stateUpdatedAt: updatedRoom.stateUpdatedAt.toISOString(),
          } as any,
        });
      } catch (err) {
        console.error('Set Control Mode error:', err);
      }
    });

    socket.on('room:transfer-host', async ({ targetUserId }) => {
      try {
        if (!socket.user || !socket.currentRoomCode) return;
        const room = await prisma.room.findUnique({ where: { roomCode: socket.currentRoomCode } });
        if (!room || room.hostId !== socket.user.id) return;

        await prisma.room.update({
          where: { id: room.id },
          data: { hostId: targetUserId },
        });

        await prisma.roomParticipant.updateMany({
          where: { roomId: room.id, userId: socket.user.id },
          data: { role: 'PARTICIPANT' },
        });

        await prisma.roomParticipant.updateMany({
          where: { roomId: room.id, userId: targetUserId },
          data: { role: 'HOST' },
        });

        const updatedRoom = await prisma.room.findUnique({
          where: { id: room.id },
          include: { currentVideo: true },
        });

        if (updatedRoom) {
          io.to(`room:${socket.currentRoomCode}`).emit('room:updated', {
            room: {
              ...updatedRoom,
              createdAt: updatedRoom.createdAt.toISOString(),
              expiresAt: updatedRoom.expiresAt.toISOString(),
              stateUpdatedAt: updatedRoom.stateUpdatedAt.toISOString(),
            } as any,
          });
        }
      } catch (err) {
        console.error('Transfer Host error:', err);
      }
    });

    // --- Co-Host Management Handlers ---
    socket.on('room:assign-cohost', async ({ targetUserId }) => {
      try {
        if (!socket.user || !socket.currentRoomCode) return;
        const room = await prisma.room.findUnique({ where: { roomCode: socket.currentRoomCode } });
        if (!room || room.hostId !== socket.user.id) return;

        await prisma.roomParticipant.updateMany({
          where: { roomId: room.id, userId: targetUserId },
          data: { role: 'CO_HOST' },
        });

        io.to(`room:${socket.currentRoomCode}`).emit('participant:state-changed', {
          userId: targetUserId,
          isMuted: false,
          isVideoOff: false,
          role: 'CO_HOST',
        });
      } catch (err) {
        console.error('Assign Co-Host error:', err);
      }
    });

    socket.on('room:revoke-cohost', async ({ targetUserId }) => {
      try {
        if (!socket.user || !socket.currentRoomCode) return;
        const room = await prisma.room.findUnique({ where: { roomCode: socket.currentRoomCode } });
        if (!room || room.hostId !== socket.user.id) return;

        await prisma.roomParticipant.updateMany({
          where: { roomId: room.id, userId: targetUserId },
          data: { role: 'PARTICIPANT' },
        });

        io.to(`room:${socket.currentRoomCode}`).emit('participant:state-changed', {
          userId: targetUserId,
          isMuted: false,
          isVideoOff: false,
          role: 'PARTICIPANT',
        });
      } catch (err) {
        console.error('Revoke Co-Host error:', err);
      }
    });

    socket.on('room:kick-participant', async ({ targetUserId }) => {
      try {
        if (!socket.user || !socket.currentRoomCode) return;
        const room = await prisma.room.findUnique({ where: { roomCode: socket.currentRoomCode } });
        if (!room || room.hostId !== socket.user.id) return;

        await prisma.roomParticipant.deleteMany({
          where: { roomId: room.id, userId: targetUserId },
        });

        io.to(`user:${targetUserId}`).emit('room:kicked', { reason: 'You were removed from the room by host.' });
        io.to(`room:${socket.currentRoomCode}`).emit('room:user-left', { userId: targetUserId });
      } catch (err) {
        console.error('Kick Participant error:', err);
      }
    });

    socket.on('room:end-room', async () => {
      try {
        if (!socket.user || !socket.currentRoomCode) return;
        const room = await prisma.room.findUnique({ where: { roomCode: socket.currentRoomCode } });
        if (!room || room.hostId !== socket.user.id) return;

        io.to(`room:${socket.currentRoomCode}`).emit('room:ended');
        console.log(`🚪 Room ${socket.currentRoomCode} ended by host ${socket.user.displayName}`);
      } catch (err) {
        console.error('End Room error:', err);
      }
    });

    // --- Watch-Party Ready System Handlers ---
    socket.on('participant:toggle-ready', async ({ isReady }) => {
      try {
        if (!socket.user || !socket.currentRoomCode) return;
        const roomCode = socket.currentRoomCode;

        io.to(`room:${roomCode}`).emit('participant:state-changed', {
          userId: socket.user.id,
          isMuted: false,
          isVideoOff: false,
          isReady,
        });
      } catch (err) {
        console.error('Toggle Ready error:', err);
      }
    });

    socket.on('room:override-start', async () => {
      try {
        if (!socket.user || !socket.currentRoomCode) return;
        const room = await prisma.room.findUnique({ where: { roomCode: socket.currentRoomCode } });
        if (!room || room.hostId !== socket.user.id) return;

        io.to(`room:${socket.currentRoomCode}`).emit('room:countdown-start');
      } catch (err) {
        console.error('Override Start error:', err);
      }
    });

    // WebRTC Signaling Relay - Direct 1-to-1 Peer Relay
    socket.on('webrtc:offer', ({ targetUserId, sdp }) => {
      if (!socket.user || !targetUserId) return;
      io.to(`user:${targetUserId}`).emit('webrtc:offer', {
        fromUserId: socket.user.id,
        sdp,
      });
    });

    socket.on('webrtc:answer', ({ targetUserId, sdp }) => {
      if (!socket.user || !targetUserId) return;
      io.to(`user:${targetUserId}`).emit('webrtc:answer', {
        fromUserId: socket.user.id,
        sdp,
      });
    });

    socket.on('webrtc:ice', ({ targetUserId, candidate }) => {
      if (!socket.user || !targetUserId) return;
      io.to(`user:${targetUserId}`).emit('webrtc:ice', {
        fromUserId: socket.user.id,
        candidate,
      });
    });

    socket.on('participant:toggle-media', async ({ isMuted, isVideoOff }) => {
      try {
        if (!socket.user || !socket.currentRoomCode) return;
        const roomCode = socket.currentRoomCode;

        const room = await prisma.room.findUnique({ where: { roomCode } });
        if (!room) return;

        const updated = await prisma.roomParticipant.update({
          where: { roomId_userId: { roomId: room.id, userId: socket.user.id } },
          data: {
            ...(isMuted !== undefined && { isMuted }),
            ...(isVideoOff !== undefined && { isVideoOff }),
          },
        });

        io.to(`room:${roomCode}`).emit('participant:state-changed', {
          userId: socket.user.id,
          isMuted: updated.isMuted,
          isVideoOff: updated.isVideoOff,
        });
      } catch (err) {
        console.error('Participant media toggle error:', err);
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      if (socket.user && socket.currentRoomCode) {
        const roomCode = socket.currentRoomCode;
        const roomSocketName = `room:${roomCode}`;

        try {
          const room = await prisma.room.findUnique({ where: { roomCode } });
          if (room) {
            await prisma.roomParticipant.updateMany({
              where: { roomId: room.id, userId: socket.user.id },
              data: { isOnline: false },
            });

            socket.to(roomSocketName).emit('room:user-left', { userId: socket.user.id });
          }
        } catch (err) {
          console.error('Socket disconnect error:', err);
        }
      }
    });

    socket.on('room:leave', async () => {
      if (socket.user && socket.currentRoomCode) {
        const roomCode = socket.currentRoomCode;
        const roomSocketName = `room:${roomCode}`;

        socket.leave(roomSocketName);
        try {
          const room = await prisma.room.findUnique({ where: { roomCode } });
          if (room) {
            await prisma.roomParticipant.updateMany({
              where: { roomId: room.id, userId: socket.user.id },
              data: { isOnline: false },
            });
            socket.to(roomSocketName).emit('room:user-left', { userId: socket.user.id });
          }
        } catch (err) {
          console.error('Socket room:leave error:', err);
        }
        socket.currentRoomCode = undefined;
      }
    });
  });
}
