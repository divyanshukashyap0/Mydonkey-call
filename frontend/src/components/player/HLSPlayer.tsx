import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { BACKEND_URL } from '../../config/apiConfig';

export interface AudioTrackItem {
  id: number;
  label: string;
  lang?: string;
}

export interface PlayerController {
  getCurrentTime: () => number;
  getDuration: () => number;
  playVideo: () => Promise<void>;
  pauseVideo: () => void;
  seekTo: (sec: number) => void;
  setPlaybackRate: (r: number) => void;
  getPlayerState: () => number;
  mute: () => void;
  unMute: () => void;
  isLiveStream?: boolean;
  getAudioTracks?: () => AudioTrackItem[];
  setAudioTrack?: (trackId: number) => void;
}

export function getAspectRatioLabel(width: number, height: number): { ratio: number; label: string } {
  if (!width || !height) return { ratio: 16 / 9, label: '16:9 HD' };
  const ratio = width / height;
  if (Math.abs(ratio - 2.39) < 0.15 || Math.abs(ratio - 2.40) < 0.15) {
    return { ratio, label: '2.39:1 Scope' };
  }
  if (Math.abs(ratio - 1.85) < 0.08) {
    return { ratio, label: '1.85:1 Flat' };
  }
  if (Math.abs(ratio - 1.43) < 0.1 || Math.abs(ratio - 1.90) < 0.1) {
    return { ratio, label: 'IMAX 70mm' };
  }
  if (Math.abs(ratio - 1.33) < 0.08) {
    return { ratio, label: '4:3 Academy' };
  }
  if (Math.abs(ratio - 1.777) < 0.1) {
    return { ratio, label: '16:9 HD' };
  }
  return { ratio, label: `${ratio.toFixed(2)}:1` };
}

interface HLSPlayerProps {
  manifestUrl: string;
  onReady?: (videoElement: HTMLVideoElement, controller: PlayerController) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onAudioTracksChange?: (tracks: AudioTrackItem[], activeTrackId: number) => void;
  onVideoDimensionsChange?: (width: number, height: number, aspectRatio: number, ratioLabel: string) => void;
}

