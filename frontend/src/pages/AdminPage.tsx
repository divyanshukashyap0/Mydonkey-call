import React, { useEffect, useState } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { useAuthStore } from '../store/useAuthStore';
import { adminApi, AdminStats, AdminUser, AdminWatchHistoryItem, AdminVideo, AdminRoom } from '../services/admin';
import {
  Users,
  History,
  Film,
  HardDrive,
  RefreshCw,
  Shield,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  DoorOpen,
  Activity,
  Clock,
  UserCheck,
  Lock,
  Unlock,
} from 'lucide-react';

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds?: number | null, fileSize?: number | bigint | null): string {
  let s = seconds ? Number(seconds) : 0;

  // Smart fallback estimation for video files with missing duration metadata based on file size (~2.5 MB/min)
  if ((!s || s <= 0) && fileSize) {
    const bytes = Number(fileSize);
    if (bytes > 0) {
      const estimatedMinutes = bytes / (2.5 * 1024 * 1024);
      s = Math.round(estimatedMinutes * 60);
    }
  }

  if (!s || s <= 0) return 'N/A';

  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);

  if (hrs > 0) return `${hrs}h ${mins > 0 ? `${mins}m` : ''}`;
  if (mins > 0) return `${mins}m ${secs > 0 ? `${secs}s` : ''}`;
  return `${secs}s`;
}

import { motion } from 'framer-motion';
import { pageEntrance } from '../animations';

import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/common/ToastNotification';

