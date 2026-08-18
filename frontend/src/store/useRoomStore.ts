import { create } from 'zustand';
import { Room, RoomParticipant, AuthoritativePlaybackState, Video, ChatMessage } from '../types';

interface RoomState {
  currentRoom: Room | null;
  myParticipant: RoomParticipant | null;
  participants: RoomParticipant[];
  authoritativePlayback: AuthoritativePlaybackState | null;
  chatMessages: ChatMessage[];
  isConnectedSocket: boolean;
  error: string | null;

  setRoomData: (data: {
    room: Room;
    participant: RoomParticipant;
    participants: RoomParticipant[];
    authoritativeState: AuthoritativePlaybackState;
    chatHistory?: ChatMessage[];
  }) => void;

  addParticipant: (participant: RoomParticipant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipantState: (data: { userId: string; isMuted?: boolean; isVideoOff?: boolean; isReady?: boolean; role?: any }) => void;
  updatePlaybackSync: (state: AuthoritativePlaybackState) => void;
  updateCurrentVideo: (video: Video | null, state: AuthoritativePlaybackState) => void;
  addChatMessage: (message: ChatMessage) => void;
  updateRoomSettings: (room: Room) => void;
  setSocketConnected: (connected: boolean) => void;
  clearRoom: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  currentRoom: null,
  myParticipant: null,
  participants: [],
  authoritativePlayback: null,
  chatMessages: [],
  isConnectedSocket: false,
  error: null,

  setRoomData: ({ room, participant, participants, authoritativeState, chatHistory = [] }) =>
    set({
      currentRoom: room,
      myParticipant: participant,
      participants,
      authoritativePlayback: authoritativeState,
      chatMessages: chatHistory,
      error: null,
    }),

  addParticipant: (participant) =>
    set((state) => {
      const exists = state.participants.some((p) => p.userId === participant.userId);
      const updated = exists
        ? state.participants.map((p) => (p.userId === participant.userId ? participant : p))
        : [...state.participants, participant];
      return { participants: updated };
    }),

  removeParticipant: (userId) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.userId !== userId),
    })),

  updateParticipantState: ({ userId, isMuted, isVideoOff, isReady, role }) =>
    set((state) => ({
      participants: state.participants.map((p) => {
        if (p.userId !== userId) return p;
        return {
          ...p,
          ...(isMuted !== undefined && { isMuted }),
          ...(isVideoOff !== undefined && { isVideoOff }),
          ...(isReady !== undefined && { isReady }),
          ...(role !== undefined && { role }),
        };
      }),
      myParticipant:
        state.myParticipant && state.myParticipant.userId === userId
          ? {
              ...state.myParticipant,
              ...(isMuted !== undefined && { isMuted }),
              ...(isVideoOff !== undefined && { isVideoOff }),
              ...(isReady !== undefined && { isReady }),
              ...(role !== undefined && { role }),
            }
          : state.myParticipant,
    })),

  updatePlaybackSync: (authoritativeState) =>
    set({ authoritativePlayback: authoritativeState }),

  updateCurrentVideo: (video, authoritativeState) =>
    set((state) => ({
      currentRoom: state.currentRoom
        ? { ...state.currentRoom, currentVideo: video, currentVideoId: video?.id || null }
        : null,
      authoritativePlayback: authoritativeState,
    })),

  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),

  updateRoomSettings: (room) =>
    set({ currentRoom: room }),

  setSocketConnected: (connected) => set({ isConnectedSocket: connected }),

  clearRoom: () =>
    set({
      currentRoom: null,
      myParticipant: null,
      participants: [],
      authoritativePlayback: null,
      chatMessages: [],
      error: null,
    }),
}));
