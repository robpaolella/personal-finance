import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { assets } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

function calculateCurrentValue(cost: number, salvageValue: number, lifespanYears: number, purchaseDate: string): number {
  const now = new Date();
  const purchased = new Date(purchaseDate);
  const yearsOwned = (now.getTime() - purchased.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const annualDepreciation = (cost - salvageValue) / lifespanYears;
  return Math.max(salvageValue, cost - (annualDepreciation * Math.min(yearsOwned, lifespanYears)));
}

// GET /api/assets
router.get('/', (_req: Request, res: Response) => {
  try {
    const rows = db.select().from(assets).all();
    const data = rows.map((a) => ({
      ...a,
      currentValue: calculateCurrentValue(a.cost, a.salvage_value, a.lifespan_years, a.purchase_date),
    }));
    res.json({ data });
  } catch (err) {
    console.error('GET /assets error:', err);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// GET /api/assets/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const asset = db.select().from(assets).where(eq(assets.id, id)).get();
    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }
    res.json({
      data: {
        ...asset,
        currentValue: calculateCurrentValue(asset.cost, asset.salvage_value, asset.lifespan_years, asset.purchase_date),
      },
    });
  } catch (err) {
    console.error('GET /assets/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
});

// POST /api/assets
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, purchaseDate, cost, lifespanYears, salvageValue } = req.body;
    if (!name || !purchaseDate || cost == null || lifespanYears == null || salvageValue == null) {
      res.status(400).json({ error: 'name, purchaseDate, cost, lifespanYears, and salvageValue are required' });
      return;
    }

    const result = db.insert(assets)
      .values({ name, purchase_date: purchaseDate, cost, lifespan_years: lifespanYears, salvage_value: salvageValue })
      .run();

    res.status(201).json({ data: { id: result.lastInsertRowid, name, purchaseDate, cost, lifespanYears, salvageValue } });
  } catch (err) {
    console.error('POST /assets error:', err);
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

// PUT /api/assets/:id
router.put('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const existing = db.select().from(assets).where(eq(assets.id, id)).get();
    if (!existing) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    const { name, purchaseDate, cost, lifespanYears, salvageValue } = req.body;
    db.update(assets).set({
      name: name ?? existing.name,
      purchase_date: purchaseDate ?? existing.purchase_date,
      cost: cost ?? existing.cost,
      lifespan_years: lifespanYears ?? existing.lifespan_years,
      salvage_value: salvageValue ?? existing.salvage_value,
    }).where(eq(assets.id, id)).run();

    res.json({ data: { id, name: name ?? existing.name } });
  } catch (err) {
    console.error('PUT /assets/:id error:', err);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

// DELETE /api/assets/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const existing = db.select().from(assets).where(eq(assets.id, id)).get();
    if (!existing) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    db.delete(assets).where(eq(assets.id, id)).run();
    res.json({ data: { success: true } });
  } catch (err) {
    console.error('DELETE /assets/:id error:', err);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

export default router;
