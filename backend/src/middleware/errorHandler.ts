import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('❌ Global Error:', err.stack);

  // Supabase Specific Errors
  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({
      success: false,
      error: 'Invalid reference data. Please check related records.'
    });
  }

  if (err.code === '23505') { // Unique violation
    return res.status(409).json({
      success: false,
      error: 'A record with this unique value already exists.'
    });
  }

  // Default Error
  const statusCode = err.status || 500;
  const message = env.NODE_ENV === 'production' && statusCode === 500 
    ? 'Internal Server Error' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};