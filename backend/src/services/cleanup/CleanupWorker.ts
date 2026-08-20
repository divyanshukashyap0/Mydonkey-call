import path from 'path';
import fs from 'fs';
import { getRedis } from '../../config/redis';
import { prisma } from '../../db/prisma';
import { segmentReferenceTracker, SegmentMetadata } from '../segment/SegmentReferenceTracker';
import { temporaryStorageService } from '../storage/TemporaryStorageService';

const STORAGE_DIR = path.resolve(__dirname, '../../../../storage');
const ORIGINAL_DIR = path.join(STORAGE_DIR, 'original');
const SEGMENTS_DIR = path.join(STORAGE_DIR, 'segments');

export class CleanupWorker {
  private intervalMs = parseInt(process.env.CLEANUP_INTERVAL_SECONDS || '60', 10) * 1000;
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  public start(): void {
    if (this.timer) return;
    console.log(`🧹 Background Segment & Video Cleanup Worker Started (Interval: ${this.intervalMs / 1000}s)`);

    // Run an initial cycle immediately on worker startup
    this.runCleanupCycle().catch(() => {});

    this.timer = setInterval(() => {
      this.runCleanupCycle().catch((err) => {
        console.error('[Cleanup Worker Error]:', err.message);
      });
    }, this.intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('🧹 Background Segment & Video Cleanup Worker Stopped');
    }
  }

  public async runCleanupCycle(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      await this.cleanupExpiredRooms();
      await this.cleanupExpiredUploadedVideos();
      await this.cleanupRedisSegments();
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Automatically deletes rooms whose 60-minute inactivity window has expired.
   */
  public async cleanupExpiredRooms(): Promise<void> {
    try {
      const now = new Date();
      const expiredRooms = await prisma.room.findMany({
        where: { expiresAt: { lt: now } },
        select: { id: true, roomCode: true },
      });

      if (expiredRooms.length === 0) return;

      for (const room of expiredRooms) {
        console.log(`⏰ Room [${room.roomCode}] expired after 60 minutes of inactivity. Purging...`);
        await prisma.room.delete({
          where: { id: room.id },
        }).catch((err) => console.warn(`DB room delete warning for ${room.roomCode}:`, err));
      }
    } catch (err: any) {
      console.error('Error during expired rooms cleanup cycle:', err.message);
    }
  }

  /**
   * Automatically deletes every uploaded movie from PostgreSQL database
   * and physical disk storage 10 minutes after its creation time.
   */
  public async cleanupExpiredUploadedVideos(): Promise<void> {
    try {
      const TEN_MINUTES_AGO = new Date(Date.now() - 10 * 60 * 1000);

      // Find all uploaded videos created more than 10 minutes ago
      const expiredVideos = await prisma.video.findMany({
        where: {
          sourceType: 'UPLOADED',
          createdAt: { lt: TEN_MINUTES_AGO },
        },
        include: { upload: true },
      });

      if (expiredVideos.length === 0) return;

      for (const video of expiredVideos) {
        // Check if any room is currently playing or attached to this video
        const activeRoomCount = await prisma.room.count({
          where: { currentVideoId: video.id },
        });

        // NEVER delete a video while a watch party room is actively using it!
        if (activeRoomCount > 0) {
          continue;
        }

        console.log(`🗑️ Purging unattached/expired uploaded movie [${video.title}] (${video.id})...`);

        // 1. Remove physical storage directories from disk
        if (video.upload?.id) {
          const uploadDir = path.join(ORIGINAL_DIR, video.upload.id);
          if (fs.existsSync(uploadDir)) {
            fs.rmSync(uploadDir, { recursive: true, force: true });
          }
        }

        const videoDir = path.join(ORIGINAL_DIR, video.id);
        if (fs.existsSync(videoDir)) {
          fs.rmSync(videoDir, { recursive: true, force: true });
        }

        const segDir = path.join(SEGMENTS_DIR, video.id);
        if (fs.existsSync(segDir)) {
          fs.rmSync(segDir, { recursive: true, force: true });
        }

        // 2. Delete database Video record (PostgreSQL cascade deletes Upload, UploadChunk, VideoSegment)
        await prisma.video.delete({
          where: { id: video.id },
        }).catch((err) => console.warn(`DB video delete warning for ${video.id}:`, err));

        console.log(`✅ [10-Min Expiration Complete] Successfully purged unattached video [${video.title}] (${video.id}) from DB & disk.`);
      }
    } catch (err: any) {
      console.error('Error during 10-minute uploaded video cleanup cycle:', err.message);
    }
  }

  private async cleanupRedisSegments(): Promise<void> {
    try {
      const redis = await getRedis();
      const segKeys: string[] = await redis.keys('room:*:segment:*');
      const now = Date.now();

      for (const key of segKeys) {
        const raw = await redis.get(key);
        if (!raw) continue;

        const seg: SegmentMetadata = JSON.parse(raw);

        // Check if 10-minute deletion timer has expired
        if (seg.status === 'DELETE_SCHEDULED' && seg.deleteAfter && now >= seg.deleteAfter) {
          const isNeeded = await segmentReferenceTracker.isSegmentNeededByAnyParticipant(seg.roomId, seg.segmentNumber);

          if (isNeeded) {
            seg.status = 'AVAILABLE';
            seg.deleteAfter = undefined;
            await redis.set(key, JSON.stringify(seg));
          } else {
            const deleted = await temporaryStorageService.deleteSegment(seg.videoId, seg.segmentName);
            if (deleted || !(await temporaryStorageService.segmentExists(seg.videoId, seg.segmentName))) {
              await segmentReferenceTracker.markSegmentDeleted(seg.roomId, seg.segmentNumber);
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('Redis segment cleanup warning:', err.message);
    }
  }
}

export const cleanupWorker = new CleanupWorker();
