import { getRedis } from '../../config/redis';
import { segmentReferenceTracker, SegmentMetadata } from '../segment/SegmentReferenceTracker';
import { temporaryStorageService } from '../storage/TemporaryStorageService';

export class CleanupWorker {
  private intervalMs = parseInt(process.env.CLEANUP_INTERVAL_SECONDS || '60', 10) * 1000;
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  public start(): void {
    if (this.timer) return;
    console.log(`🧹 Background Segment Cleanup Worker Started (Interval: ${this.intervalMs / 1000}s)`);

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
      console.log('🧹 Background Segment Cleanup Worker Stopped');
    }
  }

  public async runCleanupCycle(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

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
          console.log(`🔍 Mandatory Final Safety Check for Room ${seg.roomId} Segment ${seg.segmentNumber}...`);

          // MANDATORY FINAL SAFETY CHECK: Is segment needed by ANY participant?
          const isNeeded = await segmentReferenceTracker.isSegmentNeededByAnyParticipant(seg.roomId, seg.segmentNumber);

          if (isNeeded) {
            console.log(`🛡️ SAFETY CHECK PASSED — CANCELING DELETION: Room ${seg.roomId} Segment ${seg.segmentNumber} is currently required by an active participant.`);
            seg.status = 'AVAILABLE';
            seg.deleteAfter = undefined;
            await redis.set(key, JSON.stringify(seg));
          } else {
            console.log(`🗑️ SAFETY CHECK CONFIRMED — EXECUTING PHYSICAL DELETION: Room ${seg.roomId} Segment ${seg.segmentNumber}`);

            // Physical Storage Deletion
            const deleted = await temporaryStorageService.deleteSegment(seg.videoId, seg.segmentName);

            if (deleted || !(await temporaryStorageService.segmentExists(seg.videoId, seg.segmentName))) {
              await segmentReferenceTracker.markSegmentDeleted(seg.roomId, seg.segmentNumber);
              console.log(`[Cleanup Complete] Room: ${seg.roomId} Segment: ${seg.segmentNumber} Status: DELETED`);
            } else {
              console.warn(`[Cleanup Retry] Failed to delete file for Room ${seg.roomId} Segment ${seg.segmentNumber}. Retrying next cycle.`);
            }
          }
        }
      }
    } finally {
      this.isRunning = false;
    }
  }
}

export const cleanupWorker = new CleanupWorker();
