import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { User } from '../database/models/User';
import { AppError } from './errorHandler';
import mongoose from 'mongoose';

export interface AuthRequest extends Request {
  user?: any;
  workspaceId?: mongoose.Types.ObjectId;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    const error: AppError = new Error('You are not logged in! Please log in to get access.');
    error.statusCode = 401;
    return next(error);
  }

  try {
    // Demo bypass so frontend can work without a full login system
    if (token === 'fake-demo-token-instabot-2024') {
      req.user = { _id: new mongoose.Types.ObjectId('66882299ff44aa55bb66cc77'), name: 'Demo User', roleId: { name: 'ADMIN' } };
      req.workspaceId = new mongoose.Types.ObjectId('66882299ff44aa55bb66cc77');
      return next();
    }

    // 1. Verify token
    const decoded: TokenPayload = verifyAccessToken(token);

    // 2. Check if user still exists
    const currentUser = await User.findById(decoded.userId).populate('roleId');
    if (!currentUser) {
      const error: AppError = new Error('The user belonging to this token does no longer exist.');
      error.statusCode = 401;
      return next(error);
    }

    // 3. Check if active
    if (!currentUser.isActive) {
      const error: AppError = new Error('This account has been deactivated.');
      error.statusCode = 401;
      return next(error);
    }

    // Grant Access
    req.user = currentUser;
    req.workspaceId = currentUser.workspaceId;
    next();
  } catch (err) {
    const error: AppError = new Error('Invalid token or token expired.');
    error.statusCode = 401;
    next(error);
  }
};

export const restrictTo = (...roleNames: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.roleId || !roleNames.includes((req.user.roleId as any).name)) {
      const error: AppError = new Error('You do not have permission to perform this action');
      error.statusCode = 403;
      return next(error);
    }
    next();
  };
};
