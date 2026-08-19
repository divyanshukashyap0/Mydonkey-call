import React from 'react';
import { UploadCloud, Play, Pause, X, ExternalLink, CheckCircle } from 'lucide-react';
import { useUploadStore } from '../../store/useUploadStore';

interface BackgroundUploadOverlayProps {
  onOpenUploadModal: () => void;
  isHostOrUploader?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatETA(seconds: number): string {
  if (seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export const BackgroundUploadOverlay: React.FC<BackgroundUploadOverlayProps> = ({
  onOpenUploadModal,
}) => {
  const { progress, activeFile, pauseUpload, resumeUpload, remoteUploadProgress } = useUploadStore();
  const [isDismissed, setIsDismissed] = React.useState(false);

  const activeProgress = progress || remoteUploadProgress?.progress;
  const fileName = activeFile?.name || remoteUploadProgress?.fileName || 'Movie File';
  const isLocalUpload = !!progress;

  React.useEffect(() => {
    setIsDismissed(false);
  }, [activeFile?.name, remoteUploadProgress?.fileName]);

  if (!activeProgress || isDismissed) return null;

  const isCompleted = activeProgress.status === 'COMPLETED';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9990,
        width: '360px',
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: 'var(--radius-lg, 16px)',
        padding: '14px 16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(59, 130, 246, 0.15)',
        color: '#fff',
        transition: 'all 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
              border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isCompleted ? 'var(--success, #10b981)' : 'var(--accent, #60a5fa)',
              flexShrink: 0,
            }}
          >
            {isCompleted ? <CheckCircle size={16} /> : <UploadCloud size={16} className="spin" />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '180px',
              }}
            >
              {fileName}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
              {isCompleted ? 'Upload Complete' : isLocalUpload ? 'Uploading in background...' : `Uploaded by ${remoteUploadProgress?.uploaderName || 'Host'}`}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent, #60a5fa)' }}>
            {activeProgress.percentage}%
          </span>
          <button
            onClick={() => setIsDismissed(true)}
            title="Hide Upload Overlay"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '50%',
              width: '22px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              padding: 0,
            }}
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden', marginBottom: '10px' }}>
        <div
          style={{
            height: '100%',
            width: `${activeProgress.percentage}%`,
            background: isCompleted
              ? '#10b981'
              : 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '10px' }}>
        <div>
          Uploaded: <strong style={{ color: '#fff' }}>{formatBytes(activeProgress.uploadedBytes)}</strong>
        </div>
        <div>
          Speed: <strong style={{ color: '#10b981' }}>{activeProgress.speedMBs} MB/s</strong>
        </div>
        <div>
          ETA: <strong style={{ color: '#60a5fa' }}>{formatETA(activeProgress.etaSeconds)}</strong>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {isLocalUpload && !isCompleted && (
          <button
            className="btn btn-secondary"
            style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem', height: '30px' }}
            onClick={() => {
              if (activeProgress.status === 'UPLOADING') pauseUpload();
              else resumeUpload();
            }}
          >
            {activeProgress.status === 'UPLOADING' ? (
              <>
                <Pause size={14} /> <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={14} /> <span>Resume</span>
              </>
            )}
          </button>
        )}

        <button
          className="btn btn-primary"
          style={{ flex: 1.2, padding: '6px 10px', fontSize: '0.75rem', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
          onClick={onOpenUploadModal}
        >
          <ExternalLink size={14} />
          <span>Upload Details</span>
        </button>
      </div>
    </div>
  );
};
