import { Request, Response } from 'express';
import { env } from '../config/env';

export async function getIceServers(req: Request, res: Response) {
  try {
    const iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ];

    if (process.env.TURN_SERVER_URL) {
      iceServers.push({
        urls: process.env.TURN_SERVER_URL,
        username: process.env.TURN_USERNAME || '',
        credential: process.env.TURN_PASSWORD || '',
      });
    }

    return res.json({ iceServers });
  } catch (error: any) {
    console.error('Error fetching ICE servers:', error);
    return res.status(500).json({ error: 'Failed to fetch ICE servers' });
  }
}
