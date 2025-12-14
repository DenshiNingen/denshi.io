/**
 * Pusher Configuration for Real-time Visitors
 * 
 * To enable the real-time visitor feature:
 * 
 * 1. Create a free account at https://pusher.com
 * 2. Create a new Channels app
 * 3. Go to App Keys and copy your credentials
 * 4. Create a .env.local file in the project root with:
 * 
 * PUSHER_APP_ID=your_app_id
 * PUSHER_SECRET=your_secret_key
 * NEXT_PUBLIC_PUSHER_KEY=your_public_key
 * NEXT_PUBLIC_PUSHER_CLUSTER=your_cluster (e.g., eu, us2, ap1)
 * 
 * Note: Without these variables, the visitor feature will be disabled
 * but the rest of the site will work normally.
 * 
 * ---
 * 
 * Upstash Redis Configuration for Message Persistence
 * 
 * To enable message persistence (optional):
 * 
 * 1. Create a free account at https://upstash.com
 * 2. Create a new Redis database
 * 3. Go to Details and copy your REST credentials
 * 4. Add to your .env.local:
 * 
 * UPSTASH_REDIS_REST_URL=your_redis_rest_url
 * UPSTASH_REDIS_REST_TOKEN=your_redis_rest_token
 * 
 * Note: Without these variables, messages will not persist across refreshes.
 */

export const PUSHER_CONFIG = {
  // These are read from environment variables
  appId: process.env.PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
};

export const REDIS_CONFIG = {
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
};

