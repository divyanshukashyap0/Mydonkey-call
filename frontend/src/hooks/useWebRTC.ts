import { useWebRTCContext } from '../context/WebRTCContext';

export interface RemoteStreamInfo {
  userId: string;
  stream: MediaStream;
}

export function useWebRTC(_currentUserId?: string) {
  return useWebRTCContext();
}
