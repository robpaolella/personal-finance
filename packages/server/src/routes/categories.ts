import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { categories, transactions } from '../db/schema.js';
import { eq, asc, sql } from 'drizzle-orm';

const router = Router();

// GET /api/categories
router.get('/', (_req: Request, res: Response): void => {
  const rows = db.select().from(categories)
    .orderBy(asc(categories.type), asc(categories.sort_order), asc(categories.group_name), asc(categories.sub_name))
    .all();
  res.json({ data: rows });
});

// GET /api/categories/groups
router.get('/groups', (_req: Request, res: Response): void => {
  const rows = db.select({
    group_name: categories.group_name,
    type: categories.type,
    count: sql<number>`count(*)`,
  })
    .from(categories)
    .groupBy(categories.group_name, categories.type)
    .orderBy(asc(categories.type), asc(categories.group_name))
    .all();
  res.json({ data: rows });
});

// POST /api/categories
router.post('/', (req: Request, res: Response): void => {
  const { groupName, subName, type, isDeductible } = req.body;
  if (!groupName || !subName || !type) {
    res.status(400).json({ error: 'groupName, subName, and type are required' });
    return;
  }
  const displayName = type === 'income' ? subName : `${groupName}: ${subName}`;
  const result = db.insert(categories).values({
    group_name: groupName,
    sub_name: subName,
    display_name: displayName,
    type,
    is_deductible: isDeductible ? 1 : 0,
  }).run();
  const created = db.select().from(categories)
    .where(eq(categories.id, Number(result.lastInsertRowid)))
    .get();
  res.status(201).json({ data: created });
});

// PUT /api/categories/:id
router.put('/:id', (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const existing = db.select().from(categories).where(eq(categories.id, id)).get();
  if (!existing) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }
  const { groupName, subName, type, isDeductible } = req.body;
  const newGroup = groupName ?? existing.group_name;
  const newSub = subName ?? existing.sub_name;
  const newType = type ?? existing.type;
  const displayName = newType === 'income' ? newSub : `${newGroup}: ${newSub}`;
  db.update(categories).set({
    group_name: newGroup,
    sub_name: newSub,
    display_name: displayName,
    type: newType,
    ...(isDeductible !== undefined && { is_deductible: isDeductible ? 1 : 0 }),
  }).where(eq(categories.id, id)).run();
  const updated = db.select().from(categories).where(eq(categories.id, id)).get();
  res.json({ data: updated });
});

// DELETE /api/categories/:id
router.delete('/:id', (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const existing = db.select().from(categories).where(eq(categories.id, id)).get();
  if (!existing) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }
  const txCount = db.select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.category_id, id))
    .get();
  if (txCount && txCount.count > 0) {
    res.status(400).json({ error: 'Cannot delete category with existing transactions' });
    return;
  }
  db.delete(categories).where(eq(categories.id, id)).run();
  res.json({ data: { message: 'Category deleted' } });
});

export default router;
