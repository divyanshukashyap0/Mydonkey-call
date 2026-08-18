import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { saveWatchHistoryItem, getUserWatchHistory } from '../services/watchHistory';
import { sendFriendRequest, respondToFriendRequest, getUserFriends, getPendingFriendRequests } from '../services/friendship';

export async function recordWatchHistory(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const { roomCode, videoTitle, sourceType, youtubeUrl, thumbnail } = req.body;

    if (!roomCode || !videoTitle || !sourceType) {
      return res.status(400).json({ error: 'roomCode, videoTitle, and sourceType are required' });
    }

    await saveWatchHistoryItem(req.user.id, {
      roomCode,
      videoTitle,
      sourceType,
      youtubeUrl,
      thumbnail,
      watchedAt: new Date().toISOString(),
    });

    return res.status(201).json({ success: true });
  } catch (error: any) {
    console.error('Record watch history error:', error);
    return res.status(500).json({ error: 'Failed to record watch history' });
  }
}

export async function fetchWatchHistory(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const history = await getUserWatchHistory(req.user.id);
    return res.json({ history });
  } catch (error: any) {
    console.error('Fetch watch history error:', error);
    return res.status(500).json({ error: 'Failed to fetch watch history' });
  }
}

export async function requestFriend(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const { targetEmail } = req.body;
    if (!targetEmail) return res.status(400).json({ error: 'targetEmail is required' });

    const result = await sendFriendRequest(req.user.id, req.user.displayName, targetEmail);
    return res.json(result);
  } catch (error: any) {
    console.error('Request friend error:', error);
    return res.status(500).json({ error: 'Failed to send friend request' });
  }
}

export async function respondFriend(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const { senderUid, action } = req.body;
    if (!senderUid || !action) return res.status(400).json({ error: 'senderUid and action are required' });

    const success = await respondToFriendRequest(req.user.id, req.user.displayName, senderUid, action);
    return res.json({ success });
  } catch (error: any) {
    console.error('Respond friend error:', error);
    return res.status(500).json({ error: 'Failed to respond to friend request' });
  }
}

export async function fetchFriends(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const friends = await getUserFriends(req.user.id);
    return res.json({ friends });
  } catch (error: any) {
    console.error('Fetch friends error:', error);
    return res.status(500).json({ error: 'Failed to fetch friends' });
  }
}

export async function fetchPendingRequests(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const requests = await getPendingFriendRequests(req.user.id);
    return res.json({ requests });
  } catch (error: any) {
    console.error('Fetch pending requests error:', error);
    return res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
}
