import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { temporaryStorageService } from '../storage/TemporaryStorageService';
import { segmentReferenceTracker } from './SegmentReferenceTracker';

const STORAGE_DIR = path.resolve(__dirname, '../../../storage');

export async function regenerateSegmentOnDemand(roomId: string, videoId: string, segmentNumber: number): Promise<boolean> {
  console.log(`🔄 On-Demand Segment Regeneration Requested: Room ${roomId}, Video ${videoId}, Segment ${segmentNumber}`);

  const segmentName = `segment_${String(segmentNumber).padStart(4, '0')}.ts`;

  // Step 1: Check if segment already exists in storage
  if (await temporaryStorageService.segmentExists(videoId, segmentName)) {
    await segmentReferenceTracker.registerSegment(roomId, videoId, segmentNumber, segmentName);
    return true;
  }

  // Step 2: Search for original combined.mp4 source file for this videoId
  const originalDir = path.join(STORAGE_DIR, 'original');
  const { prisma } = await import('../../db/prisma');
  const upload = await prisma.upload.findUnique({ where: { videoId } }).catch(() => null);
  const combinedFilePath = upload ? path.join(originalDir, upload.id, 'combined.mp4') : null;

  if (!combinedFilePath || !fs.existsSync(combinedFilePath)) {
    console.warn(`Cannot regenerate segment ${segmentNumber}: Original movie file no longer available.`);
    return false;
  }

  // Step 3: Compute segment start time (6-second HLS segments)
  const startTimeSec = segmentNumber * 6;
  const targetDir = path.join(STORAGE_DIR, 'segments', videoId);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const targetPath = path.join(targetDir, segmentName);

  const ffmpegCmd = `ffmpeg -y -ss ${startTimeSec} -i "${combinedFilePath}" -t 6 -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k "${targetPath}"`;

  return new Promise<boolean>((resolve) => {
    exec(ffmpegCmd, async (err) => {
      if (!err && fs.existsSync(targetPath)) {
        console.log(`✨ Successfully Regenerated Segment ${segmentNumber} On-Demand!`);
        await segmentReferenceTracker.registerSegment(roomId, videoId, segmentNumber, segmentName);
        resolve(true);
      } else {
        console.error(`Failed to regenerate segment ${segmentNumber}:`, err?.message);
        resolve(false);
      }
    });
  });
}
