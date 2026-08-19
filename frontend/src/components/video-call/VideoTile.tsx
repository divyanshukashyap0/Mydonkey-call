import React, { useEffect, useRef } from 'react';
import { MicOff, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoTileProps {
  stream?: MediaStream | null;
  displayName: string;
  isLocal?: boolean;
  isHost?: boolean;
  isCoHost?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  displayName,
  isLocal = false,
  isHost = false,
  isCoHost = false,
  isMuted = false,
  isVideoOff = false,
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
      style={{
        position: 'relative',
        width: '100%',
        minWidth: '110px',
        maxWidth: '180px',
        aspectRatio: '16 / 10',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        background: 'var(--bg-input)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <video
        ref={(node) => {
          (videoRef as any).current = node;
          if (node && stream && node.srcObject !== stream) {
            node.srcObject = stream;
            node.play().catch(() => {});
          }
        }}
        autoPlay
        playsInline
        muted={isLocal}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: isLocal ? 'scaleX(-1)' : 'none',
          display: !isVideoOff && stream ? 'block' : 'none',
        }}
      />

      <AnimatePresence>
        {(isVideoOff || !stream) && (
          <motion.div
            key="camera-off-avatar"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: isHost ? 'var(--primary)' : 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.95rem' }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Camera Off</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Name Overlay & Badges */}
      <div style={{ position: 'absolute', bottom: '4px', left: '6px', right: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.8)', background: 'rgba(0,0,0,0.5)', padding: '1px 6px', borderRadius: '4px', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isLocal ? 'You' : displayName}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          {isHost && <ShieldCheck size={12} color="var(--warning)" />}
          {isCoHost && !isHost && <span style={{ fontSize: '0.65rem' }}>⭐</span>}
          <AnimatePresence>
            {isMuted && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <MicOff size={12} color="var(--danger)" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
