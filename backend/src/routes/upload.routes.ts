import { Router } from 'express';
import { initiateUpload, getUploadStatus, streamVideoFile } from '../controllers/upload.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/uploads', authenticateToken, initiateUpload);
router.get('/uploads/:uploadId/status', authenticateToken, getUploadStatus);
router.all('/videos/stream/*', streamVideoFile);
router.all('/videos/stream', streamVideoFile);

export default router;

