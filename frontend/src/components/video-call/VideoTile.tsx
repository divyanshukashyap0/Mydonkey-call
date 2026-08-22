import React, { useEffect, useRef } from 'react';
import { MicOff, ShieldCheck, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoTileProps {
  stream?: MediaStream | null;
  displayName: string;
  isLocal?: boolean;
  isHost?: boolean;
  isCoHost?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  volume?: number;
  onMaximize?: () => void;
  isMaximized?: boolean;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  displayName,
  isLocal = false,
  isHost = false,
  isCoHost = false,
  isMuted = false,
  isVideoOff = false,
  volume = 100,
  onMaximize,
  isMaximized = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let isMounted = true;
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      const p = videoRef.current.play();
      if (p !== undefined) {
        p.catch((err: any) => {
          if (isMounted && err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
            console.warn('Video tile playback warning:', err);
          }
        });
      }
    }

    return () => {
      isMounted = false;
    };
  }, [stream, isVideoOff]);

  return (
    <div
      onDoubleClick={onMaximize}
      style={{
        position: 'relative',
        width: '100%',
        minWidth: '110px',
        maxWidth: isMaximized ? '100%' : '180px',
        aspectRatio: '16 / 10',
        borderRadius: '12px',
        overflow: 'hidden',
        background: 'linear-gradient(145deg, rgba(20, 26, 43, 0.95) 0%, rgba(10, 14, 24, 0.95) 100%)',
        border: isHost ? '1px solid rgba(99, 102, 241, 0.45)' : '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: isHost ? '0 4px 20px rgba(99, 102, 241, 0.25)' : '0 4px 18px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        cursor: onMaximize ? 'pointer' : 'default',
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease',
      }}
    >
      {onMaximize && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMaximize();
          }}
          title={isMaximized ? 'Minimize video screen' : 'Maximize video screen'}
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            zIndex: 15,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: 'pointer',
            padding: 0,
            transition: 'transform 0.15s ease, background 0.15s ease',
          }}
        >
          {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      )}
      <video
        ref={(node) => {
          (videoRef as any).current = node;
          if (node) {
            if (stream && node.srcObject !== stream) {
              node.srcObject = stream;
              node.play().catch(() => {});
            }
            if (!isLocal) {
              node.volume = Math.max(0, Math.min(1, volume / 100));
            }
          }
        }}
        autoPlay
        playsInline
        muted={isLocal}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: isLocal ? 'scaleX(-1)' : 'none',
          display: !isVideoOff ? 'block' : 'none',
        }}
      />

      <AnimatePresence>
        {(isVideoOff || (!stream && !isLocal)) && (
          <motion.div
            key="camera-off-avatar"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: 'linear-gradient(145deg, rgba(20, 26, 43, 0.95) 0%, rgba(10, 14, 24, 0.95) 100%)',
              zIndex: 5,
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: isHost
                  ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                  : 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
                border: '2px solid rgba(255, 255, 255, 0.15)',
                boxShadow: isHost ? '0 0 14px rgba(99, 102, 241, 0.5)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1rem',
                color: '#fff',
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.55)', letterSpacing: '0.3px' }}>
              {isVideoOff ? 'Cam Off' : 'Connecting Video...'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Sleek Glass Name Overlay & Badges */}
      <div
        style={{
          position: 'absolute',
          bottom: '5px',
          left: '6px',
          right: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
          background: 'rgba(10, 14, 24, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '2px 7px',
          borderRadius: '6px',
        }}
      >
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: '#fff',
            maxWidth: '100px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {isLocal ? `You (${displayName})` : displayName}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {isHost && <span title="Host"><ShieldCheck size={12} color="#fbbf24" /></span>}
          {isCoHost && !isHost && <span style={{ fontSize: '0.65rem' }}>⭐</span>}
          <AnimatePresence>
            {isMuted && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} title="Muted">
                <MicOff size={11} color="#ef4444" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
