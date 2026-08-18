import React, { useState, useEffect } from 'react';
import { Wifi, Signal, RefreshCw, ChevronDown, ShieldAlert } from 'lucide-react';
import { getSocket } from '../../services/socket';

interface ConnectionHealthBadgeProps {
  streamStatus?: 'ready' | 'buffering' | 'unavailable';
  webRTCStatus?: 'excellent' | 'good' | 'fair' | 'poor' | 'reconnecting' | 'disconnected';
  onManualReconnect?: () => void;
}

export const ConnectionHealthBadge: React.FC<ConnectionHealthBadgeProps> = ({
  streamStatus = 'ready',
  webRTCStatus = 'good',
  onManualReconnect,
}) => {
  const [socketConnected, setSocketConnected] = useState<boolean>(true);
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    setSocketConnected(socket.connected);

    // Measure RTT ping every 5 seconds
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        const start = Date.now();
        socket.emit('sync:ping', { clientTime: start });
      }
    }, 5000);

    const handlePong = ({ clientTime }: { clientTime: number }) => {
      const rtt = Date.now() - clientTime;
      setPingMs(rtt);
    };

    socket.on('sync:pong', handlePong);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('sync:pong', handlePong);
      clearInterval(pingInterval);
    };
  }, []);

  const overallStatus = !socketConnected
    ? 'disconnected'
    : streamStatus === 'buffering' || webRTCStatus === 'reconnecting'
    ? 'warning'
    : 'good';

  const getStatusColor = () => {
    if (overallStatus === 'disconnected') return 'var(--danger)';
    if (overallStatus === 'warning') return '#f59e0b';
    return '#10b981';
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setShowDetails(!showDetails)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '20px',
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#e2e8f0',
          fontSize: '0.78rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
        title="View Connection Health"
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(),
            boxShadow: `0 0 8px ${getStatusColor()}`,
          }}
        />
        <span>
          {overallStatus === 'disconnected' ? 'Offline' : overallStatus === 'warning' ? 'Syncing...' : 'Connected'}
        </span>
        {pingMs !== null && socketConnected && (
          <span style={{ opacity: 0.7, fontSize: '0.72rem' }}>{pingMs}ms</span>
        )}
        <ChevronDown size={12} style={{ opacity: 0.6 }} />
      </button>

      {showDetails && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '230px',
            padding: '12px',
            borderRadius: '12px',
            zIndex: 100,
            fontSize: '0.8rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Signal size={14} color="#6366f1" /> Connection Metrics
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Stream Health */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Video Stream:</span>
              <span style={{ color: streamStatus === 'ready' ? '#10b981' : streamStatus === 'buffering' ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>
                {streamStatus === 'ready' ? '🟢 Ready' : streamStatus === 'buffering' ? '🟡 Buffering' : '🔴 Stalled'}
              </span>
            </div>

            {/* Socket Health */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Real-Time Sync:</span>
              <span style={{ color: socketConnected ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                {socketConnected ? `🟢 Connected (${pingMs ?? '--'}ms)` : '🔴 Disconnected'}
              </span>
            </div>

            {/* WebRTC Call */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Video Call:</span>
              <span style={{ color: webRTCStatus === 'good' || webRTCStatus === 'excellent' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                {webRTCStatus === 'good' || webRTCStatus === 'excellent' ? '🟢 Good' : webRTCStatus === 'fair' ? '🟡 Fair' : '🔴 Reconnecting'}
              </span>
            </div>
          </div>

          {(!socketConnected || overallStatus === 'disconnected') && onManualReconnect && (
            <button
              onClick={onManualReconnect}
              style={{
                marginTop: '10px',
                width: '100%',
                padding: '6px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <RefreshCw size={12} /> Force Reconnect
            </button>
          )}
        </div>
      )}
    </div>
  );
};
