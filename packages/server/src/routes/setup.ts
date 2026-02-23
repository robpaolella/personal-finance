import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { db } from '../db/index.js';
import { users, appConfig } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { sanitize } from '../utils/sanitize.js';

const router = Router();

const setupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many attempts. Please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function isSetupComplete(): boolean {
  const config = db.select().from(appConfig).where(eq(appConfig.key, 'setup_complete')).get();
  if (config?.value === 'true') return true;

  // Also check if any users exist
  const userCount = db.select({ id: users.id }).from(users).get();
  return !!userCount;
}

// GET /api/setup/status
router.get('/status', (_req: Request, res: Response): void => {
  res.json({ data: { setupRequired: !isSetupComplete() } });
});

// POST /api/setup/create-admin
router.post('/create-admin', setupLimiter, async (req: Request, res: Response): Promise<void> => {
  if (isSetupComplete()) {
    res.status(403).json({ error: 'Setup has already been completed' });
    return;
  }

  const { username, password, displayName } = sanitize(req.body);

  // Validate username
  if (!username || typeof username !== 'string') {
    res.status(400).json({ error: 'Username is required' });
    return;
  }
  if (!/^[a-z0-9]{3,20}$/.test(username)) {
    res.status(400).json({ error: 'Username must be 3-20 lowercase alphanumeric characters' });
    return;
  }

  // Validate password
  if (!password || typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  // Validate display name
  if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
    res.status(400).json({ error: 'Display name is required' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = db.insert(users).values({
    username,
    password_hash: passwordHash,
    display_name: displayName.trim(),
    role: 'owner',
    is_active: 1,
  }).run();

  const userId = Number(result.lastInsertRowid);

  // Mark setup as complete
  db.insert(appConfig).values({ key: 'setup_complete', value: 'true' }).run();

  const secret = process.env.JWT_SECRET || 'fallback-secret';
  const token = jwt.sign(
    { userId, username, displayName: displayName.trim(), role: 'owner' as const },
    secret,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    data: {
      token,
      user: { id: userId, username, displayName: displayName.trim(), role: 'owner' },
    },
  });
});

export default router;
