import { Router } from 'express';
import { createRoom, getRoomByCode, joinRoom } from '../controllers/room.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/', authenticateToken, createRoom);
router.get('/:roomCode', authenticateToken, getRoomByCode);
router.post('/:roomCode/join', authenticateToken, joinRoom);

export default router;
