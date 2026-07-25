import { Router, Request, Response } from 'express';
import { db, sqlite } from '../db/index.js';
import { merchants, transactions, transactionSplits } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { sanitize } from '../utils/sanitize.js';
import { requirePermission } from '../middleware/permissions.js';
import multer from 'multer';
import { saveImage, deleteImage } from '../services/uploads.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/** A user-uploaded merchant logo is stored as `merchant-<id>.<ext>`; catalog logos
 *  are SHARED `vendor-<id>.<ext>` files that other merchants + the vendor_logos
 *  catalog reference, so we must never delete those from a merchant operation. */
const isOwnedMerchantLogo = (url: string | null | undefined): boolean =>
  !!url && /\/merchant-\d+\.[a-z0-9]+$/i.test(url);

// GET /api/merchants — all merchants with transaction counts, A→Z.
// txn_count counts DISPLAYED rows: non-split transactions with this merchant,
// plus split legs whose effective merchant (own, or the parent's when inherited)
// is this merchant — so a merchant that appears only on a leg still counts.
router.get('/', (_req: Request, res: Response) => {
  try {
    const rows = sqlite.prepare(`
      SELECT m.id, m.name, m.logo_url, m.created_at,
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
      // Repoint the source's merchant rule so learning survives the merge — but if
      // the target already has one, drop the source's instead (keep one rule/merchant).
      const targetHasRule = sqlite.prepare("SELECT 1 FROM category_rules WHERE match_type = 'merchant' AND pattern = ?").get(String(targetId));
      if (targetHasRule) {
        sqlite.prepare("DELETE FROM category_rules WHERE match_type = 'merchant' AND pattern = ?").run(String(sourceId));
      } else {
        sqlite.prepare("UPDATE category_rules SET pattern = ? WHERE match_type = 'merchant' AND pattern = ?").run(String(targetId), String(sourceId));
      }
      db.delete(merchants).where(eq(merchants.id, sourceId)).run();
    });
    run();
    // Drop the removed merchant's logo file (if it owns one) so it doesn't orphan
    // on disk — but never a shared catalog (vendor-*) file.
    const srcLogo = both.find((m) => m.id === sourceId)?.logo_url;
    if (isOwnedMerchantLogo(srcLogo)) deleteImage(srcLogo);
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
      // Drop any merchant rule pointing at this id so it doesn't dangle.
      sqlite.prepare("DELETE FROM category_rules WHERE match_type = 'merchant' AND pattern = ?").run(String(id));
      db.delete(merchants).where(eq(merchants.id, id)).run();
    });
    run();
    if (isOwnedMerchantLogo(existing[0].logo_url)) deleteImage(existing[0].logo_url);
    res.json({ data: { id } });
  } catch (err) {
    console.error('DELETE /merchants/:id error:', err);
    res.status(500).json({ error: 'Failed to delete merchant' });
  }
});

// POST /api/merchants/:id/logo — upload a logo image
router.post('/:id/logo', requirePermission('transactions.edit'), upload.single('file'), (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const m = sqlite.prepare('SELECT logo_url FROM merchants WHERE id = ?').get(id) as { logo_url: string | null } | undefined;
    if (!m) return res.status(404).json({ error: 'Merchant not found' });
    const file = (req as unknown as { file?: { mimetype: string; buffer: Buffer } }).file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    let url: string;
    try { url = saveImage('merchant', id, file); } catch { return res.status(400).json({ error: 'Unsupported image type' }); }
    sqlite.prepare('UPDATE merchants SET logo_url = ? WHERE id = ?').run(url, id);
    res.json({ data: { logo_url: url } });
  } catch (err) {
    console.error('POST /merchants/:id/logo error:', err);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// DELETE /api/merchants/:id/logo — remove the logo
router.delete('/:id/logo', requirePermission('transactions.edit'), (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const m = sqlite.prepare('SELECT logo_url FROM merchants WHERE id = ?').get(id) as { logo_url: string | null } | undefined;
    if (!m) return res.status(404).json({ error: 'Merchant not found' });
    // Only remove the file if the merchant owns it (not a shared catalog logo).
    if (isOwnedMerchantLogo(m.logo_url)) deleteImage(m.logo_url);
    // Set '' (explicitly cleared) rather than NULL so the vendor-catalog backfill
    // won't silently re-attach a logo the user removed on the next startup.
    sqlite.prepare("UPDATE merchants SET logo_url = '' WHERE id = ?").run(id);
    res.json({ data: { logo_url: null } });
  } catch (err) {
    console.error('DELETE /merchants/:id/logo error:', err);
    res.status(500).json({ error: 'Failed to remove logo' });
  }
});

export default router;
