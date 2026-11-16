import { Router } from 'express';
import { create } from './publishing.controller';
import { protect } from '../../core/middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.post('/create', create);

export default router;
