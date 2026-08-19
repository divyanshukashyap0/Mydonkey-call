import React, { useEffect, useState } from 'react';
import { Tv, Sparkles, Shield, Cpu, Radio, Film } from 'lucide-react';

interface EyeCatchingLoaderProps {
  title?: string;
  subtitle?: string;
  badgeText?: string;
  fullScreen?: boolean;
  progress?: number;
}

const LOADING_STEPS = [
  'Initializing Secure Encryption...',
  'Connecting to Low-Latency Relay...',
  'Synchronizing Authoritative Clock...',
  'Warming Up WebRTC Video Engine...',
  'Watch Party Ready!',
];

export const EyeCatchingLoader: React.FC<EyeCatchingLoaderProps> = ({
  title = 'MyDonkey Call',
  subtitle = 'Synchronized Watch Party & Live Video Calling',
  badgeText = 'ULTRA LOW LATENCY 2.0',
  fullScreen = true,
  progress,
}) => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % (LOADING_STEPS.length - 1));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 28px',
        maxWidth: '460px',
        width: '92vw',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Outer Floating Glow Particle Orbs */}
      <div
        style={{
          position: 'absolute',
          width: '240px',
          height: '240px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(236, 72, 153, 0.15) 50%, transparent 70%)',
          filter: 'blur(40px)',
          top: '-40px',
          animation: 'pulseGlow 4s ease-in-out infinite alternate',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, rgba(16, 185, 129, 0.1) 50%, transparent 70%)',
          filter: 'blur(35px)',
          bottom: '-30px',
          animation: 'pulseGlow 3s ease-in-out infinite alternate-reverse',
          pointerEvents: 'none',
        }}
      />

      {/* Cyber Badge Header */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '99px',
          background: 'rgba(99, 102, 241, 0.12)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          color: 'var(--primary-light)',
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          marginBottom: '28px',
          boxShadow: '0 0 15px rgba(99, 102, 241, 0.2)',
        }}
      >
        <Radio size={12} className="spin" color="var(--accent)" />
        <span>{badgeText}</span>
      </div>

      {/* Central Rotating Glowing Orbit & Logo Badge */}
      <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px' }}>
        {/* Outer Conic Rotating Gradient Ring */}
        <div
          style={{
            position: 'absolute',
            inset: '-10px',
            borderRadius: '50%',
            background: 'conic-gradient(from 0deg, #6366f1, #06b6d4, #ec4899, #10b981, #6366f1)',
            animation: 'spinConic 3s linear infinite',
            padding: '3px',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            opacity: 0.85,
          }}
        />

        {/* Inner Counter-Rotating Pulsing Ring */}
        <div
          style={{
            position: 'absolute',
            inset: '-2px',
            borderRadius: '50%',
            border: '2px dashed rgba(6, 182, 212, 0.5)',
            animation: 'spinConic 8s linear infinite reverse',
          }}
        />

        {/* Glass Center Icon Container */}
        <div
          style={{
            width: '84px',
            height: '84px',
            borderRadius: '26px',
            background: 'linear-gradient(135deg, rgba(26, 32, 53, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(99, 102, 241, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            position: 'relative',
            animation: 'floatLogo 3s ease-in-out infinite',
          }}
        >
          <Tv size={38} color="#818cf8" />
          <Sparkles
            size={18}
            color="#ec4899"
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              filter: 'drop-shadow(0 0 6px #ec4899)',
            }}
          />
        </div>
      </div>

      {/* Title & Subtitle */}
      <h2
        style={{
          fontSize: '1.45rem',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          marginBottom: '6px',
          textAlign: 'center',
        }}
        className="gradient-text"
      >
        {title}
      </h2>
      <p
        style={{
          color: 'var(--text-muted)',
          fontSize: '0.88rem',
          textAlign: 'center',
          marginBottom: '24px',
          lineHeight: 1.4,
        }}
      >
        {subtitle}
      </p>

      {/* 5-Bar Dynamic Equalizer Visualizer */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '5px', height: '24px', marginBottom: '20px' }}>
        {[0, 0.2, 0.4, 0.1, 0.3].map((delay, idx) => (
          <div
            key={idx}
            style={{
              width: '4px',
              height: '100%',
              borderRadius: '99px',
              background: idx % 2 === 0 ? 'linear-gradient(to top, var(--primary), var(--accent))' : 'linear-gradient(to top, #ec4899, var(--primary-light))',
              animation: `waveEqualizer 1s ease-in-out infinite alternate`,
              animationDelay: `${delay}s`,
              boxShadow: '0 0 8px rgba(99, 102, 241, 0.5)',
            }}
          />
        ))}
      </div>

      {/* Animated Cyber Shimmer Progress Bar */}
      <div style={{ width: '100%', height: '6px', borderRadius: '99px', background: 'var(--bg-input)', overflow: 'hidden', position: 'relative', marginBottom: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
        {typeof progress === 'number' ? (
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, Math.max(0, progress))}%`,
              background: 'linear-gradient(90deg, #6366f1 0%, #06b6d4 50%, #ec4899 100%)',
              borderRadius: '99px',
              transition: 'width 0.3s ease',
              boxShadow: '0 0 12px rgba(6, 182, 212, 0.6)',
            }}
          />
        ) : (
          <div
            style={{
              height: '100%',
              width: '45%',
              background: 'linear-gradient(90deg, transparent 0%, #6366f1 30%, #06b6d4 60%, transparent 100%)',
              borderRadius: '99px',
              position: 'absolute',
              animation: 'shimmerSweep 1.6s ease-in-out infinite',
              boxShadow: '0 0 12px rgba(99, 102, 241, 0.8)',
            }}
          />
        )}
      </div>

      {/* Dynamic Status Ticker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--success)',
            boxShadow: '0 0 8px var(--success)',
            animation: 'pulseGlow 1.5s infinite ease-in-out',
          }}
        />
        <span>{LOADING_STEPS[stepIndex]}</span>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 40%, #0d121f 0%, #05070c 100%)',
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          overflow: 'hidden',
        }}
      >
        {content}
      </div>
    );
  }

  return content;
};
