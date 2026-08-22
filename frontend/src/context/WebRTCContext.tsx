import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getSocket } from '../services/socket';
import { api } from '../services/api';

export interface WebRTCContextType {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  movieStream: MediaStream | null;
  remoteMovieStream: MediaStream | null;
  isMovieBroadcasting: boolean;
  broadcastMovieStream: (stream: MediaStream | null) => void;
  stopMovieBroadcast: () => void;
  isMuted: boolean;
  isVideoOff: boolean;
  mediaError: string | null;
  participantVolumes: Record<string, number>;
  setParticipantVolume: (userId: string, volume: number) => void;
  hostMuteParticipant: (targetUserId: string, isMuted?: boolean) => void;
  hostMuteAll: () => void;
  connectToPeer: (targetUserId: string) => Promise<void>;
  restartIce: (targetUserId: string) => Promise<void>;
  toggleMic: () => void;
  toggleCamera: () => void;
}

const WebRTCContext = createContext<WebRTCContextType | null>(null);

export const WebRTCProvider: React.FC<{ currentUserId?: string; children: React.ReactNode }> = ({
  currentUserId,
  children,
}) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [movieStream, setMovieStream] = useState<MediaStream | null>(null);
  const [remoteMovieStream, setRemoteMovieStream] = useState<MediaStream | null>(null);
  const [isMovieBroadcasting, setIsMovieBroadcasting] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Default muted for everyone
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [participantVolumes, setParticipantVolumes] = useState<Record<string, number>>({});

  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const movieSendersRef = useRef<Map<string, RTCRtpSender[]>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const isMakingOfferRef = useRef<Map<string, boolean>>(new Map());
  const ignoreOfferRef = useRef<Map<string, boolean>>(new Map());
  const iceServersRef = useRef<RTCIceServer[]>([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com:3478' },
  ]);

  const localStreamRef = useRef<MediaStream | null>(null);
  localStreamRef.current = localStream;

  const movieStreamRef = useRef<MediaStream | null>(null);
  movieStreamRef.current = movieStream;

  // Broadcast movie MediaStream to all WebRTC peers
  const broadcastMovieStream = (stream: MediaStream | null) => {
    if (movieStreamRef.current && movieStreamRef.current !== stream) {
      movieStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    setMovieStream(stream);
    movieStreamRef.current = stream;
    setIsMovieBroadcasting(!!stream);

    pcsRef.current.forEach((pc, targetUserId) => {
      // Remove previous movie senders
      const oldSenders = movieSendersRef.current.get(targetUserId) || [];
      oldSenders.forEach((sender) => {
        try { pc.removeTrack(sender); } catch (e) {}
      });
      movieSendersRef.current.delete(targetUserId);

      if (stream) {
        const newSenders: RTCRtpSender[] = [];
        stream.getTracks().forEach((track) => {
          try {
            const sender = pc.addTrack(track, stream);
            newSenders.push(sender);
          } catch (e) {
            console.warn(`[MovieBroadcast] Error adding track to peer ${targetUserId}:`, e);
          }
        });
        movieSendersRef.current.set(targetUserId, newSenders);

        // Renegotiate offer with peer
        if (pc.signalingState === 'stable') {
          connectToPeer(targetUserId);
        }
      }
    });
  };

  const stopMovieBroadcast = () => {
    broadcastMovieStream(null);
  };

  // Initialize camera and microphone (Mic muted by default)
  useEffect(() => {
    let isMounted = true;

    async function initMedia() {
      api.getIceServers()
        .then((res) => {
          if (res?.iceServers && res.iceServers.length > 0) iceServersRef.current = res.iceServers;
        })
        .catch(() => {});

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('MediaDevices API is unavailable in this browser context (requires HTTPS or localhost).');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { max: 30 } },
          audio: true,
        });

        // Mute mic by default on initial capture
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false;
        }

        if (isMounted) {
          setLocalStream(stream);
          setIsMuted(true);
          setMediaError(null);
          getSocket().emit('participant:toggle-media', { isMuted: true });
        }
      } catch (err: any) {
        console.error('⚠️ Camera/Microphone access error:', err.message || err);
        if (isMounted) {
          setMediaError('Camera or Microphone access was denied or unavailable.');
        }
      }
    }

    initMedia();

    return () => {
      isMounted = false;
      pcsRef.current.forEach((pc) => pc.close());
      pcsRef.current.clear();
      pendingCandidatesRef.current.clear();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (movieStreamRef.current) {
        movieStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Dynamically attach local webcam tracks to all existing peer connections when localStream becomes available
  useEffect(() => {
    if (!localStream) return;

    pcsRef.current.forEach((pc, targetUserId) => {
      const existingSenders = pc.getSenders();
      let addedAny = false;
      const sortedTracks = localStream.getTracks().sort((a, b) => a.kind.localeCompare(b.kind));
      sortedTracks.forEach((track) => {
        const alreadyAdded = existingSenders.some((sender) => sender.track === track);
        if (!alreadyAdded) {
          pc.addTrack(track, localStream);
          addedAny = true;
        }
      });

      if (addedAny && pc.signalingState === 'stable') {
        connectToPeer(targetUserId);
      }
    });
  }, [localStream]);

  // Queue ICE candidate if remote description isn't set yet
  const addOrQueueCandidate = async (targetUserId: string, candidate: RTCIceCandidateInit) => {
    const pc = pcsRef.current.get(targetUserId);
    if (!pc) return;
    if (!candidate || (typeof candidate === 'object' && !candidate.candidate && candidate.candidate !== '')) return;

    if (pc.remoteDescription && pc.remoteDescription.type) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err: any) {
        if (err.name !== 'OperationError' && err.name !== 'InvalidStateError') {
          console.warn(`ICE candidate add warning for ${targetUserId}:`, err);
        }
      }
    } else {
      const currentQueue = pendingCandidatesRef.current.get(targetUserId) || [];
      currentQueue.push(candidate);
      pendingCandidatesRef.current.set(targetUserId, currentQueue);
    }
  };

  // Drain queued candidates after remote description is set
  const processPendingCandidates = async (targetUserId: string) => {
    const pc = pcsRef.current.get(targetUserId);
    if (!pc || !pc.remoteDescription) return;
    const queue = pendingCandidatesRef.current.get(targetUserId) || [];
    pendingCandidatesRef.current.delete(targetUserId);

    for (const cand of queue) {
      if (!cand || (typeof cand === 'object' && !cand.candidate && cand.candidate !== '')) continue;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err: any) {
        if (err.name !== 'OperationError' && err.name !== 'InvalidStateError') {
          console.warn(`Draining ICE candidate warning for ${targetUserId}:`, err);
        }
      }
    }
  };

  // Helper to create or reuse RTCPeerConnection
  const getOrCreatePeerConnection = (targetUserId: string) => {
    if (pcsRef.current.has(targetUserId)) {
      const existingPc = pcsRef.current.get(targetUserId)!;
      const activeStream = localStreamRef.current || localStream;
      if (activeStream) {
        const senders = existingPc.getSenders();
        const sortedTracks = activeStream.getTracks().sort((a, b) => a.kind.localeCompare(b.kind));
        sortedTracks.forEach((track) => {
          if (!senders.some((s) => s.track === track)) {
            existingPc.addTrack(track, activeStream);
          }
        });
      }

      // Re-attach active movie stream tracks if broadcasting
      if (movieStreamRef.current) {
        const existingSenders = existingPc.getSenders();
        movieStreamRef.current.getTracks().forEach((track) => {
          if (!existingSenders.some((s) => s.track === track)) {
            try {
              existingPc.addTrack(track, movieStreamRef.current!);
            } catch (e) {}
          }
        });
      }

      return existingPc;
    }

    const socket = getSocket();
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
    const activeStream = localStreamRef.current || localStream;

    if (activeStream) {
      const sortedTracks = activeStream.getTracks().sort((a, b) => a.kind.localeCompare(b.kind));
      sortedTracks.forEach((track) => pc.addTrack(track, activeStream));
    }

    if (movieStreamRef.current) {
      movieStreamRef.current.getTracks().forEach((track) => {
        try { pc.addTrack(track, movieStreamRef.current!); } catch (e) {}
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc:ice', { targetUserId, candidate: event.candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === 'failed' || state === 'disconnected') {
        const isPolite = currentUserId ? currentUserId < targetUserId : true;
        if (!isPolite) return;

        console.warn(`⚠️ WebRTC ICE connection ${state} for peer ${targetUserId}. Triggering automatic ICE restart...`);
        pc.createOffer({ iceRestart: true })
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            socket.emit('webrtc:offer', { targetUserId, sdp: pc.localDescription });
          })
          .catch((err) => console.error('ICE restart offer error:', err));
      }
    };

    pc.ontrack = (event) => {
      const incomingStream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
      const streamId = incomingStream.id || '';
      const isMovieTrack = streamId.includes('movie') || event.track.label.toLowerCase().includes('captured') || event.track.label.toLowerCase().includes('movie') || incomingStream.getVideoTracks().length > 1;

      if (isMovieTrack) {
        console.log(`[MovieBroadcast] 🎬 Incoming remote Live WebRTC Movie Stream from ${targetUserId}`);
        setRemoteMovieStream(incomingStream);
      } else {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          const existing = next.get(targetUserId);
          if (existing) {
            if (!existing.getTracks().some((t) => t.id === event.track.id)) {
              existing.addTrack(event.track);
            }
            next.set(targetUserId, new MediaStream(existing.getTracks()));
          } else {
            next.set(targetUserId, incomingStream);
          }
          return next;
        });
      }
    };

    pcsRef.current.set(targetUserId, pc);
    return pc;
  };

  // Socket event listeners for WebRTC signaling
  useEffect(() => {
    const socket = getSocket();

    const handleOffer = async ({ fromUserId, sdp }: { fromUserId: string; sdp: any }) => {
      const pc = getOrCreatePeerConnection(fromUserId);

      const isPolite = currentUserId ? currentUserId < fromUserId : true;
      const isMakingOffer = isMakingOfferRef.current.get(fromUserId) || false;
      const offerCollision = pc.signalingState !== 'stable' || isMakingOffer;

      const ignoreOffer = !isPolite && offerCollision;
      ignoreOfferRef.current.set(fromUserId, ignoreOffer);

      if (ignoreOffer) {
        return;
      }

      try {
        if (offerCollision && isPolite) {
          await pc.setLocalDescription({ type: 'rollback' } as any).catch(() => {});
        }

        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await processPendingCandidates(fromUserId);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc:answer', { targetUserId: fromUserId, sdp: answer });
      } catch (err: any) {
        if (err.name !== 'InvalidStateError') {
          console.warn(`Handled offer negotiation from ${fromUserId}:`, err);
        }
      }
    };

    const handleAnswer = async ({ fromUserId, sdp }: { fromUserId: string; sdp: any }) => {
      const pc = pcsRef.current.get(fromUserId);
      if (!pc) return;

      if (pc.signalingState === 'have-local-offer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await processPendingCandidates(fromUserId);
        } catch (err: any) {
          if (err.name !== 'InvalidStateError') {
            console.warn(`Handled remote answer for ${fromUserId}:`, err);
          }
        }
      }
    };

    const handleIce = async ({ fromUserId, candidate }: { fromUserId: string; candidate: any }) => {
      if (!candidate) return;
      const ignoreOffer = ignoreOfferRef.current.get(fromUserId) || false;
      if (ignoreOffer) return;

      await addOrQueueCandidate(fromUserId, candidate);
    };

    const handleUserLeft = ({ userId }: { userId: string }) => {
      const pc = pcsRef.current.get(userId);
      if (pc) {
        pc.close();
        pcsRef.current.delete(userId);
      }
      pendingCandidatesRef.current.delete(userId);
      isMakingOfferRef.current.delete(userId);
      ignoreOfferRef.current.delete(userId);
      movieSendersRef.current.delete(userId);
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    };

    const handleForceMute = () => {
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false;
        }
      }
      setIsMuted(true);
      getSocket().emit('participant:toggle-media', { isMuted: true });
    };

    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice', handleIce);
    socket.on('room:user-left', handleUserLeft);
    socket.on('host:force-mute', handleForceMute);

    return () => {
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice', handleIce);
      socket.off('room:user-left', handleUserLeft);
      socket.off('host:force-mute', handleForceMute);
    };
  }, [currentUserId]);

  const connectToPeer = async (targetUserId: string) => {
    if (!targetUserId || targetUserId === currentUserId) return;

    const existingPc = pcsRef.current.get(targetUserId);
    if (existingPc) {
      if (existingPc.signalingState === 'stable' && existingPc.iceConnectionState === 'connected') {
        return;
      }
      if (existingPc.signalingState === 'have-local-offer') {
        return;
      }
    }

    const pc = getOrCreatePeerConnection(targetUserId);

    try {
      isMakingOfferRef.current.set(targetUserId, true);
      const offer = await pc.createOffer();

      if (pc.signalingState === 'stable') {
        await pc.setLocalDescription(offer);
        getSocket().emit('webrtc:offer', { targetUserId, sdp: offer });
      }
    } catch (err: any) {
      if (err.name === 'InvalidAccessError' || err.name === 'InvalidStateError') {
        console.warn(`Handled WebRTC SDP offer renegotiation for ${targetUserId}, resetting connection:`, err.message || err);
        const oldPc = pcsRef.current.get(targetUserId);
        if (oldPc) {
          oldPc.close();
          pcsRef.current.delete(targetUserId);
        }
      } else {
        console.error(`Error initiating peer connection to ${targetUserId}:`, err);
      }
    } finally {
      isMakingOfferRef.current.set(targetUserId, false);
    }
  };

  const restartIce = async (targetUserId: string) => {
    const pc = pcsRef.current.get(targetUserId);
    if (!pc) return;
    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      getSocket().emit('webrtc:offer', { targetUserId, sdp: offer });
    } catch (err) {
      console.error('Manual ICE restart error:', err);
    }
  };

  const setParticipantVolume = (userId: string, volume: number) => {
    const clamped = Math.max(0, Math.min(100, volume));
    setParticipantVolumes((prev) => ({ ...prev, [userId]: clamped }));
  };

  const hostMuteParticipant = (targetUserId: string, targetMuted?: boolean) => {
    getSocket().emit('host:mute-participant', { targetUserId, isMuted: targetMuted });
  };

  const hostMuteAll = () => {
    getSocket().emit('host:mute-all');
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        const nextMuted = !isMuted;
        audioTrack.enabled = !nextMuted;
        setIsMuted(nextMuted);
        getSocket().emit('participant:toggle-media', { isMuted: nextMuted });
      }
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        const nextOff = !isVideoOff;
        videoTrack.enabled = !nextOff;
        setIsVideoOff(nextOff);
        getSocket().emit('participant:toggle-media', { isVideoOff: nextOff });
      }
    }
  };

  return (
    <WebRTCContext.Provider
      value={{
        localStream,
        remoteStreams,
        movieStream,
        remoteMovieStream,
        isMovieBroadcasting,
        broadcastMovieStream,
        stopMovieBroadcast,
        isMuted,
        isVideoOff,
        mediaError,
        participantVolumes,
        setParticipantVolume,
        hostMuteParticipant,
        hostMuteAll,
        connectToPeer,
        restartIce,
        toggleMic,
        toggleCamera,
      }}
    >
      {children}
    </WebRTCContext.Provider>
  );
};

export function useWebRTCContext(): WebRTCContextType {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTCContext must be used within a WebRTCProvider');
  }
  return context;
}

