import React, { useState } from 'react';
import { Share2, Copy, Check, QrCode, MessageCircle, Send, Mail, Sparkles, ShieldCheck, Link2 } from 'lucide-react';
import { AnimatedModal } from '../common/AnimatedModal';
import { useToast } from '../common/ToastNotification';

interface ShareRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  roomName?: string;
  currentVideoTitle?: string;
}

export const ShareRoomModal: React.FC<ShareRoomModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  roomName,
  currentVideoTitle,
}) => {
  const { showToast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  const normalizedCode = roomCode.toUpperCase().trim();
  const shareUrl = `${window.location.origin}/room/${normalizedCode}`;
  const inviteText = `🎬 Join my Watch Party on MyDonkey Call${currentVideoTitle ? ` to watch "${currentVideoTitle}"` : ''}! Click the link to join instantly: ${shareUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    showToast('Watch Party Link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(normalizedCode);
    setCopiedCode(true);
    showToast(`Room code ${normalizedCode} copied!`, 'success');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: roomName || 'MyDonkey Call Watch Party',
          text: inviteText,
          url: shareUrl,
        });
        showToast('Shared successfully!', 'success');
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(inviteText)}`;
    window.open(url, '_blank');
  };

  const handleShareTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(inviteText)}`;
    window.open(url, '_blank');
  };

  const handleShareEmail = () => {
    const url = `mailto:?subject=${encodeURIComponent('Join my Watch Party on MyDonkey Call')}&body=${encodeURIComponent(inviteText)}`;
    window.location.href = url;
  };

  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}&color=06b6d4&bcolor=0f172a`;

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} maxWidth="500px">
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '18px', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)', border: '1px solid rgba(6, 182, 212, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', color: 'var(--accent)' }}>
          <Share2 size={26} />
        </div>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>Invite Friends to Watch Party</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
          Share the link below so anyone can connect instantly to room <strong style={{ color: '#fff' }}>{normalizedCode}</strong>
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* 1-Click Native Share Button */}
        <button
          className="btn btn-primary"
          onClick={handleNativeShare}
          style={{ width: '100%', padding: '12px', fontSize: '0.95rem', background: 'linear-gradient(135deg, var(--primary) 0%, #b81d24 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
        >
          <Share2 size={20} />
          <span>Quick Share Link (WhatsApp, Apps & Clipboard)</span>
        </button>

        {/* Shareable Link Input Box */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
            Direct Shareable URL
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="input mono"
                style={{ fontSize: '0.82rem', paddingRight: '36px', background: 'rgba(0,0,0,0.4)', color: 'var(--accent)' }}
                onClick={handleCopyLink}
              />
              <Link2 size={16} color="var(--text-muted)" style={{ position: 'absolute', right: '12px' }} />
            </div>
            <button className="btn btn-secondary" onClick={handleCopyLink} style={{ whiteSpace: 'nowrap', gap: '6px' }}>
              {copiedLink ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
              <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* Room Code Quick Box */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-input)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Room Code</span>
            <span className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>{normalizedCode}</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleCopyCode} style={{ gap: '6px' }}>
            {copiedCode ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
            <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
          </button>
        </div>

        {/* Social Sharing Quick Buttons */}
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Share directly to
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <button
              onClick={handleShareWhatsApp}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: 'rgba(37, 211, 102, 0.15)', border: '1px solid rgba(37, 211, 102, 0.3)', color: '#4ade80', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
            >
              <MessageCircle size={16} />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleShareTelegram}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: 'rgba(0, 136, 204, 0.15)', border: '1px solid rgba(0, 136, 204, 0.3)', color: '#38bdf8', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
            >
              <Send size={16} />
              <span>Telegram</span>
            </button>

            <button
              onClick={handleShareEmail}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#c084fc', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
            >
              <Mail size={16} />
              <span>Email</span>
            </button>
          </div>
        </div>

        {/* QR Code Section Toggle */}
        <div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowQrCode(!showQrCode)}
            style={{ width: '100%', gap: '6px' }}
          >
            <QrCode size={16} />
            <span>{showQrCode ? 'Hide QR Code' : 'Scan Phone QR Code'}</span>
          </button>

          {showQrCode && (
            <div style={{ marginTop: '12px', textAlign: 'center', background: '#fff', padding: '16px', borderRadius: 'var(--radius-md)', width: 'fit-content', margin: '12px auto 0 auto' }}>
              <img src={qrApiUrl} alt="Room QR Code" style={{ width: '160px', height: '160px', display: 'block' }} />
              <span style={{ color: '#0f172a', fontSize: '0.72rem', fontWeight: 700, display: 'block', marginTop: '6px' }}>Scan with Phone Camera to Join</span>
            </div>
          )}
        </div>

        {/* Security Note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <ShieldCheck size={16} color="var(--success)" style={{ flexShrink: 0 }} />
          <span>Friends clicking this link connect directly without needing manual code typing or extra setup.</span>
        </div>
      </div>
    </AnimatedModal>
  );
};
