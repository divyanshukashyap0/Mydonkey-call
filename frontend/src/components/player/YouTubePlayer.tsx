import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  onReady?: (player: any) => void;
  onStateChange?: (state: number, currentTime: number) => void;
  onUserSeek?: (currentTime: number) => void;
  onEnded?: () => void;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  onReady,
  onStateChange,
  onEnded,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    function initPlayer() {
      if (!containerRef.current || !window.YT || !window.YT.Player) return;

      if (playerRef.current) {
        playerRef.current.loadVideoById(videoId);
        return;
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            if (isMounted && onReady) {
              onReady(event.target);
            }
          },
          onStateChange: (event: any) => {
            if (isMounted && playerRef.current) {
              const currentTime = playerRef.current.getCurrentTime() || 0;
              if (onStateChange) onStateChange(event.data, currentTime);
              if (event.data === 0 && onEnded) {
                onEnded();
              }
            }
          },
        },
      });
    }

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        if (isMounted) initPlayer();
      };
    } else {
      initPlayer();
    }

    return () => {
      isMounted = false;
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};
