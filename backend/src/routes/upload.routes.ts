import { Router } from 'express';
import { initiateUpload, uploadChunk, getUploadStatus, streamVideoFile } from '../controllers/upload.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/uploads', authenticateToken, initiateUpload);
router.post('/uploads/:uploadId/chunks/:chunkIndex', authenticateToken, uploadChunk);
router.get('/uploads/:uploadId/status', authenticateToken, getUploadStatus);
router.get('/videos/stream/:videoId', streamVideoFile);
router.get('/videos/stream/:videoId/*', streamVideoFile);

export default router;
