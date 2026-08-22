import React, { useEffect, useRef, useState } from 'react';
import { PlayerController, getAspectRatioLabel } from './HLSPlayer';
import { Radio, VolumeX, Volume2, Sparkles, RefreshCw } from 'lucide-react';
import { useMovieStreamContext } from '../../context/MovieStreamContext';

interface LiveWebRTCPlayerProps {
  stream?: MediaStream | null;
  videoTitle?: string;
  isHost?: boolean;
  onReady?: (videoElement: HTMLVideoElement, controller: PlayerController) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onVideoDimensionsChange?: (width: number, height: number, aspectRatio: number, ratioLabel: string) => void;
}

export const LiveWebRTCPlayer: React.FC<LiveWebRTCPlayerProps> = ({
  stream: customStream,
  videoTitle,
  isHost = false,
  onReady,
  onTimeUpdate,
  onEnded,
  onVideoDimensionsChange,
}) => {
  const { localMovieStream, remoteMovieStream } = useMovieStreamContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);

  // Active stream is either custom passed stream, host's localMovieStream, or viewer's remoteMovieStream
  const activeStream = customStream !== undefined ? customStream : (isHost ? localMovieStream : remoteMovieStream);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (activeStream) {
      if (video.srcObject !== activeStream) {
        video.srcObject = activeStream;
        video.load();
      }

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsAutoplayBlocked(false);
          })
          .catch((err: any) => {
            if (err.name === 'NotAllowedError') {
              console.warn('[LiveWebRTCPlayer] Audio autoplay restricted by browser policy, muting initially');
              video.muted = true;
              setIsAudioMuted(true);
              setIsAutoplayBlocked(true);
              video.play().catch(() => {});
            }
          });
      }
    } else {
      video.srcObject = null;
    }
  }, [activeStream]);

  // Controller Builder for player integration
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeStream) return;

    const controller: PlayerController = {
      getCurrentTime: () => video.currentTime || 0,
      getDuration: () => video.duration || 0,
      playVideo: async () => {
        try {
          const p = video.play();
          if (p !== undefined) await p;
        } catch (err: any) {
          if (err.name === 'NotAllowedError') {
            video.muted = true;
            setIsAudioMuted(true);
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
        try {
          video.currentTime = sec;
        } catch (err) {}
      },
      setPlaybackRate: (r: number) => {
        try {
          video.playbackRate = r;
        } catch (err) {}
      },
      getPlayerState: () => (video.paused ? 2 : 1),
      mute: () => {
        video.muted = true;
        setIsAudioMuted(true);
      },
      unMute: () => {
        video.muted = false;
        setIsAudioMuted(false);
      },
    };

    if (onReady) onReady(video, controller);
  }, [activeStream]);

  const handleUnmuteClick = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      setIsAudioMuted(false);
      setIsAutoplayBlocked(false);
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      {/* Live Badge Overlay */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem' }}>
        <Radio size={14} color="var(--success)" className="spin" />
        <span style={{ color: '#fff', fontWeight: 600 }}>
          {isHost ? 'Live WebRTC Movie Broadcaster' : 'Live WebRTC Movie Stream'}
        </span>
      </div>

      {isAutoplayBlocked && (
        <button
          onClick={handleUnmuteClick}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 20,
            background: 'rgba(229, 9, 20, 0.9)',
            color: '#fff',
            border: 'none',
            borderRadius: '30px',
            padding: '12px 24px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(229, 9, 20, 0.5)',
          }}
        >
          <VolumeX size={18} />
          <span>Click to Unmute Movie Audio</span>
        </button>
      )}

      {!activeStream ? (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <RefreshCw size={36} color="var(--primary)" className="spin" style={{ marginBottom: '12px' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px' }}>
            {isHost ? 'Preparing Live WebRTC Movie Stream...' : 'Connecting to Live Movie Stream...'}
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {isHost ? 'Capturing video & audio tracks for live broadcast' : 'Waiting for host to start video call movie stream'}
          </p>
        </div>
      ) : (
        <video
          ref={videoRef}
          controls={false}
          playsInline
          autoPlay
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
