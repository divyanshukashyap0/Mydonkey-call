import React from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, User } from 'lucide-react';

interface MediaControlsBarProps {
  isMuted: boolean;
  isVideoOff: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  showSelfView?: boolean;
  onToggleSelfView?: () => void;
  vertical?: boolean;
}

export const MediaControlsBar: React.FC<MediaControlsBarProps> = ({
  isMuted,
  isVideoOff,
  onToggleMic,
  onToggleCamera,
  showSelfView = false,
  onToggleSelfView,
  vertical = false,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        alignItems: 'center',
        gap: '6px',
        width: vertical ? '100%' : 'auto',
        justifyContent: 'center',
        padding: vertical ? '6px 0' : '0',
      }}
    >
      <button
        onClick={onToggleMic}
        title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        style={{
          padding: vertical ? '6px 12px' : '6px 14px',
          borderRadius: '8px',
          border: isMuted ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
          background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
          color: isMuted ? '#fca5a5' : '#e2e8f0',
          fontWeight: 700,
          fontSize: '0.8rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          width: vertical ? '100%' : 'auto',
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(8px)',
        }}
      >
        {isMuted ? <MicOff size={15} color="#ef4444" /> : <Mic size={15} color="#818cf8" />}
        <span>{isMuted ? 'Unmute' : 'Mute'}</span>
      </button>

      <button
        onClick={onToggleCamera}
        title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
        style={{
          padding: vertical ? '6px 12px' : '6px 14px',
          borderRadius: '8px',
          border: isVideoOff ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
          background: isVideoOff ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
          color: isVideoOff ? '#fca5a5' : '#e2e8f0',
          fontWeight: 700,
          fontSize: '0.8rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          width: vertical ? '100%' : 'auto',
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(8px)',
        }}
      >
        {isVideoOff ? <VideoOff size={15} color="#ef4444" /> : <VideoIcon size={15} color="#34d399" />}
        <span>{isVideoOff ? 'Cam Off' : 'Cam On'}</span>
      </button>

      {onToggleSelfView && (
        <button
          onClick={onToggleSelfView}
          title={showSelfView ? 'Hide Self Camera Preview' : 'Show Self Camera Preview'}
          style={{
            padding: vertical ? '6px 12px' : '6px 14px',
            borderRadius: '8px',
            border: showSelfView ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
            background: showSelfView ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.08)',
            color: showSelfView ? '#a5b4fc' : '#e2e8f0',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            width: vertical ? '100%' : 'auto',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(8px)',
          }}
        >
          <User size={15} color={showSelfView ? '#818cf8' : '#94a3b8'} />
          <span>{showSelfView ? 'Self On' : 'Self Off'}</span>
        </button>
      )}
    </div>
  );
};
