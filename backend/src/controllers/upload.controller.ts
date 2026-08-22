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

async function appendChunkToCombinedFile(uploadId: string, videoId: string, chunkIndex: number, chunkSize: number) {
  try {
    const uploadDir = path.join(ORIGINAL_DIR, uploadId);
    const videoDir = path.join(ORIGINAL_DIR, videoId);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

    const combinedUploadPath = path.join(uploadDir, 'combined.mp4');
    const combinedVideoPath = path.join(videoDir, 'combined.mp4');
    const chunkPath = path.join(uploadDir, `chunk_${String(chunkIndex).padStart(4, '0')}.part`);

    if (!fs.existsSync(chunkPath)) return;

    const chunkBuffer = await fs.promises.readFile(chunkPath);

    // Write chunk at exact byte position to upload.id directory
    const uploadHandle = await fs.promises.open(combinedUploadPath, 'a+');
    try {
      await uploadHandle.write(chunkBuffer, 0, chunkBuffer.length, chunkIndex * chunkSize);
    } finally {
      await uploadHandle.close();
    }

    // Write chunk at exact byte position to video.id directory for instant stream lookup
    const videoHandle = await fs.promises.open(combinedVideoPath, 'a+');
    try {
      await videoHandle.write(chunkBuffer, 0, chunkBuffer.length, chunkIndex * chunkSize);
    } finally {
      await videoHandle.close();
    }
  } catch (err) {
    console.warn(`Progressive chunk write warning [chunk ${chunkIndex}]:`, err);
  }
}

function ensureCorsHeaders(req: Request, res: Response) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Access-Control-Allow-Headers, Content-Type, Authorization, Origin, Accept, Range, Content-Range');
}

export async function initiateUpload(req: AuthRequest, res: Response) {
  ensureCorsHeaders(req, res);
  try {
    if (!req.user) return res.status(401).json({ error: 'Authenticated user required' });

    const { fileName, fileSize, mimeType, duration } = req.body;
    if (!fileName || !fileSize) {
      return res.status(400).json({ error: 'fileName and fileSize are required' });
    }

    let parsedDuration = duration && !isNaN(Number(duration)) && Number(duration) > 0 ? Number(duration) : null;

    const video = await prisma.video.create({
      data: {
        ownerId: req.user.id,
        sourceType: 'UPLOADED',
        title: fileName,
        originalFileName: fileName,
        fileSize: BigInt(fileSize),
        duration: parsedDuration,
        mimeType: mimeType || 'video/mp4',
        status: 'READY',
        manifestUrl: `p2p://${fileName}`,
      },
    });

    syncVideoMetadataToFirestore(video).catch(() => {});

    const upload = await prisma.upload.create({
      data: {
        videoId: video.id,
        userId: req.user.id,
        chunkSize: 1024 * 1024,
        totalChunks: Math.ceil(fileSize / (1024 * 1024)),
        completedChunks: Math.ceil(fileSize / (1024 * 1024)),
        status: 'COMPLETED',
      },
    });

    return res.status(201).json({
      uploadId: upload.id,
      videoId: video.id,
      chunkSize: 1024 * 1024,
      totalChunks: upload.totalChunks,
    });
  } catch (error: any) {
    console.error('Initiate upload error:', error);
    ensureCorsHeaders(req, res);
    return res.status(500).json({ error: 'Failed to initiate video metadata' });
  }
}

export async function uploadChunk(req: AuthRequest, res: Response) {
  ensureCorsHeaders(req, res);
  return res.status(410).json({
    error: 'Render backend does not store video chunks. Video transfer is peer-to-peer.',
  });
}

export async function getUploadStatus(req: AuthRequest, res: Response) {
  ensureCorsHeaders(req, res);
  try {
    const { uploadId } = req.params;
    const upload = await prisma.upload.findUnique({ where: { id: uploadId } });
    if (!upload) return res.status(404).json({ error: 'Upload not found' });
    return res.json({
      uploadId: upload.id,
      videoId: upload.videoId,
      status: 'COMPLETED',
      completedChunks: upload.totalChunks,
      totalChunks: upload.totalChunks,
    });
  } catch (error: any) {
    ensureCorsHeaders(req, res);
    return res.status(500).json({ error: 'Failed to fetch upload status' });
  }
}

export async function checkChunkStatus(req: AuthRequest, res: Response) {
  ensureCorsHeaders(req, res);
  return res.json({ uploaded: true });
}

export async function streamVideoFile(req: Request, res: Response) {
  ensureCorsHeaders(req, res);
  return res.status(410).json({
    error: 'Render backend does not stream video files. Video data is transferred directly peer-to-peer between room participants.',
  });
}

