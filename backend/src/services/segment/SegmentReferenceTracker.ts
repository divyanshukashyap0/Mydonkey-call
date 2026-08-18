import { getRedis } from '../../config/redis';

export type SegmentStatus =
  | 'UPLOADING'
  | 'PROCESSING'
  | 'AVAILABLE'
  | 'PLAYING'
  | 'BUFFERED'
  | 'NO_LONGER_NEEDED'
  | 'DELETE_SCHEDULED'
  | 'DELETED';

export interface SegmentMetadata {
  segmentNumber: number;
  segmentName: string;
  videoId: string;
  roomId: string;
  status: SegmentStatus;
  createdAt: number;
  lastNeededAt: number;
  deleteAfter?: number;
  activeReferences: number;
}

export interface ParticipantTelemetry {
  userId: string;
  roomId: string;
  segmentNumber: number;
  position: number;
  state: 'playing' | 'paused';
  lastActiveAt: number;
  disconnectedAt?: number | null;
}

export class SegmentReferenceTracker {
  private retentionMinutes = parseInt(process.env.TEMP_SEGMENT_RETENTION_MINUTES || '10', 10);
  private graceMinutes = parseInt(process.env.PARTICIPANT_DISCONNECT_GRACE_MINUTES || '2', 10);
  private forwardBuffer = parseInt(process.env.FORWARD_BUFFER_SEGMENTS || '5', 10);
  private backwardBuffer = parseInt(process.env.BACKWARD_BUFFER_SEGMENTS || '2', 10);

  /**
   * Update participant position telemetry
   */
  public async updateParticipantPosition(telemetry: ParticipantTelemetry): Promise<void> {
    const redis = await getRedis();
    const key = `room:${telemetry.roomId}:participant:${telemetry.userId}`;
    await redis.set(key, JSON.stringify(telemetry));

    await this.reevaluateRoomSegments(telemetry.roomId);
  }

  /**
   * Handle participant disconnect with a 2-minute grace period
   */
  public async handleParticipantDisconnect(roomId: string, userId: string): Promise<void> {
    const redis = await getRedis();
    const key = `room:${roomId}:participant:${userId}`;
    const raw = await redis.get(key);

    if (raw) {
      const telemetry: ParticipantTelemetry = JSON.parse(raw);
      telemetry.disconnectedAt = Date.now();
      await redis.set(key, JSON.stringify(telemetry));
    }
  }

  /**
   * Handle participant explicit leave
   */
  public async handleParticipantLeave(roomId: string, userId: string): Promise<void> {
    const redis = await getRedis();
    const key = `room:${roomId}:participant:${userId}`;
    await redis.del(key);

    await this.reevaluateRoomSegments(roomId);
  }

  /**
   * Register newly created segment in Redis
   */
  public async registerSegment(roomId: string, videoId: string, segmentNumber: number, segmentName: string): Promise<void> {
    const redis = await getRedis();
    const key = `room:${roomId}:segment:${segmentNumber}`;

    const metadata: SegmentMetadata = {
      segmentNumber,
      segmentName,
      videoId,
      roomId,
      status: 'AVAILABLE',
      createdAt: Date.now(),
      lastNeededAt: Date.now(),
      activeReferences: 1,
    };

    await redis.set(key, JSON.stringify(metadata));
  }

  /**
   * Check if any participant currently needs the specified segment number
   */
  public async isSegmentNeededByAnyParticipant(roomId: string, segmentNumber: number): Promise<boolean> {
    const redis = await getRedis();
    const keys: string[] = await redis.keys(`room:${roomId}:participant:*`);
    const now = Date.now();
    const graceMs = this.graceMinutes * 60 * 1000;

    for (const key of keys) {
      const raw = await redis.get(key);
      if (!raw) continue;
      const p: ParticipantTelemetry = JSON.parse(raw);

      // Check disconnect grace period
      if (p.disconnectedAt && now - p.disconnectedAt > graceMs) {
        await redis.del(key);
        continue;
      }

      const minSeg = Math.max(0, p.segmentNumber - this.backwardBuffer);
      const maxSeg = p.segmentNumber + this.forwardBuffer;

      if (segmentNumber >= minSeg && segmentNumber <= maxSeg) {
        return true;
      }
    }

    return false;
  }

  /**
   * Re-evaluate room segments to schedule 10-minute deletion or cancel deletion
   */
  public async reevaluateRoomSegments(roomId: string): Promise<void> {
    const redis = await getRedis();
    const segKeys: string[] = await redis.keys(`room:${roomId}:segment:*`);
    const now = Date.now();
    const retentionMs = this.retentionMinutes * 60 * 1000;

    for (const key of segKeys) {
      const raw = await redis.get(key);
      if (!raw) continue;

      const seg: SegmentMetadata = JSON.parse(raw);
      if (seg.status === 'DELETED') continue;

      const isNeeded = await this.isSegmentNeededByAnyParticipant(roomId, seg.segmentNumber);

      if (isNeeded) {
        // If segment was scheduled for deletion but is needed again, CANCEL DELETE
        if (seg.status === 'DELETE_SCHEDULED' || seg.status === 'NO_LONGER_NEEDED') {
          console.log(`🛡️ CANCEL DELETE for Room ${roomId} Segment ${seg.segmentNumber} (Participant requested segment)`);
          seg.status = 'AVAILABLE';
          seg.deleteAfter = undefined;
          seg.lastNeededAt = now;
          await redis.set(key, JSON.stringify(seg));
        }
      } else {
        // Segment is unused by ALL participants -> Schedule 10-minute deletion
        if (seg.status === 'AVAILABLE' || seg.status === 'PLAYING') {
          seg.status = 'DELETE_SCHEDULED';
          seg.deleteAfter = now + retentionMs;
          console.log(`⏱️ 10-Minute Deletion Scheduled for Room ${roomId} Segment ${seg.segmentNumber} (DeleteAfter: ${new Date(seg.deleteAfter).toISOString()})`);
          await redis.set(key, JSON.stringify(seg));
        }
      }
    }
  }

  /**
   * Get metadata for a specific segment
   */
  public async getSegmentMetadata(roomId: string, segmentNumber: number): Promise<SegmentMetadata | null> {
    const redis = await getRedis();
    const key = `room:${roomId}:segment:${segmentNumber}`;
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  }

  /**
   * Mark segment as physically DELETED in Redis
   */
  public async markSegmentDeleted(roomId: string, segmentNumber: number): Promise<void> {
    const redis = await getRedis();
    const key = `room:${roomId}:segment:${segmentNumber}`;
    const raw = await redis.get(key);
    if (raw) {
      const seg: SegmentMetadata = JSON.parse(raw);
      seg.status = 'DELETED';
      await redis.set(key, JSON.stringify(seg));
    }
  }
}

export const segmentReferenceTracker = new SegmentReferenceTracker();
