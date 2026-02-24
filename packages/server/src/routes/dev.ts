import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { devStorage } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

// GET /api/dev/storage/:key
router.get('/storage/:key', async (req: Request, res: Response): Promise<void> => {
  try {
    const key = req.params.key as string;
    const row = await db.select().from(devStorage).where(eq(devStorage.key, key)).get();
    if (!row) {
      res.json({ data: null });
      return;
    }
    res.json({ data: { key: row.key, value: row.value, updated_at: row.updated_at } });
  } catch (err) {
    console.error('Dev storage GET error:', err);
    res.status(500).json({ error: 'Failed to read dev storage' });
  }
});

// PUT /api/dev/storage/:key
router.put('/storage/:key', async (req: Request, res: Response): Promise<void> => {
  try {
    const key = req.params.key as string;
    const { value } = req.body;
    if (typeof value !== 'string') {
      res.status(400).json({ error: 'value must be a string' });
      return;
    }
    const now = new Date().toISOString();
    await db.insert(devStorage)
      .values({ key, value, updated_at: now })
      .onConflictDoUpdate({
        target: devStorage.key,
        set: { value, updated_at: now },
      });
    res.json({ data: { key, updated_at: now } });
  } catch (err) {
    console.error('Dev storage PUT error:', err);
    res.status(500).json({ error: 'Failed to save dev storage' });
  }
});

// DELETE /api/dev/storage/:key
router.delete('/storage/:key', async (req: Request, res: Response): Promise<void> => {
  try {
    const key = req.params.key as string;
    await db.delete(devStorage).where(eq(devStorage.key, key));
    res.json({ data: { deleted: true } });
  } catch (err) {
    console.error('Dev storage DELETE error:', err);
    res.status(500).json({ error: 'Failed to delete dev storage' });
  }
});

export default router;
