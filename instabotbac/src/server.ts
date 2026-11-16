import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { env } from './config/env';
import { connectDB } from './config/db';
import { initSocket } from './config/socket';
import { errorHandler, notFoundHandler } from './core/middlewares/errorHandler';

// 1. Initialize DB
connectDB();

const app = express();
const server = http.createServer(app);

// 2. Initialize Sockets
initSocket(server);

// 3. Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const envOrigins = [
  ...(env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : []),
  ...(env.CLIENT_URL ? [env.CLIENT_URL] : []),
].map(s => s.trim().replace(/\/$/, '')).filter(Boolean);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'https://instabotfrlive-dashboard-joqc5dw5i.vercel.app',
  'https://instabotfr.vercel.app',
  'https://instabot-black.vercel.app',
  'https://instabotfrlive-dashboard.vercel.app',
  ...envOrigins
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile apps, curl, cron)
    if (!origin) return callback(null, true);
    
    const cleanOrigin = origin.replace(/\/$/, '');
    if (
      /^http:\/\/localhost(:\d+)?$/.test(cleanOrigin) ||
      /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(cleanOrigin) ||
      allowedOrigins.includes(cleanOrigin) ||
      cleanOrigin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(env.isProduction ? 'combined' : 'dev'));

// Trust proxy for reverse proxies (Render, Railway, Fly, Heroku, Cloudflare, Nginx)
app.set('trust proxy', 1);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import instagramRoutes from './modules/instagram/instagram.routes';
import publishingRoutes from './modules/publishing/publishing.routes';
import workflowRoutes from './modules/automation/workflow.routes';
import contactRoutes from './modules/crm/contact.routes';
import inboxRoutes from './modules/inbox/inbox.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';

import productRoutes from './modules/products/products.routes';
import kbRoutes from './modules/knowledge-base/kb.routes';
import chatbotsRoutes from './modules/chatbots/chatbots.routes';

// Initialize Workers
import './modules/publishing/workers/publishWorker';
import './modules/automation/workers/commentWorker';

// 4. API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/instagram', instagramRoutes);
app.use('/api/v1/publishing', publishingRoutes);
app.use('/api/v1/automation/workflows', workflowRoutes);
app.use('/api/v1/crm/contacts', contactRoutes);
app.use('/api/v1/inbox', inboxRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/kb', kbRoutes);
app.use('/api/v1/chatbots', chatbotsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Optional Static Frontend Serving for Monorepo Single-Container Deployments
const frontendDistPath = path.resolve(__dirname, '../../instabotfr/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// 5. Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = env.PORT;

server.listen(PORT, () => {
  console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
});

// Graceful Shutdown
let isShuttingDown = false;
const shutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\nReceived ${signal}. Shutting down server gracefully...`);

  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await mongoose.disconnect();
      console.log('MongoDB connection cleanly closed.');
    } catch (e) {
      console.error('Error closing MongoDB connection:', e);
    }
    process.exit(0);
  });

  // Force close after 10 seconds if lingering
  setTimeout(() => {
    console.error('Forcing server shutdown after 10s timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  if (env.isProduction) {
    shutdown('UNCAUGHT_EXCEPTION');
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  if (env.isProduction) {
    shutdown('UNHANDLED_REJECTION');
  }
});
