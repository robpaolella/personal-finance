import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthPayload } from '@ledger/shared/src/types.js';
import { getJwtSecret } from '../utils/jwt.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/2fa/verify', '/api/health', '/api/setup'];

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
    const payload = jwt.verify(token, getJwtSecret()) as AuthPayload;

    // Reject temp 2FA tokens from being used as full auth tokens
    if (payload.purpose === '2fa') {
      res.status(401).json({ error: 'Invalid token — 2FA verification required' });
      return;
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
