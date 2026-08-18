import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Play, Users, AlertCircle } from 'lucide-react';
import { RoomParticipant, Room } from '../../types';
import { getSocket } from '../../services/socket';

interface ReadySystemBarProps {
  room: Room;
  currentUserId: string;
  isHost: boolean;
  participants: RoomParticipant[];
  onSyncToRoom?: () => void;
}

export const ReadySystemBar: React.FC<ReadySystemBarProps> = ({
  room,
  currentUserId,
  isHost,
  participants,
  onSyncToRoom,
}) => {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);

  const currentParticipant = participants.find((p) => p.userId === currentUserId);
  const readyCount = participants.filter((p) => p.isReady).length;
  const totalCount = participants.length;
  const allReady = totalCount > 0 && readyCount === totalCount;
  const isPlaybackStarted = room.playbackPosition > 5 || room.playbackState === 'PLAYING';

  useEffect(() => {
    if (currentParticipant?.isReady !== undefined) {
      setIsReady(currentParticipant.isReady);
    }
  }, [currentParticipant]);

  useEffect(() => {
    const socket = getSocket();

    const handleTick = ({ secondsRemaining }: { secondsRemaining: number }) => {
      setCountdownSeconds(secondsRemaining);
    };

    const handleStart = () => {
      setCountdownSeconds(null);
    };

    const handleCancel = () => {
      setCountdownSeconds(null);
    };

    socket.on('room:countdown-tick', handleTick);
    socket.on('room:countdown-start', handleStart);
    socket.on('room:countdown-cancelled', handleCancel);

    return () => {
      socket.off('room:countdown-tick', handleTick);
      socket.off('room:countdown-start', handleStart);
      socket.off('room:countdown-cancelled', handleCancel);
    };
  }, []);

  const handleToggleReady = () => {
    const nextState = !isReady;
    setIsReady(nextState);
    const socket = getSocket();
    socket.emit('participant:toggle-ready', { isReady: nextState });
  };

  const handleOverrideStart = () => {
    const socket = getSocket();
    socket.emit('room:override-start');
  };

  // Late Joiner Sync Banner
  if (isPlaybackStarted && !isReady) {
    return (
      <div
        className="glass-panel"
        style={{
          padding: '8px 16px',
          margin: '0 0 12px 0',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(99, 102, 241, 0.15)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <Play size={16} color="#818cf8" />
          <span>Movie already in progress.</span>
        </div>
        {onSyncToRoom && (
          <button
            onClick={onSyncToRoom}
            style={{
              padding: '4px 12px',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--primary)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Sync to Room
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="glass-panel"
      style={{
        padding: '10px 16px',
        margin: '0 0 12px 0',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
      }}
    >
      {/* Ready Status Stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 600 }}>
          <Users size={16} color="var(--primary)" />
          <span>
            Watch Party Ready ({readyCount}/{totalCount})
          </span>
        </div>
        {allReady && (
          <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={14} /> Everyone Ready!
          </span>
        )}
      </div>

      {/* Countdown Overlay Display */}
      {countdownSeconds !== null && (
        <div
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            padding: '4px 14px',
            borderRadius: '20px',
            color: '#fff',
            fontWeight: 800,
            fontSize: '0.9rem',
            animation: 'pulse 1s infinite',
          }}
        >
          Starting in {countdownSeconds}...
        </div>
      )}

      {/* Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={handleToggleReady}
          style={{
            padding: '6px 16px',
            borderRadius: '8px',
            border: 'none',
            background: isReady ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          <CheckCircle2 size={16} />
          {isReady ? "I'm Ready ✓" : "I'm Ready"}
        </button>

        {isHost && !allReady && (
          <button
            onClick={handleOverrideStart}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
            title="Start playback without waiting for everyone"
          >
            Start Anyway
          </button>
        )}
      </div>
    </div>
  );
};
