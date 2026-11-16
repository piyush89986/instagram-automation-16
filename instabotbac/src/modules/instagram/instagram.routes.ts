import { Router } from 'express';
import { 
  handleOAuthCallback, 
  verifyWebhook, 
  handleWebhookEvent, 
  getConnectedAccounts, 
  getInstagramConfig,
  connectUsingServerToken 
} from './instagram.controller';
import { protect } from '../../core/middlewares/authMiddleware';

const router = Router();

// Config & OAuth Routes (Protected)
router.get('/config', protect, getInstagramConfig);
router.post('/connect-server-token', protect, connectUsingServerToken);
router.post('/oauth/callback', protect, handleOAuthCallback);
router.get('/accounts', protect, getConnectedAccounts);

// Webhook Routes (Public, hit by Meta servers)
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleWebhookEvent);

export default router;
