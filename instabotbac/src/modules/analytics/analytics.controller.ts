import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/authMiddleware';
import { getDashboardStats } from './analytics.service';

export const getStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.workspaceId as unknown as string;
    const stats = await getDashboardStats(workspaceId);
    res.status(200).json({ status: 'success', data: stats });
  } catch (error) {
    next(error);
  }
};
