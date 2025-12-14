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

function generateExplorerName(visitorId: string): string {
  // Generate deterministic name based on visitor ID
  const hash = visitorId.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);
  const adj = adjectives[hash % adjectives.length];
  const noun = nouns[(hash * 7) % nouns.length];
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

const VISITOR_COOKIE_NAME = 'visitor_id';

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
    
    // Get visitor ID from httpOnly cookie (secure, can't be tampered with by client JS)
    let visitorId = request.cookies.get(VISITOR_COOKIE_NAME)?.value;
    let isNewVisitor = false;
    
    // If no cookie, generate a new server-side ID
    if (!visitorId) {
      visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${socketId.substr(0, 8)}`;
      isNewVisitor = true;
    }
    
    // Get visitor info from headers
    const userAgent = request.headers.get('user-agent') || '';
    
    // Geolocation from Vercel headers
    const country = request.headers.get('x-vercel-ip-country') || 
                    request.headers.get('cf-ipcountry') || // Cloudflare fallback
                    '';
    const region = request.headers.get('x-vercel-ip-country-region') || '';
    const city = request.headers.get('x-vercel-ip-city') || '';
    const latitude = request.headers.get('x-vercel-ip-latitude') || '';
    const longitude = request.headers.get('x-vercel-ip-longitude') || '';
    const timezone = request.headers.get('x-vercel-ip-timezone') || '';
    
    // Generate a deterministic color based on visitor ID (so it stays the same)
    const hash = visitorId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    const saturation = 5 + (hash % 10); // Low saturation for white-ish
    const lightness = 85 + (hash % 10); // High lightness for white
    
    // For presence channels, we need to provide user info
    const presenceData = {
      user_id: visitorId,
      user_info: {
        joinedAt: Date.now(),
        color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
        name: generateExplorerName(visitorId),
        browser: getBrowserName(userAgent),
        device: getDeviceType(userAgent),
        country: country,
        flag: countryToFlag(country),
      },
    };
    
    const authResponse = pusherInstance.authorizeChannel(socketId, channelName, presenceData);
    
    // Log visitor connection for analytics
    console.log(JSON.stringify({
      event: 'visitor_connected',
      timestamp: new Date().toISOString(),
      name: presenceData.user_info.name,
      visitorId: visitorId.substring(0, 20) + '...', // Truncate for privacy
      isNewVisitor,
      location: {
        country,
        flag: countryToFlag(country),
        region,
        city,
        coordinates: latitude && longitude ? `${latitude}, ${longitude}` : null,
        timezone,
      },
      browser: getBrowserName(userAgent),
      device: getDeviceType(userAgent),
    }));
    
    // Create response with auth data
    const response = NextResponse.json(authResponse);
    
    // Set httpOnly cookie if this is a new visitor (1 year expiry)
    if (isNewVisitor) {
      response.cookies.set(VISITOR_COOKIE_NAME, visitorId, {
        httpOnly: true, // Can't be accessed by JavaScript
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict', // Prevent CSRF
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/',
      });
    }
    
    return response;
  } catch (error) {
    console.error('Pusher auth error:', error);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}

