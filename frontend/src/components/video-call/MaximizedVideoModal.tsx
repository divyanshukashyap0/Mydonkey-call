import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VideoTile } from './VideoTile';
import { X, Minimize2, ShieldCheck, MicOff } from 'lucide-react';

interface MaximizedVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  stream?: MediaStream | null;
  displayName: string;
  isLocal?: boolean;
  isHost?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
}

export const MaximizedVideoModal: React.FC<MaximizedVideoModalProps> = ({
  isOpen,
  onClose,
  stream,
  displayName,
  isLocal = false,
  isHost = false,
  isMuted = false,
  isVideoOff = false,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(5, 7, 12, 0.88)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '900px',
            aspectRatio: '16 / 9',
            background: '#0f172a',
            borderRadius: '24px',
            overflow: 'hidden',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(99, 102, 241, 0.25)',
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 20,
              padding: '16px 20px',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{displayName}</span>
              {isHost && <ShieldCheck size={18} color="var(--warning, #f59e0b)" />}
              {isMuted && <MicOff size={16} color="var(--danger, #ef4444)" />}
            </div>

            <button
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              style={{
                borderRadius: '99px',
                padding: '6px 14px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(8px)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <Minimize2 size={16} />
              <span>Minimize</span>
            </button>
          </div>

          {/* Full Tile Stream */}
          <div style={{ width: '100%', height: '100%' }}>
            <VideoTile
              stream={stream}
              displayName={displayName}
              isLocal={isLocal}
              isHost={isHost}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              isMaximized
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
