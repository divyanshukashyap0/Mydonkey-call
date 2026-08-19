import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getSocket } from '../services/socket';
import { api } from '../services/api';

export interface WebRTCContextType {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isMuted: boolean;
  isVideoOff: boolean;
  mediaError: string | null;
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
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const isMakingOfferRef = useRef<Map<string, boolean>>(new Map());
  const ignoreOfferRef = useRef<Map<string, boolean>>(new Map());
  const iceServersRef = useRef<RTCIceServer[]>([{ urls: 'stun:stun.l.google.com:19302' }]);

  const localStreamRef = useRef<MediaStream | null>(null);
  localStreamRef.current = localStream;

  // Initialize camera and microphone
  useEffect(() => {
    let isMounted = true;

    async function initMedia() {
      try {
        const iceRes = await api.getIceServers().catch(() => ({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }));
        if (iceRes?.iceServers) {
          iceServersRef.current = iceRes.iceServers;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('MediaDevices API is unavailable in this browser context (requires HTTPS or localhost).');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (isMounted) {
          setLocalStream(stream);
          setMediaError(null);
        }
      } catch (err: any) {
        console.warn('Camera/Microphone access error:', err.message);
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
    };
  }, []);

  // Dynamically attach local tracks to all existing peer connections when localStream becomes available
  useEffect(() => {
    if (!localStream) return;

    pcsRef.current.forEach((pc, targetUserId) => {
      const existingSenders = pc.getSenders();
      let addedAny = false;
      localStream.getTracks().forEach((track) => {
        const alreadyAdded = existingSenders.some((sender) => sender.track === track);
        if (!alreadyAdded) {
          pc.addTrack(track, localStream);
          addedAny = true;
        }
      });

      if (addedAny && (pc.signalingState === 'stable' || pc.signalingState === 'have-local-offer')) {
        connectToPeer(targetUserId);
      }
    });
  }, [localStream]);

  // Queue ICE candidate if remote description isn't set yet
  const addOrQueueCandidate = async (targetUserId: string, candidate: RTCIceCandidateInit) => {
    const pc = pcsRef.current.get(targetUserId);
    if (!pc) return;

    if (pc.remoteDescription && pc.remoteDescription.type) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn(`ICE candidate add warning for ${targetUserId}:`, err);
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
    if (!pc) return;
    const queue = pendingCandidatesRef.current.get(targetUserId) || [];
    pendingCandidatesRef.current.delete(targetUserId);

    for (const cand of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.warn(`Draining ICE candidate warning for ${targetUserId}:`, err);
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
        activeStream.getTracks().forEach((track) => {
          if (!senders.some((s) => s.track === track)) {
            existingPc.addTrack(track, activeStream);
          }
        });
      }
      return existingPc;
    }

    const socket = getSocket();
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
    const activeStream = localStreamRef.current || localStream;

    if (activeStream) {
      activeStream.getTracks().forEach((track) => pc.addTrack(track, activeStream));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc:ice', { targetUserId, candidate: event.candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        console.warn(`⚠️ WebRTC ICE connection ${pc.iceConnectionState} for peer ${targetUserId}. Triggering ICE restart...`);
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
        console.log(`Ignoring offer collision from ${fromUserId} (impolite peer)`);
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
      } catch (err) {
        console.error(`Error handling offer from ${fromUserId}:`, err);
      }
    };

    const handleAnswer = async ({ fromUserId, sdp }: { fromUserId: string; sdp: any }) => {
      const pc = pcsRef.current.get(fromUserId);
      if (!pc) return;

      if (pc.signalingState === 'have-local-offer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await processPendingCandidates(fromUserId);
        } catch (err) {
          console.error(`Error setting remote answer for ${fromUserId}:`, err);
        }
      } else {
        console.warn(`Ignoring answer from ${fromUserId} because signalingState is '${pc.signalingState}' (expected 'have-local-offer')`);
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
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    };

    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice', handleIce);
    socket.on('room:user-left', handleUserLeft);

    return () => {
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice', handleIce);
      socket.off('room:user-left', handleUserLeft);
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

      if (pc.signalingState === 'stable' || pc.signalingState === 'have-local-offer') {
        await pc.setLocalDescription(offer);
        getSocket().emit('webrtc:offer', { targetUserId, sdp: offer });
      }
    } catch (err) {
      console.error(`Error initiating peer connection to ${targetUserId}:`, err);
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
        isMuted,
        isVideoOff,
        mediaError,
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
