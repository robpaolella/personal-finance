import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

const router = Router();

// GET /api/users — returns display names for dropdowns
router.get('/', (_req: Request, res: Response): void => {
  const rows = db.select({
    id: users.id,
    username: users.username,
    display_name: users.display_name,
  }).from(users).all();
  res.json({ data: rows });
});

export default router;
