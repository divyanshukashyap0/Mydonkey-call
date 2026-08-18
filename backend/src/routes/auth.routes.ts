import { Router } from 'express';
import { register, login, createGuestSession, syncFirebaseUser, getMe } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/guest', createGuestSession);
router.post('/firebase-sync', authenticateToken, syncFirebaseUser);
router.get('/me', authenticateToken, getMe);

export default router;
