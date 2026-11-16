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

// Create a reusable Redis connection for BullMQ and other caching needs
const redisConnection = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, redisOptions)
  : new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
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
