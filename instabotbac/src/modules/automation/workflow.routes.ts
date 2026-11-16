import { Router } from 'express';
import { getWorkflows, getWorkflow, createWorkflow, updateWorkflow, deleteWorkflow } from './workflow.controller';
import { protect, restrictTo } from '../../core/middlewares/authMiddleware';

const router = Router();

// Require authentication for all workflow routes
router.use(protect);

// Only Team Owners and Managers can edit workflows
router.get('/', getWorkflows);
router.get('/:id', getWorkflow);
router.post('/', restrictTo('Team Owner', 'Manager', 'Admin'), createWorkflow);
router.put('/:id', restrictTo('Team Owner', 'Manager', 'Admin'), updateWorkflow);
router.delete('/:id', restrictTo('Team Owner', 'Manager', 'Admin'), deleteWorkflow);

export default router;
