import React, { useEffect, useRef, useState } from 'react';
import { useP2PVideo } from '../../context/P2PVideoContext';
import { PlayerController, getAspectRatioLabel } from './HLSPlayer';
import { ShieldAlert, Radio, RefreshCw, WifiOff } from 'lucide-react';

interface P2PVideoPlayerProps {
  isHost: boolean;
  videoTitle?: string;
  onReady?: (videoElement: HTMLVideoElement, controller: PlayerController) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onVideoDimensionsChange?: (width: number, height: number, aspectRatio: number, ratioLabel: string) => void;
}

export const P2PVideoPlayer: React.FC<P2PVideoPlayerProps> = ({
  isHost,
  videoTitle,
  onReady,
  onTimeUpdate,
  onEnded,
  onVideoDimensionsChange,
}) => {
  const { localVideoObjectUrl, p2pStatus, p2pError, requestChunk, peerVideoMetadata, peerCount } = useP2PVideo();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [bufferProgress, setBufferProgress] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);

  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const currentObjectUrlRef = useRef<string | null>(null);
  const isFetchingChunksRef = useRef(false);

  // Host: Play directly from local file ObjectURL
  useEffect(() => {
    if (isHost && localVideoObjectUrl) {
      setStreamUrl(localVideoObjectUrl);
    }
  }, [isHost, localVideoObjectUrl]);

  // Peer Viewer: Receive progressive P2P chunks over DataChannel
  useEffect(() => {
    if (isHost) return;

    let isMounted = true;
    let cancel = false;

    async function initP2PStream() {
      if (!peerVideoMetadata) return;

      const { fileSize, mimeType } = peerVideoMetadata;
      const CHUNK_SIZE = 128 * 1024; // 128 KB chunks for fast streaming
      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

      if (window.MediaSource && MediaSource.isTypeSupported(mimeType || 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"')) {
        try {
          const ms = new MediaSource();
          mediaSourceRef.current = ms;
          const msUrl = URL.createObjectURL(ms);
          if (currentObjectUrlRef.current) URL.revokeObjectURL(currentObjectUrlRef.current);
          currentObjectUrlRef.current = msUrl;
          if (isMounted) setStreamUrl(msUrl);

          ms.addEventListener('sourceopen', async () => {
            if (cancel || ms.readyState !== 'open') return;
            try {
              const sb = ms.addSourceBuffer(mimeType || 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
              sourceBufferRef.current = sb;

              let fetchedBytes = 0;
              for (let i = 0; i < totalChunks && !cancel; i++) {
                const start = i * CHUNK_SIZE;
                const end = Math.min(fileSize, (i + 1) * CHUNK_SIZE);
                const chunkData = await requestChunk(start, end);

                if (chunkData && sb && !sb.updating && ms.readyState === 'open') {
                  fetchedBytes += chunkData.byteLength;
                  sb.appendBuffer(chunkData);
                  await new Promise((r) => {
                    sb.onupdateend = r;
                  });

                  if (isMounted) {
                    setBufferProgress(Math.round((fetchedBytes / fileSize) * 100));
                  }
                }
              }

              if (ms.readyState === 'open' && !sb.updating) {
                ms.endOfStream();
              }
            } catch (sbErr) {
              console.warn('MSE SourceBuffer warning:', sbErr);
            }
          });
          return;
        } catch (mseErr) {
          console.warn('MSE init fallback to Blob array:', mseErr);
        }
      }

      // Progressive Blob Stream Buffer
      try {
        setIsBuffering(true);
        const buffers: ArrayBuffer[] = [];
        let fetched = 0;
        const initialWindow = Math.min(4, totalChunks);

        for (let i = 0; i < totalChunks && !cancel; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(fileSize, (i + 1) * CHUNK_SIZE);
          const chunkData = await requestChunk(start, end);
          if (chunkData) {
            buffers.push(chunkData);
            fetched += chunkData.byteLength;

            if (isMounted) {
              setBufferProgress(Math.round((fetched / fileSize) * 100));
            }

            // Create initial playable Blob URL once initial window is ready
            if (i === initialWindow - 1 || i === totalChunks - 1) {
              const blob = new Blob(buffers, { type: mimeType || 'video/mp4' });
              const blobUrl = URL.createObjectURL(blob);
              if (currentObjectUrlRef.current) URL.revokeObjectURL(currentObjectUrlRef.current);
              currentObjectUrlRef.current = blobUrl;

              if (isMounted) {
                const prevTime = videoRef.current?.currentTime || 0;
                setStreamUrl(blobUrl);
                setIsBuffering(false);
                if (videoRef.current && prevTime > 0) {
                  videoRef.current.currentTime = prevTime;
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('P2P fallback chunk streaming error:', err);
      }

    }

    initP2PStream();

    return () => {
      isMounted = false;
      cancel = true;
      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
        currentObjectUrlRef.current = null;
      }
    };
  }, [isHost, peerVideoMetadata]);

  // Controller Builder
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    const controller: PlayerController = {
      getCurrentTime: () => video.currentTime,
      getDuration: () => video.duration || 0,
      playVideo: async () => {
        try {
          const p = video.play();
          if (p !== undefined) await p;
        } catch (err: any) {
          if (err.name === 'NotAllowedError') {
            video.muted = true;
            video.play().catch(() => {});
          }
        }
      },
      pauseVideo: () => {
        try {
          video.pause();
        } catch (err) {}
      },
      seekTo: (sec: number) => {
        video.currentTime = sec;
      },
      setPlaybackRate: (r: number) => {
        video.playbackRate = r;
      },
      getPlayerState: () => (video.paused ? 2 : 1),
      mute: () => {
        video.muted = true;
      },
      unMute: () => {
        video.muted = false;
      },
    };

    if (onReady) onReady(video, controller);
  }, [streamUrl]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      {/* P2P Status Overlay Banner */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem' }}>
        <Radio size={14} color={p2pStatus === 'connected' || isHost ? 'var(--success)' : p2pStatus === 'error' ? 'var(--danger)' : 'var(--warning)'} className={p2pStatus === 'connecting' ? 'spin' : ''} />
        <span style={{ color: '#fff', fontWeight: 600 }}>
          {isHost ? `P2P Provider (Sharing with ${peerCount} peers)` : p2pStatus === 'connected' ? 'P2P Direct Stream' : p2pStatus === 'connecting' ? `P2P Buffering (${bufferProgress}%)` : p2pStatus === 'error' ? 'P2P Connection Error' : 'P2P Standing By'}
        </span>
      </div>

      {p2pError ? (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <ShieldAlert size={40} color="var(--danger)" style={{ marginBottom: '12px' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fca5a5', marginBottom: '6px' }}>P2P Direct Video Connection Failed</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', marginBottom: '16px' }}>{p2pError}</p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Note: Central backend bandwidth streaming is disabled. Direct peer-to-peer connection requires host availability.</p>
        </div>
      ) : !isHost && p2pStatus === 'connecting' && !streamUrl ? (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <RefreshCw size={36} color="var(--primary)" className="spin" style={{ marginBottom: '12px' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px' }}>Establishing P2P DataChannel Connection...</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Requesting video stream directly from host browser ({bufferProgress}% ready)</p>
        </div>
      ) : !isHost && p2pStatus === 'disconnected' ? (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <WifiOff size={40} color="var(--warning)" style={{ marginBottom: '12px' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--warning)', marginBottom: '6px' }}>Video Host Disconnected</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '400px' }}>The video source host has disconnected from the room. Waiting for host to reconnect or select a new video.</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={streamUrl || undefined}
          controls={false}
          playsInline
          preload="auto"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onLoadedMetadata={() => {
            if (videoRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight) {
              const w = videoRef.current.videoWidth;
              const h = videoRef.current.videoHeight;
              const { ratio, label } = getAspectRatioLabel(w, h);
              if (onVideoDimensionsChange) {
                onVideoDimensionsChange(w, h, ratio, label);
              }
            }
          }}
          onTimeUpdate={() => {
            if (videoRef.current && onTimeUpdate) {
              onTimeUpdate(videoRef.current.currentTime, videoRef.current.duration || 0);
            }
          }}
          onEnded={onEnded}
        />
      )}
    </div>
  );
};
