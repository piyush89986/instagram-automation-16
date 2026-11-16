import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${statusCode} - ${message}`);
  
  if (!isOperational && !env.isProduction) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    status: 'error',
    message: message,
    stack: err.stack,
    error: message
  });
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error: AppError = new Error(`Route Not Found: ${req.originalUrl}`);
  error.statusCode = 404;
  error.isOperational = true;
  next(error);
};
