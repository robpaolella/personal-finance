import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { db } from '../db/index.js';
import { users, userPermissions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { sanitize } from '../utils/sanitize.js';
import { ALL_PERMISSIONS } from '../middleware/permissions.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response): Promise<void> => {
  const { username, password } = sanitize(req.body);

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const user = db.select().from(users).where(eq(users.username, username)).get();

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  if (!user.is_active) {
    res.status(403).json({ error: 'Account is disabled. Contact an administrator.' });
    return;
  }

  const secret = process.env.JWT_SECRET || 'fallback-secret';
  const token = jwt.sign(
    { userId: user.id, username: user.username, displayName: user.display_name, role: user.role },
    secret,
    { expiresIn: '7d' }
  );

  res.json({
    data: {
      token,
      user: { id: user.id, username: user.username, displayName: user.display_name, role: user.role },
    },
  });
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response): void => {
  res.json({ data: { message: 'Logged out' } });
});

// GET /api/auth/me
router.get('/me', (req: Request, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  // Build permissions map
  let permissions: Record<string, boolean>;

  if (req.user.role === 'admin') {
    // Admins have all permissions implicitly
    permissions = {};
    for (const perm of ALL_PERMISSIONS) {
      permissions[perm] = true;
    }
  } else {
    // Query member's actual permissions
    const rows = db.select({
      permission: userPermissions.permission,
      granted: userPermissions.granted,
    }).from(userPermissions).where(eq(userPermissions.user_id, req.user.userId)).all();

    permissions = {};
    for (const perm of ALL_PERMISSIONS) {
      permissions[perm] = false;
    }
    for (const row of rows) {
      permissions[row.permission] = row.granted === 1;
    }
  }

  res.json({
    data: {
      id: req.user.userId,
      username: req.user.username,
      displayName: req.user.displayName,
      role: req.user.role,
      permissions,
    },
  });
});

export default router;
