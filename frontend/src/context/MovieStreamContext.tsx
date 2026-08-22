import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getSocket } from '../services/socket';
import { api } from '../services/api';

export interface MovieStreamContextType {
  localMovieStream: MediaStream | null;
  remoteMovieStream: MediaStream | null;
  isBroadcasting: boolean;
  startBroadcastingMovie: (stream: MediaStream) => void;
  stopBroadcastingMovie: () => void;
}

const MovieStreamContext = createContext<MovieStreamContextType | null>(null);

export const MovieStreamProvider: React.FC<{ currentUserId?: string; hostId?: string; children: React.ReactNode }> = ({
  currentUserId,
  hostId,
  children,
}) => {
  const [localMovieStream, setLocalMovieStream] = useState<MediaStream | null>(null);
  const [remoteMovieStream, setRemoteMovieStream] = useState<MediaStream | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const moviePcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const iceServersRef = useRef<RTCIceServer[]>([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com:3478' },
  ]);

  const localStreamRef = useRef<MediaStream | null>(null);
  localStreamRef.current = localMovieStream;

  // Fetch ICE servers
  useEffect(() => {
    api.getIceServers()
      .then((res) => {
        if (res?.iceServers && res.iceServers.length > 0) iceServersRef.current = res.iceServers;
      })
      .catch(() => {});
  }, []);

  const getOrCreateMoviePeerConnection = (targetUserId: string) => {
    if (moviePcsRef.current.has(targetUserId)) {
      return moviePcsRef.current.get(targetUserId)!;
    }

    const socket = getSocket();
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try { pc.addTrack(track, localStreamRef.current!); } catch (e) {}
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('movie-stream:ice', { targetUserId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      console.log(`[MovieStreamContext] 🎬 Received dedicated movie media track from ${targetUserId}`);
      const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
      setRemoteMovieStream(stream);
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        console.warn(`[MovieStreamContext] WebRTC movie connection ${pc.iceConnectionState} with ${targetUserId}`);
      }
    };

    moviePcsRef.current.set(targetUserId, pc);
    return pc;
  };

  const startBroadcastingMovie = (stream: MediaStream) => {
    console.log('[MovieStreamContext] ⚡ Host starting dedicated Live WebRTC Movie Broadcast');
    setLocalMovieStream(stream);
    localStreamRef.current = stream;
    setIsBroadcasting(true);

    const socket = getSocket();

    moviePcsRef.current.forEach((pc) => {
      pc.getSenders().forEach((sender) => {
        try { pc.removeTrack(sender); } catch (e) {}
      });
      stream.getTracks().forEach((track) => {
        try { pc.addTrack(track, stream); } catch (e) {}
      });
    });
  };

  const stopBroadcastingMovie = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    setLocalMovieStream(null);
    localStreamRef.current = null;
    setIsBroadcasting(false);

    moviePcsRef.current.forEach((pc) => {
      pc.close();
    });
    moviePcsRef.current.clear();
  };

  // Socket signaling for dedicated movie stream
  useEffect(() => {
    const socket = getSocket();

    const handleOffer = async ({ fromUserId, sdp }: { fromUserId: string; sdp: any }) => {
      try {
        let pc = moviePcsRef.current.get(fromUserId);
        if (pc && (pc.signalingState !== 'stable' || pc.connectionState === 'closed')) {
          pc.close();
          moviePcsRef.current.delete(fromUserId);
          pc = undefined;
        }

        if (!pc) {
          pc = getOrCreateMoviePeerConnection(fromUserId);
        }

        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        const pending = pendingCandidatesRef.current.get(fromUserId) || [];
        pendingCandidatesRef.current.delete(fromUserId);
        for (const cand of pending) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('movie-stream:answer', { targetUserId: fromUserId, sdp: answer });
      } catch (err) {
        console.error('[MovieStreamContext] handleOffer error:', err);
      }
    };

    const handleAnswer = async ({ fromUserId, sdp }: { fromUserId: string; sdp: any }) => {
      try {
        const pc = moviePcsRef.current.get(fromUserId);
        if (pc && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const pending = pendingCandidatesRef.current.get(fromUserId) || [];
          pendingCandidatesRef.current.delete(fromUserId);
          for (const cand of pending) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
        }
      } catch (err) {
        console.error('[MovieStreamContext] handleAnswer error:', err);
      }
    };

    const handleIce = async ({ fromUserId, candidate }: { fromUserId: string; candidate: any }) => {
      try {
        const pc = moviePcsRef.current.get(fromUserId);
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          const list = pendingCandidatesRef.current.get(fromUserId) || [];
          list.push(candidate);
          pendingCandidatesRef.current.set(fromUserId, list);
        }
      } catch (err) {
        console.error('[MovieStreamContext] handleIce error:', err);
      }
    };

    const handleUserLeft = ({ userId }: { userId: string }) => {
      const pc = moviePcsRef.current.get(userId);
      if (pc) {
        pc.close();
        moviePcsRef.current.delete(userId);
      }
      pendingCandidatesRef.current.delete(userId);
    };

    socket.on('movie-stream:offer', handleOffer);
    socket.on('movie-stream:answer', handleAnswer);
    socket.on('movie-stream:ice', handleIce);
    socket.on('room:user-left', handleUserLeft);

    return () => {
      socket.off('movie-stream:offer', handleOffer);
      socket.off('movie-stream:answer', handleAnswer);
      socket.off('movie-stream:ice', handleIce);
      socket.off('room:user-left', handleUserLeft);
    };
  }, [currentUserId]);

  // Initiate peer connection to target user if host is broadcasting
  const connectMoviePeer = async (targetUserId: string) => {
    if (!currentUserId || currentUserId === targetUserId || !localStreamRef.current) return;

    try {
      const pc = getOrCreateMoviePeerConnection(targetUserId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      getSocket().emit('movie-stream:offer', { targetUserId, sdp: offer });
    } catch (err) {
      console.error('[MovieStreamContext] connectMoviePeer error:', err);
    }
  };

  return (
    <MovieStreamContext.Provider
      value={{
        localMovieStream,
        remoteMovieStream,
        isBroadcasting,
        startBroadcastingMovie,
        stopBroadcastingMovie,
      }}
    >
      {children}
    </MovieStreamContext.Provider>
  );
};

export function useMovieStreamContext(): MovieStreamContextType {
  const context = useContext(MovieStreamContext);
  if (!context) {
    throw new Error('useMovieStreamContext must be used within a MovieStreamProvider');
  }
  return context;
}
