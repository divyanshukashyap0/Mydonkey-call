import { prisma } from '../db/prisma';

export const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 60 Minutes (1 Hour)

/**
 * Resets the 60-minute inactivity countdown for a room whenever user activity occurs.
 */
export async function touchRoomActivity(roomIdOrCode: string): Promise<Date | null> {
  try {
    const newExpiresAt = new Date(Date.now() + INACTIVITY_TIMEOUT_MS);

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
    console.warn(`[touchRoomActivity Warning] Failed to update expiration for ${roomIdOrCode}:`, err.message);
    return null;
  }
}
