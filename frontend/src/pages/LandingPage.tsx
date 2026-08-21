import React, { useState } from 'react';
import {
  Tv,
  Sparkles,
  Video,
  UploadCloud,
  Users,
  Zap,
  ShieldCheck,
  Play,
  Lock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Globe,
  CheckCircle2,
  Sliders,
  Radio,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { CreateRoomModal } from '../components/room/CreateRoomModal';
import { JoinRoomModal } from '../components/room/JoinRoomModal';
import { motion, AnimatePresence } from 'framer-motion';
import { pageEntrance, staggerContainer, staggerItem, hoverScale } from '../animations';

interface LandingPageProps {
  onEnterRoom?: (code: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterRoom }) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: 'Do my friends need an account to join a watch party?',
      a: 'No! MyDonkey Call supports instant Guest access. You can simply share your 6-digit room code, and your friends can join immediately without creating an account.',
    },
    {
      q: 'What video formats and platforms are supported?',
      a: 'You can host watch parties using any YouTube video URL or upload your own local movie files (MP4, MKV, WebM, MOV, AVI). Large files are processed progressively so playback begins right away.',
    },
    {
      q: 'How does the real-time video synchronization work?',
      a: 'Our proprietary Sub-100ms Sync Engine uses server-authoritative playback state combined with 3-tier micro-drift rate correction to ensure all participants stay on the exact same frame globally.',
    },
    {
      q: 'Is video calling and room access private & secure?',
      a: 'Yes! All rooms are private with optional Host-Only control locks. WebRTC video and audio streams are encrypted end-to-end between room participants.',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-dark)' }}>
      <Navbar onOpenCreateModal={() => setIsCreateOpen(true)} onOpenJoinModal={() => setIsJoinOpen(true)} />

      {/* Hero Section */}
      <motion.main
        variants={pageEntrance}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'clamp(32px, 6vw, 72px) 20px', textAlign: 'center', position: 'relative' }}
      >
        {/* Ambient Glow Effects */}
        <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(90vw, 650px)', height: 'min(90vw, 650px)', background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, rgba(6,182,212,0.12) 50%, rgba(0,0,0,0) 70%)', filter: 'blur(70px)', pointerEvents: 'none' }} />

        {/* Live Status Pill */}
        <motion.div className="glass-panel" style={{ padding: '6px 16px', borderRadius: '99px', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px', border: '1px solid rgba(99,102,241,0.35)', boxShadow: '0 4px 20px rgba(99,102,241,0.15)', maxWidth: '90vw' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
          <Sparkles size={15} color="var(--accent)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.02em', color: '#fff' }}>
            OFFICIAL PLATFORM • REAL-TIME WEBRTC & SYNCHRONIZED CINEMA
          </span>
        </motion.div>

        <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3.8rem)', fontWeight: 900, lineHeight: 1.15, maxWidth: '920px', letterSpacing: '-0.03em', marginBottom: '20px' }}>
          The Next-Gen Cinema & <span className="gradient-text">High-Definition Video Calling</span> Platform
        </h1>

        <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.22rem)', color: 'var(--text-muted)', maxWidth: '720px', lineHeight: 1.6, marginBottom: '36px' }}>
          Experience synchronized 4K YouTube streaming and multi-gigabyte movie uploads alongside HD mesh video calls, crystal-clear audio, and real-time chat.
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '56px' }}>
          <motion.button
            whileHover={{ scale: hoverScale.button }}
            whileTap={{ scale: hoverScale.tap }}
            className="btn btn-primary"
            style={{ padding: '16px 36px', fontSize: '1.08rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 25px rgba(99, 102, 241, 0.4)' }}
            onClick={() => setIsCreateOpen(true)}
          >
            <Tv size={22} />
            <span>Create Watch Party</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: hoverScale.button }}
            whileTap={{ scale: hoverScale.tap }}
            className="btn btn-secondary"
            style={{ padding: '16px 36px', fontSize: '1.08rem', borderRadius: 'var(--radius-lg)' }}
            onClick={() => setIsJoinOpen(true)}
          >
            <Users size={22} />
            <span>Enter Room Code</span>
          </motion.button>
        </div>

        {/* Live Platform Stats Bar */}
        <div className="glass-panel" style={{ width: '100%', maxWidth: '1000px', padding: '20px 24px', borderRadius: 'var(--radius-lg)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '72px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary-light)' }}>&lt; 100ms</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sync Latency</div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#10b981' }}>100% Free</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>No Limits</div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--accent)' }}>4K / HLS</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progressive Media</div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f59e0b' }}>Encrypted</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>WebRTC Mesh</div>
          </div>
        </div>

        {/* How It Works Section */}
        <div style={{ width: '100%', maxWidth: '1100px', marginBottom: '72px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>How MyDonkey Call Works</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Three simple steps to start hosting synchronized movie nights</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '32px 24px', textAlign: 'left', position: 'relative' }}>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: 'rgba(99, 102, 241, 0.2)', position: 'absolute', top: '16px', right: '20px' }}>01</div>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '20px' }}>
                <Tv size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>1. Create a Private Room</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Launch your private cinema with custom host permissions, room locks, and an instant 6-digit room code.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '32px 24px', textAlign: 'left', position: 'relative' }}>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: 'rgba(6, 182, 212, 0.2)', position: 'absolute', top: '16px', right: '20px' }}>02</div>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', marginBottom: '20px' }}>
                <UploadCloud size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>2. Load YouTube or Upload Media</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Paste YouTube video links or drag & drop multi-gigabyte local video files. Progressive HLS starts playback instantly.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '32px 24px', textAlign: 'left', position: 'relative' }}>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: 'rgba(16, 185, 129, 0.2)', position: 'absolute', top: '16px', right: '20px' }}>03</div>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', marginBottom: '20px' }}>
                <Video size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>3. Watch & Video Call Live</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Enjoy real-time synchronized video playback alongside active webcam grid overlays, crystal-clear audio, and live chat.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Grid Section */}
        <div style={{ width: '100%', maxWidth: '1100px', marginBottom: '72px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>Platform Features</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Built for seamless group entertainment and real-time social interaction</p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}
          >
            <motion.div variants={staggerItem} whileHover={{ y: -4 }} className="glass-panel" style={{ padding: '28px', textAlign: 'left' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '16px' }}>
                <Zap size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>Sub-100ms Sync Engine</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Latency-compensated state calculation with 3-tier micro-rate drift correction keeps everyone on the exact same frame.
              </p>
            </motion.div>

            <motion.div variants={staggerItem} whileHover={{ y: -4 }} className="glass-panel" style={{ padding: '28px', textAlign: 'left' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', marginBottom: '16px' }}>
                <Video size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>Live WebRTC Video Mesh</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Talk face-to-face with low latency audio & video calling seamlessly overlaid alongside the main cinema screen.
              </p>
            </motion.div>

            <motion.div variants={staggerItem} whileHover={{ y: -4 }} className="glass-panel" style={{ padding: '28px', textAlign: 'left' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', marginBottom: '16px' }}>
                <UploadCloud size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>Resumable Large File Uploads</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Upload multi-gigabyte video files in background chunks. Progressive HLS processing allows playback before full completion.
              </p>
            </motion.div>

            <motion.div variants={staggerItem} whileHover={{ y: -4 }} className="glass-panel" style={{ padding: '28px', textAlign: 'left' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', marginBottom: '16px' }}>
                <Sliders size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>Host Control Modes</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Toggle between Host-Only controls and Everyone Control mode. Lock rooms to prevent unauthorized participants.
              </p>
            </motion.div>

            <motion.div variants={staggerItem} whileHover={{ y: -4 }} className="glass-panel" style={{ padding: '28px', textAlign: 'left' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ec4899', marginBottom: '16px' }}>
                <MessageSquare size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>Live Room Chat</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Send real-time messages with automatic links and participant badges without interrupting movie playback.
              </p>
            </motion.div>

            <motion.div variants={staggerItem} whileHover={{ y: -4 }} className="glass-panel" style={{ padding: '28px', textAlign: 'left' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', marginBottom: '16px' }}>
                <ShieldCheck size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>Cloud Security & Roles</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Firebase Cloud Firestore authentication
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* FAQ Section */}
        <div style={{ width: '100%', maxWidth: '850px', marginBottom: '64px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>Frequently Asked Questions</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Everything you need to know about MyDonkey Call</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className="glass-panel" style={{ padding: '18px 24px', textAlign: 'left', cursor: 'pointer' }} onClick={() => setOpenFaq(isOpen ? null : index)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '0.98rem' }}>
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={18} color="var(--primary-light)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                  </div>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5, marginTop: '12px' }}
                      >
                        {faq.a}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Official Footer */}
        <footer style={{ width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '40px', paddingBottom: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px', padding: '0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>
              <Tv size={20} color="var(--primary-light)" />
              <span>MyDonkey Call</span>
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <a href="/history" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>History</a>
              <a href="/friends" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Friends</a>
              <a href="/profile" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Profile</a>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 600 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              <span>All Systems Operational</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            © {new Date().getFullYear()} MyDonkey Call Platform. All rights reserved.
          </div>
        </footer>
      </motion.main>

      {/* Modals */}
      <CreateRoomModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSuccess={(code) => onEnterRoom && onEnterRoom(code)} />
      <JoinRoomModal isOpen={isJoinOpen} onClose={() => setIsJoinOpen(false)} onSuccess={(code) => onEnterRoom && onEnterRoom(code)} />
    </div>
  );
};
