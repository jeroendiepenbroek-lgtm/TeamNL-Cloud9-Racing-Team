import { Request, Response, NextFunction } from 'express';

/**
 * Express async error handler wrapper
 * Vangt errors in async route handlers op en geeft ze door aan error middleware
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
