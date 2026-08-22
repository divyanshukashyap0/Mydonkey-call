import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DoorOpen, ArrowRight } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import { pageEntrance } from '../animations';

export const JoinPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const codeParam = searchParams.get('code') || searchParams.get('roomCode');
    if (codeParam && codeParam.trim().length === 6) {
      const clean = codeParam.trim().toUpperCase();
      setCode(clean);
      navigate(`/room/${clean}`);
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      setError('Room code must be 6 characters');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.getRoom(cleanCode);
      navigate(`/room/${cleanCode}`);
    } catch (err: any) {
      setError(err.message || 'Room not found. Please check code.');
      setLoading(false);
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
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }}
      >
        <div className="glass-panel" style={{ width: 'min(92vw, 440px)', padding: 'clamp(20px, 4vw, 36px)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', color: 'var(--accent)' }}>
              <DoorOpen size={24} />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Join Watch Party</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Enter the 6-character room code to join
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
                className="input mono"
                placeholder="e.g. K7X92P"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError('');
                }}
                style={{ textAlign: 'center', fontSize: '1.3rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px' }} disabled={loading}>
              <span>{loading ? 'Joining Room...' : 'Enter Watch Party'}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </motion.main>
    </div>
  );
};
