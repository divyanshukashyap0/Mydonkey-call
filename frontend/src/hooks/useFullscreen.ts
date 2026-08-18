import { useState, useEffect, useCallback, RefObject } from 'react';

export interface UseFullscreenResult {
  isFullscreen: boolean;
  showControls: boolean;
  enterFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
  toggleFullscreen: () => Promise<void>;
  resetControlsTimeout: () => void;
}

export function useFullscreen(elementRef: RefObject<HTMLElement>): UseFullscreenResult {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);

  // Auto-hide controls timeout
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
  }, []);

  const handleFullscreenChange = useCallback(() => {
    const doc = document as any;
    const fullscreenElement =
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement;

    const isFull = !!fullscreenElement && fullscreenElement === elementRef.current;
    setIsFullscreen(isFull);
  }, [elementRef]);

  useEffect(() => {
    const doc = document as any;
    doc.addEventListener('fullscreenchange', handleFullscreenChange);
    doc.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    doc.addEventListener('mozfullscreenchange', handleFullscreenChange);
    doc.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      doc.removeEventListener('fullscreenchange', handleFullscreenChange);
      doc.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      doc.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      doc.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [handleFullscreenChange]);

  // Controls auto-hide timer after 3.5s inactivity when playing/fullscreen
  useEffect(() => {
    if (!showControls) return;

    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, [showControls]);

  const enterFullscreen = useCallback(async () => {
    if (!elementRef.current) return;
    const elem = elementRef.current as any;

    try {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        await elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  }, [elementRef]);

  const exitFullscreen = useCallback(async () => {
    const doc = document as any;
    try {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen exit failed:', err);
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  return {
    isFullscreen,
    showControls,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
    resetControlsTimeout,
  };
}
