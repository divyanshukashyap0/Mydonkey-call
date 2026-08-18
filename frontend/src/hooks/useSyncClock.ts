import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../services/socket';

export function useSyncClock() {
  const [clockOffset, setClockOffset] = useState<number>(0);
  const [rtt, setRtt] = useState<number>(0);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const socket = getSocket();

    const handlePong = ({ clientTime, serverTime }: { clientTime: number; serverTime: number }) => {
      const now = Date.now();
      const calculatedRtt = now - clientTime;
      const calculatedOffset = serverTime - (now - calculatedRtt / 2);

      setRtt(calculatedRtt);
      setClockOffset(calculatedOffset);
      isSyncingRef.current = false;
    };

    socket.on('sync:pong', handlePong);

    const pingInterval = setInterval(() => {
      if (socket.connected && !isSyncingRef.current) {
        isSyncingRef.current = true;
        socket.emit('sync:ping', { clientTime: Date.now() });
      }
    }, 10000); // Calibration sample every 10 seconds

    // Initial ping on mount
    if (socket.connected) {
      socket.emit('sync:ping', { clientTime: Date.now() });
    }

    return () => {
      socket.off('sync:pong', handlePong);
      clearInterval(pingInterval);
    };
  }, []);

  const getAdjustedServerTime = (): number => {
    return Date.now() + clockOffset;
  };

  return { clockOffset, rtt, getAdjustedServerTime };
}
