import React from 'react';
import { Users, ShieldCheck, Mic, MicOff, Video as VideoIcon, VideoOff, Volume2, VolumeX, MicOff as MuteAllIcon } from 'lucide-react';
import { useRoomStore } from '../../store/useRoomStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useWebRTCContext } from '../../context/WebRTCContext';

export const ParticipantList: React.FC = () => {
  const { user } = useAuthStore();
  const { participants, currentRoom, myParticipant } = useRoomStore();
  const { participantVolumes, setParticipantVolume, hostMuteParticipant, hostMuteAll } = useWebRTCContext();

  const isCurrentHost = currentRoom?.hostId === user?.id || myParticipant?.role === 'HOST' || myParticipant?.role === 'CO_HOST';

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1rem' }}>
          <Users size={18} className="gradient-text" />
          <span>People in Room</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isCurrentHost && (
            <button
              onClick={hostMuteAll}
              title="Mute all participants mic"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <MuteAllIcon size={13} />
              <span>Mute All</span>
            </button>
          )}
          <span style={{ fontSize: '0.8rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-light)', padding: '2px 8px', borderRadius: '99px', fontWeight: 600 }}>
            {participants.length}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1 }}>
        {participants.map((p) => {
          const isHost = p.role === 'HOST' || p.userId === currentRoom?.hostId;
          const isCoHost = p.role === 'CO_HOST';
          const displayName = p.user?.displayName || 'User';
          const isSelf = p.userId === user?.id;
          const currentVol = participantVolumes[p.userId] ?? 100;

          return (
            <div
              key={p.id || p.userId}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '10px 12px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{displayName} {isSelf && '(You)'}</span>
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

                {/* Media Controls State Badges & Host Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Host Remote Mute Button */}
                  {isCurrentHost && !isSelf && (
                    <button
                      onClick={() => hostMuteParticipant(p.userId, !p.isMuted)}
                      title={p.isMuted ? 'Host: Unmute Participant' : 'Host: Mute Participant'}
                      style={{
                        background: p.isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid ' + (p.isMuted ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'),
                        borderRadius: '6px',
                        padding: '4px 6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: p.isMuted ? '#ef4444' : '#10b981',
                        transition: 'transform 0.1s ease',
                      }}
                    >
                      {p.isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                    </button>
                  )}

                  {!isCurrentHost && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                      {p.isMuted ? <MicOff size={14} color="var(--danger)" /> : <Mic size={14} color="var(--success)" />}
                      {p.isVideoOff ? <VideoOff size={14} color="var(--danger)" /> : <VideoIcon size={14} color="var(--success)" />}
                    </div>
                  )}
                </div>
              </div>

              {/* Voice Volume Control Slider for Remote Participants */}
              {!isSelf && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                  }}
                >
                  <span style={{ color: currentVol === 0 ? '#ef4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                    {currentVol === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={currentVol}
                    onChange={(e) => setParticipantVolume(p.userId, parseInt(e.target.value, 10))}
                    style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      accentColor: 'var(--primary)',
                      cursor: 'pointer',
                    }}
                  />
                  <span style={{ minWidth: '32px', textAlign: 'right', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {currentVol}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
