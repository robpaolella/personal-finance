import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { accounts, transactions } from '../db/schema.js';
import { eq, asc, sql } from 'drizzle-orm';

const router = Router();

// GET /api/accounts
router.get('/', (_req: Request, res: Response): void => {
  const rows = db.select().from(accounts)
    .where(eq(accounts.is_active, 1))
    .orderBy(asc(accounts.owner), asc(accounts.type))
    .all();
  res.json({ data: rows });
});

// GET /api/accounts/:id
router.get('/:id', (req: Request, res: Response): void => {
  const row = db.select().from(accounts)
    .where(eq(accounts.id, Number(req.params.id)))
    .get();
  if (!row) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }
  res.json({ data: row });
});

// POST /api/accounts
router.post('/', (req: Request, res: Response): void => {
  const { name, lastFour, type, classification, owner } = req.body;
  if (!name || !type || !classification || !owner) {
    res.status(400).json({ error: 'name, type, classification, and owner are required' });
    return;
  }
  const result = db.insert(accounts).values({
    name,
    last_four: lastFour || null,
    type,
    classification,
    owner,
  }).run();
  const created = db.select().from(accounts)
    .where(eq(accounts.id, Number(result.lastInsertRowid)))
    .get();
  res.status(201).json({ data: created });
});

// PUT /api/accounts/:id
router.put('/:id', (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const existing = db.select().from(accounts).where(eq(accounts.id, id)).get();
  if (!existing) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }
  const { name, lastFour, type, classification, owner } = req.body;
  db.update(accounts).set({
    ...(name !== undefined && { name }),
    ...(lastFour !== undefined && { last_four: lastFour }),
    ...(type !== undefined && { type }),
    ...(classification !== undefined && { classification }),
    ...(owner !== undefined && { owner }),
  }).where(eq(accounts.id, id)).run();
  const updated = db.select().from(accounts).where(eq(accounts.id, id)).get();
  res.json({ data: updated });
});

// DELETE /api/accounts/:id (soft delete)
router.delete('/:id', (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const existing = db.select().from(accounts).where(eq(accounts.id, id)).get();
  if (!existing) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }
  // Check for transactions
  const txCount = db.select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.account_id, id))
    .get();
  if (txCount && txCount.count > 0) {
    res.status(400).json({ error: 'Cannot delete account with existing transactions' });
    return;
  }
  db.update(accounts).set({ is_active: 0 }).where(eq(accounts.id, id)).run();
  res.json({ data: { message: 'Account deactivated' } });
});

export default router;
