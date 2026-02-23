import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthPayload } from '@ledger/shared/src/types.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const PUBLIC_PATHS = ['/api/auth/login', '/api/health', '/api/setup'];

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // Use originalUrl for full path matching since middleware may be mounted at a sub-path
  if (PUBLIC_PATHS.some(p => req.originalUrl === p || req.originalUrl.startsWith(p + '?') || req.originalUrl.startsWith(p + '/'))) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const payload = jwt.verify(token, secret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
