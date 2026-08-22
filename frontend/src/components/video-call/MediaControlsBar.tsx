import React from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, User, Users, MessageSquare } from 'lucide-react';

interface MediaControlsBarProps {
  isMuted: boolean;
  isVideoOff: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  showSelfView?: boolean;
  onToggleSelfView?: () => void;
  onToggleChat?: () => void;
  onToggleParticipants?: () => void;
  vertical?: boolean;
}

export const MediaControlsBar: React.FC<MediaControlsBarProps> = ({
  isMuted,
  isVideoOff,
  onToggleMic,
  onToggleCamera,
  showSelfView = false,
  onToggleSelfView,
  onToggleChat,
  onToggleParticipants,
  vertical = false,
}) => {
  if (vertical) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 0 4px 0',
          width: '100%',
        }}
      >
        <button
          onClick={onToggleMic}
          title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            border: isMuted ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.12)',
            background: isMuted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)',
            color: isMuted ? '#ef4444' : '#e2e8f0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(8px)',
          }}
        >
          {isMuted ? <MicOff size={18} color="#ef4444" /> : <Mic size={18} color="#e2e8f0" />}
        </button>

        <button
          onClick={onToggleCamera}
          title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            border: isVideoOff ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.12)',
            background: isVideoOff ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)',
            color: isVideoOff ? '#ef4444' : '#e2e8f0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(8px)',
          }}
        >
          {isVideoOff ? <VideoOff size={18} color="#ef4444" /> : <VideoIcon size={18} color="#e2e8f0" />}
        </button>

        {onToggleParticipants && (
          <button
            onClick={onToggleParticipants}
            title="Toggle Participants Panel"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Users size={18} color="#e2e8f0" />
          </button>
        )}

        {onToggleChat && (
          <button
            onClick={onToggleChat}
            title="Toggle Room Chat"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(8px)',
            }}
          >
            <MessageSquare size={18} color="#e2e8f0" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '6px',
        width: 'auto',
        justifyContent: 'center',
      }}
    >
      <button
        onClick={onToggleMic}
        title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        style={{
          padding: '3px 8px',
          borderRadius: '6px',
          border: isMuted ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
          background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
          color: isMuted ? '#fca5a5' : '#e2e8f0',
          fontWeight: 600,
          fontSize: '0.7rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          minHeight: '24px',
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(8px)',
        }}
      >
        {isMuted ? <MicOff size={13} color="#ef4444" /> : <Mic size={13} color="#818cf8" />}
        <span>{isMuted ? 'Unmute' : 'Mute'}</span>
      </button>

      <button
        onClick={onToggleCamera}
        title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
        style={{
          padding: '3px 8px',
          borderRadius: '6px',
          border: isVideoOff ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
          background: isVideoOff ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
          color: isVideoOff ? '#fca5a5' : '#e2e8f0',
          fontWeight: 600,
          fontSize: '0.7rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          minHeight: '24px',
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(8px)',
        }}
      >
        {isVideoOff ? <VideoOff size={13} color="#ef4444" /> : <VideoIcon size={13} color="#34d399" />}
        <span>{isVideoOff ? 'Cam Off' : 'Cam On'}</span>
      </button>

      {onToggleSelfView && (
        <button
          onClick={onToggleSelfView}
          title={showSelfView ? 'Hide Self Camera Preview' : 'Show Self Camera Preview'}
          style={{
            padding: '3px 8px',
            borderRadius: '6px',
            border: showSelfView ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
            background: showSelfView ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.08)',
            color: showSelfView ? '#a5b4fc' : '#e2e8f0',
            fontWeight: 600,
            fontSize: '0.7rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            minHeight: '24px',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(8px)',
          }}
        >
          <User size={13} color="#a5b4fc" />
          <span>{showSelfView ? 'Self On' : 'Self Off'}</span>
        </button>
      )}
    </div>
  );
};
