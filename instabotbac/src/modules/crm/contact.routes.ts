import { Router } from 'express';
import { getContacts, getContact, updateContact } from './contact.controller';
import { protect } from '../../core/middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.get('/', getContacts);
router.get('/:id', getContact);
router.put('/:id', updateContact);

export default router;
