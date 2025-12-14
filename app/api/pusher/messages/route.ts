import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

const MESSAGE_TTL = 3600; // 1 hour in seconds

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');
    const global = searchParams.get('global');
    
    const redisInstance = getRedis();
    
    if (!redisInstance) {
      // Return empty array if Redis not configured
      return NextResponse.json({ messages: [] });
    }
    
    // Determine which key to use
    let redisKey: string;
    if (global === 'true') {
      redisKey = 'chat:global';
    } else if (channelId) {
      redisKey = `chat:${channelId}`;
    } else {
      return NextResponse.json({ error: 'Missing channelId or global parameter' }, { status: 400 });
    }
    
    // Get messages from last hour only (using sorted set range by score)
    const oneHourAgo = Date.now() - (MESSAGE_TTL * 1000);
    
    // Get messages with timestamp > oneHourAgo, ordered by timestamp ascending
    const messages = await redisInstance.zrangebyscore(redisKey, oneHourAgo, '+inf');
    
    // Parse messages
    const parsedMessages = messages
      .map((msg: string | object) => {
        if (typeof msg === 'string') {
          try {
            return JSON.parse(msg);
          } catch {
            return null;
          }
        }
        return msg; // Already parsed by Upstash
      })
      .filter(Boolean);
    
    return NextResponse.json({ messages: parsedMessages });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Failed to get messages' }, { status: 500 });
  }
}

