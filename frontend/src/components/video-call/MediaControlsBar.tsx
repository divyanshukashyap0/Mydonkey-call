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
        alignItems: 'stretch',
        gap: '8px',
        width: vertical ? '100%' : 'auto',
        justifyContent: 'center',
      }}
    >
      <button
        className={`btn btn-sm ${isMuted ? 'btn-danger' : 'btn-secondary'}`}
        onClick={onToggleMic}
        title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        style={{ justifyContent: 'center' }}
      >
        {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
        <span>{isMuted ? 'Unmute' : 'Mute'}</span>
      </button>

      <button
        className={`btn btn-sm ${isVideoOff ? 'btn-danger' : 'btn-secondary'}`}
        onClick={onToggleCamera}
        title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
        style={{ justifyContent: 'center' }}
      >
        {isVideoOff ? <VideoOff size={16} /> : <VideoIcon size={16} />}
        <span>{isVideoOff ? 'Cam Off' : 'Cam On'}</span>
      </button>

      {onToggleSelfView && (
        <button
          className={`btn btn-sm ${showSelfView ? 'btn-primary' : 'btn-secondary'}`}
          onClick={onToggleSelfView}
          title={showSelfView ? 'Hide Self Camera Preview' : 'Show Self Camera Preview'}
          style={{ justifyContent: 'center' }}
        >
          <User size={16} />
          <span>{showSelfView ? 'Self On' : 'Self Off'}</span>
        </button>
      )}
    </div>
  );
};
