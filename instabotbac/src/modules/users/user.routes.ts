import { Router } from 'express';
import { getMe, updateKnowledgeBase } from './user.controller';
import { protect } from '../../core/middlewares/authMiddleware';

const router = Router();

// Protect all routes after this middleware
router.use(protect);

router.get('/me', getMe);
router.put('/workspace/knowledgebase', updateKnowledgeBase);

export default router;
