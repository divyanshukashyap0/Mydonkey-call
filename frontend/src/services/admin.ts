export interface AdminStats {
  totalUsers: number;
  totalRooms: number;
  totalVideos: number;
  totalWatchEvents: number;
  totalStorageBytes: number;
  totalHttpBytesServed?: number;
  totalHttpRequestsServed?: number;
}

export interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  isGuest: boolean;
  role: string;
  createdAt: string;
  roomsCreated: number;
  videosUploaded: number;
}

export interface AdminRoomParticipant {
  userId: string;
  displayName: string;
  role: string;
  isOnline: boolean;
}

export interface AdminRoom {
  id: string;
  roomCode: string;
  name: string;
  hostId: string;
  hostDisplayName: string;
  hostEmail: string;
  controlMode: string;
  isLocked: boolean;
  createdAt: string;
  expiresAt: string;
  currentVideo?: {
    id: string;
    title: string;
    sourceType: string;
  } | null;
  activeParticipantCount: number;
  totalParticipantCount: number;
  participants: AdminRoomParticipant[];
}

export interface AdminWatchHistoryItem {
  id: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  roomCode: string;
  videoTitle: string;
  sourceType: 'YOUTUBE' | 'UPLOADED';
  youtubeUrl?: string | null;
  thumbnail?: string | null;
  watchedAt: string;
}

export interface AdminVideo {
  id: string;
  title: string;
  sourceType: 'YOUTUBE' | 'UPLOADED';
  originalFileName?: string | null;
  fileSize?: number | null;
  duration?: number | null;
  mimeType?: string | null;
  status: string;
  manifestUrl?: string | null;
  createdAt: string;
  ownerDisplayName: string;
  ownerEmail: string;
}

import { API_BASE } from '../config/apiConfig';

function getAuthHeaders() {
  const token = localStorage.getItem('mydonkey_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export const adminApi = {
  async getStats(): Promise<AdminStats> {
    const res = await fetch(`${API_BASE}/admin/stats`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch admin stats');
    const data = await res.json();
    return data.stats;
  },

  async getUsers(): Promise<AdminUser[]> {
    const res = await fetch(`${API_BASE}/admin/users`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch users');
    const data = await res.json();
    return data.users;
  },

  async getRooms(): Promise<AdminRoom[]> {
    const res = await fetch(`${API_BASE}/admin/rooms`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch rooms');
    const data = await res.json();
    return data.rooms;
  },

  async getWatchHistory(): Promise<AdminWatchHistoryItem[]> {
    const res = await fetch(`${API_BASE}/admin/watch-history`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch watch history');
    const data = await res.json();
    return data.watchHistory;
  },

  async getVideos(): Promise<AdminVideo[]> {
    const res = await fetch(`${API_BASE}/admin/videos`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch videos');
    const data = await res.json();
    return data.videos;
  },

  async updateUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error('Failed to update user role');
  },
};
