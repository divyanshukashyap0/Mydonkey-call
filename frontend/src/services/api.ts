import { AuthResponse, User, Room, CreateRoomInput } from '../types';

const API_BASE = '/api';

async function fetchJSON<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('mydonkey_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API Request failed');
  }

  return data as T;
}

export const api = {
  // Auth
  register: (body: { email: string; password: string; displayName: string }) =>
    fetchJSON<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    fetchJSON<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  guest: (displayName?: string) =>
    fetchJSON<AuthResponse>('/auth/guest', { method: 'POST', body: JSON.stringify({ displayName }) }),

  getMe: () =>
    fetchJSON<{ user: User }>('/auth/me'),

  syncFirebaseUser: (user: User) =>
    fetchJSON<{ user: User }>('/auth/firebase-sync', { method: 'POST', body: JSON.stringify(user) }),

  // Social & Watch History
  recordWatchHistory: (data: { roomCode: string; videoTitle: string; sourceType: 'YOUTUBE' | 'UPLOADED'; youtubeUrl?: string; thumbnail?: string }) =>
    fetchJSON<{ success: boolean }>('/social/watch-history', { method: 'POST', body: JSON.stringify(data) }),

  getWatchHistory: () =>
    fetchJSON<{ history: any[] }>('/social/watch-history'),

  sendFriendRequest: (targetEmail: string) =>
    fetchJSON<{ success: boolean; message: string }>('/social/friends/request', { method: 'POST', body: JSON.stringify({ targetEmail }) }),

  respondFriendRequest: (senderUid: string, action: 'accept' | 'decline') =>
    fetchJSON<{ success: boolean }>('/social/friends/respond', { method: 'POST', body: JSON.stringify({ senderUid, action }) }),

  getFriends: () =>
    fetchJSON<{ friends: any[] }>('/social/friends'),

  getPendingFriendRequests: () =>
    fetchJSON<{ requests: any[] }>('/social/friends/requests'),

  // Rooms
  createRoom: (body: CreateRoomInput) =>
    fetchJSON<{ room: Room }>('/rooms', { method: 'POST', body: JSON.stringify(body) }),

  getRoom: (roomCode: string) =>
    fetchJSON<{ room: Room }>(`/rooms/${roomCode}`),

  joinRoom: (roomCode: string) =>
    fetchJSON<{ room: Room; participant: any }>(`/rooms/${roomCode}/join`, { method: 'POST' }),

  // WebRTC
  getIceServers: () =>
    fetchJSON<{ iceServers: RTCIceServer[] }>('/webrtc/ice-servers'),
};
