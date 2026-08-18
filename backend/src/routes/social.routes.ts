import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  recordWatchHistory,
  fetchWatchHistory,
  requestFriend,
  respondFriend,
  fetchFriends,
  fetchPendingRequests,
} from '../controllers/social.controller';

const router = Router();

router.post('/watch-history', authenticateToken, recordWatchHistory);
router.get('/watch-history', authenticateToken, fetchWatchHistory);
router.post('/friends/request', authenticateToken, requestFriend);
router.post('/friends/respond', authenticateToken, respondFriend);
router.get('/friends', authenticateToken, fetchFriends);
router.get('/friends/requests', authenticateToken, fetchPendingRequests);

export default router;