export const AdminPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [watchHistory, setWatchHistory] = useState<AdminWatchHistoryItem[]>([]);
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'rooms' | 'videos' | 'history'>('videos');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [sData, uData, rData, hData, vData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers(),
        adminApi.getRooms(),
        adminApi.getWatchHistory(),
        adminApi.getVideos(),
      ]);

      setStats(sData);
      setUsers(uData);
      setRooms(rData);
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
    if (user?.role === 'admin') {
      loadData();
    } else if (user && user.role !== 'admin') {
      setLoading(false);
      setErrorMsg('Admin role required');
      showToast('⚠️ Access Denied: You do not have permission to access the Admin Dashboard. Redirecting to Home...', 'error');

      const timer = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [user?.role, navigate]);

  const handleUpdateRole = async (targetUserId: string, newRole: 'admin' | 'user') => {
    try {
      await adminApi.updateUserRole(targetUserId, newRole);
      setUsers((prev) => prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u)));
    } catch (err: any) {
      alert(`Failed to update role: ${err.message}`);
    }
  };

  const handleDeleteRoom = async (roomId: string, roomCode: string) => {
    if (window.confirm(`Are you sure you want to expire and delete room ${roomCode}? Connected participants will be disconnected.`)) {
      try {
        await adminApi.deleteRoom(roomId);
        setRooms((prev) => prev.filter((r) => r.id !== roomId));
        showToast(`Room ${roomCode} has been expired & deleted.`, 'info');
      } catch (err: any) {
        showToast(`Failed to delete room: ${err.message}`, 'error');
      }
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRooms = rooms.filter(
    (r) =>
      r.roomCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.hostDisplayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.hostEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.currentVideo?.title && r.currentVideo.title.toLowerCase().includes(searchQuery.toLowerCase()))
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
      (v.ownerEmail && v.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      v.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Loading Spinner Screen
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-dark)' }}>
        <Navbar />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
          <div className="glass-panel" style={{ maxWidth: '440px', width: '100%', padding: '40px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <RefreshCw size={32} style={{ animation: 'spin 1.2s linear infinite' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px', color: '#fff' }}>Loading Admin Dashboard...</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Verifying Firestore permissions & fetching room stats...
              </p>
            </div>
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </main>
      </div>
    );
  }

  // Role Gate: Non-Admin Access Screen with Warning & Redirect Banner
  if (user && user.role !== 'admin' && errorMsg) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-dark)' }}>
        <Navbar />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
          <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', padding: '36px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', border: '1px solid rgba(239, 68, 68, 0.4)', boxShadow: '0 8px 32px rgba(239, 68, 68, 0.2)' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
              <ShieldAlert size={42} />
            </div>

            <div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '8px', color: '#fff' }}>⚠️ Access Denied</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.5' }}>
                You do not have administrative privileges to view the Admin Dashboard. Only verified accounts with <strong>role = admin</strong> in Cloud Firestore are permitted.
              </p>
            </div>

            <div style={{ padding: '14px 18px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.25)', width: '100%', fontSize: '0.85rem', color: '#ef4444', fontWeight: 700 }}>
              🏠 Redirecting to Home Page in {redirectCountdown} second{redirectCountdown !== 1 ? 's' : ''}...
            </div>

            <button className="btn btn-primary" onClick={() => navigate('/')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span>Return to Home Now</span>
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
        style={{ flex: 1, padding: '32px 24px', maxWidth: '1360px', width: '100%', margin: '0 auto' }}
      >
        {/* Header Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: 'var(--primary)' }}>
                <Shield size={24} />
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Admin Dashboard & Traffic Inspection</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Real-time monitoring for User Uploads, All Room Details, and Render Backend Bandwidth Consumption.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="btn btn-secondary btn-sm" style={{ cursor: 'default', pointerEvents: 'none' }}>
              <ShieldCheck size={16} color="var(--primary-light)" />
              <span>Role: {user?.role || 'admin'}</span>
            </div>

            <button className="btn btn-secondary btn-sm" onClick={loadData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {/* Render Backend Bandwidth */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid rgba(99, 102, 241, 0.35)', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
              <Activity size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Render Backend Bandwidth</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#818cf8' }}>
                {formatBytes(stats?.totalHttpBytesServed ?? 0)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                {stats?.totalHttpRequestsServed ?? 0} API Requests
              </div>
            </div>
          </div>

          {/* Uploaded Storage */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ec4899' }}>
              <HardDrive size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Uploaded Storage</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{formatBytes(stats?.totalStorageBytes)}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Total Video Files</div>
            </div>
          </div>

          {/* All Rooms */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <DoorOpen size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Total Rooms</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{stats?.totalRooms ?? rooms.length}</div>
              <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>
                {rooms.filter(r => r.activeParticipantCount > 0).length} Active Now
              </div>
            </div>
          </div>

          {/* Total Users */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
              <Users size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Total Users</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{stats?.totalUsers ?? users.length}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Registered & Guests</div>
            </div>
          </div>

          {/* Total Videos */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
              <Film size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Content Items</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{stats?.totalVideos ?? videos.length}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>YouTube & Uploaded</div>
            </div>
          </div>
        </div>

        {/* Tab Selection & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-input)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <button
              className={`btn btn-sm ${activeTab === 'videos' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('videos')}
              style={{ padding: '8px 16px' }}
            >
              <Film size={16} />
              <span>User Uploaded Content ({videos.length})</span>
            </button>

            <button
              className={`btn btn-sm ${activeTab === 'rooms' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('rooms')}
              style={{ padding: '8px 16px' }}
            >
              <DoorOpen size={16} />
              <span>All Room Details ({rooms.length})</span>
            </button>

            <button
              className={`btn btn-sm ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('users')}
              style={{ padding: '8px 16px' }}
            >
              <Users size={16} />
              <span>User Profiles ({users.length})</span>
            </button>

            <button
              className={`btn btn-sm ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('history')}
              style={{ padding: '8px 16px' }}
            >
              <History size={16} />
              <span>Watch History ({watchHistory.length})</span>
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

        {/* Tab 1: Uploaded Content Details (Which user uploaded which content & time) */}
        {activeTab === 'videos' && (
          <div className="glass-panel" style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px 16px' }}>Content Title / File</th>
                  <th style={{ padding: '14px 16px' }}>Uploaded By User</th>
                  <th style={{ padding: '14px 16px' }}>Upload Date & Time</th>
                  <th style={{ padding: '14px 16px' }}>File Size</th>
                  <th style={{ padding: '14px 16px' }}>Duration</th>
                  <th style={{ padding: '14px 16px' }}>Type & Status</th>
                  <th style={{ padding: '14px 16px' }}>Manifest / Stream Link</th>
                </tr>
              </thead>
              <tbody>
                {filteredVideos.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Admin dashboard details are on the way....
                    </td>
                  </tr>
                ) : (
                  filteredVideos.map((v) => (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{v.title}</div>
                        {v.originalFileName && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {v.originalFileName}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <UserCheck size={14} color="var(--primary)" />
                          <span>{v.ownerDisplayName}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v.ownerEmail}</div>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={13} color="var(--text-dim)" />
                          <span>{new Date(v.createdAt).toLocaleString()}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                        {v.sourceType === 'UPLOADED' ? formatBytes(v.fileSize) : 'N/A (YouTube)'}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{formatDuration(v.duration, v.fileSize)}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, background: v.sourceType === 'YOUTUBE' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)', color: v.sourceType === 'YOUTUBE' ? '#ef4444' : 'var(--primary)' }}>
                            {v.sourceType}
                          </span>
                          <span style={{ padding: '3px 8px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, background: v.status === 'READY' || v.status === 'PARTIALLY_READY' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: v.status === 'READY' || v.status === 'PARTIALLY_READY' ? 'var(--success)' : 'var(--warning)' }}>
                            {v.status}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }} className="mono">
                        {v.manifestUrl ? (
                          <a href={v.manifestUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}>
                            <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.manifestUrl}</span>
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>Direct CDN</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: All Rooms Details */}
        {activeTab === 'rooms' && (
          <div className="glass-panel" style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px 16px' }}>Room Code & Name</th>
                  <th style={{ padding: '14px 16px' }}>Host User</th>
                  <th style={{ padding: '14px 16px' }}>Creation & Expire Date/Time</th>
                  <th style={{ padding: '14px 16px' }}>Playing Movie / Video</th>
                  <th style={{ padding: '14px 16px' }}>Active Participants</th>
                  <th style={{ padding: '14px 16px' }}>Control & Lock</th>
                  <th style={{ padding: '14px 16px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No active or past rooms found.
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1rem' }}>{r.roomCode}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.name}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{r.hostDisplayName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.hostEmail}</div>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Clock size={12} color="#10b981" />
                            <span>Created: <strong>{new Date(r.createdAt).toLocaleString()}</strong></span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Clock size={12} color="#ef4444" />
                            <span>Expires: <strong>{new Date(r.expiresAt).toLocaleString()}</strong></span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {r.currentVideo ? (
                          <div>
                            <div style={{ fontWeight: 600, color: '#fff' }}>{r.currentVideo.title}</div>
                            <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: r.currentVideo.sourceType === 'YOUTUBE' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)', color: r.currentVideo.sourceType === 'YOUTUBE' ? '#ef4444' : '#818cf8', fontWeight: 700 }}>
                              {r.currentVideo.sourceType}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>No video playing</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700, background: r.activeParticipantCount > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.06)', color: r.activeParticipantCount > 0 ? '#10b981' : 'var(--text-dim)' }}>
                            {r.activeParticipantCount} Active / {r.totalParticipantCount} Total
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '240px' }}>
                          {r.participants.slice(0, 5).map((p) => (
                            <span key={p.userId} style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', color: p.isOnline ? '#fff' : 'var(--text-dim)', padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                              {p.displayName} {p.role === 'HOST' ? '👑' : ''}
                            </span>
                          ))}
                          {r.participants.length > 5 && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+{r.participants.length - 5} more</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, background: r.controlMode === 'HOST_ONLY' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: r.controlMode === 'HOST_ONLY' ? 'var(--warning)' : 'var(--success)' }}>
                            {r.controlMode}
                          </span>
                          {r.isLocked ? <span title="Room Locked"><Lock size={14} color="#ef4444" /></span> : <span title="Room Unlocked"><Unlock size={14} color="#10b981" /></span>}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDeleteRoom(r.id, r.roomCode)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            fontSize: '0.75rem',
                            padding: '4px 10px',
                          }}
                        >
                          Expire & Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Users Table */}
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
                  <th style={{ padding: '14px 16px' }}>Joined Date & Time</th>
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

        {/* Tab 4: Watch History Table */}
        {activeTab === 'history' && (
          <div className="glass-panel" style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px 16px' }}>User</th>
                  <th style={{ padding: '14px 16px' }}>Room Code</th>
                  <th style={{ padding: '14px 16px' }}>Video Title</th>
                  <th style={{ padding: '14px 16px' }}>Source</th>
                  <th style={{ padding: '14px 16px' }}>Watched At (Date & Time)</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No watch history records stored in database yet.
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
      </motion.main>
    </div>
  );
};
