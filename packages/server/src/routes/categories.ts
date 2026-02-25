import { Router, Request, Response } from 'express';
import { db, sqlite } from '../db/index.js';
import { categories, transactions } from '../db/schema.js';
import { eq, asc, and, sql } from 'drizzle-orm';
import { requirePermission } from '../middleware/permissions.js';

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
router.post('/', requirePermission('categories.create'), (req: Request, res: Response): void => {
  const { groupName, subName, type, isDeductible } = req.body;
  if (!groupName || !subName || !type) {
    res.status(400).json({ error: 'groupName, subName, and type are required' });
    return;
  }
  const displayName = type === 'income' ? subName : `${groupName}: ${subName}`;

  // Compute sort_order: insert alphabetically among siblings in the same group
  const siblings = db.select({ sub_name: categories.sub_name, sort_order: categories.sort_order })
    .from(categories)
    .where(and(eq(categories.group_name, groupName), eq(categories.type, type)))
    .orderBy(asc(categories.sort_order), asc(categories.sub_name))
    .all();
  let newSortOrder = 0;
  const lowerNew = subName.toLowerCase();
  for (let i = 0; i < siblings.length; i++) {
    if (lowerNew <= siblings[i].sub_name.toLowerCase()) {
      newSortOrder = i;
      // Shift siblings at and after the insertion point
      for (let j = siblings.length - 1; j >= i; j--) {
        db.update(categories).set({ sort_order: j + 1 })
          .where(and(
            eq(categories.group_name, groupName),
            eq(categories.type, type),
            eq(categories.sub_name, siblings[j].sub_name)
          )).run();
      }
      break;
    }
    if (i === siblings.length - 1) {
      newSortOrder = siblings.length;
    }
  }

  const result = db.insert(categories).values({
    group_name: groupName,
    sub_name: subName,
    display_name: displayName,
    type,
    is_deductible: isDeductible ? 1 : 0,
    sort_order: newSortOrder,
  }).run();
  const created = db.select().from(categories)
    .where(eq(categories.id, Number(result.lastInsertRowid)))
    .get();
  res.status(201).json({ data: created });
});

// PUT /api/categories/reorder
router.put('/reorder', requirePermission('categories.edit'), (req: Request, res: Response): void => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'items array is required' });
    return;
  }
  const stmt = sqlite.prepare('UPDATE categories SET sort_order = ? WHERE id = ?');
  const runAll = sqlite.transaction(() => {
    for (const item of items) {
      if (typeof item.id !== 'number' || typeof item.sort_order !== 'number') continue;
      stmt.run(item.sort_order, item.id);
    }
  });
  runAll();
  res.json({ data: { message: 'Sort order updated' } });
});

// PUT /api/categories/:id
router.put('/:id', requirePermission('categories.edit'), (req: Request, res: Response): void => {
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
router.delete('/:id', requirePermission('categories.delete'), (req: Request, res: Response): void => {
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
