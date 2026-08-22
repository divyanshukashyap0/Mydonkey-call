import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getSocket } from '../services/socket';
import { api } from '../services/api';
import { sendBinaryWithBackpressure } from '../utils/p2pTransfer';

export interface P2PVideoContextType {
  localVideoFile: File | null;
  setLocalVideoFile: (file: File | null) => void;
  localVideoObjectUrl: string | null;
  p2pStatus: 'idle' | 'provider_ready' | 'connecting' | 'connected' | 'error' | 'disconnected';
  p2pError: string | null;
  peerCount: number;
  requestChunk: (startByte: number, endByte: number) => Promise<ArrayBuffer | null>;
  peerVideoMetadata: { fileSize: number; mimeType: string; fileName: string } | null;
  reconnectP2P: () => void;
}


const P2PVideoContext = createContext<P2PVideoContextType | null>(null);

export const P2PVideoProvider: React.FC<{ currentUserId?: string; hostId?: string; children: React.ReactNode }> = ({
  currentUserId,
  hostId,
  children,
}) => {
  const [localVideoFile, setLocalVideoFileState] = useState<File | null>(null);
  const [localVideoObjectUrl, setLocalVideoObjectUrl] = useState<string | null>(null);
  const [p2pStatus, setP2pStatus] = useState<'idle' | 'provider_ready' | 'connecting' | 'connected' | 'error' | 'disconnected'>('idle');
  const [p2pError, setP2pError] = useState<string | null>(null);
  const [peerCount, setPeerCount] = useState(0);
  const [peerVideoMetadata, setPeerVideoMetadata] = useState<{ fileSize: number; mimeType: string; fileName: string } | null>(null);

  const localFileRef = useRef<File | null>(null);
  localFileRef.current = localVideoFile;

  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannelsRef = useRef<Map<string, RTCDataChannel>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const iceServersRef = useRef<RTCIceServer[]>([{ urls: 'stun:stun.l.google.com:19302' }]);

  const chunkResolversRef = useRef<Map<string, (data: ArrayBuffer) => void>>(new Map());

  // Per-viewer flow control & AbortController tracking
  const viewerTransfersRef = useRef<Map<string, { abortController: AbortController; currentRequestId?: string }>>(new Map());

  // Handle local video file registration (Host Side)
  const setLocalVideoFile = (file: File | null) => {
    // Abort all active host transfers when video changes
    viewerTransfersRef.current.forEach((t) => t.abortController.abort());
    viewerTransfersRef.current.clear();

    if (localVideoObjectUrl) {
      URL.revokeObjectURL(localVideoObjectUrl);
      setLocalVideoObjectUrl(null);
    }

    setLocalVideoFileState(file);
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setLocalVideoObjectUrl(objectUrl);
      setP2pStatus('provider_ready');
      setP2pError(null);

      const socket = getSocket();
      socket.emit('p2p-video:provider-ready', { videoId: file.name });
    } else {
      setP2pStatus('idle');
    }
  };

  // Fetch ICE servers
  useEffect(() => {
    api.getIceServers()
      .then((res) => {
        if (res?.iceServers) iceServersRef.current = res.iceServers;
      })
      .catch(() => {});
  }, []);

  // Cleanup ObjectURLs & Abort Controllers on unmount
  useEffect(() => {
    return () => {
      viewerTransfersRef.current.forEach((t) => t.abortController.abort());
      viewerTransfersRef.current.clear();

      if (localVideoObjectUrl) {
        URL.revokeObjectURL(localVideoObjectUrl);
      }
      pcsRef.current.forEach((pc) => pc.close());
      pcsRef.current.clear();
      dataChannelsRef.current.clear();
    };
  }, []);

  // Host DataChannel setup for incoming viewer connection
  const setupHostDataChannel = (targetUserId: string, channel: RTCDataChannel) => {
    channel.binaryType = 'arraybuffer';
    dataChannelsRef.current.set(targetUserId, channel);
    setPeerCount(dataChannelsRef.current.size);

    channel.onopen = () => {
      console.log(`[MovieTransfer] 📡 P2P Video DataChannel OPENED with viewer ${targetUserId}`);
    };

    channel.onclose = () => {
      console.log(`[MovieTransfer] viewer=${targetUserId} DataChannel closed`);
      const existing = viewerTransfersRef.current.get(targetUserId);
      if (existing) {
        existing.abortController.abort();
        viewerTransfersRef.current.delete(targetUserId);
      }
      dataChannelsRef.current.delete(targetUserId);
      setPeerCount(dataChannelsRef.current.size);
    };

    channel.onmessage = async (event) => {
      try {
        if (typeof event.data === 'string') {
          const msg = JSON.parse(event.data);
          const file = localFileRef.current;
          if (!file) return;

          if (msg.type === 'request-metadata') {
            channel.send(JSON.stringify({
              type: 'metadata',
              fileSize: file.size,
              mimeType: file.type || 'video/mp4',
              fileName: file.name,
            }));
          } else if (msg.type === 'request-chunk') {
            const { requestId, startByte, endByte } = msg;

            // Abort previous transfer for this specific viewer if still active
            const prevTransfer = viewerTransfersRef.current.get(targetUserId);
            if (prevTransfer) {
              prevTransfer.abortController.abort();
            }

            const abortController = new AbortController();
            viewerTransfersRef.current.set(targetUserId, {
              abortController,
              currentRequestId: requestId,
            });

            // Slice requested chunk on demand without duplicating full movie in memory
            const blobSlice = file.slice(startByte, Math.min(file.size, endByte));
            const buffer = await blobSlice.arrayBuffer();

            if (channel.readyState === 'open' && !abortController.signal.aborted) {
              // Send metadata header first
              channel.send(JSON.stringify({
                type: 'chunk-start',
                requestId,
                totalBytes: buffer.byteLength,
                totalPackets: Math.ceil(buffer.byteLength / (16 * 1024)),
              }));

              // Send binary buffer using reusable 16KB sub-packetizer with event-driven backpressure
              await sendBinaryWithBackpressure(channel, buffer, {
                packetSize: 16 * 1024, // 16 KB per RTCDataChannel.send() call
                highWaterMark: 512 * 1024,
                lowWaterMark: 128 * 1024,
                signal: abortController.signal,
                viewerId: targetUserId,
              });
            }
          }
        }
      } catch (err) {
        console.error(`[MovieTransfer] viewer=${targetUserId} DataChannel message error:`, err);
      }
    };
  };


  // Setup Peer Consumer DataChannel
  const setupConsumerDataChannel = (targetUserId: string, channel: RTCDataChannel) => {
    channel.binaryType = 'arraybuffer';
    dataChannelsRef.current.set(targetUserId, channel);

    let activeTransfer: { requestId: string; totalBytes: number; receivedBytes: number; chunks: Uint8Array[] } | null = null;

    channel.onopen = () => {
      console.log(`📡 P2P Video Consumer DataChannel OPENED with provider ${targetUserId}`);
      setP2pStatus('connected');
      setP2pError(null);

      // Request file metadata
      channel.send(JSON.stringify({ type: 'request-metadata' }));
    };

    channel.onclose = () => {
      setP2pStatus('disconnected');
      dataChannelsRef.current.delete(targetUserId);
    };

    channel.onerror = () => {
      setP2pStatus('error');
      setP2pError('P2P direct video connection failed between host and viewer.');
    };

    channel.onmessage = (event) => {
      try {
        if (typeof event.data === 'string') {
          const msg = JSON.parse(event.data);
          if (msg.type === 'metadata') {
            setPeerVideoMetadata({
              fileSize: msg.fileSize,
              mimeType: msg.mimeType,
              fileName: msg.fileName,
            });
          } else if (msg.type === 'chunk-start') {
            activeTransfer = {
              requestId: msg.requestId,
              totalBytes: msg.totalBytes,
              receivedBytes: 0,
              chunks: [],
            };
          }
        } else if (event.data instanceof ArrayBuffer && activeTransfer) {
          const frameUint8 = new Uint8Array(event.data);
          activeTransfer.chunks.push(frameUint8);
          activeTransfer.receivedBytes += frameUint8.byteLength;

          if (activeTransfer.receivedBytes >= activeTransfer.totalBytes) {
            const { requestId, totalBytes, chunks } = activeTransfer;
            const fullBuffer = new Uint8Array(totalBytes);
            let pos = 0;
            for (const chunk of chunks) {
              fullBuffer.set(chunk, pos);
              pos += chunk.byteLength;
            }

            const resolver = chunkResolversRef.current.get(requestId);
            if (resolver) {
              resolver(fullBuffer.buffer);
              chunkResolversRef.current.delete(requestId);
            }
            activeTransfer = null;
          }
        }
      } catch (err) {
        console.error('P2P Consumer DataChannel message error:', err);
      }
    };
  };


  // Connect to Host Provider (Viewer Side)
  const connectToHostProvider = async (providerUserId: string) => {
    if (!currentUserId || currentUserId === providerUserId) return;
    const socket = getSocket();

    try {
      setP2pStatus('connecting');

      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
      pcsRef.current.set(providerUserId, pc);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('p2p-video:ice', { targetUserId: providerUserId, candidate: event.candidate });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.iceConnectionState === 'failed') {
          setP2pStatus('error');
          setP2pError('P2P direct video connection failed. Check network NAT/firewall configuration.');
        }
      };

      const dataChannel = pc.createDataChannel('p2p-video-transfer', { ordered: true });
      setupConsumerDataChannel(providerUserId, dataChannel);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('p2p-video:offer', { targetUserId: providerUserId, sdp: offer });

    } catch (err: any) {
      console.error('P2P connectToHostProvider error:', err);
      setP2pStatus('error');
      setP2pError('Failed to initialize P2P video connection.');
    }
  };

  // Socket P2P Signaling Listeners
  useEffect(() => {
    const socket = getSocket();

    const handleOffer = async ({ fromUserId, sdp }: { fromUserId: string; sdp: any }) => {
      try {
        let pc = pcsRef.current.get(fromUserId);
        if (!pc) {
          pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
          pcsRef.current.set(fromUserId, pc);

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              socket.emit('p2p-video:ice', { targetUserId: fromUserId, candidate: event.candidate });
            }
          };

          pc.ondatachannel = (event) => {
            setupHostDataChannel(fromUserId, event.channel);
          };
        }

        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        const pending = pendingCandidatesRef.current.get(fromUserId) || [];
        pendingCandidatesRef.current.delete(fromUserId);
        for (const cand of pending) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('p2p-video:answer', { targetUserId: fromUserId, sdp: answer });

      } catch (err) {
        console.error('P2P handleOffer error:', err);
      }
    };

    const handleAnswer = async ({ fromUserId, sdp }: { fromUserId: string; sdp: any }) => {
      try {
        const pc = pcsRef.current.get(fromUserId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const pending = pendingCandidatesRef.current.get(fromUserId) || [];
          pendingCandidatesRef.current.delete(fromUserId);
          for (const cand of pending) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
        }
      } catch (err) {
        console.error('P2P handleAnswer error:', err);
      }
    };

    const handleIce = async ({ fromUserId, candidate }: { fromUserId: string; candidate: any }) => {
      try {
        const pc = pcsRef.current.get(fromUserId);
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          const list = pendingCandidatesRef.current.get(fromUserId) || [];
          list.push(candidate);
          pendingCandidatesRef.current.set(fromUserId, list);
        }
      } catch (err) {
        console.error('P2P handleIce error:', err);
      }
    };

    const handleProviderReady = ({ providerId }: { providerId: string; videoId: string }) => {
      if (currentUserId && currentUserId !== providerId) {
        connectToHostProvider(providerId);
      }
    };

    const handleUserLeft = ({ userId }: { userId: string }) => {
      console.log(`[MovieTransfer] user=${userId} left room - cleaning up P2P connection`);
      const existing = viewerTransfersRef.current.get(userId);
      if (existing) {
        existing.abortController.abort();
        viewerTransfersRef.current.delete(userId);
      }
      const pc = pcsRef.current.get(userId);
      if (pc) {
        pc.close();
        pcsRef.current.delete(userId);
      }
      dataChannelsRef.current.delete(userId);
      setPeerCount(dataChannelsRef.current.size);
    };

    const handleUserJoined = () => {
      if (localFileRef.current) {
        console.log('[MovieTransfer] New user joined room - re-broadcasting provider-ready event');
        socket.emit('p2p-video:provider-ready', { videoId: localFileRef.current.name });
      }
    };

    socket.on('p2p-video:offer', handleOffer);
    socket.on('p2p-video:answer', handleAnswer);
    socket.on('p2p-video:ice', handleIce);
    socket.on('p2p-video:provider-ready', handleProviderReady);
    socket.on('room:user-left', handleUserLeft);
    socket.on('room:user-joined', handleUserJoined);

    if (hostId && currentUserId && currentUserId !== hostId && p2pStatus === 'idle') {
      connectToHostProvider(hostId);
    }

    return () => {
      socket.off('p2p-video:offer', handleOffer);
      socket.off('p2p-video:answer', handleAnswer);
      socket.off('p2p-video:ice', handleIce);
      socket.off('p2p-video:provider-ready', handleProviderReady);
      socket.off('room:user-left', handleUserLeft);
      socket.off('room:user-joined', handleUserJoined);
    };

  }, [currentUserId, hostId]);

  // Reconnect P2P Stream manually or on retry
  const reconnectP2P = () => {
    if (hostId && currentUserId && currentUserId !== hostId) {
      console.log(`[MovieTransfer] Reconnecting P2P DataChannel stream to host ${hostId}`);
      const pc = pcsRef.current.get(hostId);
      if (pc) {
        pc.close();
        pcsRef.current.delete(hostId);
      }
      dataChannelsRef.current.delete(hostId);
      setP2pError(null);
      connectToHostProvider(hostId);
    }
  };

  // Request chunk from provider over DataChannel
  const requestChunk = (startByte: number, endByte: number): Promise<ArrayBuffer | null> => {
    return new Promise((resolve) => {
      const channel = hostId ? dataChannelsRef.current.get(hostId) : Array.from(dataChannelsRef.current.values())[0];
      if (!channel || channel.readyState !== 'open') {
        return resolve(null);
      }

      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const timeoutTimer = setTimeout(() => {
        chunkResolversRef.current.delete(requestId);
        resolve(null);
      }, 8000);

      chunkResolversRef.current.set(requestId, (data: ArrayBuffer) => {
        clearTimeout(timeoutTimer);
        resolve(data);
      });

      channel.send(JSON.stringify({
        type: 'request-chunk',
        requestId,
        startByte,
        endByte,
      }));
    });
  };

  return (
    <P2PVideoContext.Provider
      value={{
        localVideoFile,
        setLocalVideoFile,
        localVideoObjectUrl,
        p2pStatus,
        p2pError,
        peerCount,
        requestChunk,
        peerVideoMetadata,
        reconnectP2P,
      }}
    >
      {children}
    </P2PVideoContext.Provider>
  );
};


export function useP2PVideo() {
  const ctx = useContext(P2PVideoContext);
  if (!ctx) throw new Error('useP2PVideo must be used within a P2PVideoProvider');
  return ctx;
}
