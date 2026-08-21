import React, { useEffect, useRef, useState } from 'react';
import { Send, MessageSquare, AlertCircle } from 'lucide-react';
import { useRoomStore } from '../../store/useRoomStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getSocket } from '../../services/socket';

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export const ChatPanel: React.FC = () => {
  const { user } = useAuthStore();
  const { chatMessages } = useRoomStore();
  const [content, setContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || content.length > 500) return;

    const socket = getSocket();
    socket.emit('chat:send', { content: content.trim() });
    setContent('');
  };

  return (
    <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', fontWeight: 700, fontSize: '0.95rem' }}>
        <MessageSquare size={18} className="gradient-text" />
        <span>Room Messages</span>
      </div>

      {/* Scrollable Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
        {chatMessages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            No messages yet. Say hello! 👋
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isMe = msg.senderId === user?.id;

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 600, color: isMe ? 'var(--primary-light)' : 'var(--accent)' }}>
                    {msg.senderName}
                  </span>
                  <span style={{ color: 'var(--text-dim)' }}>{formatTime(msg.createdAt)}</span>
                </div>

                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: isMe ? 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)' : 'var(--bg-input)',
                    color: '#fff',
                    fontSize: '0.88rem',
                    border: '1px solid var(--border-color)',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Form Input */}
      <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="input"
            placeholder="Type a message..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            style={{
              flex: 1,
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
            }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!content.trim()}
            style={{ padding: '8px 12px', minWidth: 'auto', background: 'linear-gradient(135deg, var(--primary) 0%, #b81d24 100%)' }}
          >
            <Send size={15} />
          </button>
        </div>

        {/* Quick Emoji Bar */}
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between', marginTop: '2px' }}>
          {['❤️', '😂', '😲', '🔥', '👏'].map((emoji) => (
            <button
              key={emoji}
              type="button"
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '4px 0',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'transform 0.15s ease',
              }}
              onClick={() => {
                const socket = getSocket();
                socket.emit('chat:send', { content: emoji });
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.7rem', color: content.length > 450 ? 'var(--warning)' : 'var(--text-dim)' }}>
          {content.length}/500
        </div>
      </form>
    </div>
  );
};
