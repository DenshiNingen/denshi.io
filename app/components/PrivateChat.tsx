"use client";

import { useState, useRef, useEffect, CSSProperties, useMemo } from 'react';
import { PrivateChatMessage } from '../hooks/useVisitors';

interface DisplayMessage extends PrivateChatMessage {
  isOwn: boolean;
}

interface PrivateChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  currentUserFlag: string;
  targetUser: {
    id: string;
    name: string;
    flag: string;
  };
  // Messages from useVisitors hook
  messages: PrivateChatMessage[];
  onLoadMessages: (channelId: string, messages: PrivateChatMessage[]) => void;
}

// Generate consistent channel ID for two users
function getChannelId(userId1: string, userId2: string) {
  const sorted = [userId1, userId2].sort();
  return `private-chat-${sorted[0]}-${sorted[1]}`.replace(/[^a-zA-Z0-9-_]/g, '_');
}

export default function PrivateChat({ 
  isOpen, 
  onClose, 
  currentUserId, 
  currentUserName,
  currentUserFlag,
  targetUser,
  messages,
  onLoadMessages,
}: PrivateChatProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadedRef = useRef(false);

  const channelId = useMemo(() => 
    getChannelId(currentUserId, targetUser.id), 
    [currentUserId, targetUser.id]
  );

  // Convert to display messages with isOwn flag
  const displayMessages: DisplayMessage[] = useMemo(() => 
    messages.map(msg => ({
      ...msg,
      isOwn: msg.senderId === currentUserId,
    })),
    [messages, currentUserId]
  );

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayMessages, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Load messages from server when chat opens
  useEffect(() => {
    if (!isOpen || !currentUserId || !targetUser.id) return;
    if (loadedRef.current) return; // Already loaded

    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/pusher/messages?channelId=${channelId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            onLoadMessages(channelId, data.messages);
          }
          loadedRef.current = true;
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };
    
    loadMessages();
  }, [isOpen, currentUserId, targetUser.id, channelId, onLoadMessages]);

  // Reset loaded flag when target user changes
  useEffect(() => {
    loadedRef.current = false;
  }, [targetUser.id]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;
    
    const messageText = inputValue.trim();
    setIsSending(true);
    setInputValue('');
    
    try {
      await fetch('/api/pusher/private-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          senderId: currentUserId,
          senderName: currentUserName,
          senderFlag: currentUserFlag,
          recipientId: targetUser.id,
          channelId,
        }),
      });
    } catch (error) {
      console.error('Failed to send private message:', error);
    }
    
    setIsSending(false);
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

  // Styles
  const styles: Record<string, CSSProperties> = {
    chatPanel: {
      position: 'fixed',
      bottom: '70px',
      left: '50%',
      transform: isOpen ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.9)',
      width: '320px',
      height: '420px',
      background: 'rgba(10, 10, 30, 0.98)',
      border: '1px solid rgba(150, 100, 255, 0.3)',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1100,
      opacity: isOpen ? 1 : 0,
      pointerEvents: isOpen ? 'auto' : 'none',
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      overflow: 'hidden',
      boxShadow: '0 0 30px rgba(150, 100, 255, 0.2)',
    },
    chatHeader: {
      padding: '12px 16px',
      borderBottom: '1px solid rgba(150, 100, 255, 0.2)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'rgba(150, 100, 255, 0.1)',
    },
    chatTitle: {
      fontFamily: 'Orbitron, monospace',
      fontSize: '11px',
      fontWeight: 600,
      color: 'rgba(200, 150, 255, 1)',
    },
    closeButton: {
      background: 'transparent',
      border: 'none',
      color: 'rgba(255, 255, 255, 0.5)',
      fontSize: '16px',
      cursor: 'pointer',
      padding: '4px 8px',
      borderRadius: '4px',
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
      borderTop: '1px solid rgba(150, 100, 255, 0.2)',
      display: 'flex',
      gap: '8px',
    },
    chatInput: {
      flex: 1,
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(150, 100, 255, 0.3)',
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
      background: 'rgba(150, 100, 255, 0.3)',
      border: '1px solid rgba(150, 100, 255, 0.4)',
      color: 'white',
      fontSize: '16px',
      cursor: 'pointer',
      opacity: !inputValue.trim() || isSending ? 0.3 : 1,
    },
  };

  const getMessageStyle = (isOwn: boolean): CSSProperties => ({
    background: isOwn ? 'rgba(150, 100, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
    border: isOwn ? '1px solid rgba(150, 100, 255, 0.3)' : 'none',
    borderRadius: '8px',
    padding: '8px 10px',
    maxWidth: '85%',
    alignSelf: isOwn ? 'flex-end' : 'flex-start',
  });

  return (
    <div style={styles.chatPanel}>
      <div style={styles.chatHeader}>
        <span style={styles.chatTitle}>
          🔮 {targetUser.flag} {targetUser.name}
        </span>
        <button style={styles.closeButton} onClick={onClose} aria-label="Close chat">✕</button>
      </div>

      <div style={styles.chatMessages}>
        {displayMessages.length === 0 ? (
          <div style={styles.chatEmpty}>
            <span>Private channel opened</span>
            <span>Say hi to {targetUser.name}! 👋</span>
          </div>
        ) : (
          displayMessages.map((msg) => (
            <div key={msg.id} style={getMessageStyle(msg.isOwn)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ 
                  fontFamily: 'Orbitron, monospace', 
                  fontSize: '9px', 
                  color: msg.isOwn ? 'rgba(150, 100, 255, 0.8)' : 'rgba(255, 255, 255, 0.6)',
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

