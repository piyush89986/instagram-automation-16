import Redis, { RedisOptions } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times: number) {
    return Math.min(times * 1000, 10000);
  },
};

// Check if REDIS_URL or if REDIS_HOST contains full redis connection string
const rawHost = process.env.REDIS_HOST || '';
const redisUrl = process.env.REDIS_URL || (rawHost.startsWith('redis://') || rawHost.startsWith('rediss://') ? rawHost : null);

// Create a reusable Redis connection for BullMQ and other caching needs
const redisConnection = redisUrl
  ? new Redis(redisUrl, redisOptions)
  : new Redis({
      host: rawHost || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      ...redisOptions,
    });

let hasLoggedRedisError = false;

redisConnection.on('connect', () => {
  hasLoggedRedisError = false;
  console.log('✅ Redis connected successfully.');
});

redisConnection.on('error', (err: any) => {
  if (!hasLoggedRedisError) {
    console.warn(`⚠️  Redis unavailable (${err.message}). Background queue workers will activate once Redis is online.`);
    hasLoggedRedisError = true;
  }
});

export default redisConnection;
