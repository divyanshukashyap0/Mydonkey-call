import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { BACKEND_URL } from '../../config/apiConfig';

interface HLSPlayerProps {
  manifestUrl: string;
  onReady?: (videoElement: HTMLVideoElement) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
}

export const HLSPlayer: React.FC<HLSPlayerProps> = ({
  manifestUrl,
  onReady,
  onTimeUpdate,
  onEnded,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !manifestUrl) return;

    // Resolve full URLs
    const fullManifestUrl = manifestUrl.startsWith('http')
      ? manifestUrl
      : `${BACKEND_URL.replace(/\/$/, '')}${manifestUrl.startsWith('/') ? '' : '/'}${manifestUrl}`;

    // Direct MP4 fallback URL (works instantly with HTTP 206 Range requests for uploaded videos)
    const mp4StreamUrl = fullManifestUrl.replace(/index\.m3u8.*$/, 'source.mp4');

    let isHlsLoaded = false;

    let retryTimer: any = null;

    const setupNativePlayback = () => {
      if (!video) return;
      const targetUrl = fullManifestUrl.endsWith('source.mp4') ? fullManifestUrl : mp4StreamUrl;
      if (video.src !== targetUrl) {
        video.src = targetUrl;
        video.load();
      }

      const handleLoaded = () => {
        if (retryTimer) clearInterval(retryTimer);
        if (onReady) onReady(video);
      };

      video.addEventListener('loadedmetadata', handleLoaded, { once: true });
      video.addEventListener('loadeddata', handleLoaded, { once: true });

      if (video.readyState >= 1 && onReady) {
        if (retryTimer) clearInterval(retryTimer);
        onReady(video);
      } else {
        // If video container is still being written on backend, retry polling every 3.5s
        retryTimer = setInterval(() => {
          if (video && video.readyState < 1) {
            video.load();
          } else {
            if (retryTimer) clearInterval(retryTimer);
            if (video && onReady) onReady(video);
          }
        }, 3500);
      }
    };

    const isUploadedStream = fullManifestUrl.includes('/api/videos/stream/') || fullManifestUrl.endsWith('source.mp4');

    if (isUploadedStream) {
      setupNativePlayback();
    } else if (Hls.isSupported() && fullManifestUrl.endsWith('.m3u8')) {
      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        enableWorker: true,
        lowLatencyMode: true,
        fragLoadingRetryDelay: 1000,
        manifestLoadingRetryDelay: 1000,
      });

      hlsRef.current = hls;
      hls.loadSource(fullManifestUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        isHlsLoaded = true;
        if (onReady) onReady(video);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal && !isHlsLoaded) {
          console.warn('HLS manifest loading failed, falling back to native MP4 stream:', data);
          hls.destroy();
          hlsRef.current = null;
          setupNativePlayback();
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') && fullManifestUrl.endsWith('.m3u8')) {
      video.src = fullManifestUrl;
      video.addEventListener('loadedmetadata', () => {
        if (onReady) onReady(video);
      }, { once: true });
    } else {
      setupNativePlayback();
    }

    return () => {
      if (retryTimer) clearInterval(retryTimer);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [manifestUrl]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <video
        ref={videoRef}
        controls={false}
        playsInline
        preload="auto"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onTimeUpdate={() => {
          if (videoRef.current && onTimeUpdate) {
            onTimeUpdate(videoRef.current.currentTime, videoRef.current.duration || 0);
          }
        }}
        onEnded={onEnded}
      />
    </div>
  );
};
