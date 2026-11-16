import express from 'express';
import http from 'http';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
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
app.use(helmet()); // Security headers
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'https://instabotfrlive-dashboard-joqc5dw5i.vercel.app',
  'https://instabotfr.vercel.app',
  'https://instabot-black.vercel.app',
  'https://instabotfrlive-dashboard.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    if (/^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev')); // Request logging

// Trust proxy for Render so rate limit uses correct client IP
app.set('trust proxy', 1);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// 5. Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = env.PORT;

server.listen(PORT, () => {
  console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
});

// Graceful Shutdown
const shutdown = () => {
  console.log('Shutting down server gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forcing server shutdown after 10s');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...', err);
  shutdown();
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...', err);
  shutdown();
});
