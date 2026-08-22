export type Role = 'HOST' | 'PARTICIPANT' | 'MODERATOR';
export type ControlMode = 'HOST_ONLY' | 'EVERYONE';
export type PlaybackState = 'PLAYING' | 'PAUSED' | 'BUFFERING';
export type VideoSourceType = 'YOUTUBE' | 'UPLOADED';

export interface User {
  id: string;
  email?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  isGuest: boolean;
}

export interface RoomParticipant {
  id: string;
  roomId: string;
  userId: string;
  role: Role;
  joinedAt: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isOnline: boolean;
  user?: User;
}

export interface Video {
  id: string;
  ownerId: string;
  sourceType: VideoSourceType;
  title: string;
  youtubeUrl?: string | null;
  youtubeVideoId?: string | null;
  originalFileName?: string | null;
  fileSize?: number | null;
  duration?: number | null;
  mimeType?: string | null;
  status: 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'PARTIALLY_READY' | 'READY' | 'FAILED';
  manifestUrl?: string | null;
  thumbnailUrl?: string | null;
  createdAt: string;
}

export interface AuthoritativePlaybackState {
  state: PlaybackState;
  position: number;
  playbackRate: number;
  updatedAt: number;
  sequenceNumber: number;
}

export interface Room {
  id: string;
  roomCode: string;
  name: string;
  hostId: string;
  currentVideoId?: string | null;
  currentVideo?: Video | null;
  isLocked: boolean;
  controlMode: ControlMode;
  playbackState: PlaybackState;
  playbackPosition: number;
  playbackRate: number;
  stateUpdatedAt: string;
  sequenceNumber: number;
  maxParticipants: number;
  expiresAt: string;
  createdAt: string;
  participants?: RoomParticipant[];
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface CreateRoomInput {
  name: string;
  controlMode?: ControlMode;
}

export interface JoinRoomInput {
  roomCode: string;
  displayName?: string;
}

// Socket.IO Events
export interface ServerToClientEvents {
  'room:joined': (data: { room: Room; participant: RoomParticipant; participants: RoomParticipant[]; authoritativeState: AuthoritativePlaybackState }) => void;
  'room:user-joined': (data: { participant: RoomParticipant }) => void;
  'room:user-left': (data: { userId: string }) => void;
  'room:updated': (data: { room: Room }) => void;
  'playback:sync': (data: { authoritativeState: AuthoritativePlaybackState; actionBy: string }) => void;
  'video:changed': (data: { video: Video | null; authoritativeState: AuthoritativePlaybackState }) => void;
  'chat:receive': (data: { id: string; senderId: string; senderName: string; content: string; createdAt: string }) => void;
  'webrtc:offer': (data: { fromUserId: string; sdp: any }) => void;
  'webrtc:answer': (data: { fromUserId: string; sdp: any }) => void;
  'webrtc:ice': (data: { fromUserId: string; candidate: any }) => void;
  'movie-stream:offer': (data: { fromUserId: string; sdp: any }) => void;
  'movie-stream:answer': (data: { fromUserId: string; sdp: any }) => void;
  'movie-stream:ice': (data: { fromUserId: string; candidate: any }) => void;
  'movie-stream:reconnect-request': (data: { fromUserId: string }) => void;
  'p2p-video:offer': (data: { fromUserId: string; sdp: any }) => void;
  'p2p-video:answer': (data: { fromUserId: string; sdp: any }) => void;
  'p2p-video:ice': (data: { fromUserId: string; candidate: any }) => void;
  'p2p-video:provider-ready': (data: { providerId: string; videoId: string; metadata?: any }) => void;
  'video:metadata-sync': (data: { metadata: any }) => void;
  'participant:state-changed': (data: { userId: string; isMuted: boolean; isVideoOff: boolean }) => void;
  'host:force-mute': () => void;
  'error:message': (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  'room:join': (data: { roomCode: string; displayName?: string }) => void;
  'room:leave': () => void;
  'playback:command': (data: { action: 'PLAY' | 'PAUSED' | 'SEEK' | 'RATE'; position: number; rate?: number; sequenceNumber?: number }) => void;
  'playback:requestSync': () => void;
  'video:change': (data: { videoId: string | null; youtubeUrl?: string; metadata?: any }) => void;
  'video:set-metadata': (data: { metadata: any }) => void;
  'chat:send': (data: { content: string }) => void;
  'webrtc:offer': (data: { targetUserId: string; sdp: any }) => void;
  'webrtc:answer': (data: { targetUserId: string; sdp: any }) => void;
  'webrtc:ice': (data: { targetUserId: string; candidate: any }) => void;
  'movie-stream:offer': (data: { targetUserId: string; sdp: any }) => void;
  'movie-stream:answer': (data: { targetUserId: string; sdp: any }) => void;
  'movie-stream:ice': (data: { targetUserId: string; candidate: any }) => void;
  'movie-stream:reconnect-request': (data: { targetUserId: string }) => void;
  'p2p-video:offer': (data: { targetUserId: string; sdp: any }) => void;
  'p2p-video:answer': (data: { targetUserId: string; sdp: any }) => void;
  'p2p-video:ice': (data: { targetUserId: string; candidate: any }) => void;
  'p2p-video:provider-ready': (data: { videoId: string; metadata?: any }) => void;
  'participant:toggle-media': (data: { isMuted?: boolean; isVideoOff?: boolean }) => void;
  'host:mute-participant': (data: { targetUserId: string; isMuted?: boolean }) => void;
  'host:mute-all': () => void;
}

