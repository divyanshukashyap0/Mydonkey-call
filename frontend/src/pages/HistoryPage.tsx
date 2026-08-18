import React, { useEffect } from 'react';
import { History, Play } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { useSocialStore } from '../store/useSocialStore';
import { motion } from 'framer-motion';
import { pageEntrance, staggerContainer, staggerItem } from '../animations';

export const HistoryPage: React.FC = () => {
  const { watchHistory, fetchSocialData } = useSocialStore();

  useEffect(() => {
    fetchSocialData();
  }, []);

  const handleHostAgain = (youtubeUrl?: string) => {
    if (youtubeUrl) {
      window.location.href = `/?ytUrl=${encodeURIComponent(youtubeUrl)}`;
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
        style={{ flex: 1, padding: '20px 16px', maxWidth: '800px', margin: '0 auto', width: '100%' }}
      >
        <div className="glass-panel" style={{ padding: 'clamp(16px, 4vw, 36px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
              <History size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Watch History</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Previously watched videos & watch party logs</p>
            </div>
          </div>

          {watchHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <History size={48} style={{ margin: '0 auto 16px auto', opacity: 0.4 }} />
              <p style={{ fontSize: '0.95rem' }}>No watch history recorded yet.</p>
            </div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {watchHistory.map((item, idx) => (
                <motion.div key={idx} variants={staggerItem} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', padding: '14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.videoTitle} style={{ width: '70px', height: '40px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '70px', height: '40px', background: 'rgba(99,102,241,0.2)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                        <Play size={18} />
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.videoTitle}</h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                        Room: <code className="mono">{item.roomCode}</code> • {new Date(item.watchedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {item.youtubeUrl && (
                    <button className="btn btn-secondary btn-sm" onClick={() => handleHostAgain(item.youtubeUrl)}>
                      <Play size={14} />
                      <span>Host Party</span>
                    </button>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.main>
    </div>
  );
};
