import React, { useState } from 'react';
import { X, Sparkles, Shield, Users } from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { ControlMode } from '../../types';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (roomCode: string) => void;
}

import { AnimatedModal } from '../common/AnimatedModal';

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, loginAsGuest } = useAuthStore();
  const [roomName, setRoomName] = useState('');
  const [guestName, setGuestName] = useState('');
  const [controlMode, setControlMode] = useState<ControlMode>('HOST_ONLY');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!user) {
        if (!guestName.trim()) {
          throw new Error('Please enter a display name');
        }
        await loginAsGuest(guestName);
      }

      const res = await api.createRoom({
        name: roomName.trim() || undefined as any,
        controlMode,
      });

      onSuccess(res.room.roomCode);
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} maxWidth="480px">
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', color: 'var(--primary)' }}>
          <Sparkles size={24} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Create Watch Room</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
          Start a private watch party and invite your friends.
        </p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {!user && (
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Your Display Name
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Alex"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
            />
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
            Room Title
          </label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Friday Movie Night 🍿"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
            Who can control playback?
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              className={`btn ${controlMode === 'HOST_ONLY' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.85rem', padding: '10px', gap: '6px' }}
              onClick={() => setControlMode('HOST_ONLY')}
            >
              <Shield size={16} />
              <span>Host Only</span>
            </button>
            <button
              type="button"
              className={`btn ${controlMode === 'EVERYONE' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.85rem', padding: '10px', gap: '6px' }}
              onClick={() => setControlMode('EVERYONE')}
            >
              <Users size={16} />
              <span>Everyone</span>
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px', padding: '14px' }} disabled={loading}>
          {loading ? 'Creating Cinema...' : 'Create Room & Get Code'}
        </button>
      </form>
    </AnimatedModal>
  );
};
