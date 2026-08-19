import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VideoTile } from './VideoTile';
import { useRoomStore } from '../../store/useRoomStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useWebRTC } from '../../hooks/useWebRTC';
import { Video, ChevronDown, ChevronUp, EyeOff, Eye, Move } from 'lucide-react';
import { MediaControlsBar } from './MediaControlsBar';
import { floatingCallOverlay } from '../../animations';

type SnapCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export const FloatingCallOverlay: React.FC = () => {
  const { user } = useAuthStore();
  const { participants, currentRoom } = useRoomStore();
  const [displayMode, setDisplayMode] = useState<'expanded' | 'collapsed' | 'hidden'>('expanded');
  const [snapCorner, setSnapCorner] = useState<SnapCorner>('top-right');
  const [showSelfView, setShowSelfView] = useState(true);

  const {
    localStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    toggleMic,
    toggleCamera,
  } = useWebRTC(user?.id);

  if (participants.length === 0) return null;

  const otherParticipants = participants.filter((p: any) => p.userId !== user?.id);

  const cycleSnapCorner = () => {
    const corners: SnapCorner[] = ['top-right', 'bottom-right', 'bottom-left', 'top-left'];
    const currentIndex = corners.indexOf(snapCorner);
    const nextCorner = corners[(currentIndex + 1) % corners.length];
    setSnapCorner(nextCorner);
  };

  const getPositionStyles = (): React.CSSProperties => {
    switch (snapCorner) {
      case 'top-left':
        return { top: '16px', left: '16px' };
      case 'top-right':
        return { top: '16px', right: '16px' };
      case 'bottom-left':
        return { bottom: '75px', left: '16px' };
      case 'bottom-right':
        return { bottom: '75px', right: '16px' };
      default:
        return { top: '16px', right: '16px' };
    }
  };

  const totalVisibleTiles = otherParticipants.length + (showSelfView ? 1 : 0);

  return (
    <AnimatePresence>
      {displayMode === 'hidden' ? (
        <motion.button
          key="hidden-btn"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={() => setDisplayMode('collapsed')}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 'var(--z-floating-call)',
            background: 'rgba(18, 22, 36, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-color)',
            borderRadius: '99px',
            color: 'var(--text-main)',
            padding: '6px 14px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <Eye size={14} color="var(--accent)" />
          <span>Show Calls ({participants.length})</span>
        </motion.button>
      ) : displayMode === 'collapsed' ? (
        <motion.div
          key="collapsed-bar"
          layout
          variants={floatingCallOverlay}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{
            position: 'absolute',
            ...getPositionStyles(),
            zIndex: 'var(--z-floating-call)',
            background: 'rgba(18, 22, 36, 0.9)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--border-glow)',
            borderRadius: '99px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Video size={16} color="var(--accent)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
              Call ({participants.length})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={cycleSnapCorner}
              title="Reposition Overlay"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
            >
              <Move size={14} />
            </button>
            <button
              onClick={() => setDisplayMode('expanded')}
              title="Expand Call"
              style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '2px' }}
            >
              <ChevronDown size={16} />
            </button>
            <button
              onClick={() => setDisplayMode('hidden')}
              title="Hide Overlay"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
            >
              <EyeOff size={14} />
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="expanded-grid"
          layout
          variants={floatingCallOverlay}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{
            position: 'absolute',
            ...getPositionStyles(),
            zIndex: 'var(--z-floating-call)',
            width: 'min(90vw, 320px)',
            background: 'rgba(10, 13, 20, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '10px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: 'calc(100% - 100px)',
            overflow: 'hidden',
          }}
        >
          {/* Header Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)' }}>
              <Video size={16} />
              <span>Live Call ({participants.length})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={cycleSnapCorner}
                title="Reposition overlay corner"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
              >
                <Move size={14} />
              </button>
              <button
                onClick={() => setDisplayMode('collapsed')}
                title="Collapse overlay"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={() => setDisplayMode('hidden')}
                title="Hide overlay"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
              >
                <EyeOff size={14} />
              </button>
            </div>
          </div>

          {/* Floating Video Grid Scroll Area */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: totalVisibleTiles > 1 ? 'repeat(2, 1fr)' : '1fr',
              gap: '6px',
              maxHeight: '220px',
              overflowY: 'auto',
              paddingRight: '2px',
            }}
          >
            {/* Opponent / Remote Participant Tiles (Shown Normally) */}
            <AnimatePresence>
              {otherParticipants.map((p: any) => {
                const remoteStream = remoteStreams.get(p.userId);
                const displayName = p.user?.displayName || 'Participant';
                const isHost = p.role === 'HOST' || p.userId === currentRoom?.hostId;

                return (
                  <motion.div
                    key={p.userId}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <VideoTile
                      stream={remoteStream}
                      displayName={displayName}
                      isHost={isHost}
                      isMuted={p.isMuted}
                      isVideoOff={p.isVideoOff}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Local Participant Tile (Hidden Normally, Shown on Toggle) */}
            <AnimatePresence>
              {showSelfView && (
                <motion.div
                  key="self-tile"
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <VideoTile
                    stream={localStream}
                    displayName={user?.displayName || 'You'}
                    isLocal
                    isHost={user?.id === currentRoom?.hostId}
                    isMuted={isMuted}
                    isVideoOff={isVideoOff}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {otherParticipants.length === 0 && !showSelfView && (
              <div style={{ textAlign: 'center', padding: '14px 8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <span>Waiting for opponent to join video call...</span>
                <button
                  onClick={() => setShowSelfView(true)}
                  style={{ display: 'block', margin: '6px auto 0 auto', background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Show my camera preview
                </button>
              </div>
            )}
          </div>

          {/* Media Controls Footer */}
          <div style={{ paddingTop: '6px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
            <MediaControlsBar
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              onToggleMic={toggleMic}
              onToggleCamera={toggleCamera}
              showSelfView={showSelfView}
              onToggleSelfView={() => setShowSelfView(!showSelfView)}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
