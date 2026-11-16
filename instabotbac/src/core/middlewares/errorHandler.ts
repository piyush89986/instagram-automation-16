import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational ?? false;
  
  // In production, mask non-operational internal errors
  const message = (env.isProduction && !isOperational && statusCode === 500)
    ? 'Internal Server Error'
    : (err.message || 'An unexpected error occurred');

  // Log full error details server-side
  console.error(`[Error] ${req.method} ${req.originalUrl} - ${statusCode} - ${err.message}`);
  if (err.stack && (!env.isProduction || !isOperational)) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(env.isProduction ? {} : { stack: err.stack }),
  });
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error: AppError = new Error(`Route Not Found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  error.isOperational = true;
  next(error);
};
