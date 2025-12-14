"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Pusher, { PresenceChannel, Members } from 'pusher-js';

// Generate or retrieve a persistent device ID (persists across sessions)
function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  let deviceId = localStorage.getItem('visitor_device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('visitor_device_id', deviceId);
  }
  return deviceId;
}

export interface Visitor {
  id: string;
  color: string;
  joinedAt: number;
  isCurrentUser: boolean;
  name: string;
  browser: string;
  device: string;
  country: string;
  flag: string;
}

export interface ChatMessage {
  id: string;
  message: string;
  senderId: string;
  senderName: string;
  senderFlag: string;
  timestamp: number;
  isOwn: boolean;
}

export interface PrivateMessageNotification {
  senderId: string;
  senderName: string;
  senderFlag: string;
  channelId: string;
  timestamp: number;
}

export interface PrivateChatMessage {
  id: string;
  message: string;
  senderId: string;
  senderName: string;
  senderFlag: string;
  recipientId: string;
  channelId: string;
  timestamp: number;
}

interface VisitorInfo {
  joinedAt: number;
  color: string;
  name: string;
  browser: string;
  device: string;
  country: string;
  flag: string;
}

interface PusherMember {
  id: string;
  info: VisitorInfo;
}

const MAX_MESSAGES = 50; // Keep last 50 messages

export function useVisitors() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const currentUserInfoRef = useRef<VisitorInfo | null>(null);
  const [privateNotifications, setPrivateNotifications] = useState<Record<string, PrivateMessageNotification>>({});
  const [privateMessages, setPrivateMessages] = useState<Record<string, PrivateChatMessage[]>>({});

  const clearPrivateNotification = useCallback((senderId: string) => {
    setPrivateNotifications(prev => {
      const newNotifs = { ...prev };
      delete newNotifs[senderId];
      return newNotifs;
    });
  }, []);

  const addPrivateMessage = useCallback((message: PrivateChatMessage) => {
    setPrivateMessages(prev => {
      const channelMessages = prev[message.channelId] || [];
      // Avoid duplicates
      if (channelMessages.some(m => m.id === message.id)) {
        return prev;
      }
      return {
        ...prev,
        [message.channelId]: [...channelMessages, message].slice(-50),
      };
    });
  }, []);

  const getPrivateMessages = useCallback((channelId: string) => {
    return privateMessages[channelId] || [];
  }, [privateMessages]);

  const setPrivateMessagesForChannel = useCallback((channelId: string, messages: PrivateChatMessage[]) => {
    setPrivateMessages(prev => ({
      ...prev,
      [channelId]: messages,
    }));
  }, []);

  const addVisitor = useCallback((member: PusherMember, isCurrentUser: boolean = false) => {
    if (isCurrentUser) {
      currentUserInfoRef.current = member.info;
    }
    
    setVisitors(prev => {
      // Check if visitor already exists
      if (prev.some(v => v.id === member.id)) {
        return prev;
      }
      
      return [...prev, {
        id: member.id,
        color: member.info?.color || '#FFFFFF',
        joinedAt: member.info?.joinedAt || Date.now(),
        isCurrentUser,
        name: member.info?.name || 'Unknown Explorer',
        browser: member.info?.browser || 'Unknown',
        device: member.info?.device || '💻 Desktop',
        country: member.info?.country || '',
        flag: member.info?.flag || '🌍',
      }];
    });
  }, []);

  const removeVisitor = useCallback((memberId: string) => {
    setVisitors(prev => prev.filter(v => v.id !== memberId));
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!currentUserId || !currentUserInfoRef.current || !message.trim()) {
      return false;
    }
    
    try {
      const response = await fetch('/api/pusher/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          senderId: currentUserId,
          senderName: currentUserInfoRef.current.name,
          senderFlag: currentUserInfoRef.current.flag,
        }),
      });
      
      return response.ok;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }, [currentUserId]);

  // Load global messages from Redis on mount
  useEffect(() => {
    const loadGlobalMessages = async () => {
      try {
        const response = await fetch('/api/pusher/messages?global=true');
        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages.map((msg: ChatMessage) => ({
              ...msg,
              isOwn: msg.senderId === currentUserId,
            })));
          }
        }
      } catch (error) {
        console.error('Failed to load global messages:', error);
      }
    };
    
    if (currentUserId) {
      loadGlobalMessages();
    }
  }, [currentUserId]);

  useEffect(() => {
    // Only initialize if we have the required env vars
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    
    if (!pusherKey || !pusherCluster) {
      console.warn('Pusher environment variables not configured');
      return;
    }

    // Get persistent device ID
    const deviceId = getDeviceId();

    // Initialize Pusher with device ID in auth params
    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
      authEndpoint: '/api/pusher/auth',
      auth: {
        params: {
          device_id: deviceId,
        },
      },
    });

    // Subscribe to presence channel
    const channel = pusher.subscribe('presence-visitors') as PresenceChannel;

    channel.bind('pusher:subscription_succeeded', (members: Members) => {
      setIsConnected(true);
      
      // Get current user's ID
      const myId = members.myID;
      setCurrentUserId(myId);
      
      // Add all existing members
      members.each((member: PusherMember) => {
        addVisitor(member, member.id === myId);
      });
    });

    channel.bind('pusher:member_added', (member: PusherMember) => {
      addVisitor(member, false);
    });

    channel.bind('pusher:member_removed', (member: PusherMember) => {
      removeVisitor(member.id);
    });

    channel.bind('pusher:subscription_error', (error: Error) => {
      console.error('Pusher subscription error:', error);
      setIsConnected(false);
    });

    // Listen for chat messages
    channel.bind('chat-message', (data: Omit<ChatMessage, 'isOwn'>) => {
      setMessages(prev => {
        const newMessage: ChatMessage = {
          ...data,
          isOwn: data.senderId === currentUserId,
        };
        const updated = [...prev, newMessage];
        // Keep only last MAX_MESSAGES
        return updated.slice(-MAX_MESSAGES);
      });
    });

    // Listen for private messages
    channel.bind('private-message', (data: PrivateChatMessage) => {
      // Only process if we are sender or recipient
      if (data.recipientId === currentUserId || data.senderId === currentUserId) {
        addPrivateMessage(data);
        
        // Show notification if we are the recipient (not the sender)
        if (data.recipientId === currentUserId) {
          setPrivateNotifications(prev => ({
            ...prev,
            [data.senderId]: {
              senderId: data.senderId,
              senderName: data.senderName,
              senderFlag: data.senderFlag,
              channelId: data.channelId,
              timestamp: data.timestamp,
            },
          }));
        }
      }
    });

    // Cleanup on unmount
    return () => {
      channel.unbind_all();
      pusher.unsubscribe('presence-visitors');
      pusher.disconnect();
    };
  }, [addVisitor, removeVisitor, currentUserId, addPrivateMessage]);

  return {
    visitors,
    visitorCount: visitors.length,
    isConnected,
    currentUserId,
    messages,
    sendMessage,
    currentUserName: currentUserInfoRef.current?.name || null,
    currentUserFlag: currentUserInfoRef.current?.flag || null,
    privateNotifications,
    clearPrivateNotification,
    getPrivateMessages,
    addPrivateMessage,
    setPrivateMessagesForChannel,
  };
}

