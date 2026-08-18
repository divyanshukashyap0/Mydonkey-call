import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../services/socket';
import { api } from '../services/api';

export interface RemoteStreamInfo {
  userId: string;
  stream: MediaStream;
}

export function useWebRTC(currentUserId?: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceServersRef = useRef<RTCIceServer[]>([{ urls: 'stun:stun.l.google.com:19302' }]);

  useEffect(() => {
    let isMounted = true;

    async function initMedia() {
      try {
        const iceRes = await api.getIceServers().catch(() => ({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }));
        if (iceRes?.iceServers) {
          iceServersRef.current = iceRes.iceServers;
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
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const localStreamRef = useRef<MediaStream | null>(null);
  localStreamRef.current = localStream;

  // Dynamically attach local tracks to all existing peer connections when localStream becomes available
  useEffect(() => {
    if (!localStream) return;

    pcsRef.current.forEach((pc) => {
      const existingSenders = pc.getSenders();
      localStream.getTracks().forEach((track) => {
        const alreadyAdded = existingSenders.some((sender) => sender.track === track);
        if (!alreadyAdded) {
          pc.addTrack(track, localStream);
        }
      });
    });
  }, [localStream]);

  // WebRTC Signaling Event Handling over Socket.IO
  useEffect(() => {
    const socket = getSocket();

    const createPeerConnection = (targetUserId: string) => {
      if (pcsRef.current.has(targetUserId)) {
        const existingPc = pcsRef.current.get(targetUserId)!;
        const currentStream = localStreamRef.current || localStream;
        if (currentStream) {
          const senders = existingPc.getSenders();
          currentStream.getTracks().forEach((track) => {
            if (!senders.some((s) => s.track === track)) {
              existingPc.addTrack(track, currentStream);
            }
          });
        }
        return existingPc;
      }

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

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.set(targetUserId, event.streams[0]);
            return next;
          });
        }
      };

      pcsRef.current.set(targetUserId, pc);
      return pc;
    };

    const handleOffer = async ({ fromUserId, sdp }: { fromUserId: string; sdp: any }) => {
      const pc = createPeerConnection(fromUserId);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp)).catch(console.error);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc:answer', { targetUserId: fromUserId, sdp: answer });
    };

    const handleAnswer = async ({ fromUserId, sdp }: { fromUserId: string; sdp: any }) => {
      const pc = pcsRef.current.get(fromUserId);
      if (pc && pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp)).catch(console.error);
      }
    };

    const handleIce = async ({ fromUserId, candidate }: { fromUserId: string; candidate: any }) => {
      const pc = pcsRef.current.get(fromUserId);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
      }
    };

    const handleUserLeft = ({ userId }: { userId: string }) => {
      const pc = pcsRef.current.get(userId);
      if (pc) {
        pc.close();
        pcsRef.current.delete(userId);
      }
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
  }, [localStream]);

  // Initiate connection to a target user
  const connectToPeer = async (targetUserId: string) => {
    if (!targetUserId || targetUserId === currentUserId) return;
    const socket = getSocket();

    const pc = pcsRef.current.get(targetUserId);
    if (pc && (pc.signalingState === 'stable' || pc.signalingState === 'have-local-offer')) {
      return;
    }

    const pcInstance = new RTCPeerConnection({ iceServers: iceServersRef.current });
    const activeStream = localStreamRef.current || localStream;
    if (activeStream) {
      activeStream.getTracks().forEach((track) => pcInstance.addTrack(track, activeStream));
    }

    pcInstance.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc:ice', { targetUserId, candidate: event.candidate });
      }
    };

    pcInstance.oniceconnectionstatechange = () => {
      if (pcInstance.iceConnectionState === 'failed' || pcInstance.iceConnectionState === 'disconnected') {
        console.warn(`⚠️ WebRTC ICE connection ${pcInstance.iceConnectionState} for peer ${targetUserId}. Triggering ICE restart...`);
        pcInstance.createOffer({ iceRestart: true })
          .then((offer) => pcInstance.setLocalDescription(offer))
          .then(() => {
            socket.emit('webrtc:offer', { targetUserId, sdp: pcInstance.localDescription });
          })
          .catch((err) => console.error('ICE restart offer error:', err));
      }
    };

    pcInstance.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(targetUserId, event.streams[0]);
          return next;
        });
      }
    };

    pcsRef.current.set(targetUserId, pcInstance);

    try {
      const offer = await pcInstance.createOffer();
      await pcInstance.setLocalDescription(offer);
      socket.emit('webrtc:offer', { targetUserId, sdp: offer });
    } catch (err) {
      console.error('WebRTC createOffer error:', err);
    }
  };

  const restartIce = async (targetUserId: string) => {
    const pc = pcsRef.current.get(targetUserId);
    if (!pc) return;
    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      const socket = getSocket();
      socket.emit('webrtc:offer', { targetUserId, sdp: offer });
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
        const socket = getSocket();
        socket.emit('participant:toggle-media', { isMuted: nextMuted });
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
        const socket = getSocket();
        socket.emit('participant:toggle-media', { isVideoOff: nextOff });
      }
    }
  };

  return {
    localStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    mediaError,
    connectToPeer,
    restartIce,
    toggleMic,
    toggleCamera,
  };
}