export const HLSPlayer: React.FC<HLSPlayerProps> = ({
  manifestUrl,
  onReady,
  onTimeUpdate,
  onEnded,
  onAudioTracksChange,
  onVideoDimensionsChange,
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

    const mp4StreamUrl = fullManifestUrl.replace(/index\.m3u8.*$/, 'source.mp4');

    let isHlsLoaded = false;
    let retryTimer: any = null;

    const extractNativeAudioTracks = (): AudioTrackItem[] => {
      const nativeTracks = (video as any).audioTracks || (video as any).webkitAudioTracks;
      if (nativeTracks && nativeTracks.length > 0) {
        const items: AudioTrackItem[] = [];
        for (let i = 0; i < nativeTracks.length; i++) {
          const t = nativeTracks[i];
          items.push({
            id: i,
            label: t.label || t.language || `Audio Track ${i + 1}`,
            lang: t.language || undefined,
          });
        }
        return items;
      }
      return [];
    };

    const buildController = (hlsInstance?: Hls | null): PlayerController => {
      return {
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
        getAudioTracks: () => {
          if (hlsInstance && hlsInstance.audioTracks.length > 0) {
            return hlsInstance.audioTracks.map((t, idx) => ({
              id: idx,
              label: t.name || t.lang || `Track ${idx + 1}`,
              lang: t.lang || undefined,
            }));
          }
          return extractNativeAudioTracks();
        },
        setAudioTrack: (trackId: number) => {
          if (hlsInstance && hlsInstance.audioTracks.length > 0) {
            if (trackId >= 0 && trackId < hlsInstance.audioTracks.length) {
              hlsInstance.audioTrack = trackId;
            }
          } else {
            const nativeTracks = (video as any).audioTracks || (video as any).webkitAudioTracks;
            if (nativeTracks && nativeTracks.length > 0) {
              for (let i = 0; i < nativeTracks.length; i++) {
                nativeTracks[i].enabled = i === trackId;
              }
            }
          }
        },
      };
    };

    const notifyAudioTracks = (hlsInstance?: Hls | null) => {
      if (!onAudioTracksChange) return;
      if (hlsInstance && hlsInstance.audioTracks && hlsInstance.audioTracks.length > 0) {
        const tracks: AudioTrackItem[] = hlsInstance.audioTracks.map((t, idx) => ({
          id: idx,
          label: t.name || (t.lang ? t.lang.toUpperCase() : `Audio Track ${idx + 1}`),
          lang: t.lang || undefined,
        }));
        onAudioTracksChange(tracks, hlsInstance.audioTrack >= 0 ? hlsInstance.audioTrack : 0);
      } else {
        const nativeTracks = extractNativeAudioTracks();
        if (nativeTracks.length > 0) {
          let activeIndex = 0;
          const rawTracks = (video as any).audioTracks || (video as any).webkitAudioTracks;
          for (let i = 0; i < rawTracks.length; i++) {
            if (rawTracks[i].enabled) {
              activeIndex = i;
              break;
            }
          }
          onAudioTracksChange(nativeTracks, activeIndex);
        } else {
          onAudioTracksChange([{ id: 0, label: 'Default Audio Stream' }], 0);
        }
      }
    };

    const setupNativePlayback = () => {
      if (!video) return;
      const targetUrl = fullManifestUrl.endsWith('source.mp4') ? fullManifestUrl : mp4StreamUrl;
      if (video.src !== targetUrl) {
        video.src = targetUrl;
        video.load();
      }

      const handleLoaded = () => {
        if (retryTimer) clearInterval(retryTimer);
        notifyAudioTracks(null);
        if (onReady) onReady(video, buildController(null));
      };

      const handleError = () => {
        if (video.error && video.readyState >= 1 && video.error.code !== 4) {
          console.warn('Video stream buffering notice:', video.error.message);
        }
      };

      video.addEventListener('error', handleError);
      video.addEventListener('loadedmetadata', handleLoaded, { once: true });
      video.addEventListener('loadeddata', handleLoaded, { once: true });

      if (video.readyState >= 1 && onReady) {
        if (retryTimer) clearInterval(retryTimer);
        notifyAudioTracks(null);
        onReady(video, buildController(null));
      } else {
        retryTimer = setInterval(() => {
          if (video && video.readyState < 1) {
            video.load();
          } else {
            if (retryTimer) clearInterval(retryTimer);
            if (video && onReady) {
              notifyAudioTracks(null);
              onReady(video, buildController(null));
            }
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
        notifyAudioTracks(hls);
        if (onReady) onReady(video, buildController(hls));
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_event, data) => {
        if (data.audioTracks) {
          notifyAudioTracks(hls);
        }
      });

      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_event, data) => {
        if (onAudioTracksChange && hls.audioTracks) {
          const tracks: AudioTrackItem[] = hls.audioTracks.map((t, idx) => ({
            id: idx,
            label: t.name || (t.lang ? t.lang.toUpperCase() : `Audio Track ${idx + 1}`),
            lang: t.lang || undefined,
          }));
          onAudioTracksChange(tracks, data.id);
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error('⚠️ HLS Playback Fatal Error:', {
            type: data.type,
            details: data.details,
            fatal: data.fatal,
            url: fullManifestUrl,
          });
          if (!isHlsLoaded) {
            hls.destroy();
            hlsRef.current = null;
            setupNativePlayback();
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') && fullManifestUrl.endsWith('.m3u8')) {
      video.src = fullManifestUrl;
      video.addEventListener('loadedmetadata', () => {
        notifyAudioTracks(null);
        if (onReady) onReady(video, buildController(null));
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
    </div>
  );
};
