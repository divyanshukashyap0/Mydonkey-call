import { prisma } from '../db/prisma';

export const INACTIVITY_TIMEOUT_MS = 100 * 365 * 24 * 60 * 60 * 1000; // Permanent rooms (No Expiration)

/**
 * Updates room activity timestamp without expiring rooms.
 */
export async function touchRoomActivity(roomIdOrCode: string): Promise<Date | null> {
  try {
    const newExpiresAt = new Date('2099-12-31T23:59:59Z');

    const room = await prisma.room.findFirst({
      where: {
        OR: [
          { id: roomIdOrCode },
          { roomCode: roomIdOrCode },
        ],
      },
      select: { id: true },
    });

    if (!room) return null;

    await prisma.room.update({
      where: { id: room.id },
      data: {
        expiresAt: newExpiresAt,
      },
    });

    return newExpiresAt;
  } catch (err: any) {
    console.warn(`[touchRoomActivity Warning] Failed to update room activity for ${roomIdOrCode}:`, err.message);
    return null;
  }
}
