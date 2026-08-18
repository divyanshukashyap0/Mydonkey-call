import React, { useState } from 'react';
import { X, Youtube, UploadCloud, Play } from 'lucide-react';
import { extractYouTubeId, getYouTubeThumbnail } from '../../utils/youtube';

interface SelectVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectYouTube: (url: string) => void;
  onOpenUploadModal: () => void;
}

import { AnimatedModal } from '../common/AnimatedModal';

export const SelectVideoModal: React.FC<SelectVideoModalProps> = ({
  isOpen,
  onClose,
  onSelectYouTube,
  onOpenUploadModal,
}) => {
  const [tab, setTab] = useState<'youtube' | 'upload'>('youtube');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const ytId = extractYouTubeId(url);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ytId) {
      setError('Invalid YouTube video link. Please enter a valid YouTube video URL.');
      return;
    }
    setError('');
    onSelectYouTube(url.trim());
    onClose();
  };

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} maxWidth="520px">
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Choose Video Source</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
          Watch a YouTube video or upload a movie file to stream in sync.
        </p>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        <button
          className={`btn ${tab === 'youtube' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.88rem' }}
          onClick={() => setTab('youtube')}
        >
          <Youtube size={16} />
          <span>YouTube URL</span>
        </button>
        <button
          className={`btn ${tab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.88rem' }}
          onClick={() => setTab('upload')}
        >
          <UploadCloud size={16} />
          <span>Upload Video File</span>
        </button>
      </div>

      {tab === 'youtube' ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              YouTube Video URL
            </label>
            <input
              type="url"
              className="input"
              placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError('');
              }}
              required
            />
          </div>

          {ytId && (
            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px' }}>
              <img src={getYouTubeThumbnail(ytId)} alt="YouTube Preview" style={{ width: '120px', height: '68px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
              <div>
                <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Youtube size={14} /> Ready to Load
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600, display: 'block', marginTop: '2px' }} className="mono">
                  ID: {ytId}
                </span>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px', padding: '14px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)' }} disabled={!ytId}>
            <Play size={18} />
            <span>Load Video into Room</span>
          </button>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
            Upload a large local movie file (MP4, MKV, MOV) using progressive resumable chunked uploading.
          </p>
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px' }}
            onClick={() => {
              onClose();
              onOpenUploadModal();
            }}
          >
            <UploadCloud size={18} />
            <span>Open Resumable File Uploader</span>
          </button>
        </div>
      )}
    </AnimatedModal>
  );
};
