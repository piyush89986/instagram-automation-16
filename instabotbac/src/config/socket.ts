import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyAccessToken } from '../core/utils/jwt';

let io: Server;

export const initSocket = (server: HttpServer): Server => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
    'https://instabotfr.vercel.app',
    'https://instabot-black.vercel.app',
    'https://instabotfrlive-dashboard.vercel.app',
    'https://instabotfrlive-dashboard-joqc5dw5i.vercel.app'
  ];

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected to Socket.IO: ${socket.id}`);

    // Listen for frontend authentication containing the JWT token
    socket.on('authenticate', (data: { token: string }) => {
      try {
        if (!data.token) return;
        let token = data.token;
        if (token.startsWith('Bearer ')) {
          token = token.slice(7);
        }
        const decoded = verifyAccessToken(token);
        if (decoded && decoded.workspaceId) {
          socket.join(decoded.workspaceId);
          console.log(`Socket ${socket.id} authenticated and joined workspace ${decoded.workspaceId}`);
        }
      } catch (error) {
        console.error(`Socket auth failed for ${socket.id}:`, error);
      }
    });

    // Fallback: manual join if they don't use authenticate (legacy)
    socket.on('join_workspace', (workspaceId: string) => {
      socket.join(workspaceId);
      console.log(`Socket ${socket.id} manually joined workspace ${workspaceId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
