import { Router } from 'express';
import multer from 'multer';
import { initiateUpload, uploadChunk, getUploadStatus, streamVideoFile } from '../controllers/upload.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.post('/uploads', authenticateToken, initiateUpload);
router.post('/uploads/:uploadId/chunks/:chunkIndex', authenticateToken, uploadMiddleware.single('chunk'), uploadChunk);
router.get('/uploads/:uploadId/status', authenticateToken, getUploadStatus);
router.get('/videos/stream/:videoId', streamVideoFile);
router.get('/videos/stream/:videoId/*', streamVideoFile);

export default router;
