import { Request, Response, NextFunction } from 'express';

/** Global error handler — returns consistent JSON errors. */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Unhandled error:', err.message);

  const statusCode = res.statusCode && res.statusCode >= 400 ? res.statusCode : 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { details: err.message }),
  });
}
