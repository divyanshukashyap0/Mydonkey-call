import { useState, useEffect, useCallback, useRef, RefObject } from 'react';

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
  const timeoutRef = useRef<any>(null);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // Auto-hide controls after 5 seconds (5000ms) of inactivity
    timeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 5000);
  }, []);

  const handleFullscreenChange = useCallback(() => {
    const doc = document as any;
    const fullscreenElement =
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement;

    const isFull = !!fullscreenElement && (elementRef.current ? fullscreenElement === elementRef.current : true);
    setIsFullscreen(isFull);
    resetControlsTimeout();
  }, [elementRef, resetControlsTimeout]);

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

  // Handle user mouse movement / keypress / touch events to reset the 5s timer
  useEffect(() => {
    const elem = elementRef.current || document;

    const handleActivity = () => {
      resetControlsTimeout();
    };

    elem.addEventListener('mousemove', handleActivity as any);
    elem.addEventListener('mousedown', handleActivity as any);
    elem.addEventListener('touchstart', handleActivity as any);
    elem.addEventListener('keydown', handleActivity as any);

    resetControlsTimeout();

    return () => {
      elem.removeEventListener('mousemove', handleActivity as any);
      elem.removeEventListener('mousedown', handleActivity as any);
      elem.removeEventListener('touchstart', handleActivity as any);
      elem.removeEventListener('keydown', handleActivity as any);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [elementRef, isFullscreen, resetControlsTimeout]);

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
