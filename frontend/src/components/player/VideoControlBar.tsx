import { Play, Pause, Volume2, VolumeX, Maximize, Gauge, Zap, MessageSquare, Users, RefreshCw, Globe } from 'lucide-react';
import { PlaybackState } from '../../types';

export interface AudioTrackItem {
  id: number;
  label: string;
  lang?: string;
}

interface VideoControlBarProps {
  playbackState: PlaybackState;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isMuted: boolean;
  driftMs?: number;
  canControl: boolean;
  audioTracks?: AudioTrackItem[];
  selectedAudioTrackId?: number;
  onSelectAudioTrack?: (trackId: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (position: number) => void;
  onRateChange: (rate: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onToggleFloatingChat?: () => void;
  onToggleFloatingParticipants?: () => void;
  onManualSync?: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const VideoControlBar: React.FC<VideoControlBarProps> = ({
  playbackState,
  currentTime,
  duration,
  playbackRate,
  isMuted,
  driftMs = 0,
  canControl,
  audioTracks,
  selectedAudioTrackId,
  onSelectAudioTrack,
  onPlay,
  onPause,
  onSeek,
  onRateChange,
  onToggleMute,
  onToggleFullscreen,
  onToggleFloatingChat,
  onToggleFloatingParticipants,
  onManualSync,
}) => {
  const isPlaying = playbackState === 'PLAYING';

  return (
    <div
      className="glass-panel"
      style={{
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        background: 'rgba(10, 13, 20, 0.88)',
        borderColor: 'var(--border-color)',
        borderRadius: 'var(--radius-md)',
        width: '100%',
      }}
    >
      {/* Timeline Scrubber */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', flexShrink: 0 }}>
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          disabled={!canControl}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          aria-label="Video playback position timeline"
          style={{
            flex: 1,
            height: '6px',
            cursor: canControl ? 'pointer' : 'not-allowed',
            accentColor: 'var(--primary)',
          }}
        />
        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', flexShrink: 0 }}>
          {formatTime(duration)}
        </span>
      </div>

      {/* Controls Strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        {/* Play/Pause & Speed */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {isPlaying ? (
            <button
              className="btn btn-primary btn-icon"
              disabled={!canControl}
              onClick={onPause}
              aria-label="Pause video"
              title={canControl ? 'Pause' : 'Only Host can control playback'}
              style={{ width: '38px', height: '38px' }}
            >
              <Pause size={18} />
            </button>
          ) : (
            <button
              className="btn btn-primary btn-icon"
              disabled={!canControl}
              onClick={onPlay}
              aria-label="Play video"
              title={canControl ? 'Play' : 'Only Host can control playback'}
              style={{ width: '38px', height: '38px' }}
            >
              <Play size={18} style={{ marginLeft: '2px' }} />
            </button>
          )}

          {/* Speed Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Gauge size={14} color="var(--text-muted)" />
            <select
              value={playbackRate}
              disabled={!canControl}
              onChange={(e) => onRateChange(parseFloat(e.target.value))}
              aria-label="Playback speed"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                padding: '4px 6px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              <option value={0.5}>0.5x</option>
              <option value={1.0}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2.0}>2.0x</option>
            </select>
          </div>

          {/* Audio Language / Track Selector (Per-Participant Local Preference) */}
          {audioTracks && audioTracks.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Select your audio language">
              <Globe size={14} color="var(--primary)" />
              <select
                value={selectedAudioTrackId ?? 0}
                onChange={(e) => onSelectAudioTrack && onSelectAudioTrack(parseInt(e.target.value, 10))}
                aria-label="Audio language selection"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  color: 'var(--text-main)',
                  padding: '4px 6px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {audioTracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sync Latest Video Button */}
          {onManualSync && (
            <button
              className="btn btn-sm btn-primary"
              onClick={onManualSync}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '99px',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                boxShadow: '0 0 12px rgba(99, 102, 241, 0.4)',
                cursor: 'pointer',
                border: 'none',
              }}
              title="Sync video to latest room playback position"
            >
              <RefreshCw size={13} />
              <span>Sync Video</span>
            </button>
          )}

          {/* Sync Metric Badge */}
          <div className="sync-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--success)', padding: '2px 8px', borderRadius: '99px', fontWeight: 600 }}>
            <Zap size={11} />
            <span>{Math.abs(Math.round(driftMs)) < 5000 ? `Synced (${Math.abs(Math.round(driftMs))}ms)` : 'Out of Sync'}</span>
          </div>
        </div>

        {/* Action Controls & Fullscreen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {onToggleFloatingChat && (
            <button
              className="btn btn-secondary btn-icon"
              onClick={onToggleFloatingChat}
              aria-label="Toggle floating chat"
              title="Toggle Chat"
              style={{ width: '38px', height: '38px' }}
            >
              <MessageSquare size={16} />
            </button>
          )}
          {onToggleFloatingParticipants && (
            <button
              className="btn btn-secondary btn-icon"
              onClick={onToggleFloatingParticipants}
              aria-label="Toggle floating participants"
              title="Toggle Participants"
              style={{ width: '38px', height: '38px' }}
            >
              <Users size={16} />
            </button>
          )}
          <button
            className="btn btn-secondary btn-icon"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute video audio' : 'Mute video audio'}
            style={{ width: '38px', height: '38px' }}
          >
            {isMuted ? <VolumeX size={16} color="var(--danger)" /> : <Volume2 size={16} />}
          </button>
          <button
            className="btn btn-secondary btn-icon"
            onClick={onToggleFullscreen}
            aria-label="Toggle fullscreen"
            style={{ width: '38px', height: '38px' }}
          >
            <Maximize size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

