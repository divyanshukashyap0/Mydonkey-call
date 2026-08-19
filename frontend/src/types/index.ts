export type Role = 'HOST' | 'CO_HOST' | 'PARTICIPANT' | 'MODERATOR';
export type ControlMode = 'HOST_ONLY' | 'EVERYONE';
export type PlaybackState = 'PLAYING' | 'PAUSED' | 'BUFFERING';
export type VideoSourceType = 'YOUTUBE' | 'UPLOADED';
export type PrivacyMode = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY' | 'PASSWORD_PROTECTED';
export type ConnectionQuality = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DISCONNECTED';

export interface User {
  id: string;
  email?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  isGuest: boolean;
  role?: string;
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
  isReady?: boolean;
  connectionQuality?: ConnectionQuality;
  pingMs?: number;
  rttMs?: number;
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

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface Room {
  id: string;
  roomCode: string;
  name: string;
  hostId: string;
  coHostIds?: string[];
  bannedUserIds?: string[];
  currentVideoId?: string | null;
  currentVideo?: Video | null;
  isLocked: boolean;
  privacyMode?: PrivacyMode;
  passwordHash?: string | null;
  controlMode: ControlMode;
  playbackState: PlaybackState;
  playbackPosition: number;
  playbackRate: number;
  stateUpdatedAt: string;
  sequenceNumber: number;
  maxParticipants: number;
  requireAllReady?: boolean;
  isCountdownActive?: boolean;
  countdownSeconds?: number;
  expiresAt: string;
  createdAt: string;
  participants?: RoomParticipant[];
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface CreateRoomInput {
  name?: string;
  youtubeUrl?: string;
  controlMode?: ControlMode;
  privacyMode?: PrivacyMode;
  password?: string;
  maxParticipants?: number;
}

export interface JoinRoomInput {
  roomCode: string;
  displayName?: string;
  password?: string;
}

// Socket.IO Events
export interface ServerToClientEvents {
  'room:joined': (data: { room: Room; participant: RoomParticipant; participants: RoomParticipant[]; authoritativeState: AuthoritativePlaybackState; chatHistory: ChatMessage[] }) => void;
  'room:user-joined': (data: { participant: RoomParticipant }) => void;
  'room:user-left': (data: { userId: string }) => void;
  'room:updated': (data: { room: Room }) => void;
  'room:kicked': (data?: { reason?: string }) => void;
  'room:ended': () => void;
  'playback:sync': (data: { authoritativeState: AuthoritativePlaybackState; actionBy: string }) => void;
  'video:changed': (data: { video: Video | null; authoritativeState: AuthoritativePlaybackState }) => void;
  'chat:receive': (data: ChatMessage) => void;
  'webrtc:offer': (data: { fromUserId: string; sdp: any }) => void;
  'webrtc:answer': (data: { fromUserId: string; sdp: any }) => void;
  'webrtc:ice': (data: { fromUserId: string; candidate: any }) => void;
  'webrtc:reconnect-request': (data: { fromUserId: string }) => void;
  'participant:state-changed': (data: { userId: string; isMuted: boolean; isVideoOff: boolean; isReady?: boolean; role?: Role; connectionQuality?: ConnectionQuality }) => void;
  'room:countdown-tick': (data: { secondsRemaining: number }) => void;
  'room:countdown-cancelled': (data: { reason: string }) => void;
  'room:countdown-start': () => void;
  'playback:state-sync': (data: { authoritativeState: AuthoritativePlaybackState; currentVideo: Video | null }) => void;
  'sync:pong': (data: { clientTime: number; serverTime: number }) => void;
  'upload:progress': (data: { progress: any; fileName: string; uploaderName: string }) => void;
  'error:message': (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  'room:sync-request': (data: { roomCode?: string }) => void;
  'room:join': (data: { roomCode: string; displayName?: string; password?: string }) => void;
  'room:leave': () => void;
  'playback:command': (data: { action: 'PLAY' | 'PAUSE' | 'SEEK' | 'RATE'; position: number; rate?: number; sequenceNumber?: number }) => void;
  'playback:requestSync': () => void;
  'playback:telemetry': (data: { position: number; state?: string }) => void;
  'video:change': (data: { youtubeUrl?: string; videoId?: string }) => void;
  'chat:send': (data: { content: string }) => void;
  'room:toggle-lock': () => void;
  'room:set-control-mode': (data: { controlMode: ControlMode }) => void;
  'room:transfer-host': (data: { targetUserId: string }) => void;
  'room:assign-cohost': (data: { targetUserId: string }) => void;
  'room:revoke-cohost': (data: { targetUserId: string }) => void;
  'room:kick-participant': (data: { targetUserId: string }) => void;
  'room:ban-participant': (data: { targetUserId: string }) => void;
  'room:end-room': () => void;
  'participant:toggle-ready': (data: { isReady: boolean }) => void;
  'room:override-start': () => void;
  'webrtc:offer': (data: { targetUserId: string; sdp: any }) => void;
  'webrtc:answer': (data: { targetUserId: string; sdp: any }) => void;
  'webrtc:ice': (data: { targetUserId: string; candidate: any }) => void;
  'webrtc:reconnect-request': (data: { targetUserId: string }) => void;
  'participant:toggle-media': (data: { isMuted?: boolean; isVideoOff?: boolean }) => void;
  'upload:progress': (data: { progress: any; fileName: string }) => void;
  'sync:ping': (data: { clientTime: number }) => void;
}
