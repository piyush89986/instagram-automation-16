import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { z } from 'zod';
import { AppError } from '../../core/middlewares/errorHandler';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
});

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const result = await authService.registerUser(validatedData);

    // Remove passwordHash from response
    const userObj = result.user.toObject();
    delete (userObj as any).passwordHash;

    res.status(201).json({
      status: 'success',
      data: {
        user: userObj,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const message = error.issues?.[0]?.message || 'Validation Failed';
      return next(Object.assign(new Error(message), { statusCode: 400, isOperational: true }));
    }
    const err = new Error(error.message);
    (err as AppError).statusCode = 400;
    (err as AppError).isOperational = true;
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(Object.assign(new Error('Please provide email and password'), { statusCode: 400, isOperational: true }));
    }

    const result = await authService.loginUser({ email, password });
    
    const userObj = result.user.toObject();
    delete (userObj as any).passwordHash;

    res.status(200).json({
      status: 'success',
      data: {
        user: userObj,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }
    });
  } catch (error: any) {
    const err = new Error(error.message);
    (err as AppError).statusCode = 401;
    (err as AppError).isOperational = true;
    next(err);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return next(Object.assign(new Error('Refresh token is required'), { statusCode: 400, isOperational: true }));
    }

    const tokens = await authService.refreshAuthToken(refreshToken);
    
    res.status(200).json({
      status: 'success',
      data: tokens
    });
  } catch (error: any) {
    const err = new Error(error.message);
    (err as AppError).statusCode = 401;
    (err as AppError).isOperational = true;
    next(err);
  }
};
