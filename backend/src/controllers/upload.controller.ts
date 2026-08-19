import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../db/prisma';
import { processVideoFile } from '../services/videoProcessor';
import { AuthRequest } from '../middleware/auth';
import { env } from '../config/env';
import { syncVideoMetadataToFirestore } from '../services/firestoreSync';

const STORAGE_DIR = path.resolve(__dirname, '../../storage');
const ORIGINAL_DIR = path.join(STORAGE_DIR, 'original');
const SEGMENTS_DIR = path.join(STORAGE_DIR, 'segments');

if (!fs.existsSync(ORIGINAL_DIR)) fs.mkdirSync(ORIGINAL_DIR, { recursive: true });
if (!fs.existsSync(SEGMENTS_DIR)) fs.mkdirSync(SEGMENTS_DIR, { recursive: true });

async function appendChunkToCombinedFile(uploadId: string, chunkIndex: number) {
  try {
    const uploadDir = path.join(ORIGINAL_DIR, uploadId);
    const combinedPath = path.join(uploadDir, 'combined.mp4');
    const chunkPath = path.join(uploadDir, `chunk_${String(chunkIndex).padStart(4, '0')}.part`);

    if (!fs.existsSync(chunkPath)) return;

    const chunkBuffer = await fs.promises.readFile(chunkPath);
    await fs.promises.appendFile(combinedPath, chunkBuffer);
  } catch (err) {
    console.warn(`Progressive chunk append warning [chunk ${chunkIndex}]:`, err);
  }
}

export async function initiateUpload(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authenticated user required' });

    const { fileName, fileSize, mimeType } = req.body;
    if (!fileName || !fileSize) {
      return res.status(400).json({ error: 'fileName and fileSize are required' });
    }

    const chunkSize = env.DEFAULT_CHUNK_SIZE_MB * 1024 * 1024; // e.g. 10MB
    const totalChunks = Math.ceil(fileSize / chunkSize);

    const video = await prisma.video.create({
      data: {
        ownerId: req.user.id,
        sourceType: 'UPLOADED',
        title: fileName,
        originalFileName: fileName,
        fileSize: BigInt(fileSize),
        mimeType: mimeType || 'video/mp4',
        status: 'UPLOADING',
      },
    });

    const manifestUrl = `/api/videos/stream/${video.id}/index.m3u8`;
    const updatedVideo = await prisma.video.update({
      where: { id: video.id },
      data: { manifestUrl },
    });

    syncVideoMetadataToFirestore(updatedVideo).catch(() => {});

    const upload = await prisma.upload.create({
      data: {
        videoId: video.id,
        userId: req.user.id,
        chunkSize,
        totalChunks,
        completedChunks: 0,
        status: 'UPLOADING',
      },
    });

    const uploadDir = path.join(ORIGINAL_DIR, upload.id);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    return res.status(201).json({
      uploadId: upload.id,
      videoId: video.id,
      chunkSize,
      totalChunks,
    });
  } catch (error: any) {
    console.error('Initiate upload error:', error);
    return res.status(500).json({ error: 'Failed to initiate upload' });
  }
}

export async function uploadChunk(req: AuthRequest, res: Response) {
  try {
    const { uploadId, chunkIndex } = req.params;
    const index = parseInt(chunkIndex, 10);

    const upload = await prisma.upload.findUnique({ where: { id: uploadId } });
    if (!upload) return res.status(404).json({ error: 'Upload session not found' });

    const uploadDir = path.join(ORIGINAL_DIR, upload.id);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const chunkPath = path.join(uploadDir, `chunk_${String(index).padStart(4, '0')}.part`);

    const writeStream = fs.createWriteStream(chunkPath);

    writeStream.on('error', (err) => {
      console.error('WriteStream error:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Failed to write chunk' });
    });

    req.on('error', (err) => {
      console.error('Request stream error:', err);
      writeStream.destroy();
    });

    req.pipe(writeStream);

    writeStream.on('finish', async () => {
      try {
        let retries = 3;
        let success = false;
        while (retries > 0 && !success) {
          try {
            await prisma.uploadChunk.upsert({
              where: { uploadId_chunkIndex: { uploadId: upload.id, chunkIndex: index } },
              update: { isUploaded: true, uploadedAt: new Date() },
              create: {
                uploadId: upload.id,
                chunkIndex: index,
                byteStart: BigInt(index * upload.chunkSize),
                byteEnd: BigInt((index + 1) * upload.chunkSize),
                isUploaded: true,
                uploadedAt: new Date(),
              },
            });
            success = true;
          } catch (dbErr) {
            retries--;
            if (retries === 0) throw dbErr;
            await new Promise((r) => setTimeout(r, 150));
          }
        }

        const completedCount = await prisma.uploadChunk.count({
          where: { uploadId: upload.id, isUploaded: true },
        });

        await prisma.upload.update({
          where: { id: upload.id },
          data: { completedChunks: completedCount },
        });

        // Progressively append uploaded chunk bytes to combined.mp4 for instant streaming
        await appendChunkToCombinedFile(upload.id, index);

        // Mark video as READY as soon as 2 chunks are uploaded so playback starts immediately
        if (completedCount >= 2) {
          const videoRecord = await prisma.video.findUnique({ where: { id: upload.videoId } });
          if (videoRecord && videoRecord.status === 'UPLOADING') {
            const updatedVideo = await prisma.video.update({
              where: { id: upload.videoId },
              data: { status: 'READY' },
            });
            syncVideoMetadataToFirestore(updatedVideo).catch(() => {});
          }
        }

        // If all chunks uploaded, trigger combined assembly & FFmpeg background processing
        if (completedCount === upload.totalChunks) {
          await prisma.upload.update({ where: { id: upload.id }, data: { status: 'PROCESSING' } });
          await prisma.video.update({ where: { id: upload.videoId }, data: { status: 'PROCESSING' } });

          // Run background FFmpeg processing
          processVideoFile(upload.id, upload.videoId).catch(console.error);
        }

        return res.json({ success: true, chunkIndex: index, completedChunks: completedCount });
      } catch (err: any) {
        console.error(`Upload chunk ${index} finish processing error:`, err);
        if (!res.headersSent) {
          return res.status(500).json({ error: 'Failed to process upload chunk' });
        }
      }
    });
  } catch (error: any) {
    console.error('Upload chunk error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to upload chunk' });
    }
  }
}

