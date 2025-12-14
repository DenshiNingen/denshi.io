"use client";

import { useState, useEffect, useCallback } from 'react';
import Pusher, { PresenceChannel, Members } from 'pusher-js';

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

export function useVisitors() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const addVisitor = useCallback((member: PusherMember, isCurrentUser: boolean = false) => {
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

  useEffect(() => {
    // Only initialize if we have the required env vars
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    
    if (!pusherKey || !pusherCluster) {
      console.warn('Pusher environment variables not configured');
      return;
    }

    // Initialize Pusher
    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
      authEndpoint: '/api/pusher/auth',
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

    // Cleanup on unmount
    return () => {
      channel.unbind_all();
      pusher.unsubscribe('presence-visitors');
      pusher.disconnect();
    };
  }, [addVisitor, removeVisitor]);

  return {
    visitors,
    visitorCount: visitors.length,
    isConnected,
    currentUserId,
  };
}

