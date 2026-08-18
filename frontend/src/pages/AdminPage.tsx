import React, { useEffect, useState } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { useAuthStore } from '../store/useAuthStore';
import { adminApi, AdminStats, AdminUser, AdminWatchHistoryItem, AdminVideo } from '../services/admin';
import { Users, History, Film, HardDrive, RefreshCw, Shield, ExternalLink, ShieldAlert, ShieldCheck } from 'lucide-react';

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds?: number | null): string {
  if (!seconds) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

import { motion } from 'framer-motion';
import { pageEntrance, staggerContainer, staggerItem } from '../animations';

export const AdminPage: React.FC = () => {
  const { user, token } = useAuthStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [watchHistory, setWatchHistory] = useState<AdminWatchHistoryItem[]>([]);
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'history' | 'videos'>('users');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [sData, uData, hData, vData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers(),
        adminApi.getWatchHistory(),
        adminApi.getVideos(),
      ]);

      setStats(sData);
      setUsers(uData);
      setWatchHistory(hData);
      setVideos(vData);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      setErrorMsg(err.message || 'Failed to fetch admin statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin' || user || token) {
      loadData();
    }
  }, [user?.role, token]);

  const handleToggleSelfAdmin = async () => {
    try {
      const res = await adminApi.toggleSelfAdmin();
      if (user) {
        user.role = res.role;
      }
      await loadData();
    } catch (err: any) {
      alert(`Role change error: ${err.message}`);
    }
  };

  const handleUpdateRole = async (targetUserId: string, newRole: 'admin' | 'user') => {
    try {
      await adminApi.updateUserRole(targetUserId, newRole);
      setUsers((prev) => prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u)));
    } catch (err: any) {
      alert(`Failed to update role: ${err.message}`);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredHistory = watchHistory.filter(
    (h) =>
      h.videoTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.userDisplayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.roomCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVideos = videos.filter(
    (v) =>
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.ownerDisplayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Role Gate: Non-Admin Access Screen
  if (user && user.role !== 'admin' && errorMsg) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-dark)' }}>
        <Navbar />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '36px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
              <ShieldAlert size={36} />
            </div>

            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>Access Denied</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Only users with <strong>role = admin</strong> are permitted to access the Admin Dashboard. Your profile role is currently <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{user.role || 'user'}</span>.
              </p>
            </div>

            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', width: '100%', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              🔑 Testing Mode: Click below to grant <strong>role = admin</strong> to your account!
            </div>

            <button className="btn btn-primary" onClick={handleToggleSelfAdmin} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <ShieldCheck size={18} />
              <span>Promote My Account to Admin</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-dark)' }}>
      <Navbar />

      <motion.main
        variants={pageEntrance}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ flex: 1, padding: '32px 24px', maxWidth: '1280px', width: '100%', margin: '0 auto' }}
      >
        {/* Header Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: 'var(--primary)' }}>
                <Shield size={24} />
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Admin Database Inspection</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Live Firestore & DB metrics for User Details, Watch History, and Video Metadata.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleToggleSelfAdmin} title="Toggle role">
              <ShieldCheck size={16} color="var(--primary-light)" />
              <span>Role: {user?.role || 'user'}</span>
            </button>

            <button className="btn btn-secondary btn-sm" onClick={loadData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Users size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Users</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats?.totalUsers ?? users.length}</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
              <History size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Watch Events</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats?.totalWatchEvents ?? watchHistory.length}</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
              <Film size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Videos Metadata</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats?.totalVideos ?? videos.length}</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ec4899' }}>
              <HardDrive size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Storage Used</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatBytes(stats?.totalStorageBytes)}</div>
            </div>
          </div>
        </div>

        {/* Tab Selection & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-input)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <button
              className={`btn btn-sm ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('users')}
              style={{ padding: '8px 16px' }}
            >
              <Users size={16} />
              <span>User Details ({users.length})</span>
            </button>

            <button
              className={`btn btn-sm ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('history')}
              style={{ padding: '8px 16px' }}
            >
              <History size={16} />
              <span>Watch History ({watchHistory.length})</span>
            </button>

            <button
              className={`btn btn-sm ${activeTab === 'videos' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('videos')}
              style={{ padding: '8px 16px' }}
            >
              <Film size={16} />
              <span>Video Metadata ({videos.length})</span>
            </button>
          </div>

          <input
            type="text"
            className="form-control"
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ maxWidth: '280px', fontSize: '0.85rem' }}
          />
        </div>

        {/* Tab 1: Users Table */}
        {activeTab === 'users' && (
          <div className="glass-panel" style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px 16px' }}>User ID</th>
                  <th style={{ padding: '14px 16px' }}>Display Name</th>
                  <th style={{ padding: '14px 16px' }}>Email</th>
                  <th style={{ padding: '14px 16px' }}>Account Type</th>
                  <th style={{ padding: '14px 16px' }}>Profile Role</th>
                  <th style={{ padding: '14px 16px' }}>Joined Date</th>
                  <th style={{ padding: '14px 16px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px 16px' }} className="mono">{u.id}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{u.displayName}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{u.email}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600, background: u.isGuest ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: u.isGuest ? 'var(--warning)' : 'var(--success)' }}>
                          {u.isGuest ? 'Guest' : 'Registered'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700, background: u.role === 'admin' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.06)', color: u.role === 'admin' ? 'var(--primary-light)' : 'var(--text-muted)', border: u.role === 'admin' ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--border-color)' }}>
                          {u.role ? u.role.toUpperCase() : 'USER'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{new Date(u.createdAt).toLocaleString()}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleUpdateRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                        >
                          {u.role === 'admin' ? 'Set as User' : 'Set as Admin'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Watch History Table */}
        {activeTab === 'history' && (
          <div className="glass-panel" style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px 16px' }}>User</th>
                  <th style={{ padding: '14px 16px' }}>Room Code</th>
                  <th style={{ padding: '14px 16px' }}>Video Title</th>
                  <th style={{ padding: '14px 16px' }}>Source</th>
                  <th style={{ padding: '14px 16px' }}>Watched At</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No watch history records stored in database yet. Join a room and play a video to record history!
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((h) => (
                    <tr key={h.id || `${h.roomCode}-${h.watchedAt}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{h.userDisplayName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{h.userEmail}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }} className="mono">
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{h.roomCode}</span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{h.videoTitle}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600, background: h.sourceType === 'YOUTUBE' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)', color: h.sourceType === 'YOUTUBE' ? '#ef4444' : 'var(--primary)' }}>
                          {h.sourceType}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{new Date(h.watchedAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Video Metadata Table */}
        {activeTab === 'videos' && (
          <div className="glass-panel" style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px 16px' }}>Video ID</th>
                  <th style={{ padding: '14px 16px' }}>Title</th>
                  <th style={{ padding: '14px 16px' }}>Source</th>
                  <th style={{ padding: '14px 16px' }}>File Size</th>
                  <th style={{ padding: '14px 16px' }}>Duration</th>
                  <th style={{ padding: '14px 16px' }}>Status</th>
                  <th style={{ padding: '14px 16px' }}>Stream Path</th>
                  <th style={{ padding: '14px 16px' }}>Owner</th>
                </tr>
              </thead>
              <tbody>
                {filteredVideos.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No video metadata stored in database yet.
                    </td>
                  </tr>
                ) : (
                  filteredVideos.map((v) => (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px 16px' }} className="mono">{v.id}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{v.title}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600, background: v.sourceType === 'YOUTUBE' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)', color: v.sourceType === 'YOUTUBE' ? '#ef4444' : 'var(--primary)' }}>
                          {v.sourceType}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>{v.sourceType === 'UPLOADED' ? formatBytes(v.fileSize) : 'N/A'}</td>
                      <td style={{ padding: '14px 16px' }}>{formatDuration(v.duration)}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600, background: v.status === 'READY' || v.status === 'PARTIALLY_READY' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: v.status === 'READY' || v.status === 'PARTIALLY_READY' ? 'var(--success)' : 'var(--warning)' }}>
                          {v.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }} className="mono">
                        {v.manifestUrl ? (
                          <a href={v.manifestUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>{v.manifestUrl}</span>
                            <ExternalLink size={12} />
                          </a>
                        ) : 'None'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>{v.ownerDisplayName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </motion.main>
    </div>
  );
};
