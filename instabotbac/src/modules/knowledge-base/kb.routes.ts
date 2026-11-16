import { Router } from 'express';
import { getKnowledgeBase, updateKnowledgeBase } from './kb.controller';
import { protect } from '../../core/middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.get('/', getKnowledgeBase);
router.put('/:id', updateKnowledgeBase);

export default router;
