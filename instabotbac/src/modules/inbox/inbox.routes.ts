import { Router } from 'express';
import { getConversations, getMessages, toggleHumanTakeover, sendManualMessage, migrateWorkspace, updateToken, resetAll } from './inbox.controller';
import { protect } from '../../core/middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.get('/conversations', getConversations);
router.get('/conversations/:id/messages', getMessages);
router.patch('/conversations/:id/takeover', toggleHumanTakeover);
router.put('/conversations/:id/takeover', toggleHumanTakeover);
router.post('/conversations/:id/messages', sendManualMessage);
router.post('/debug/migrate-workspace', migrateWorkspace);
router.post('/debug/update-token', updateToken);
router.post('/debug/reset-all', resetAll);

export default router;
