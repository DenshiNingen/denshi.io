import { NextRequest, NextResponse } from 'next/server';
import Pusher from 'pusher';

// Initialize Pusher server lazily to avoid build-time errors
let pusher: Pusher | null = null;

function getPusher(): Pusher | null {
  if (pusher) return pusher;
  
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  
  if (!appId || !key || !secret || !cluster) {
    console.error('Missing Pusher environment variables:', { appId: !!appId, key: !!key, secret: !!secret, cluster: !!cluster });
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

// Fun explorer name generator
const adjectives = [
  'Cosmic', 'Stellar', 'Nebula', 'Quantum', 'Solar', 'Lunar', 'Astral', 
  'Orbital', 'Galactic', 'Void', 'Nova', 'Pulsar', 'Quasar', 'Binary',
  'Chromatic', 'Photon', 'Plasma', 'Ionic', 'Magnetic', 'Gravity'
];

const nouns = [
  'Voyager', 'Pioneer', 'Wanderer', 'Seeker', 'Drifter', 'Nomad', 
  'Pathfinder', 'Scout', 'Ranger', 'Observer', 'Explorer', 'Traveler',
  'Navigator', 'Stargazer', 'Dreamer', 'Pilgrim', 'Rover', 'Sentinel'
];

function generateExplorerName(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
}

// Parse user agent to get browser name
function getBrowserName(ua: string): string {
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Unknown';
}

// Get device type from user agent
function getDeviceType(ua: string): string {
  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
    if (/iPad|Tablet/i.test(ua)) return '📱 Tablet';
    return '📱 Mobile';
  }
  return '💻 Desktop';
}

// Country code to flag emoji
function countryToFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export async function POST(request: NextRequest) {
  try {
    const pusherInstance = getPusher();
    
    if (!pusherInstance) {
      return NextResponse.json({ error: 'Pusher not configured' }, { status: 503 });
    }
    
    const body = await request.text();
    const params = new URLSearchParams(body);
    
    const socketId = params.get('socket_id');
    const channelName = params.get('channel_name');
    
    if (!socketId || !channelName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }
    
    // Get visitor info from headers
    const userAgent = request.headers.get('user-agent') || '';
    const country = request.headers.get('x-vercel-ip-country') || 
                    request.headers.get('cf-ipcountry') || // Cloudflare
                    '';
    
    // Generate a random color tint for this visitor (white-ish with slight variation)
    const hue = Math.floor(Math.random() * 360);
    const saturation = Math.floor(Math.random() * 15); // Low saturation for white-ish
    const lightness = 85 + Math.floor(Math.random() * 10); // High lightness for white
    
    // For presence channels, we need to provide user info
    const presenceData = {
      user_id: `visitor_${socketId}_${Date.now()}`,
      user_info: {
        joinedAt: Date.now(),
        color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
        name: generateExplorerName(),
        browser: getBrowserName(userAgent),
        device: getDeviceType(userAgent),
        country: country,
        flag: countryToFlag(country),
      },
    };
    
    const authResponse = pusherInstance.authorizeChannel(socketId, channelName, presenceData);
    
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}