export async function getUploadStatus(req: AuthRequest, res: Response) {
  try {
    const { uploadId } = req.params;
    const upload = await prisma.upload.findUnique({
      where: { id: uploadId },
      include: { chunks: { where: { isUploaded: true }, select: { chunkIndex: true } } },
    });

    if (!upload) return res.status(404).json({ error: 'Upload not found' });

    const completedIndexes = upload.chunks.map((c) => c.chunkIndex);

    return res.json({
      uploadId: upload.id,
      videoId: upload.videoId,
      totalChunks: upload.totalChunks,
      completedChunks: upload.completedChunks,
      completedIndexes,
      status: upload.status,
    });
  } catch (error: any) {
    console.error('Get upload status error:', error);
    return res.status(500).json({ error: 'Failed to fetch upload status' });
  }
}

export async function streamVideoFile(req: Request, res: Response) {
  try {
    const { videoId } = req.params;
    if (!videoId) {
      return res.status(400).send('Video ID required');
    }

    const rawSubPath = req.params[0] || 'index.m3u8';
    const subPath = rawSubPath.split('?')[0];
    let filePath = path.join(SEGMENTS_DIR, videoId, subPath);

    // If requested HLS segment/manifest exists on disk in SEGMENTS_DIR, serve it
    if (fs.existsSync(filePath)) {
      if (subPath.endsWith('.m3u8')) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      } else if (subPath.endsWith('.ts')) {
        res.setHeader('Content-Type', 'video/MP2T');
      }
      return fs.createReadStream(filePath).pipe(res);
    }

    // If a requested .ts segment is missing, attempt on-demand regeneration
    if (subPath.endsWith('.ts')) {
      const match = subPath.match(/segment_(\d+)\.ts/);
      if (match) {
        const segNum = parseInt(match[1], 10);
        const room = await prisma.room.findFirst({ where: { currentVideoId: videoId } }).catch(() => null);
        const roomId = room ? room.roomCode : 'DEFAULT';

        try {
          const { regenerateSegmentOnDemand } = await import('../services/segment/SegmentRegenerator');
          const success = await regenerateSegmentOnDemand(roomId, videoId, segNum);
          if (success && fs.existsSync(filePath)) {
            res.setHeader('Content-Type', 'video/MP2T');
            return fs.createReadStream(filePath).pipe(res);
          }
        } catch (regenErr) {
          console.warn('Segment regeneration error:', regenErr);
        }
      }
    }

    // Fallback: Stream directly from combined.mp4 if HLS segments don't exist yet
    const upload = await prisma.upload.findUnique({ where: { videoId } }).catch(() => null);
    if (upload) {
      const combinedPath = path.join(ORIGINAL_DIR, upload.id, 'combined.mp4');
      if (fs.existsSync(combinedPath)) {
        if (subPath.endsWith('.m3u8') || subPath === 'index.m3u8') {
          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
          const m3u8Content = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:3600\n#EXT-X-MEDIA-SEQUENCE:0\n#EXTINF:3600.0,\nsource.mp4\n#EXT-X-ENDLIST\n`;
          return res.send(m3u8Content);
        }

        if (subPath === 'source.mp4' || subPath.endsWith('.mp4') || subPath.endsWith('.ts')) {
          try {
            const stat = fs.statSync(combinedPath);
            const fileSize = stat.size;
            const range = req.headers.range;

            if (range) {
              const parts = range.replace(/bytes=/, '').split('-');
              const start = parseInt(parts[0], 10);
              const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
              const chunkSize = end - start + 1;
              const file = fs.createReadStream(combinedPath, { start, end });

              res.status(206);
              res.set({
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize.toString(),
                'Content-Type': 'video/mp4',
              });
              return file.pipe(res);
            } else {
              res.status(200);
              res.set({
                'Content-Length': fileSize.toString(),
                'Content-Type': 'video/mp4',
              });
              return fs.createReadStream(combinedPath).pipe(res);
            }
          } catch (fileErr) {
            console.error('Combined video stream file access error:', fileErr);
            return res.status(503).send('Video source temporarily busy. Please retry.');
          }
        }
      }
    }

    return res.status(404).send('Segment or manifest file not found');
  } catch (error: any) {
    console.error('Stream video error:', error);
    return res.status(500).send('Streaming error');
  }
}
