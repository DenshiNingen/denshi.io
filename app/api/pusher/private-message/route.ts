import { NextRequest, NextResponse } from 'next/server';
import Pusher from 'pusher';
import { Redis } from '@upstash/redis';

// Initialize Pusher server lazily
let pusher: Pusher | null = null;
let redis: Redis | null = null;

function getPusher(): Pusher | null {
  if (pusher) return pusher;
  
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  
  if (!appId || !key || !secret || !cluster) {
    return null;
  }
  
  pusher = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });
  
  return pusher;
}

function getRedis(): Redis | null {
  if (redis) return redis;
  
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    return null;
  }
  
  redis = new Redis({ url, token });
  return redis;
}

const MESSAGE_TTL = 3600; // 1 hour in seconds

export async function POST(request: NextRequest) {
  try {
    const pusherInstance = getPusher();
    
    if (!pusherInstance) {
      return NextResponse.json({ error: 'Pusher not configured' }, { status: 503 });
    }
    
    const body = await request.json();
    const { message, senderId, senderName, senderFlag, recipientId, channelId } = body;
    
    if (!message || !senderId || !senderName || !recipientId || !channelId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }
    
    // Limit message length
    const trimmedMessage = message.slice(0, 200);
    const timestamp = Date.now();
    const messageId = `pm_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    
    const messageData = {
      id: messageId,
      message: trimmedMessage,
      senderId,
      senderName,
      senderFlag: senderFlag || '🌍',
      recipientId,
      timestamp,
    };
    
    // Store message in Redis if available
    const redisInstance = getRedis();
    if (redisInstance) {
      try {
        // Store in a sorted set with timestamp as score (for automatic ordering and cleanup)
        const key = `chat:${channelId}`;
        await redisInstance.zadd(key, { score: timestamp, member: JSON.stringify(messageData) });
        
        // Remove messages older than 1 hour
        const oneHourAgo = Date.now() - (MESSAGE_TTL * 1000);
        await redisInstance.zremrangebyscore(key, 0, oneHourAgo);
        
        // Keep only last 100 messages (by removing oldest if more than 100)
        const count = await redisInstance.zcard(key);
        if (count > 100) {
          await redisInstance.zremrangebyrank(key, 0, count - 101);
        }
        
        // Set TTL on the key (1 hour) - ensures cleanup even if no new messages
        await redisInstance.expire(key, MESSAGE_TTL);
      } catch (e) {
        console.error('Redis error:', e);
      }
    }
    
    // Send message through the main presence channel (always connected)
    // Include full message data so recipient gets it even without private chat open
    await pusherInstance.trigger('presence-visitors', 'private-message', {
      ...messageData,
      channelId,
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Private message send error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

