import React, { useEffect, useState } from 'react';
import { X, User, History, Users, UserPlus, Check, X as RejectIcon, Play, Sparkles, Send, Copy } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useSocialStore } from '../../store/useSocialStore';
import { useRoomStore } from '../../store/useRoomStore';

interface SocialDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

import { AnimatedModal } from '../common/AnimatedModal';

export const SocialDashboardModal: React.FC<SocialDashboardModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { currentRoom } = useRoomStore();
  const { watchHistory, friends, pendingRequests, fetchSocialData, sendFriendRequest, respondFriendRequest } = useSocialStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'friends'>('profile');
  const [friendEmail, setFriendEmail] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchSocialData();
    }
  }, [isOpen]);

  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendEmail.trim()) return;
    setStatusMsg('');
    setErrorMsg('');

    try {
      const msg = await sendFriendRequest(friendEmail);
      setStatusMsg(msg);
      setFriendEmail('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send request');
    }
  };

  const handleHostAgain = (youtubeUrl?: string) => {
    if (youtubeUrl) {
      onClose();
      // Redirect to landing page to create a new party
      window.location.href = `/?ytUrl=${encodeURIComponent(youtubeUrl)}`;
    }
  };

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} maxWidth="640px">
      <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <User size={24} />
            </div>
          )}
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{user?.displayName || 'User Profile'}</h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user?.email || (user?.isGuest ? 'Guest Account' : 'Authenticated User')}</span>
          </div>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
          <button className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('profile')}>
            <User size={16} />
            <span>Profile</span>
          </button>
          <button className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('history')}>
            <History size={16} />
            <span>Watch History ({watchHistory.length})</span>
          </button>
          <button className={`btn ${activeTab === 'friends' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('friends')}>
            <Users size={16} />
            <span>Friends ({friends.length})</span>
            {pendingRequests.length > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '99px', fontWeight: 700 }}>
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-light)' }}>{watchHistory.length}</span>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Watch Parties Attended</span>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)' }}>{friends.length}</span>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Connected Friends</span>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} color="var(--accent)" /> Account Details
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  User ID: <code className="mono" style={{ color: 'var(--text-main)' }}>{user?.id}</code>
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Account Type: <strong style={{ color: user?.isGuest ? 'var(--warning)' : 'var(--success)' }}>{user?.isGuest ? 'Guest Session' : 'Firebase Verified Profile'}</strong>
                </p>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {watchHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <History size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                  <p>No watch history yet. Join or create a watch party room to start recording history!</p>
                </div>
              ) : (
                watchHistory.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt={item.videoTitle} style={{ width: '64px', height: '36px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                      ) : (
                        <div style={{ width: '64px', height: '36px', background: 'rgba(99,102,241,0.2)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                          <Play size={16} />
                        </div>
                      )}
                      <div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.videoTitle}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
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
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'friends' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Send Friend Request Form */}
              <form onSubmit={handleSendFriendRequest} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  className="input"
                  placeholder="Friend's email address..."
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
                  <UserPlus size={16} />
                  <span>Add Friend</span>
                </button>
              </form>

              {statusMsg && <div style={{ fontSize: '0.85rem', color: 'var(--success)' }}>{statusMsg}</div>}
              {errorMsg && <div style={{ fontSize: '0.85rem', color: '#fca5a5' }}>{errorMsg}</div>}

              {/* Pending Friend Requests */}
              {pendingRequests.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '10px' }}>Pending Invites</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {pendingRequests.map((req, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{req.senderDisplayName}</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => respondFriendRequest(req.senderUid, 'accept')}>
                            <Check size={14} />
                            <span>Accept</span>
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => respondFriendRequest(req.senderUid, 'decline')}>
                            <RejectIcon size={14} />
                            <span>Decline</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Friends List */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px' }}>Your Friends</h4>
                {friends.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                    No friends added yet. Send a friend request by email above to invite friends!
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {friends.map((f, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                            {f.friendDisplayName[0].toUpperCase()}
                          </div>
                          <div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, display: 'block' }}>{f.friendDisplayName}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.friendEmail || 'Friend'}</span>
                          </div>
                        </div>

                        {currentRoom && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              navigator.clipboard.writeText(`https://mydonkey-call.local/room/${currentRoom.roomCode}`);
                              alert(`Room Code copied! Share ${currentRoom.roomCode} with ${f.friendDisplayName}`);
                            }}
                          >
                            <Copy size={14} />
                            <span>Invite to Room</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AnimatedModal>
  );
};
