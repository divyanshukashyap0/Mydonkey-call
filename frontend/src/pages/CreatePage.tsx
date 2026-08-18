import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { api } from '../services/api';
import { extractYouTubeId } from '../utils/youtube';
import { motion } from 'framer-motion';
import { pageEntrance } from '../animations';

export const CreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;

    const ytId = extractYouTubeId(youtubeUrl);
    if (!ytId) {
      setError('Invalid YouTube link. Please enter a valid YouTube video URL.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const { room } = await api.createRoom({ youtubeUrl: youtubeUrl.trim() });
      navigate(`/room/${room.roomCode}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
      setLoading(false);
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
        <div className="glass-panel" style={{ width: 'min(92vw, 480px)', padding: 'clamp(20px, 4vw, 36px)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', color: 'var(--primary)' }}>
              <Sparkles size={24} />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Create Watch Party</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Host a synchronized cinema room for your friends
            </p>
          </div>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px' }} disabled={loading}>
              <Plus size={18} />
              <span>{loading ? 'Creating Room...' : 'Launch Watch Party'}</span>
            </button>
          </form>
        </div>
      </motion.main>
    </div>
  );
};
