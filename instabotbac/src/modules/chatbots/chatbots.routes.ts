import { Router } from 'express';
import { getChatbots, getChatbotById, createChatbot, updateChatbot, deleteChatbot } from './chatbots.controller';
import { protect } from '../../core/middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.get('/', getChatbots);
router.get('/:id', getChatbotById);
router.post('/', createChatbot);
router.patch('/:id', updateChatbot);
router.delete('/:id', deleteChatbot);

export default router;
