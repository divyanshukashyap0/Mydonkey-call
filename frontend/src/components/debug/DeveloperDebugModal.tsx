import React, { useState, useEffect } from 'react';
import { AnimatedModal } from '../common/AnimatedModal';
import { Terminal, Cpu, Radio, Shield, Video, Trash2, X } from 'lucide-react';
import { Room, RoomParticipant, AuthoritativePlaybackState } from '../../types';
import { getSocket } from '../../services/socket';

interface DeveloperDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  room?: Room | null;
  currentUserId?: string;
  authoritativeState?: AuthoritativePlaybackState | null;
  localTime?: number;
  timeDelta?: number;
}

export const DeveloperDebugModal: React.FC<DeveloperDebugModalProps> = ({
  isOpen,
  onClose,
  room,
  currentUserId,
  authoritativeState,
  localTime = 0,
  timeDelta = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'room' | 'socket' | 'sync' | 'webrtc' | 'cleanup'>('room');
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    const socket = getSocket();
    setSocketConnected(socket.connected);

    const interval = setInterval(() => {
      if (socket.connected) {
        const start = Date.now();
        socket.emit('sync:ping', { clientTime: start });
      }
    }, 3000);

    const handlePong = ({ clientTime }: { clientTime: number }) => {
      setPingMs(Date.now() - clientTime);
    };

    socket.on('sync:pong', handlePong);

    return () => {
      socket.off('sync:pong', handlePong);
      clearInterval(interval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} maxWidth="650px">
      <div style={{ padding: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Terminal size={20} color="#6366f1" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Developer Debug Console</h3>
          </div>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
          {(['room', 'socket', 'sync', 'webrtc', 'cleanup'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === tab ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: activeTab === tab ? '#fff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Console Content */}
        <div style={{ background: '#090d16', padding: '14px', borderRadius: '10px', fontFamily: 'monospace', fontSize: '0.82rem', color: '#e2e8f0', minHeight: '220px' }}>
          {activeTab === 'room' && (
            <div>
              <p><strong>Room ID:</strong> {room?.id || 'N/A'}</p>
              <p><strong>Room Code:</strong> {room?.roomCode || 'N/A'}</p>
              <p><strong>Host ID:</strong> {room?.hostId || 'N/A'}</p>
              <p><strong>Current User ID:</strong> {currentUserId || 'N/A'}</p>
              <p><strong>Is Locked:</strong> {room?.isLocked ? 'YES 🔒' : 'NO 🔓'}</p>
              <p><strong>Control Mode:</strong> {room?.controlMode || 'N/A'}</p>
              <p><strong>Privacy Mode:</strong> {room?.privacyMode || 'PUBLIC'}</p>
              <p><strong>Participants Count:</strong> {room?.participants?.length || 0}</p>
            </div>
          )}

          {activeTab === 'socket' && (
            <div>
              <p><strong>Socket Connected:</strong> {socketConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
              <p><strong>Ping RTT Latency:</strong> {pingMs !== null ? `${pingMs} ms` : 'Measuring...'}</p>
              <p><strong>Socket Transport:</strong> WebSocket</p>
            </div>
          )}

          {activeTab === 'sync' && (
            <div>
              <p><strong>Authoritative State:</strong> {authoritativeState?.state || 'N/A'}</p>
              <p><strong>Authoritative Position:</strong> {authoritativeState?.position?.toFixed(3)}s</p>
              <p><strong>Authoritative Rate:</strong> {authoritativeState?.playbackRate}x</p>
              <p><strong>Local Time:</strong> {localTime.toFixed(3)}s</p>
              <p><strong>Calculated Delta:</strong> {timeDelta.toFixed(3)}s</p>
              <p><strong>Hysteresis Status:</strong> {Math.abs(timeDelta) < 0.15 ? '🟢 Deadband' : Math.abs(timeDelta) <= 1.5 ? '🟡 Micro-Correcting' : '🔴 Hard Seek Threshold'}</p>
            </div>
          )}

          {activeTab === 'webrtc' && (
            <div>
              <p><strong>STUN Servers:</strong> stun:stun.l.google.com:19302</p>
              <p><strong>Signaling Method:</strong> Socket.IO Relay</p>
              <p><strong>Auto ICE Restart:</strong> Enabled</p>
            </div>
          )}

          {activeTab === 'cleanup' && (
            <div>
              <p><strong>Retention Policy:</strong> 10 Minutes (TEMP_SEGMENT_RETENTION_MINUTES=10)</p>
              <p><strong>Backward Buffer:</strong> 2 Segments</p>
              <p><strong>Forward Buffer:</strong> 5 Segments</p>
              <p><strong>Disconnect Grace:</strong> 2 Minutes</p>
              <p><strong>Safety Check:</strong> Participant Minimum Segment Calculation Active</p>
            </div>
          )}
        </div>
      </div>
    </AnimatedModal>
  );
};
