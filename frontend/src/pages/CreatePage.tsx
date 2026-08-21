import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles, Youtube, UploadCloud, FileVideo, Check, Film } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { api } from '../services/api';
import { extractYouTubeId } from '../utils/youtube';
import { useUploadStore } from '../store/useUploadStore';
import { motion } from 'framer-motion';
import { pageEntrance } from '../animations';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const CreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { startUpload } = useUploadStore();

  const [activeTab, setActiveTab] = useState<'youtube' | 'upload'>('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError('');
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
      setSelectedFile(e.dataTransfer.files[0]);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (activeTab === 'youtube') {
      if (!youtubeUrl.trim()) {
        setError('Please enter a YouTube video URL.');
        return;
      }
      const ytId = extractYouTubeId(youtubeUrl);
      if (!ytId) {
        setError('Invalid YouTube link. Please enter a valid YouTube video URL.');
        return;
      }

      try {
        setLoading(true);
        const { room } = await api.createRoom({ youtubeUrl: youtubeUrl.trim() });
        navigate(`/room/${room.roomCode}`);
      } catch (err: any) {
        setError(err.message || 'Failed to create room');
        setLoading(false);
      }
    } else {
      // Media Upload Tab
      if (!selectedFile) {
        setError('Please select or drop a media file to upload.');
        return;
      }

      try {
        setLoading(true);
        const roomName = selectedFile.name.replace(/\.[^/.]+$/, '') + ' Party';
        const { room } = await api.createRoom({ name: roomName });
        
        // Start background resumable upload & navigate to room immediately
        startUpload(selectedFile).catch((err) => console.error('Upload error:', err));
        navigate(`/room/${room.roomCode}`);
      } catch (err: any) {
        setError(err.message || 'Failed to create watch party with media file');
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg-dark)' }}>
      <Navbar />

      <motion.main
        variants={pageEntrance}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }}
      >
        <div className="glass-panel" style={{ width: 'min(92vw, 520px)', padding: 'clamp(24px, 4vw, 40px)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '18px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto', color: 'var(--primary)' }}>
              <Sparkles size={26} />
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800 }}>Create Watch Party</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Host a synchronized cinema room from YouTube or local media
            </p>
          </div>

          {/* Source Type Selector Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '4px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => { setActiveTab('youtube'); setError(''); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: 'calc(var(--radius-md) - 2px)',
                fontWeight: 700,
                fontSize: '0.88rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeTab === 'youtube' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                color: activeTab === 'youtube' ? '#ef4444' : 'var(--text-muted)',
                boxShadow: activeTab === 'youtube' ? '0 2px 8px rgba(239, 68, 68, 0.25)' : 'none',
              }}
            >
              <Youtube size={18} />
              <span>YouTube Video</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('upload'); setError(''); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: 'calc(var(--radius-md) - 2px)',
                fontWeight: 700,
                fontSize: '0.88rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeTab === 'upload' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: activeTab === 'upload' ? '#10b981' : 'var(--text-muted)',
                boxShadow: activeTab === 'upload' ? '0 2px 8px rgba(16, 185, 129, 0.25)' : 'none',
              }}
            >
              <UploadCloud size={18} />
              <span>Upload Media</span>
            </button>
          </div>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {activeTab === 'youtube' ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  YouTube Video Link
                </label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                  value={youtubeUrl}
                  onChange={(e) => {
                    setYoutubeUrl(e.target.value);
                    setError('');
                  }}
                  required
                />
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Select or Drop Movie / Video File
                </label>
                <label
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '32px 20px',
                    border: `2px dashed ${isDragging ? '#10b981' : selectedFile ? 'rgba(16, 185, 129, 0.5)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-md)',
                    background: isDragging ? 'rgba(16, 185, 129, 0.1)' : selectedFile ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />

                  {selectedFile ? (
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileVideo size={24} />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedFile.name}
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '99px', background: 'rgba(255, 255, 255, 0.06)' }}>
                        {formatBytes(selectedFile.size)} • Click to change file
                      </span>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <UploadCloud size={36} color="#10b981" />
                      <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#fff' }}>
                        Click to browse or drop video file here
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Supports MP4, WebM, MKV, MOV, AVI files
                      </span>
                    </div>
                  )}
                </label>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                background: activeTab === 'upload' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : undefined,
                boxShadow: activeTab === 'upload' ? '0 4px 16px rgba(16, 185, 129, 0.3)' : undefined,
              }}
              disabled={loading}
            >
              <Plus size={18} />
              <span>
                {loading
                  ? 'Creating Watch Party...'
                  : activeTab === 'youtube'
                  ? 'Launch Watch Party'
                  : 'Launch Watch Party with Media Upload'}
              </span>
            </button>
          </form>
        </div>
      </motion.main>
    </div>
  );
};
