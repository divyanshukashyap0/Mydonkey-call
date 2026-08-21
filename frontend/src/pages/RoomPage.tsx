import React, { useEffect, useRef, useState } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { ParticipantList } from '../components/room/ParticipantList';
import { YouTubePlayer } from '../components/player/YouTubePlayer';
import { VideoControlBar } from '../components/player/VideoControlBar';
import { SelectVideoModal } from '../components/player/SelectVideoModal';
import { VideoGrid } from '../components/video-call/VideoGrid';
import { FloatingCallOverlay } from '../components/video-call/FloatingCallOverlay';
import { ChatPanel } from '../components/chat/ChatPanel';
import { HostControlsModal } from '../components/room/HostControlsModal';
import { WebRTCProvider } from '../context/WebRTCContext';
import { HLSPlayer } from '../components/player/HLSPlayer';
import { UploadModal } from '../components/upload/UploadModal';
import { BackgroundUploadOverlay } from '../components/upload/BackgroundUploadOverlay';
import { ConnectionHealthBadge } from '../components/room/ConnectionHealthBadge';
import { ReadySystemBar } from '../components/room/ReadySystemBar';
import { DeveloperDebugModal } from '../components/debug/DeveloperDebugModal';
import { EyeCatchingLoader } from '../components/common/EyeCatchingLoader';
import { useRoomStore } from '../store/useRoomStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUploadStore } from '../store/useUploadStore';
import { useSyncClock } from '../hooks/useSyncClock';
import { useFullscreen } from '../hooks/useFullscreen';
import { useSyncEngine } from '../hooks/useSyncEngine';
import { connectSocket, getSocket } from '../services/socket';
import { Tv, Sparkles, Plus, X, Terminal, ChevronLeft, ExternalLink, Minimize2, Users } from 'lucide-react';

interface RoomPageProps {
  roomCode: string;
}

