import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Tv, LogOut, User as UserIcon, Plus, DoorOpen, LogIn, Users, History, Shield, Menu, X, Settings, Lock, Unlock, MessageSquare, Share2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useRoomStore } from '../../store/useRoomStore';
import { getSocket } from '../../services/socket';
import { AuthModal } from '../auth/AuthModal';
import { SocialDashboardModal } from '../social/SocialDashboardModal';
import { ShareRoomModal } from '../room/ShareRoomModal';

interface NavbarProps {
  onOpenCreateModal?: () => void;
  onOpenJoinModal?: () => void;
}

import { motion, AnimatePresence } from 'framer-motion';
import { drawerVariant, modalBackdrop } from '../../animations';
import { useToast } from '../common/ToastNotification';

export const Navbar: React.FC<NavbarProps> = ({ onOpenCreateModal, onOpenJoinModal }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { currentRoom, clearRoom } = useRoomStore();
  const { showToast } = useToast();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSocialOpen, setIsSocialOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);


  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    showToast(`Copied room code: ${code}`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveRoom = () => {
    clearRoom();
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  return (
    <>
      <nav
        className="glass-panel"
        style={{
          borderRadius: 0,
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 'var(--z-header)',
          gap: '12px',
        }}
      >
        {/* Brand Logo & Hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="mobile-hamburger-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', minWidth: 0 }}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #e50914 0%, #ff2e4d 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(229, 9, 20, 0.4)' }}
            >
              <Tv size={18} color="#fff" />
            </motion.div>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }} className="gradient-text">
                myDonkey-call
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentRoom ? (
            <>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setIsShareModalOpen(true)}
                style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #b81d24 100%)', gap: '4px', padding: '4px 10px', fontSize: '0.74rem', minHeight: '26px' }}
              >
                <Share2 size={13} />
                <span>Share Link</span>
              </button>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="room-code-badge"
                onClick={() => handleCopyCode(currentRoom.roomCode)}
              >
                <span>CODE: {currentRoom.roomCode}</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({copied ? 'Copied ✓' : 'Copy'})</span>
              </motion.div>
              {user?.id === currentRoom.hostId && (
                <button
                  className={`btn btn-sm ${currentRoom.isLocked ? 'btn-danger' : 'btn-secondary'}`}
                  onClick={() => getSocket().emit('room:toggle-lock')}
                  title={currentRoom.isLocked ? 'Unlock Room (Allow new participants to join)' : 'Lock Room (Prevent new participants from joining)'}
                >
                  {currentRoom.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                  <span>{currentRoom.isLocked ? 'Locked' : 'Lock Room'}</span>
                </button>
              )}
              {user?.id === currentRoom.hostId && onOpenCreateModal && (
                <button className="btn btn-secondary btn-sm" onClick={onOpenCreateModal}>
                  <Settings size={16} />
                  <span>Host Settings</span>
                </button>
              )}
              <button className="btn btn-danger btn-sm" onClick={handleLeaveRoom}>
                <DoorOpen size={16} />
                <span>Leave Room</span>
              </button>
            </>

          ) : (
            <>
              <Link to="/history" className="btn btn-secondary btn-sm">
                <History size={16} />
                <span>History</span>
              </Link>
              <Link to="/friends" className="btn btn-secondary btn-sm">
                <Users size={16} />
                <span>Friends</span>
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="btn btn-secondary btn-sm" title="Admin Dashboard">
                  <Shield size={16} color="var(--primary-light)" />
                  <span>Admin</span>
                </Link>
              )}
              <button className="btn btn-secondary btn-sm" onClick={() => (onOpenJoinModal ? onOpenJoinModal() : navigate('/join'))}>
                <DoorOpen size={16} />
                <span>Join Code</span>
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => (onOpenCreateModal ? onOpenCreateModal() : navigate('/create'))}>
                <Plus size={16} />
                <span>Create Party</span>
              </button>
            </>
          )}

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.05)', padding: '4px 10px', borderRadius: '99px', border: '1px solid var(--border-color)' }}>
              <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }} title="View Profile">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserIcon size={16} color="#fff" />
                  </div>
                )}
                <span style={{ fontSize: '0.85rem', fontWeight: 600, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.displayName}</span>
              </Link>

              {user.isGuest && (
                <button
                  onClick={() => setIsAuthOpen(true)}
                  style={{ fontSize: '0.7rem', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.4)', color: 'var(--primary-light)', padding: '2px 8px', borderRadius: '99px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Sign In
                </button>
              )}
              <button
                onClick={logout}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setIsAuthOpen(true)}>
              <LogIn size={16} />
              <span>Sign In</span>
            </button>
          )}
        </div>

        {/* Mobile Header Right Bar (Screens < 991px) */}
        <div className="mobile-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {currentRoom && (
            <button
              className="btn btn-primary btn-sm"
              style={{ padding: '4px 10px', fontSize: '0.78rem', gap: '4px', background: 'linear-gradient(135deg, var(--primary) 0%, #b81d24 100%)' }}
              onClick={() => setIsShareModalOpen(true)}
            >
              <Share2 size={14} />
              <span>Share Link</span>
            </button>
          )}

          <button
            className="btn btn-secondary btn-icon"
            style={{ width: '34px', height: '34px', position: 'relative' }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            title="Room Menu & Chat"
          >
            <MessageSquare size={16} />
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                background: 'var(--primary)',
                color: '#fff',
                fontSize: '0.6rem',
                fontWeight: 800,
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              3
            </span>
          </button>

          {user && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--border-color)' }}
                />
              ) : (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserIcon size={16} color="#fff" />
                </div>
              )}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--success)',
                  border: '1.5px solid #000',
                }}
              />
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Drawer Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            variants={modalBackdrop}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              position: 'fixed',
              top: '57px',
              inset: '57px 0 0 0',
              background: 'rgba(10, 13, 20, 0.95)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              zIndex: 'var(--z-modal)',
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
              gap: '16px',
              overflowY: 'auto',
            }}
          >
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserIcon size={20} color="#fff" />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.displayName}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.isGuest ? 'Guest Account' : user.email || 'Registered User'}</span>
                </div>
                <Link to="/profile" className="btn btn-secondary btn-sm" onClick={() => setIsMobileMenuOpen(false)}>
                  Profile
                </Link>
              </div>
            )}

            {currentRoom ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsShareModalOpen(true);
                  }}
                  style={{ width: '100%', background: 'linear-gradient(135deg, var(--primary) 0%, #b81d24 100%)' }}
                >
                  <Share2 size={18} />
                  <span>Share Watch Party Link</span>
                </button>
                <div className="room-code-badge" onClick={() => handleCopyCode(currentRoom.roomCode)} style={{ justifyContent: 'center', padding: '10px' }}>
                  <span>ROOM CODE: {currentRoom.roomCode} (Tap to Copy)</span>
                </div>
                {user?.id === currentRoom.hostId && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      if (onOpenCreateModal) onOpenCreateModal();
                    }}
                    style={{ width: '100%' }}
                  >
                    <Settings size={18} />
                    <span>Host Settings</span>
                  </button>
                )}
                <button className="btn btn-danger" onClick={handleLeaveRoom} style={{ width: '100%' }}>
                  <DoorOpen size={18} />
                  <span>Leave Room</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (onOpenCreateModal) onOpenCreateModal();
                    else navigate('/create');
                  }}
                  style={{ width: '100%' }}
                >
                  <Plus size={18} />
                  <span>Create Party</span>
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (onOpenJoinModal) onOpenJoinModal();
                    else navigate('/join');
                  }}
                  style={{ width: '100%' }}
                >
                  <DoorOpen size={18} />
                  <span>Join Code</span>
                </button>
                <Link to="/history" className="btn btn-secondary" onClick={() => setIsMobileMenuOpen(false)} style={{ width: '100%' }}>
                  <History size={18} />
                  <span>Watch History</span>
                </Link>
                <Link to="/friends" className="btn btn-secondary" onClick={() => setIsMobileMenuOpen(false)} style={{ width: '100%' }}>
                  <Users size={18} />
                  <span>Friends & Social</span>
                </Link>
                {user?.role === 'admin' && (
                  <Link to="/admin" className="btn btn-secondary" onClick={() => setIsMobileMenuOpen(false)} style={{ width: '100%' }}>
                    <Shield size={18} color="var(--primary-light)" />
                    <span>Admin Dashboard</span>
                  </Link>
                )}
              </div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px' }}>
              {user ? (
                <button className="btn btn-danger" onClick={() => { logout(); setIsMobileMenuOpen(false); }} style={{ flex: 1 }}>
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => { setIsAuthOpen(true); setIsMobileMenuOpen(false); }} style={{ flex: 1 }}>
                  <LogIn size={18} />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Responsive Header CSS Rules */}
      <style>{`
        @media (max-width: 991px) {
          .desktop-nav { display: none !important; }
          .mobile-hamburger-btn { display: flex !important; }
          .mobile-header-actions { display: flex !important; }
        }
        @media (min-width: 992px) {
          .desktop-nav { display: flex !important; }
          .mobile-hamburger-btn { display: none !important; }
          .mobile-header-actions { display: none !important; }
        }
      `}</style>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <SocialDashboardModal isOpen={isSocialOpen} onClose={() => setIsSocialOpen(false)} />
      {currentRoom && (
        <ShareRoomModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          roomCode={currentRoom.roomCode}
          roomName={currentRoom.name}
          currentVideoTitle={currentRoom.currentVideo?.title}
        />
      )}
    </>
  );
};


