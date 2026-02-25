import { Router, Request, Response } from 'express';
import { db, sqlite } from '../db/index.js';
import { accounts, transactions, simplefinLinks } from '../db/schema.js';
import { eq, asc, sql } from 'drizzle-orm';
import { requirePermission } from '../middleware/permissions.js';

const router = Router();

/** Enrich raw account rows with owners from account_owners junction table */
function enrichWithOwners(rows: typeof accounts.$inferSelect[]) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const ownerRows = sqlite.prepare(`
    SELECT ao.account_id, u.id as user_id, u.display_name
    FROM account_owners ao
    JOIN users u ON ao.user_id = u.id
    WHERE ao.account_id IN (${ids.map(() => '?').join(',')})
    ORDER BY u.display_name
  `).all(...ids) as { account_id: number; user_id: number; display_name: string }[];

  const ownerMap = new Map<number, { id: number; displayName: string }[]>();
  for (const o of ownerRows) {
    if (!ownerMap.has(o.account_id)) ownerMap.set(o.account_id, []);
    ownerMap.get(o.account_id)!.push({ id: o.user_id, displayName: o.display_name });
  }

  return rows.map((r) => {
    const owners = ownerMap.get(r.id) || [];
    return {
      ...r,
      owners,
      isShared: owners.length > 1,
    };
  });
}

// GET /api/accounts
router.get('/', (_req: Request, res: Response): void => {
  const rows = db.select().from(accounts)
    .where(eq(accounts.is_active, 1))
    .orderBy(asc(accounts.owner), asc(accounts.type))
    .all();
  res.json({ data: enrichWithOwners(rows) });
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
  res.json({ data: enrichWithOwners([row])[0] });
});

// POST /api/accounts
router.post('/', requirePermission('accounts.create'), (req: Request, res: Response): void => {
  const { name, lastFour, type, classification, ownerIds } = req.body;
  const ids: number[] = ownerIds || [];
  if (!name || !type || !classification || ids.length === 0) {
    res.status(400).json({ error: 'name, type, classification, and at least one owner are required' });
    return;
  }
  // Look up first owner display_name for legacy column
  const firstUser = sqlite.prepare('SELECT display_name FROM users WHERE id = ?').get(ids[0]) as { display_name: string } | undefined;
  const result = db.insert(accounts).values({
    name,
    last_four: lastFour || null,
    type,
    classification,
    owner: firstUser?.display_name || '',
  }).run();
  const accountId = Number(result.lastInsertRowid);
  const insertOwner = sqlite.prepare('INSERT OR IGNORE INTO account_owners (account_id, user_id) VALUES (?, ?)');
  for (const uid of ids) insertOwner.run(accountId, uid);

  const created = db.select().from(accounts)
    .where(eq(accounts.id, accountId))
    .get();
  res.status(201).json({ data: enrichWithOwners([created!])[0] });
});

// PUT /api/accounts/:id
router.put('/:id', requirePermission('accounts.edit'), (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const existing = db.select().from(accounts).where(eq(accounts.id, id)).get();
  if (!existing) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }
  const { name, lastFour, type, classification, ownerIds } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (lastFour !== undefined) updates.last_four = lastFour;
  if (type !== undefined) updates.type = type;
  if (classification !== undefined) updates.classification = classification;

  if (ownerIds !== undefined) {
    const ids: number[] = ownerIds;
    if (ids.length === 0) {
      res.status(400).json({ error: 'At least one owner is required' });
      return;
    }
    // Update legacy owner column
    const firstUser = sqlite.prepare('SELECT display_name FROM users WHERE id = ?').get(ids[0]) as { display_name: string } | undefined;
    if (firstUser) updates.owner = firstUser.display_name;
    // Replace junction rows
    sqlite.prepare('DELETE FROM account_owners WHERE account_id = ?').run(id);
    const insertOwner = sqlite.prepare('INSERT OR IGNORE INTO account_owners (account_id, user_id) VALUES (?, ?)');
    for (const uid of ids) insertOwner.run(id, uid);
  }

  if (Object.keys(updates).length > 0) {
    db.update(accounts).set(updates as typeof accounts.$inferInsert).where(eq(accounts.id, id)).run();
  }
  const updated = db.select().from(accounts).where(eq(accounts.id, id)).get();
  res.json({ data: enrichWithOwners([updated!])[0] });
});

// DELETE /api/accounts/:id (soft delete)
router.delete('/:id', requirePermission('accounts.delete'), (req: Request, res: Response): void => {
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
  // Clean up SimpleFIN links pointing to this account
  db.delete(simplefinLinks).where(eq(simplefinLinks.account_id, id)).run();
  res.json({ data: { message: 'Account deactivated' } });
});

export default router;
