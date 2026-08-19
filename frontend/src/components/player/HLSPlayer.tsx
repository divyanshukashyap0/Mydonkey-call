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

    const setupNativePlayback = () => {
      if (!video) return;
      video.src = mp4StreamUrl;
      video.load();

      const handleLoadedMetadata = () => {
        if (onReady) onReady(video);
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
      if (video.readyState >= 1 && onReady) {
        onReady(video);
      }
    };

    if (Hls.isSupported()) {
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
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = fullManifestUrl;
      video.addEventListener('loadedmetadata', () => {
        if (onReady) onReady(video);
      }, { once: true });
    } else {
      setupNativePlayback();
    }

    return () => {
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
