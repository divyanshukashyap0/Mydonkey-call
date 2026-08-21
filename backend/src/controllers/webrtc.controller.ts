import { Request, Response } from 'express';
import { env } from '../config/env';

export async function getIceServers(req: Request, res: Response) {
  try {
    const iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
      { urls: 'stun:relay.metered.ca:80' },
      { urls: 'stun:stun.cloudflare.com:3478' },
    ];

    if (process.env.TURN_SERVER_URL) {
      const turnUrls = process.env.TURN_SERVER_URL.split(',').map((u) => u.trim());
      iceServers.push({
        urls: turnUrls.length === 1 ? turnUrls[0] : turnUrls,
        username: process.env.TURN_USERNAME || '',
        credential: process.env.TURN_PASSWORD || '',
      });
    } else {
      // Default OpenRelay TURN Fallback pool for strict symmetric NATs / strict firewalls
      iceServers.push({
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp',
        ],
        username: 'openrelay',
        credential: 'openrelay',
      });
    }

    return res.json({ iceServers });
  } catch (error: any) {
    console.error('Error fetching ICE servers:', error);
    return res.status(500).json({ error: 'Failed to fetch ICE servers' });
  }
}
