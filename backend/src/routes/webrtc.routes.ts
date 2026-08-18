import { Router } from 'express';
import { getIceServers } from '../controllers/webrtc.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/ice-servers', authenticateToken, getIceServers);

export default router;
