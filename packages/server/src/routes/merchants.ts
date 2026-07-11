import { Router, Request, Response } from 'express';
import { db, sqlite } from '../db/index.js';
import { merchants, transactions, transactionSplits } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { sanitize } from '../utils/sanitize.js';
import { requirePermission } from '../middleware/permissions.js';

const router = Router();

// GET /api/merchants — all merchants with transaction counts, A→Z.
// txn_count counts DISPLAYED rows: non-split transactions with this merchant,
// plus split legs whose effective merchant (own, or the parent's when inherited)
// is this merchant — so a merchant that appears only on a leg still counts.
router.get('/', (_req: Request, res: Response) => {
  try {
    const rows = sqlite.prepare(`
      SELECT m.id, m.name, m.created_at,
        (SELECT COUNT(*) FROM transactions t
           WHERE t.merchant_id = m.id
             AND NOT EXISTS (SELECT 1 FROM transaction_splits s WHERE s.transaction_id = t.id))
        +
        (SELECT COUNT(*) FROM transaction_splits ts
           JOIN transactions tp ON ts.transaction_id = tp.id
           WHERE COALESCE(ts.merchant_id, tp.merchant_id) = m.id)
        AS txn_count
      FROM merchants m
      ORDER BY m.name ASC
    `).all();
    res.json({ data: rows });
  } catch (err) {
    console.error('GET /merchants error:', err);
    res.status(500).json({ error: 'Failed to fetch merchants' });
  }
});

// PATCH /api/merchants/:id — rename
router.patch('/:id', requirePermission('transactions.edit'), (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { name } = sanitize(req.body) as { name?: unknown };
    if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'name is required' });
    const clean = name.trim();

    const existing = db.select().from(merchants).where(eq(merchants.id, id)).all();
    if (existing.length === 0) return res.status(404).json({ error: 'Merchant not found' });

    // Renaming onto an existing name would violate UNIQUE — merge instead.
    const clash = db.select().from(merchants).where(eq(merchants.name, clean)).all();
    if (clash.length > 0 && clash[0].id !== id) {
      return res.status(409).json({ error: 'A merchant with that name already exists — merge instead' });
    }

    db.update(merchants).set({ name: clean }).where(eq(merchants.id, id)).run();
    res.json({ data: { id, name: clean } });
  } catch (err) {
    console.error('PATCH /merchants/:id error:', err);
    res.status(500).json({ error: 'Failed to rename merchant' });
  }
});

// POST /api/merchants/merge — repoint all of source's transactions to target, delete source
router.post('/merge', requirePermission('transactions.edit'), (req: Request, res: Response) => {
  try {
    const { sourceId, targetId } = req.body as { sourceId?: number; targetId?: number };
    if (!sourceId || !targetId || sourceId === targetId) {
      return res.status(400).json({ error: 'distinct sourceId and targetId are required' });
    }
    const both = db.select().from(merchants).where(sql`${merchants.id} IN (${sourceId}, ${targetId})`).all();
    if (both.length < 2) return res.status(404).json({ error: 'Merchant not found' });

    const run = sqlite.transaction(() => {
      db.update(transactions).set({ merchant_id: targetId }).where(eq(transactions.merchant_id, sourceId)).run();
      // Repoint split legs too, or the FK (foreign_keys=ON) blocks the delete.
      db.update(transactionSplits).set({ merchant_id: targetId }).where(eq(transactionSplits.merchant_id, sourceId)).run();
      db.delete(merchants).where(eq(merchants.id, sourceId)).run();
    });
    run();
    res.json({ data: { merged: true, targetId } });
  } catch (err) {
    console.error('POST /merchants/merge error:', err);
    res.status(500).json({ error: 'Failed to merge merchants' });
  }
});

// DELETE /api/merchants/:id — unlink from transactions, then remove
router.delete('/:id', requirePermission('transactions.edit'), (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const existing = db.select().from(merchants).where(eq(merchants.id, id)).all();
    if (existing.length === 0) return res.status(404).json({ error: 'Merchant not found' });

    const run = sqlite.transaction(() => {
      db.update(transactions).set({ merchant_id: null }).where(eq(transactions.merchant_id, id)).run();
      // Unlink split legs too (they'd otherwise dangle / block the FK delete).
      db.update(transactionSplits).set({ merchant_id: null }).where(eq(transactionSplits.merchant_id, id)).run();
      db.delete(merchants).where(eq(merchants.id, id)).run();
    });
    run();
    res.json({ data: { id } });
  } catch (err) {
    console.error('DELETE /merchants/:id error:', err);
    res.status(500).json({ error: 'Failed to delete merchant' });
  }
});

export default router;
