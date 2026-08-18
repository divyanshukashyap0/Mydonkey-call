import React, { useState } from 'react';
import { Tv, Sparkles, Video, UploadCloud, Users, Zap } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { CreateRoomModal } from '../components/room/CreateRoomModal';
import { JoinRoomModal } from '../components/room/JoinRoomModal';
import { motion } from 'framer-motion';
import { pageEntrance, staggerContainer, staggerItem, hoverScale } from '../animations';

interface LandingPageProps {
  onEnterRoom?: (code: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterRoom }) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar onOpenCreateModal={() => setIsCreateOpen(true)} onOpenJoinModal={() => setIsJoinOpen(true)} />

      {/* Hero Section */}
      <motion.main
        variants={pageEntrance}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(24px, 6vw, 60px) 16px', textAlign: 'center', position: 'relative' }}
      >
        {/* Glow Effects */}
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(90vw, 500px)', height: 'min(90vw, 500px)', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, rgba(6,182,212,0.1) 50%, rgba(0,0,0,0) 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

        <motion.div className="glass-panel" style={{ padding: '6px 14px', borderRadius: '99px', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px', border: '1px solid rgba(99,102,241,0.3)', maxWidth: '90vw' }}>
          <Sparkles size={16} color="var(--accent)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Real-Time Cinema & Live Video Mesh Platform
          </span>
        </motion.div>

        <h1 style={{ fontSize: 'clamp(1.8rem, 6vw, 3.5rem)', fontWeight: 800, lineHeight: 1.15, maxWidth: '850px', letterSpacing: '-0.03em', marginBottom: '16px' }}>
          Watch Movies Together In Perfect <span className="gradient-text">Real-Time Sync</span>
        </h1>

        <p style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.2rem)', color: 'var(--text-muted)', maxWidth: '640px', lineHeight: 1.6, marginBottom: '32px' }}>
          Host virtual cinema parties with YouTube or large local movie uploads while enjoying HD video calls and crystal-clear audio chat with your friends.
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '60px' }}>
          <motion.button whileHover={{ scale: hoverScale.button }} whileTap={{ scale: hoverScale.tap }} className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '1.1rem', borderRadius: 'var(--radius-lg)' }} onClick={() => setIsCreateOpen(true)}>
            <Tv size={20} />
            <span>Create Private Room</span>
          </motion.button>

          <motion.button whileHover={{ scale: hoverScale.button }} whileTap={{ scale: hoverScale.tap }} className="btn btn-secondary" style={{ padding: '16px 32px', fontSize: '1.1rem', borderRadius: 'var(--radius-lg)' }} onClick={() => setIsJoinOpen(true)}>
            <Users size={20} />
            <span>Enter Room Code</span>
          </motion.button>
        </div>

        {/* Feature Grid */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '1100px', width: '100%', margin: '0 auto' }}
        >
          <motion.div variants={staggerItem} whileHover={{ y: -4 }} className="glass-panel" style={{ padding: '28px', textAlign: 'left' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '16px' }}>
              <Zap size={22} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Sub-100ms Sync Engine</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Latency-compensated state calculation with 3-tier micro-rate drift correction keeps everyone on the exact same frame.
            </p>
          </motion.div>

          <motion.div variants={staggerItem} whileHover={{ y: -4 }} className="glass-panel" style={{ padding: '28px', textAlign: 'left' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', marginBottom: '16px' }}>
              <Video size={22} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Live WebRTC Video Grid</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Talk face-to-face with low latency audio & video calling seamlessly overlaid alongside the main cinema screen.
            </p>
          </motion.div>

          <motion.div variants={staggerItem} whileHover={{ y: -4 }} className="glass-panel" style={{ padding: '28px', textAlign: 'left' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', marginBottom: '16px' }}>
              <UploadCloud size={22} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Progressive Large File Upload</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Upload multi-gigabyte video files in background chunks. Progressive HLS processing allows playback before full completion.
            </p>
          </motion.div>
        </motion.div>
      </motion.main>

      {/* Modals */}
      <CreateRoomModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSuccess={(code) => onEnterRoom && onEnterRoom(code)} />
      <JoinRoomModal isOpen={isJoinOpen} onClose={() => setIsJoinOpen(false)} onSuccess={(code) => onEnterRoom && onEnterRoom(code)} />
    </div>
  );
};
