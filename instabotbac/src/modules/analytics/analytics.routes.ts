import { Router } from 'express';
import { getStats } from './analytics.controller';
import { protect, restrictTo } from '../../core/middlewares/authMiddleware';

const router = Router();
router.use(protect);

router.get('/dashboard', getStats);

export default router;
