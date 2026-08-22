import React, { useEffect, useRef, useState } from 'react';
import { useP2PVideo } from '../../context/P2PVideoContext';
import { useMovieStreamContext } from '../../context/MovieStreamContext';
import { PlayerController, getAspectRatioLabel } from './HLSPlayer';
import { LiveWebRTCPlayer } from './LiveWebRTCPlayer';
import { ShieldAlert, Radio, RefreshCw, WifiOff, UploadCloud, Video } from 'lucide-react';

interface P2PVideoPlayerProps {
  isHost: boolean;
  videoTitle?: string;
  onReady?: (videoElement: HTMLVideoElement, controller: PlayerController) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onVideoDimensionsChange?: (width: number, height: number, aspectRatio: number, ratioLabel: string) => void;
}

function getCapturedMovieStream(videoEl: HTMLVideoElement): MediaStream | null {
  if (!videoEl) return null;
  try {
    if (typeof (videoEl as any).captureStream === 'function') {
      return (videoEl as any).captureStream();
    }
    if (typeof (videoEl as any).mozCaptureStream === 'function') {
      return (videoEl as any).mozCaptureStream();
    }
  } catch (err) {
    console.warn('[MovieStream] captureStream feature detection or CORS notice:', err);
  }
  return null;
}

export const P2PVideoPlayer: React.FC<P2PVideoPlayerProps> = ({
  isHost,
  videoTitle,
  onReady,
  onTimeUpdate,
  onEnded,
  onVideoDimensionsChange,
}) => {
  const { localVideoObjectUrl, setLocalVideoFile, p2pStatus, p2pError, requestChunk, peerVideoMetadata, peerCount, reconnectP2P } = useP2PVideo();
  const { startBroadcastingMovie, remoteMovieStream, reconnectMovieStream } = useMovieStreamContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [bufferProgress, setBufferProgress] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);

  const currentObjectUrlRef = useRef<string | null>(null);

  // Peer Viewer: Periodically request live WebRTC movie stream connection from Host if not connected
  useEffect(() => {
    if (!isHost && !remoteMovieStream) {
      reconnectMovieStream();
      const interval = setInterval(() => {
        if (!remoteMovieStream) reconnectMovieStream();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isHost, remoteMovieStream]);

  // Host: Play directly from local file ObjectURL
  useEffect(() => {
    if (isHost && localVideoObjectUrl) {
      setStreamUrl(localVideoObjectUrl);
    }
  }, [isHost, localVideoObjectUrl]);

  // Host: Capture stream on video metadata load & play for Live WebRTC MediaStream Broadcast
  const handleHostVideoInit = () => {
    if (isHost && videoRef.current) {
      const capturedStream = getCapturedMovieStream(videoRef.current);
      if (capturedStream) {
        console.log('[MovieStream] Host captured movie MediaStream for Live WebRTC broadcast');
        startBroadcastingMovie(capturedStream);
      }
    }
  };

  // Peer Viewer: Fallback to progressive P2P video stream over WebRTC DataChannel
  useEffect(() => {
    if (isHost) return;

    let isMounted = true;
    let cancel = false;

    async function initP2PStream() {
      if (!peerVideoMetadata) return;

      const { fileSize, mimeType } = peerVideoMetadata;
      const CHUNK_SIZE = 512 * 1024; // 512 KB chunks for high-performance throughput
      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
      const buffers: ArrayBuffer[] = [];
      let fetchedBytes = 0;
      let initialBlobCreated = false;

      setIsBuffering(true);
      setBufferProgress(0);

      // Fast-start window: create initial playable Blob URL after 2 MB or 100% of smaller files
      const initialWindow = Math.min(4, totalChunks);

      for (let i = 0; i < totalChunks && !cancel; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(fileSize, (i + 1) * CHUNK_SIZE);

        let chunkData: ArrayBuffer | null = null;
        let attempts = 0;

        // Try requesting chunk up to 3 times with short retry backoff
        while (attempts < 3 && !chunkData && !cancel && isMounted) {
          attempts++;
          chunkData = await requestChunk(start, end);
          if (!chunkData && attempts < 3 && !cancel && isMounted) {
            await new Promise((r) => setTimeout(r, 400));
          }
        }

        if (!chunkData || cancel || !isMounted) {
          console.warn(`[P2PVideoPlayer] Failed to retrieve chunk index ${i} after 3 attempts.`);
          break;
        }

        buffers.push(chunkData);
        fetchedBytes += chunkData.byteLength;

        const progressPercent = Math.round((fetchedBytes / fileSize) * 100);
        if (isMounted) setBufferProgress(progressPercent);

        // 1. Initial playable Blob URL once fast-start window (2MB or 100%) is ready
        if (!initialBlobCreated && (i === initialWindow - 1 || i === totalChunks - 1)) {
          initialBlobCreated = true;
          const blob = new Blob(buffers, { type: mimeType || 'video/mp4' });
          const blobUrl = URL.createObjectURL(blob);

          if (isMounted) {
            currentObjectUrlRef.current = blobUrl;
            setStreamUrl(blobUrl);
            setIsBuffering(false);
          }
        }
      }

      // 2. Once 100% of chunks are downloaded, swap to the complete final Blob URL if movie > initial window
      if (!cancel && isMounted && buffers.length === totalChunks && totalChunks > initialWindow) {
        const finalBlob = new Blob(buffers, { type: mimeType || 'video/mp4' });
        const finalBlobUrl = URL.createObjectURL(finalBlob);

        const video = videoRef.current;
        const prevTime = video?.currentTime || 0;

        if (currentObjectUrlRef.current) {
          URL.revokeObjectURL(currentObjectUrlRef.current);
        }
        currentObjectUrlRef.current = finalBlobUrl;
        setStreamUrl(finalBlobUrl);
        setIsBuffering(false);

        if (video && prevTime > 0) {
          video.currentTime = prevTime;
        }
      }
    }

    initP2PStream();

    return () => {
      isMounted = false;
      cancel = true;
    };
  }, [isHost, peerVideoMetadata]);

  // Auto-play stream on viewer device once streamUrl updates
  useEffect(() => {
    if (!isHost && streamUrl && videoRef.current) {
      const video = videoRef.current;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
      }
    }
  }, [isHost, streamUrl]);

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

  // Peer Viewer: If live WebRTC movie stream is active from Host, display LiveWebRTCPlayer directly
  if (!isHost && remoteMovieStream) {
    return (
      <LiveWebRTCPlayer
        stream={remoteMovieStream}
        videoTitle={videoTitle}
        onReady={onReady}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onVideoDimensionsChange={onVideoDimensionsChange}
      />
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      {/* P2P Status Overlay Banner */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem' }}>
        <Radio size={14} color={p2pStatus === 'connected' || isHost ? 'var(--success)' : p2pStatus === 'error' ? 'var(--danger)' : 'var(--warning)'} className={p2pStatus === 'connecting' ? 'spin' : ''} />
        <span style={{ color: '#fff', fontWeight: 600 }}>
          {isHost ? `P2P Host (Sharing stream with ${peerCount} peers)` : p2pStatus === 'connected' ? `P2P Stream (${bufferProgress}%)` : p2pStatus === 'connecting' ? `P2P Buffering (${bufferProgress}%)` : p2pStatus === 'error' ? 'P2P Connection Error' : 'P2P Standing By'}
        </span>
      </div>

      {isHost && !localVideoObjectUrl ? (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', background: 'rgba(99, 102, 241, 0.05)' }}>
          <UploadCloud size={48} color="var(--primary)" style={{ marginBottom: '12px' }} />
          <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>Host Stream Re-attachment Required</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', marginBottom: '16px' }}>
            {videoTitle ? `Re-select "${videoTitle}"` : 'Select movie file'} from your local device to broadcast direct P2P video stream to room participants.
          </p>
          <label className="btn btn-primary" style={{ cursor: 'pointer', gap: '8px' }}>
            <UploadCloud size={16} />
            <span>Re-attach Local Video File</span>
            <input
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setLocalVideoFile(e.target.files[0]);
                }
              }}
            />
          </label>
        </div>
      ) : p2pError ? (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <ShieldAlert size={40} color="var(--danger)" style={{ marginBottom: '12px' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fca5a5', marginBottom: '6px' }}>P2P Direct Video Connection Failed</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', marginBottom: '16px' }}>{p2pError}</p>
          <button className="btn btn-primary btn-sm" onClick={reconnectP2P} style={{ gap: '6px' }}>
            <RefreshCw size={14} />
            <span>Reconnect P2P Stream</span>
          </button>
        </div>
      ) : !isHost && (!streamUrl || isBuffering) && p2pStatus !== 'error' ? (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <RefreshCw size={36} color="var(--primary)" className="spin" style={{ marginBottom: '12px' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px' }}>
            {p2pStatus === 'connected' ? 'Buffering P2P Movie Stream...' : 'Connecting to Host P2P Stream...'}
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '400px', marginBottom: '16px' }}>
            Receiving video stream directly from room host ({bufferProgress}% ready)
          </p>
          <button className="btn btn-secondary btn-sm" onClick={reconnectP2P} style={{ gap: '6px' }}>
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={streamUrl || undefined}
          controls={false}
          playsInline
          preload="auto"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onPlay={handleHostVideoInit}
          onLoadedMetadata={() => {
            handleHostVideoInit();
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
          onEnded={() => {
            if ((isHost || bufferProgress >= 98) && onEnded) {
              onEnded();
            }
          }}
        />
      )}
    </div>
  );
};


