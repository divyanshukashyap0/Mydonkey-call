import React, { useState } from 'react';
import { X, UploadCloud, Play, Pause, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { ResumableUploader, UploadProgress } from '../../services/resumableUploader';
import { getSocket } from '../../services/socket';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatETA(seconds: number): string {
  if (seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

import { useUploadStore } from '../../store/useUploadStore';
import { AnimatedModal } from '../common/AnimatedModal';
import { EyeCatchingLoader } from '../common/EyeCatchingLoader';

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose }) => {
  const { startUpload, pauseUpload, resumeUpload, progress, activeFile, isInitializing, error } = useUploadStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      startUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      startUpload(file);
    }
  };

  const handleTogglePause = () => {
    if (!progress) return;
    if (progress.status === 'UPLOADING') {
      pauseUpload();
    } else if (progress.status === 'PAUSED') {
      resumeUpload();
    }
  };

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} maxWidth="520px">
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', color: 'var(--success)' }}>
          <UploadCloud size={24} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Upload Movie File</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
          Select or drop a video file. Upload starts instantly and plays automatically in room!
        </p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {!progress && !isInitializing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '36px 24px',
              border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border-color)'}`,
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              background: isDragging ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)',
              transition: 'all 0.2s ease',
            }}
          >
            <UploadCloud size={40} color="var(--primary-light)" style={{ marginBottom: '12px' }} />
            <span style={{ fontSize: '1rem', fontWeight: 600 }}>
              {isDragging ? 'Drop Video File Here' : 'Drop or Choose a Video File'}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              Upload starts automatically upon selection. Supports MP4, MKV, MOV, WEBM.
            </span>
            <input type="file" accept="video/*" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>
        </div>
      ) : isInitializing && !progress ? (
        <EyeCatchingLoader
          title="Initializing Stream..."
          subtitle={`Preparing instant playback for ${activeFile?.name}...`}
          badgeText="RESUMABLE CHUNK STREAM"
          fullScreen={false}
        />
      ) : progress ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              <span style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeFile?.name}</span>
              <span className="mono" style={{ color: 'var(--accent)' }}>{progress.percentage}%</span>
            </div>
            <div style={{ height: '8px', background: 'var(--bg-input)', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress.percentage}%`, background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)', transition: 'width 0.3s ease' }} />
            </div>
          </div>

          {/* Live Streaming Notification Banner */}
          {progress.currentChunk >= 1 && progress.status !== 'COMPLETED' && (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#6ee7b7', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Play size={16} color="var(--success)" />
              <span><strong>Video stream live in room!</strong> Movie plays automatically while remaining chunks upload.</span>
            </div>
          )}

          {/* Telemetry Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div>Uploaded: <strong style={{ color: 'var(--text-main)' }}>{formatBytes(progress.uploadedBytes)} / {formatBytes(progress.totalBytes)}</strong></div>
            <div>Speed: <strong style={{ color: 'var(--success)' }}>{progress.speedMBs} MB/s</strong></div>
            <div>Chunks: <strong style={{ color: 'var(--text-main)' }}>{progress.currentChunk} / {progress.totalChunks}</strong></div>
            <div>ETA: <strong style={{ color: 'var(--accent)' }}>{formatETA(progress.etaSeconds)}</strong></div>
          </div>

          {/* Control Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {progress.status === 'UPLOADING' && (
              <>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleTogglePause}>
                  <Pause size={16} />
                  <span>Pause</span>
                </button>
                {progress.currentChunk >= 1 && (
                  <button className="btn btn-primary" style={{ flex: 1.5 }} onClick={onClose}>
                    <Play size={16} />
                    <span>Watch Movie Now</span>
                  </button>
                )}
              </>
            )}
            {progress.status === 'PAUSED' && (
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleTogglePause}>
                <Play size={16} />
                <span>Resume Upload</span>
              </button>
            )}
            {progress.status === 'COMPLETED' && (
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>
                <CheckCircle size={16} />
                <span>Upload Complete — Play Video</span>
              </button>
            )}
          </div>
        </div>
      ) : null}
    </AnimatedModal>
  );
};