export const RoomPage: React.FC<RoomPageProps> = ({ roomCode }) => {
  const { user } = useAuthStore();
  const {
    currentRoom,
    authoritativePlayback,
    participants,
    setRoomData,
    addParticipant,
    removeParticipant,
    updatePlaybackSync,
    updateCurrentVideo,
    updateParticipantState,
    setSocketConnected,
  } = useRoomStore();

  const { getAdjustedServerTime } = useSyncClock();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'participants' | 'chat'>('chat');
  const [isSelectVideoOpen, setIsSelectVideoOpen] = useState(false);
  const [isHostSettingsOpen, setIsHostSettingsOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  // Fullscreen Floating Panels
  const [showFloatingChat, setShowFloatingChat] = useState(false);
  const [showFloatingParticipants, setShowFloatingParticipants] = useState(false);

  // Player state
  const playerRef = useRef<any>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [driftMs, setDriftMs] = useState(0);
  const [audioTracks, setAudioTracks] = useState<Array<{ id: number; label: string; lang?: string }>>([]);
  const [selectedAudioTrackId, setSelectedAudioTrackId] = useState<number>(0);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number>(16 / 9);
  const [aspectRatioLabel, setAspectRatioLabel] = useState<string>('16:9 HD');
  const stageRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, showControls, toggleFullscreen } = useFullscreen(stageRef);
  const isProgrammaticActionRef = useRef(false);

  const canControl =
    currentRoom?.controlMode === 'EVERYONE' || currentRoom?.hostId === user?.id;

  // Connect Sockets
  useEffect(() => {
    const socket = connectSocket();

    const handleJoin = () => {
      setSocketConnected(true);
      socket.emit('room:join', { roomCode, displayName: user?.displayName });
    };

    if (socket.connected) {
      handleJoin();
    }

    socket.on('connect', handleJoin);

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('room:joined', (data) => {
      setRoomData(data as any);
      setLoading(false);
    });

    socket.on('room:user-joined', ({ participant }) => {
      addParticipant(participant as any);
    });

    socket.on('room:user-left', ({ userId }) => {
      removeParticipant(userId);
    });

    socket.on('playback:sync', ({ authoritativeState }) => {
      updatePlaybackSync(authoritativeState);
    });

    socket.on('video:changed', ({ video, authoritativeState }) => {
      updateCurrentVideo(video as any, authoritativeState);
      setVideoAspectRatio(16 / 9);
      setAspectRatioLabel('16:9 HD');
      if (video && roomCode) {
        import('../store/useSocialStore').then(({ useSocialStore }) => {
          useSocialStore.getState().recordHistory({
            roomCode,
            videoTitle: video.title || `Video (${video.id})`,
            sourceType: video.sourceType || 'UPLOADED',
            youtubeUrl: video.youtubeUrl || undefined,
            thumbnail: video.youtubeVideoId ? `https://img.youtube.com/vi/${video.youtubeVideoId}/hqdefault.jpg` : undefined,
          });
        });
      }
    });

    socket.on('participant:state-changed', (data) => {
      updateParticipantState(data);
    });

    socket.on('room:kicked', (data) => {
      alert(data?.reason || 'You were removed from the room.');
      window.location.href = '/';
    });

    socket.on('room:ended', () => {
      alert('The room host has ended the session.');
      window.location.href = '/';
    });

    socket.on('chat:receive', (msg) => {
      useRoomStore.getState().addChatMessage(msg);
    });

    socket.on('room:updated', ({ room }) => {
      useRoomStore.getState().updateRoomSettings(room as any);
    });

    socket.on('upload:progress', (data) => {
      useUploadStore.getState().setRemoteUploadProgress(data);
    });

    socket.on('playback:state-sync', ({ authoritativeState, currentVideo: newVideo }) => {
      if (authoritativeState) {
        updatePlaybackSync(authoritativeState);
      }
      if (newVideo) {
        updateCurrentVideo(newVideo as any, authoritativeState);
      }
      if (playerRef.current && authoritativeState) {
        playerRef.current.seekTo(authoritativeState.position);
        if (authoritativeState.state === 'PLAYING') {
          playerRef.current.playVideo();
        } else {
          playerRef.current.pauseVideo();
        }
      }
    });

    socket.on('error:message', ({ message }) => {
      console.warn('Room socket error:', message);
      if (!useRoomStore.getState().currentRoom) {
        setError(message);
      } else {
        alert(`Notice: ${message}`);
      }
      setLoading(false);
    });

    if (socket.connected) {
      socket.emit('room:join', { roomCode, displayName: user?.displayName });
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room:joined');
      socket.off('room:user-joined');
      socket.off('room:user-left');
      socket.off('playback:sync');
      socket.off('video:changed');
      socket.off('participant:state-changed');
      socket.off('room:kicked');
      socket.off('room:ended');
      socket.off('chat:receive');
      socket.off('room:updated');
      socket.off('upload:progress');
      socket.off('playback:state-sync');
      socket.off('error:message');
    };
  }, [roomCode, user]);

  // 500ms Server-Authoritative Sync & Drift Correction Loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (!authoritativePlayback || !playerRef.current || !playerRef.current.getCurrentTime) return;

      const playerTime = playerRef.current.getCurrentTime() || 0;
      setCurrentTime(playerTime);
      const rawDuration = playerRef.current.getDuration() || 0;
      const validDuration = (rawDuration > 0 && rawDuration !== 3600 && rawDuration !== 86400)
        ? rawDuration
        : (currentVideo?.duration || rawDuration);
      setDuration(validDuration);

      const serverNow = getAdjustedServerTime();
      let expectedPosition = authoritativePlayback.position;

      if (authoritativePlayback.state === 'PLAYING') {
        const elapsedSec = (serverNow - authoritativePlayback.updatedAt) / 1000;
        expectedPosition += elapsedSec * authoritativePlayback.playbackRate;
      }

      const diffSec = expectedPosition - playerTime;
      const drift = diffSec * 1000;
      setDriftMs(drift);

      // Playback State Alignment
      const playerState = playerRef.current.getPlayerState();
      const isPlayerPlaying = playerState === 1;

      if (authoritativePlayback.state === 'PLAYING' && !isPlayerPlaying) {
        isProgrammaticActionRef.current = true;
        playerRef.current.playVideo();
      } else if (authoritativePlayback.state === 'PAUSED' && isPlayerPlaying) {
        isProgrammaticActionRef.current = true;
        playerRef.current.pauseVideo();
      }

      // 3-Tier Drift Correction Engine
      const absDrift = Math.abs(drift);

      if (absDrift > 1500) {
        isProgrammaticActionRef.current = true;
        playerRef.current.seekTo(expectedPosition, true);
        playerRef.current.setPlaybackRate(authoritativePlayback.playbackRate);
      } else if (absDrift >= 150) {
        const adjustedRate =
          drift > 0
            ? authoritativePlayback.playbackRate * 1.05
            : authoritativePlayback.playbackRate * 0.95;
        playerRef.current.setPlaybackRate(adjustedRate);
      } else {
        playerRef.current.setPlaybackRate(authoritativePlayback.playbackRate);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [authoritativePlayback]);

  // Keyboard Shortcuts (Space, F, M, Left, Right)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (authoritativePlayback?.state === 'PLAYING') handleUserPause();
        else handleUserPlay();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleUserSeek(currentTime + 5);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleUserSeek(Math.max(0, currentTime - 5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, authoritativePlayback]);

  // User Playback Actions
  const handleUserPlay = () => {
    if (!canControl) return;
    const socket = getSocket();
    const pos = playerRef.current?.getCurrentTime() || 0;
    socket.emit('playback:command', { action: 'PLAY', position: pos });
  };

  const handleUserPause = () => {
    if (!canControl) return;
    const socket = getSocket();
    const pos = playerRef.current?.getCurrentTime() || 0;
    socket.emit('playback:command', { action: 'PAUSE', position: pos });
  };

  const handleUserSeek = (newPosition: number) => {
    if (!canControl) return;
    const socket = getSocket();
    socket.emit('playback:command', {
      action: authoritativePlayback?.state === 'PLAYING' ? 'PLAY' : 'PAUSE',
      position: newPosition,
    });
  };

  const handleRateChange = (rate: number) => {
    if (!canControl) return;
    const socket = getSocket();
    const pos = playerRef.current?.getCurrentTime() || 0;
    socket.emit('playback:command', {
      action: authoritativePlayback?.state === 'PLAYING' ? 'PLAY' : 'PAUSE',
      position: pos,
      rate,
    });
  };

  const handleManualSync = () => {
    const socket = getSocket();
    socket.emit('room:sync-request', { roomCode });
    if (playerRef.current && authoritativePlayback) {
      const serverNow = getAdjustedServerTime();
      let expectedPosition = authoritativePlayback.position;
      if (authoritativePlayback.state === 'PLAYING') {
        const elapsedSec = (serverNow - authoritativePlayback.updatedAt) / 1000;
        expectedPosition += elapsedSec * authoritativePlayback.playbackRate;
      }
      playerRef.current.seekTo(expectedPosition, true);
      if (authoritativePlayback.state === 'PLAYING') {
        playerRef.current.playVideo();
      }
    }
  };

  const toggleMute = () => {
    if (playerRef.current) {
      if (isMuted) playerRef.current.unMute();
      else playerRef.current.mute();
      setIsMuted(!isMuted);
    }
  };

  const handleVideoEnded = () => {
    console.log('🔄 Video completed - Auto-replaying from 00:00 across all room devices');
    if (playerRef.current) {
      if (playerRef.current.seekTo) playerRef.current.seekTo(0);
      if (playerRef.current.playVideo) playerRef.current.playVideo();
    }
    const socket = getSocket();
    socket.emit('playback:command', {
      action: 'PLAY',
      position: 0.0,
      rate: authoritativePlayback?.playbackRate || 1.0,
    });
  };

  const handleSelectYouTube = (youtubeUrl: string) => {
    const socket = getSocket();
    socket.emit('video:change', { youtubeUrl });
  };

  if (loading) {
    return (
      <EyeCatchingLoader
        title="Joining Watch Room..."
        subtitle={`Connecting to room ${roomCode}...`}
        badgeText={`ROOM ${roomCode}`}
        fullScreen
      />
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg-dark)' }}>
        <Navbar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', width: 'min(92vw, 400px)' }}>
            <h2 style={{ color: 'var(--danger)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Room Error</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>{error}</p>
            <button className="btn btn-primary" onClick={() => (window.location.href = '/')}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentVideo = currentRoom?.currentVideo;

  return (
    <WebRTCProvider currentUserId={user?.id}>
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-dark)' }}>
      <Navbar onOpenCreateModal={() => setIsHostSettingsOpen(true)} />

      {/* Top Controls Bar (Ready System + Connection Health + Debug Console) */}
      <div style={{ padding: '8px 16px 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        {currentRoom && user && (
          <ReadySystemBar
            room={currentRoom}
            currentUserId={user.id}
            isHost={currentRoom.hostId === user.id}
            participants={participants}
            onSyncToRoom={handleManualSync}
          />
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <ConnectionHealthBadge />
          <button
            onClick={() => setIsDebugOpen(true)}
            style={{
              padding: '4px 8px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(15, 23, 42, 0.65)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
            title="Developer Debug Console"
          >
            <Terminal size={12} /> Debug
          </button>
        </div>
      </div>

      {/* Main Responsive Room Container */}
      <div className="room-layout-container">
        {/* Left Side: Video Stage & Call Controls */}
        <div className="video-section">
          {/* Main Video Stage (Supports Fullscreen API) */}
          <div ref={stageRef} className="glass-panel video-stage">
            {/* Video Player Box */}
            <div style={{ flex: 1, width: '100%', height: '100%', position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000' }}>
              {currentVideo?.sourceType === 'YOUTUBE' && currentVideo.youtubeVideoId ? (
                <YouTubePlayer
                  videoId={currentVideo.youtubeVideoId}
                  onReady={(player) => {
                    playerRef.current = player;
                  }}
                  onEnded={handleVideoEnded}
                />
              ) : currentVideo?.sourceType === 'UPLOADED' && currentVideo.manifestUrl ? (
                <HLSPlayer
                  manifestUrl={currentVideo.manifestUrl}
                  onReady={(_videoEl, controller) => {
                    playerRef.current = controller;
                  }}
                  onAudioTracksChange={(tracks, activeId) => {
                    setAudioTracks(tracks);
                    setSelectedAudioTrackId(activeId);
                  }}
                  onVideoDimensionsChange={(_w, _h, ratio, label) => {
                    setVideoAspectRatio(ratio);
                    setAspectRatioLabel(label);
                  }}
                  onEnded={handleVideoEnded}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: 'rgba(0,0,0,0.5)', padding: '24px', textAlign: 'center' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '16px' }}>
                    <Sparkles size={28} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>No Video Loaded Yet</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '420px', marginBottom: '20px' }}>
                    {canControl
                      ? 'Choose a YouTube URL or upload a video file to start watching together.'
                      : 'Waiting for the room host to select a video.'}
                  </p>
                  {canControl && (
                    <button className="btn btn-primary" onClick={() => setIsSelectVideoOpen(true)}>
                      <Plus size={18} />
                      <span>Choose Video Source</span>
                    </button>
                  )}
                </div>
              )}

              {/* Fullscreen Top Header Overlay Bar */}
              {isFullscreen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '64px',
                    zIndex: 'var(--z-fullscreen-overlay)',
                    padding: '0 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(to bottom, rgba(10, 14, 24, 0.85) 0%, rgba(10, 14, 24, 0) 100%)',
                    opacity: !showControls ? 0 : 1,
                    pointerEvents: !showControls ? 'none' : 'auto',
                    transition: 'opacity 0.3s ease-in-out',
                  }}
                >
                  {/* Left: Exit Fullscreen & Brand */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <button
                      onClick={toggleFullscreen}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                      }}
                      title="Exit Fullscreen"
                    >
                      <ChevronLeft size={22} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '1rem', color: '#fff', letterSpacing: '-0.3px' }}>
                      <span style={{ fontSize: '1.2rem' }}>🫏</span>
                      <span>mydonkey-call</span>
                    </div>
                  </div>

                  {/* Right: Quick Action Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      onClick={() => {
                        if (currentRoom) navigator.clipboard.writeText(window.location.href);
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '20px',
                        padding: '5px 14px',
                        color: '#fff',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backdropFilter: 'blur(10px)',
                      }}
                      title="Copy Shareable Room Link"
                    >
                      <ExternalLink size={14} />
                      <span>Copy Link</span>
                    </button>

                    <button
                      onClick={() => setShowFloatingParticipants(!showFloatingParticipants)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '20px',
                        padding: '5px 12px',
                        color: '#fff',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backdropFilter: 'blur(10px)',
                      }}
                      title="Room Participants"
                    >
                      <Users size={14} />
                      <span>{participants.length}</span>
                    </button>

                    <button
                      onClick={toggleFullscreen}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '10px',
                        width: '32px',
                        height: '32px',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)',
                      }}
                      title="Exit Fullscreen"
                    >
                      <Minimize2 size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Floating WebRTC Video Call Overlay (Active ONLY in Fullscreen Mode) */}
              {isFullscreen && (
                <div
                  style={{
                    opacity: !showControls ? 0 : 1,
                    pointerEvents: !showControls ? 'none' : 'auto',
                    transition: 'opacity 0.3s ease-in-out',
                  }}
                >
                  <FloatingCallOverlay
                    isFullscreen
                    onToggleChat={() => setShowFloatingChat(!showFloatingChat)}
                    onToggleParticipants={() => setShowFloatingParticipants(!showFloatingParticipants)}
                  />
                </div>
              )}

              {/* Fullscreen Floating Chat Drawer */}
              {showFloatingChat && (
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    width: 'min(90vw, 320px)',
                    height: 'calc(100% - 100px)',
                    zIndex: 'var(--z-fullscreen-overlay)',
                    opacity: isFullscreen && !showControls ? 0 : 1,
                    pointerEvents: isFullscreen && !showControls ? 'none' : 'auto',
                    transition: 'opacity 0.3s ease-in-out',
                  }}
                >
                  <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Room Chat</span>
                      <button onClick={() => setShowFloatingChat(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={16} />
                      </button>
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <ChatPanel />
                    </div>
                  </div>
                </div>
              )}

              {/* Fullscreen Floating Participants Drawer */}
              {showFloatingParticipants && (
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    width: 'min(90vw, 300px)',
                    height: 'calc(100% - 100px)',
                    zIndex: 'var(--z-fullscreen-overlay)',
                    opacity: isFullscreen && !showControls ? 0 : 1,
                    pointerEvents: isFullscreen && !showControls ? 'none' : 'auto',
                    transition: 'opacity 0.3s ease-in-out',
                  }}
                >
                  <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Participants</span>
                      <button onClick={() => setShowFloatingParticipants(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={16} />
                      </button>
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <ParticipantList />
                    </div>
                  </div>
                </div>
              )}

              {/* Floating Over-Video Control Bar */}
              {currentVideo && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '16px',
                    right: '16px',
                    zIndex: 30,
                    opacity: isFullscreen && !showControls ? 0 : 1,
                    pointerEvents: isFullscreen && !showControls ? 'none' : 'auto',
                    transition: 'opacity 0.3s ease-in-out',
                  }}
                >
                  <VideoControlBar
                    playbackState={authoritativePlayback?.state || 'PAUSED'}
                    currentTime={currentTime}
                    duration={duration}
                    playbackRate={authoritativePlayback?.playbackRate || 1.0}
                    isMuted={isMuted}
                    driftMs={driftMs}
                    canControl={canControl}
                    audioTracks={audioTracks}
                    selectedAudioTrackId={selectedAudioTrackId}
                    aspectRatioLabel={aspectRatioLabel}
                    onSelectAudioTrack={(trackId) => {
                      setSelectedAudioTrackId(trackId);
                      if (playerRef.current && playerRef.current.setAudioTrack) {
                        playerRef.current.setAudioTrack(trackId);
                      }
                    }}
                    onPlay={handleUserPlay}
                    onPause={handleUserPause}
                    onSeek={handleUserSeek}
                    onRateChange={handleRateChange}
                    onToggleMute={toggleMute}
                    onToggleFullscreen={toggleFullscreen}
                    onManualSync={handleManualSync}
                    onToggleFloatingChat={() => setShowFloatingChat(!showFloatingChat)}
                    onToggleFloatingParticipants={() => setShowFloatingParticipants(!showFloatingParticipants)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* WebRTC Bottom Strip (Visible in Normal Layout) */}
          <div className="webrtc-strip">
            <VideoGrid />
          </div>
        </div>

        {/* Right Side Sidebar (Chat & Participants) */}
        <div className="sidebar-section">
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            <button
              className={`btn btn-sm ${activeTab === 'chat' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'participants' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => setActiveTab('participants')}
            >
              Participants
            </button>
          </div>

          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeTab === 'chat' ? (
              <ChatPanel />
            ) : (
              <ParticipantList />
            )}
          </div>
        </div>
      </div>

      {/* Responsive Watch Room Layout CSS Engine */}
      <style>{`
        .room-layout-container {
          flex: 1;
          display: flex;
          gap: 12px;
          padding: 12px;
          overflow: hidden;
          max-width: 1920px;
          width: 100%;
          margin: 0 auto;
        }

        .video-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
          height: 100%;
          overflow: hidden;
          min-width: 0;
        }

        .video-stage {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          padding: 0;
          gap: 0;
          min-height: 240px;
        }

        .sidebar-section {
          width: 320px;
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          flex-shrink: 0;
        }

        /* Mobile Layout (< 768px) */
        @media (max-width: 767px) {
          .room-layout-container {
            flex-direction: column;
            overflow-y: auto;
            padding: 8px;
            gap: 8px;
          }
          .video-section {
            height: auto;
            flex: none;
          }
          .video-stage {
            min-height: 220px;
            aspect-ratio: 16 / 9;
          }
          .sidebar-section {
            width: 100%;
            height: 320px;
            flex: none;
          }
          .webrtc-strip {
            display: none;
          }
        }

        /* Tablet Portrait Layout (768px - 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .room-layout-container {
            flex-direction: column;
            overflow-y: auto;
          }
          .video-section {
            height: auto;
          }
          .video-stage {
            min-height: 360px;
          }
          .sidebar-section {
            width: 100%;
            height: 340px;
          }
        }
      `}</style>

      {/* Select Video Modal */}
      <SelectVideoModal
        isOpen={isSelectVideoOpen}
        onClose={() => setIsSelectVideoOpen(false)}
        onSelectYouTube={handleSelectYouTube}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />

      {/* Floating Background Upload Progress Overlay (Visible to Host & Uploaders) */}
      <BackgroundUploadOverlay
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
      />

      {/* Host Controls Modal */}
      <HostControlsModal
        isOpen={isHostSettingsOpen}
        onClose={() => setIsHostSettingsOpen(false)}
      />

      {/* Developer Debug Console Modal */}
      <DeveloperDebugModal
        isOpen={isDebugOpen}
        onClose={() => setIsDebugOpen(false)}
        room={currentRoom}
        currentUserId={user?.id}
        authoritativeState={authoritativePlayback}
        localTime={currentTime}
        timeDelta={driftMs / 1000}
      />
    </div>
    </WebRTCProvider>
  );
};

