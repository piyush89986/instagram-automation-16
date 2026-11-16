import { Request, Response, NextFunction } from 'express';
import * as publishingService from './publishing.service';
import { AuthRequest } from '../../core/middlewares/authMiddleware';
import { AppError } from '../../core/middlewares/errorHandler';

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { instagramAccountId, postType, mediaUrls, caption, scheduledTime, publishNow } = req.body;

    const post = await publishingService.createPost({
      workspaceId: req.workspaceId,
      instagramAccountId,
      postType,
      mediaUrls,
      caption,
      scheduledTime
    });

    if (publishNow) {
      await publishingService.publishPostNow(post._id as any, req.workspaceId as any);
    }

    res.status(201).json({
      status: 'success',
      data: { post }
    });
  } catch (error: any) {
    const err = new Error(error.message);
    (err as AppError).statusCode = 400;
    (err as AppError).isOperational = true;
    next(err);
  }
};
