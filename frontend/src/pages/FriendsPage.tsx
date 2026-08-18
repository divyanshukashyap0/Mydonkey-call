import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Check, X as RejectIcon } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { useSocialStore } from '../store/useSocialStore';
import { motion } from 'framer-motion';
import { pageEntrance, staggerContainer, staggerItem } from '../animations';

export const FriendsPage: React.FC = () => {
  const { friends, pendingRequests, fetchSocialData, sendFriendRequest, respondFriendRequest } = useSocialStore();
  const [friendEmail, setFriendEmail] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchSocialData();
  }, []);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendEmail.trim()) return;
    setStatusMsg('');
    setErrorMsg('');

    try {
      const msg = await sendFriendRequest(friendEmail);
      setStatusMsg(msg);
      setFriendEmail('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send friend request');
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
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
              <Users size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Friends & Social</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Connect with friends and invite them to watch parties</p>
            </div>
          </div>

          {/* Send Friend Request Form */}
          <form onSubmit={handleSendRequest} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}>
            <input
              type="email"
              className="input"
              placeholder="Friend's email address..."
              value={friendEmail}
              onChange={(e) => setFriendEmail(e.target.value)}
              style={{ flex: 1, minWidth: '200px' }}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0 20px' }}>
              <UserPlus size={18} />
              <span>Add Friend</span>
            </button>
          </form>

          {statusMsg && <div style={{ fontSize: '0.85rem', color: 'var(--success)', marginBottom: '16px' }}>{statusMsg}</div>}
          {errorMsg && <div style={{ fontSize: '0.85rem', color: '#fca5a5', marginBottom: '16px' }}>{errorMsg}</div>}

          {/* Pending Invites */}
          {pendingRequests.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '12px' }}>Pending Requests</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingRequests.map((req, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{req.senderDisplayName}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
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
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px' }}>Connected Friends ({friends.length})</h3>
            {friends.length === 0 ? (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>
                No friends added yet. Send a request above to get started!
              </p>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                {friends.map((f, idx) => (
                  <motion.div key={idx} variants={staggerItem} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                        {f.friendDisplayName[0].toUpperCase()}
                      </div>
                      <div>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600, display: 'block' }}>{f.friendDisplayName}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{f.friendEmail || 'Friend'}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </motion.main>
    </div>
  );
};
