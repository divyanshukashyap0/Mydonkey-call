import React from 'react';
import { X, Lock, Unlock, Shield, Users, UserMinus, Crown } from 'lucide-react';
import { useRoomStore } from '../../store/useRoomStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getSocket } from '../../services/socket';
import { ControlMode } from '../../types';

interface HostControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

import { AnimatedModal } from '../common/AnimatedModal';

export const HostControlsModal: React.FC<HostControlsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { currentRoom, participants } = useRoomStore();

  const isHost = currentRoom?.hostId === user?.id;
  const socket = getSocket();

  const handleToggleLock = () => {
    socket.emit('room:toggle-lock');
  };

  const handleSetControlMode = (mode: ControlMode) => {
    socket.emit('room:set-control-mode', { controlMode: mode });
  };

  const handleAssignCoHost = (targetUserId: string) => {
    socket.emit('room:assign-cohost', { targetUserId });
  };

  const handleRevokeCoHost = (targetUserId: string) => {
    socket.emit('room:revoke-cohost', { targetUserId });
  };

  const handleKickParticipant = (targetUserId: string) => {
    if (confirm('Are you sure you want to remove this participant from the room?')) {
      socket.emit('room:kick-participant', { targetUserId });
    }
  };

  const handleEndRoom = () => {
    if (confirm('Are you sure you want to end the room for everyone? All participants will be disconnected.')) {
      socket.emit('room:end-room');
      onClose();
    }
  };

  return (
    <AnimatedModal isOpen={isOpen && !!currentRoom} onClose={onClose} maxWidth="520px">
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', color: 'var(--warning)' }}>
          <Crown size={24} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Host Room Settings</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
          Manage room privacy, playback permissions, co-hosts, and participants.
        </p>
      </div>

      {currentRoom && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Lock Room Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: '0.95rem', display: 'block' }}>Lock Room</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {currentRoom.isLocked ? 'Room is locked. New guests cannot join.' : 'Room is unlocked and accepting joins.'}
              </span>
            </div>
            <button className={`btn ${currentRoom.isLocked ? 'btn-danger' : 'btn-secondary'} btn-sm`} onClick={handleToggleLock} disabled={!isHost}>
              {currentRoom.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
              <span>{currentRoom.isLocked ? 'Locked' : 'Unlocked'}</span>
            </button>
          </div>

          {/* Control Mode Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
              Playback Control Mode
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                className={`btn ${currentRoom.controlMode === 'HOST_ONLY' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '10px' }}
                onClick={() => handleSetControlMode('HOST_ONLY')}
                disabled={!isHost}
              >
                <Shield size={16} />
                <span>Host Only</span>
              </button>
              <button
                className={`btn ${currentRoom.controlMode === 'EVERYONE' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '10px' }}
                onClick={() => handleSetControlMode('EVERYONE')}
                disabled={!isHost}
              >
                <Users size={16} />
                <span>Everyone</span>
              </button>
            </div>
          </div>

          {/* Manage Participants & Co-Hosts */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
              Manage Room Participants ({participants.length})
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {participants.map((p) => {
                const isTargetHost = p.userId === currentRoom.hostId;
                const isCoHost = p.role === 'CO_HOST';
                const displayName = p.user?.displayName || 'User';

                return (
                  <div key={p.userId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                      {displayName} {isTargetHost ? '👑 (Host)' : isCoHost ? '⭐ (Co-Host)' : ''}
                    </span>
                    {!isTargetHost && isHost && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {isCoHost ? (
                          <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '0.72rem' }} onClick={() => handleRevokeCoHost(p.userId)} title="Revoke Co-Host">
                            Revoke Co-Host
                          </button>
                        ) : (
                          <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '0.72rem' }} onClick={() => handleAssignCoHost(p.userId)} title="Make Co-Host">
                            Make Co-Host
                          </button>
                        )}
                        <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleKickParticipant(p.userId)} title="Kick">
                          <UserMinus size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* End Room Action */}
          {isHost && (
            <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                className="btn btn-danger"
                style={{ width: '100%', padding: '10px', fontSize: '0.9rem' }}
                onClick={handleEndRoom}
              >
                End Room for Everyone
              </button>
            </div>
          )}
        </div>
      )}
    </AnimatedModal>
  );
};
