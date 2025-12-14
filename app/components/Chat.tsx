"use client";

import { useState, useRef, useEffect, CSSProperties } from 'react';
import { ChatMessage } from '../hooks/useVisitors';

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<boolean>;
  isConnected: boolean;
  visitorCount: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function Chat({ messages, onSendMessage, isConnected, visitorCount, isOpen, onClose }: ChatProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;
    
    setIsSending(true);
    const success = await onSendMessage(inputValue);
    setIsSending(false);
    
    if (success) {
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isConnected) return null;

  // Styles
  const styles: Record<string, CSSProperties> = {
    chatPanel: {
      position: 'fixed',
      bottom: '70px',
      right: '15px',
      width: '300px',
      height: '400px',
      background: 'rgba(10, 10, 20, 0.95)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      opacity: isOpen ? 1 : 0,
      transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
      pointerEvents: isOpen ? 'auto' : 'none',
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      overflow: 'hidden',
    },
    chatHeader: {
      padding: '12px 16px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    chatTitle: {
      fontFamily: 'Orbitron, monospace',
      fontSize: '12px',
      fontWeight: 600,
      color: 'white',
    },
    chatOnline: {
      fontFamily: 'Orbitron, monospace',
      fontSize: '10px',
      color: 'rgba(100, 255, 100, 0.8)',
    },
    closeButton: {
      background: 'transparent',
      border: 'none',
      color: 'rgba(255, 255, 255, 0.5)',
      fontSize: '16px',
      cursor: 'pointer',
      padding: '4px 8px',
      borderRadius: '4px',
      transition: 'all 0.2s ease',
    },
    chatMessages: {
      flex: 1,
      overflowY: 'auto',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    chatEmpty: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      fontFamily: 'Orbitron, monospace',
      fontSize: '11px',
      color: 'rgba(255, 255, 255, 0.4)',
      gap: '8px',
      textAlign: 'center',
    },
    chatInputContainer: {
      padding: '12px',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      gap: '8px',
    },
    chatInput: {
      flex: 1,
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '8px',
      padding: '8px 12px',
      fontFamily: 'Orbitron, monospace',
      fontSize: '11px',
      color: 'white',
      outline: 'none',
    },
    chatSend: {
      width: '36px',
      height: '36px',
      borderRadius: '8px',
      background: 'rgba(100, 150, 255, 0.3)',
      border: '1px solid rgba(100, 150, 255, 0.4)',
      color: 'white',
      fontSize: '16px',
      cursor: 'pointer',
      opacity: !inputValue.trim() || isSending ? 0.3 : 1,
    },
  };

  const getMessageStyle = (isOwn: boolean): CSSProperties => ({
    background: isOwn ? 'rgba(100, 150, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
    border: isOwn ? '1px solid rgba(100, 150, 255, 0.2)' : 'none',
    borderRadius: '8px',
    padding: '8px 10px',
    maxWidth: '85%',
    alignSelf: isOwn ? 'flex-end' : 'flex-start',
  });

  return (
    <div style={styles.chatPanel}>
      <div style={styles.chatHeader}>
        <span style={styles.chatTitle}>🌌 Space Chat</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={styles.chatOnline}>{visitorCount} online</span>
          <button style={styles.closeButton} onClick={onClose} aria-label="Close chat">✕</button>
        </div>
      </div>

        <div style={styles.chatMessages}>
          {messages.length === 0 ? (
            <div style={styles.chatEmpty}>
              <span>No messages yet.</span>
              <span>Say hi to other explorers! 👋</span>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} style={getMessageStyle(msg.isOwn)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ 
                    fontFamily: 'Orbitron, monospace', 
                    fontSize: '9px', 
                    color: msg.isOwn ? 'rgba(100, 150, 255, 0.8)' : 'rgba(255, 255, 255, 0.6)',
                    fontWeight: 600 
                  }}>
                    {msg.senderFlag} {msg.isOwn ? 'You' : msg.senderName}
                  </span>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '8px', color: 'rgba(255, 255, 255, 0.3)' }}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <div style={{ 
                  fontFamily: 'Orbitron, monospace', 
                  fontSize: '11px', 
                  color: 'rgba(255, 255, 255, 0.9)',
                  wordBreak: 'break-word',
                  lineHeight: 1.4 
                }}>
                  {msg.message}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={styles.chatInputContainer}>
          <input
            ref={inputRef}
            type="text"
            style={styles.chatInput}
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={200}
            disabled={isSending}
          />
          <button 
            style={styles.chatSend}
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
          >
            {isSending ? '...' : '→'}
          </button>
        </div>
    </div>
  );
}
