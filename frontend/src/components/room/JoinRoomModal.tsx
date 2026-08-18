import React, { useState } from 'react';
import { X, DoorOpen } from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (roomCode: string) => void;
  initialCode?: string;
}

import { AnimatedModal } from '../common/AnimatedModal';

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ isOpen, onClose, onSuccess, initialCode = '' }) => {
  const { user, loginAsGuest } = useAuthStore();
  const [code, setCode] = useState(initialCode);
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formattedCode = code.toUpperCase().trim();
    if (!formattedCode) {
      setError('Please enter a room code');
      setLoading(false);
      return;
    }

    try {
      if (!user) {
        if (!guestName.trim()) {
          throw new Error('Please enter a display name');
        }
        await loginAsGuest(guestName);
      }

      await api.joinRoom(formattedCode);
      onSuccess(formattedCode);
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} maxWidth="440px">
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', color: 'var(--accent)' }}>
          <DoorOpen size={24} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Join Watch Party</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
          Enter your 6-character room code to enter the room.
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
            Room Code
          </label>
          <input
            type="text"
            className="input input-code"
            placeholder="K7X92P"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
          />
        </div>

        {!user && (
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Your Display Name
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Jordan"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
            />
          </div>
        )}

        <button type="submit" className="btn btn-accent" style={{ width: '100%', marginTop: '8px', padding: '14px' }} disabled={loading}>
          {loading ? 'Joining Room...' : 'Enter Room'}
        </button>
      </form>
    </AnimatedModal>
  );
};
