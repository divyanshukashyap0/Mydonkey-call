import { create } from 'zustand';
import { api } from '../services/api';

export interface WatchHistoryItem {
  id?: string;
  roomCode: string;
  videoTitle: string;
  sourceType: 'YOUTUBE' | 'UPLOADED';
  youtubeUrl?: string;
  thumbnail?: string;
  watchedAt: string;
}

export interface Friend {
  friendUid: string;
  friendDisplayName: string;
  friendEmail?: string;
  friendPhotoURL?: string;
  addedAt: string;
}

export interface FriendRequest {
  senderUid: string;
  senderDisplayName: string;
  senderEmail?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  sentAt: string;
}

interface SocialState {
  watchHistory: WatchHistoryItem[];
  friends: Friend[];
  pendingRequests: FriendRequest[];
  loading: boolean;
  error: string | null;

  fetchSocialData: () => Promise<void>;
  recordHistory: (data: { roomCode: string; videoTitle: string; sourceType: 'YOUTUBE' | 'UPLOADED'; youtubeUrl?: string; thumbnail?: string }) => Promise<void>;
  sendFriendRequest: (email: string) => Promise<string>;
  respondFriendRequest: (senderUid: string, action: 'accept' | 'decline') => Promise<void>;
}

export const useSocialStore = create<SocialState>((set, get) => ({
  watchHistory: [],
  friends: [],
  pendingRequests: [],
  loading: false,
  error: null,

  fetchSocialData: async () => {
    try {
      set({ loading: true, error: null });
      const [historyRes, friendsRes, requestsRes] = await Promise.all([
        api.getWatchHistory().catch(() => ({ history: [] })),
        api.getFriends().catch(() => ({ friends: [] })),
        api.getPendingFriendRequests().catch(() => ({ requests: [] })),
      ]);

      set({
        watchHistory: historyRes.history || [],
        friends: friendsRes.friends || [],
        pendingRequests: requestsRes.requests || [],
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  recordHistory: async (data) => {
    try {
      await api.recordWatchHistory(data);
      get().fetchSocialData();
    } catch (err) {
      console.warn('Record history store warning:', err);
    }
  },

  sendFriendRequest: async (email) => {
    const res = await api.sendFriendRequest(email);
    await get().fetchSocialData();
    return res.message;
  },

  respondFriendRequest: async (senderUid, action) => {
    await api.respondFriendRequest(senderUid, action);
    await get().fetchSocialData();
  },
}));
