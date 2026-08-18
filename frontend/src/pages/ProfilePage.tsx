import React from 'react';
import { User, Sparkles, History, Users } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { useAuthStore } from '../store/useAuthStore';
import { useSocialStore } from '../store/useSocialStore';
import { motion } from 'framer-motion';
import { pageEntrance } from '../animations';

export const ProfilePage: React.FC = () => {
  const { user } = useAuthStore();
  const { watchHistory, friends } = useSocialStore();

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '28px' }}>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                <User size={32} />
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.displayName || 'User Profile'}</h1>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', wordBreak: 'break-all' }}>{user?.email || (user?.isGuest ? 'Guest Account' : 'Authenticated Profile')}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '28px' }}>
            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <History size={22} color="var(--primary-light)" style={{ marginBottom: '6px' }} />
              <span style={{ fontSize: '1.6rem', fontWeight: 800, display: 'block', color: 'var(--primary-light)' }}>{watchHistory.length}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Watch Parties Attended</span>
            </div>
            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <Users size={22} color="var(--accent)" style={{ marginBottom: '6px' }} />
              <span style={{ fontSize: '1.6rem', fontWeight: 800, display: 'block', color: 'var(--accent)' }}>{friends.length}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Connected Friends</span>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} color="var(--accent)" /> Account Overview
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', wordBreak: 'break-all' }}>
              User ID: <code className="mono" style={{ color: 'var(--text-main)' }}>{user?.id}</code>
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Authentication Status: <strong style={{ color: user?.isGuest ? 'var(--warning)' : 'var(--success)' }}>{user?.isGuest ? 'Guest Session' : 'Firebase Verified'}</strong>
            </p>
          </div>
        </div>
      </motion.main>
    </div>
  );
};
