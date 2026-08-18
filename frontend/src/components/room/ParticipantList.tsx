import React from 'react';
import { Users, ShieldCheck, Mic, MicOff, Video as VideoIcon, VideoOff } from 'lucide-react';
import { useRoomStore } from '../../store/useRoomStore';

export const ParticipantList: React.FC = () => {
  const { participants, currentRoom } = useRoomStore();

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1rem' }}>
          <Users size={18} className="gradient-text" />
          <span>People in Room</span>
        </div>
        <span style={{ fontSize: '0.8rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-light)', padding: '2px 8px', borderRadius: '99px', fontWeight: 600 }}>
          {participants.length}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }}>
        {participants.map((p) => {
          const isHost = p.role === 'HOST' || p.userId === currentRoom?.hostId;
          const isCoHost = p.role === 'CO_HOST';
          const displayName = p.user?.displayName || 'User';

          return (
            <div
              key={p.id || p.userId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isHost ? 'var(--primary)' : 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700 }}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: p.isOnline ? 'var(--success)' : 'var(--danger)',
                      border: '2px solid var(--bg-dark)',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{displayName}</span>
                    {isHost && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.15)', padding: '1px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 700 }}>
                        <ShieldCheck size={12} /> Host
                      </span>
                    )}
                    {isCoHost && !isHost && (
                      <span style={{ fontSize: '0.7rem', color: '#6366f1', background: 'rgba(99, 102, 241, 0.15)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        ⭐ Co-Host
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {p.isOnline ? 'Active' : 'Disconnected'}
                    </span>
                    {p.isReady && (
                      <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>
                        ✓ Ready
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Media Controls State Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                {p.isMuted ? <MicOff size={14} color="var(--danger)" /> : <Mic size={14} color="var(--success)" />}
                {p.isVideoOff ? <VideoOff size={14} color="var(--danger)" /> : <VideoIcon size={14} color="var(--success)" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
