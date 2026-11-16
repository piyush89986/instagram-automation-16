import { Router } from 'express';
import { handleOAuthCallback, verifyWebhook, handleWebhookEvent, getConnectedAccounts } from './instagram.controller';
import { protect } from '../../core/middlewares/authMiddleware';

const router = Router();

// OAuth Routes (Protected, triggered by frontend after getting FB code/token)
router.post('/oauth/callback', protect, handleOAuthCallback);
router.get('/accounts', protect, getConnectedAccounts);

// Webhook Routes (Public, hit by Meta servers)
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleWebhookEvent);

export default router;
