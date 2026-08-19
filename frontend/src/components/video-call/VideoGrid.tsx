import React, { useEffect, useState } from 'react';
import { VideoTile } from './VideoTile';
import { MediaControlsBar } from './MediaControlsBar';
import { useRoomStore } from '../../store/useRoomStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useWebRTC } from '../../hooks/useWebRTC';
import { Video as VideoIcon } from 'lucide-react';

import { MaximizedVideoModal } from './MaximizedVideoModal';

export const VideoGrid: React.FC = () => {
  const { user } = useAuthStore();
  const { participants, currentRoom } = useRoomStore();
  const [showSelfView, setShowSelfView] = useState(true);
  const [maximizedUser, setMaximizedUser] = useState<any | null>(null);

  const {
    localStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    connectToPeer,
    toggleMic,
    toggleCamera,
  } = useWebRTC(user?.id);

  // Auto-connect WebRTC peers when new participants join or local stream initializes
  useEffect(() => {
    if (!user?.id) return;
    participants.forEach((p) => {
      if (p.userId !== user.id) {
        connectToPeer(p.userId);
      }
    });
  }, [participants, user?.id, localStream]);

  const otherParticipants = participants.filter((p) => p.userId !== user?.id);

  return (
    <>
      <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, overflowX: 'auto', paddingBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0, paddingRight: '8px', borderRight: '1px solid var(--border-color)' }}>
            <VideoIcon size={18} />
            <span>Live Call ({participants.length})</span>
          </div>

          {/* Remote Opponent Participants Tiles */}
          {otherParticipants.map((p) => {
            const remoteStream = remoteStreams.get(p.userId);
            const displayName = p.user?.displayName || 'Participant';
            const isHost = p.role === 'HOST' || p.userId === currentRoom?.hostId;

            return (
              <VideoTile
                key={p.userId}
                stream={remoteStream}
                displayName={displayName}
                isHost={isHost}
                isMuted={p.isMuted}
                isVideoOff={p.isVideoOff}
                onMaximize={() => setMaximizedUser({
                  id: p.userId,
                  stream: remoteStream,
                  displayName,
                  isHost,
                  isMuted: p.isMuted,
                  isVideoOff: p.isVideoOff,
                })}
              />
            );
          })}

          {/* Local Self Participant Tile */}
          {showSelfView && (
            <VideoTile
              stream={localStream}
              displayName={user?.displayName || 'You'}
              isLocal
              isHost={user?.id === currentRoom?.hostId}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              onMaximize={() => setMaximizedUser({
                id: 'local',
                stream: localStream,
                displayName: user?.displayName || 'You',
                isLocal: true,
                isHost: user?.id === currentRoom?.hostId,
                isMuted,
                isVideoOff,
              })}
            />
          )}

          {otherParticipants.length === 0 && !showSelfView && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Waiting for opponent to join...
            </span>
          )}
        </div>

        {/* Media Controls */}
        <MediaControlsBar
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          showSelfView={showSelfView}
          onToggleSelfView={() => setShowSelfView(!showSelfView)}
        />
      </div>

      {/* Maximized Camera Tile Modal */}
      {maximizedUser && (
        <MaximizedVideoModal
          isOpen={!!maximizedUser}
          onClose={() => setMaximizedUser(null)}
          stream={maximizedUser.stream}
          displayName={maximizedUser.displayName}
          isLocal={maximizedUser.isLocal}
          isHost={maximizedUser.isHost}
          isMuted={maximizedUser.isMuted}
          isVideoOff={maximizedUser.isVideoOff}
        />
      )}
    </>
  );
};
