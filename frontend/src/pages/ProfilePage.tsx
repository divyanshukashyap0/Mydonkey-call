import React, { useState } from 'react';
import {
  User,
  Sparkles,
  History,
  Users,
  Shield,
  ShieldCheck,
  Copy,
  Check,
  Film,
  Clock,
  Mail,
  Key,
  Award,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { useAuthStore } from '../store/useAuthStore';
import { useSocialStore } from '../store/useSocialStore';
import { motion, AnimatePresence } from 'framer-motion';
import { pageEntrance, staggerContainer, staggerItem } from '../animations';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/common/ToastNotification';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { watchHistory, friends } = useSocialStore();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [copiedId, setCopiedId] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<'overview' | 'history' | 'friends'>('overview');

  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      showToast('User ID copied to clipboard!', 'info');
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg-dark)' }}>
      <Navbar />

      <motion.main
        variants={pageEntrance}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ flex: 1, padding: '32px 16px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}
      >
        {/* Profile Glass Hero Header */}
        <div
          className="glass-panel"
          style={{
            padding: '32px',
            marginBottom: '24px',
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(20, 26, 43, 0.9) 0%, rgba(10, 14, 24, 0.95) 100%)',
            border: isAdmin ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--border-color)',
            boxShadow: isAdmin ? '0 8px 32px rgba(99, 102, 241, 0.15)' : 'var(--shadow-lg)',
          }}
        >
          {/* Subtle Ambient Background Glow */}
          <div
            style={{
              position: 'absolute',
              top: '-60px',
              right: '-60px',
              width: '240px',
              height: '240px',
              borderRadius: '50%',
              background: isAdmin ? 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {/* Avatar Circle */}
            <div style={{ position: 'relative' }}>
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  style={{
                    width: '84px',
                    height: '84px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--primary)',
                    boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '84px',
                    height: '84px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '2rem',
                    boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
                    border: '3px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  {(user?.displayName || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <span
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  right: '2px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#10b981',
                  border: '3px solid var(--bg-dark)',
                  boxShadow: '0 0 8px rgba(16, 185, 129, 0.8)',
                }}
                title="Online"
              />
            </div>

            {/* Profile Info */}
            <div style={{ flex: 1, minWidth: '240px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
                  {user?.displayName || 'User Profile'}
                </h1>
                {isAdmin ? (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '99px',
                      background: 'rgba(99, 102, 241, 0.25)',
                      color: 'var(--primary-light)',
                      border: '1px solid rgba(99, 102, 241, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <ShieldCheck size={14} color="#818cf8" /> ADMIN PROFILE
                  </span>
                ) : user?.isGuest ? (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '99px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: 'var(--warning)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    ⚡ GUEST SESSION
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '99px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: 'var(--success)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Sparkles size={13} /> VERIFIED USER
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} color="var(--primary-light)" />
                  <span>{user?.email || (user?.isGuest ? 'Guest (No Email)' : 'No Email Assigned')}</span>
                </div>

                <div
                  onClick={handleCopyId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    transition: 'all 0.15s ease',
                  }}
                  title="Click to copy User ID"
                >
                  <Key size={13} color="var(--accent)" />
                  <span className="mono" style={{ fontSize: '0.78rem' }}>{user?.id?.slice(0, 12)}...</span>
                  {copiedId ? <Check size={13} color="#10b981" /> : <Copy size={13} color="var(--text-muted)" />}
                </div>
              </div>
            </div>

            {/* Admin Quick Action Button */}
            {isAdmin && (
              <button
                className="btn btn-primary"
                onClick={() => navigate('/admin')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
              >
                <Shield size={18} />
                <span>Admin Dashboard</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid Cards */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}
        >
          <motion.div
            variants={staggerItem}
            className="glass-panel"
            style={{
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-light)' }}>
              <History size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Watch Parties</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>{watchHistory.length}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Sessions Attended</div>
            </div>
          </motion.div>

          <motion.div
            variants={staggerItem}
            className="glass-panel"
            style={{
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              transition: 'transform 0.2s ease',
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
              <Users size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Friends</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>{friends.length}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Connected Contacts</div>
            </div>
          </motion.div>

          <motion.div
            variants={staggerItem}
            className="glass-panel"
            style={{
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <Award size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Account Level</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>
                {isAdmin ? 'System Admin' : user?.isGuest ? 'Guest Participant' : 'Pro Member'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Full Access</div>
            </div>
          </motion.div>
        </motion.div>

        {/* Profile Tabs Section */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <button
            className={`btn btn-sm ${activeProfileTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveProfileTab('overview')}
            style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Sparkles size={16} />
            <span>Account Details</span>
          </button>

          <button
            className={`btn btn-sm ${activeProfileTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveProfileTab('history')}
            style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <History size={16} />
            <span>Watch History ({watchHistory.length})</span>
          </button>

          <button
            className={`btn btn-sm ${activeProfileTab === 'friends' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveProfileTab('friends')}
            style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Users size={16} />
            <span>Friends ({friends.length})</span>
          </button>
        </div>

        {/* Tab 1: Account Details */}
        {activeProfileTab === 'overview' && (
          <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="var(--primary-light)" /> Security & Session Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Full User Unique ID</span>
                <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)', wordBreak: 'break-all' }}>{user?.id}</span>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Authentication Identity</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: user?.isGuest ? 'var(--warning)' : '#10b981' }}>
                  {user?.isGuest ? 'Anonymous Guest Session' : 'Firebase Verified Account'}
                </span>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Profile Authorization Role</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: isAdmin ? 'var(--primary-light)' : 'var(--text-main)' }}>
                  {user?.role ? user.role.toUpperCase() : 'USER'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button
                className="btn btn-secondary"
                onClick={logout}
                style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)' }}
              >
                <span>Sign Out of Account</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Recent Watch History */}
        {activeProfileTab === 'history' && (
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Recent Watch Parties</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/history')}>
                <span>View All History</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {watchHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                No watch party history recorded yet. Join or create a room to play videos!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {watchHistory.slice(0, 5).map((item) => (
                  <div
                    key={item.id || `${item.roomCode}-${item.watchedAt}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)' }}>
                        <Film size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.videoTitle}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Room Code: <strong style={{ color: 'var(--accent)' }}>{item.roomCode}</strong></div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={13} />
                      <span>{new Date(item.watchedAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Friends List */}
        {activeProfileTab === 'friends' && (
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Connected Friends</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/friends')}>
                <span>Manage Friends</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {friends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                You have not connected with any friends yet. Add friends using their email!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                {friends.map((f) => (
                  <div
                    key={f.friendUid}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
                      {(f.friendDisplayName || 'F').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{f.friendDisplayName || 'Friend'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.friendEmail || 'No email'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.main>
    </div>
  );
};
