import React, { useState } from 'react';
import { Share2, QrCode, MessageCircle, Send, Mail, ShieldCheck } from 'lucide-react';
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
}) => {
  const { showToast } = useToast();
  const [showQrCode, setShowQrCode] = useState(false);

  const normalizedCode = roomCode.toUpperCase().trim();
  const displayRoomName = roomName?.trim() || `Room ${normalizedCode}`;
  const shareUrl = `${window.location.origin}/room/${normalizedCode}`;
  const inviteText = `🎬 Join my Watch Party "${displayRoomName}" on MyDonkey Call! Click the link to join instantly: ${shareUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    showToast('Watch Party Link copied to clipboard!', 'success');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: displayRoomName,
          text: inviteText,
          url: shareUrl,
        });
        showToast('Shared successfully!', 'success');
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
        return;
      }
    }
    handleCopyLink();
  };

  const handleSocialShare = (platform: 'whatsapp' | 'telegram' | 'email') => {
    let url = '';
    const encodedText = encodeURIComponent(inviteText);
    const encodedUrl = encodeURIComponent(shareUrl);

    switch (platform) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodedText}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(`🎬 Join "${displayRoomName}" on MyDonkey Call!`)}`;
        break;
      case 'email':
        url = `mailto:?subject=${encodeURIComponent(`Watch Party Invitation: ${displayRoomName}`)}&body=${encodedText}`;
        break;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
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
          Share the link below to invite friends to <strong style={{ color: '#fff' }}>{displayRoomName}</strong> (Code: <span style={{ color: 'var(--accent)' }}>{normalizedCode}</span>)
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
          <span>Share</span>
        </button>

        {/* Social Sharing Quick Buttons */}
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Share directly to
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <button
              onClick={() => handleSocialShare('whatsapp')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: 'rgba(37, 211, 102, 0.15)', border: '1px solid rgba(37, 211, 102, 0.3)', color: '#4ade80', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
            >
              <MessageCircle size={16} />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={() => handleSocialShare('telegram')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: 'rgba(0, 136, 204, 0.15)', border: '1px solid rgba(0, 136, 204, 0.3)', color: '#38bdf8', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
            >
              <Send size={16} />
              <span>Telegram</span>
            </button>

            <button
              onClick={() => handleSocialShare('email')}
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
