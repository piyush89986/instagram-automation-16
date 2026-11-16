import { cleanEnv, str, port } from 'envalid';
import dotenv from 'dotenv';

dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  PORT: port({ default: 5000 }),
  MONGO_URI: str({ default: 'mongodb://127.0.0.1:27017/ig-saas' }),
  
  REDIS_URL: str({ default: '' }),
  REDIS_HOST: str({ default: '127.0.0.1' }),
  REDIS_PORT: port({ default: 6379 }),

  JWT_ACCESS_SECRET: str({ default: 'access-secret-key' }),
  JWT_REFRESH_SECRET: str({ default: 'refresh-secret-key' }),

  META_APP_ID: str({ default: '' }),
  META_APP_SECRET: str({ default: '' }),
  META_WEBHOOK_VERIFY_TOKEN: str({ default: '' }),
  META_ACCESS_TOKEN: str({ default: process.env.META_ACESS_TOKEN || '' }),
  META_ACESS_TOKEN: str({ default: '' }),

  GEMINI_API_KEY: str({ default: 'dummy_key' }),
  OPENAI_API_KEY: str({ default: 'dummy_key' }),

  CORS_ORIGIN: str({ default: '' }),
  ALLOWED_ORIGINS: str({ default: '' }),
  CLIENT_URL: str({ default: '' }),
  FRONTEND_URL: str({ default: '' }),
});
