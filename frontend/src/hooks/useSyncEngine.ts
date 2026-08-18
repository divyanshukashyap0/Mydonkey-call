import { useState, useEffect, useCallback, useRef } from 'react';
import { AuthoritativePlaybackState } from '../types';

export interface UseSyncEngineProps {
  authoritativeState: AuthoritativePlaybackState | null;
  getCurrentTime: () => number;
  seekTo: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  isPlaying: boolean;
  isBuffering?: boolean;
}

export interface UseSyncEngineResult {
  syncStatus: 'synced' | 'syncing' | 'out_of_sync';
  timeDelta: number;
  estimatedServerPosition: number;
  syncNow: () => void;
}

export function useSyncEngine({
  authoritativeState,
  getCurrentTime,
  seekTo,
  setPlaybackRate,
  isPlaying,
  isBuffering = false,
}: UseSyncEngineProps): UseSyncEngineResult {
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'out_of_sync'>('synced');
  const [timeDelta, setTimeDelta] = useState<number>(0);
  const [estimatedServerPos, setEstimatedServerPos] = useState<number>(0);

  const lastAppliedRate = useRef<number>(1.0);
  const isPerformingCorrection = useRef<boolean>(false);

  // Calculate current authoritative server position
  const getEstimatedServerPosition = useCallback(() => {
    if (!authoritativeState) return 0;
    const { state, position, playbackRate, updatedAt } = authoritativeState;

    if (state === 'PLAYING') {
      const elapsedSeconds = (Date.now() - updatedAt) / 1000;
      return Math.max(0, position + elapsedSeconds * playbackRate);
    }
    return Math.max(0, position);
  }, [authoritativeState]);

  const performSyncCheck = useCallback(() => {
    if (!authoritativeState || isBuffering) {
      if (isBuffering) setSyncStatus('syncing');
      return;
    }

    const serverPos = getEstimatedServerPosition();
    const localPos = getCurrentTime();
    const delta = serverPos - localPos; // Positive = local is behind, Negative = local is ahead

    setEstimatedServerPos(serverPos);
    setTimeDelta(delta);

    const absDelta = Math.abs(delta);

    // Update Status Indicator
    if (absDelta < 0.2) {
      setSyncStatus('synced');
    } else if (absDelta <= 1.5) {
      setSyncStatus('syncing');
    } else {
      setSyncStatus('out_of_sync');
    }

    // 1. Hysteresis Deadband: |delta| < 0.15s -> Do nothing (normal 1.00x)
    if (absDelta < 0.15) {
      if (lastAppliedRate.current !== 1.0) {
        lastAppliedRate.current = 1.0;
        setPlaybackRate(1.0);
      }
      return;
    }

    // 2. Large Difference (|delta| > 1.5s) -> Hard Seek
    if (absDelta > 1.5) {
      if (!isPerformingCorrection.current) {
        isPerformingCorrection.current = true;
        console.log(`⚡ Hard Sync Seek: Local=${localPos.toFixed(2)}s, Server=${serverPos.toFixed(2)}s (Delta=${delta.toFixed(2)}s)`);
        seekTo(serverPos);
        lastAppliedRate.current = 1.0;
        setPlaybackRate(1.0);

        setTimeout(() => {
          isPerformingCorrection.current = false;
        }, 800);
      }
      return;
    }

    // 3. Moderate Difference (0.15s <= |delta| <= 1.5s) -> Gentle Micro-Rate Drift Correction
    if (isPlaying && authoritativeState.state === 'PLAYING') {
      let targetRate = 1.0;
      if (delta > 0) {
        // Behind server -> Speed up slightly (1.03x)
        targetRate = 1.03;
      } else {
        // Ahead of server -> Slow down slightly (0.97x)
        targetRate = 0.97;
      }

      if (lastAppliedRate.current !== targetRate) {
        lastAppliedRate.current = targetRate;
        setPlaybackRate(targetRate);
      }
    }
  }, [authoritativeState, isBuffering, getEstimatedServerPosition, getCurrentTime, seekTo, setPlaybackRate, isPlaying]);

  // Periodic Sync Correction Interval (Runs every 1000ms)
  useEffect(() => {
    const timer = setInterval(() => {
      performSyncCheck();
    }, 1000);

    return () => clearInterval(timer);
  }, [performSyncCheck]);

  // Manual Sync Now Trigger
  const syncNow = useCallback(() => {
    const serverPos = getEstimatedServerPosition();
    console.log(`🎯 Manual Sync Triggered -> Seeking to ${serverPos.toFixed(2)}s`);
    seekTo(serverPos);
    lastAppliedRate.current = 1.0;
    setPlaybackRate(1.0);
    setSyncStatus('synced');
  }, [getEstimatedServerPosition, seekTo, setPlaybackRate]);

  return {
    syncStatus,
    timeDelta,
    estimatedServerPosition: estimatedServerPos,
    syncNow,
  };
}
