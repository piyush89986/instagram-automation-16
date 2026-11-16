import { Router } from 'express';
import { create, getPosts } from './publishing.controller';
import { protect } from '../../core/middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.post('/create', create);
router.get('/posts', getPosts);

export default router;
