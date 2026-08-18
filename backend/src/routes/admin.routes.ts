import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import {
  getAdminStats,
  getAdminUsers,
  getAdminWatchHistory,
  getAdminVideos,
  updateUserRole,
  toggleAdminSelf,
} from '../controllers/admin.controller';

const router = Router();

// Allow authenticated user to toggle self-admin for initial setup/testing
router.post('/toggle-self', authenticateToken as any, toggleAdminSelf as any);

// Protected Admin Routes (Requires role === 'admin')
router.use(authenticateToken as any, requireAdmin as any);

router.get('/stats', getAdminStats as any);
router.get('/users', getAdminUsers as any);
router.put('/users/:userId/role', updateUserRole as any);
router.get('/watch-history', getAdminWatchHistory as any);
router.get('/videos', getAdminVideos as any);

export default router;
