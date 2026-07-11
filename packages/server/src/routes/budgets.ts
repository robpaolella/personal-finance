import { Router, Request, Response } from 'express';
import { db, sqlite } from '../db/index.js';
import { budgets, categories } from '../db/schema.js';
import { eq, and, asc } from 'drizzle-orm';
import { requirePermission } from '../middleware/permissions.js';
import { getRecurringFloors } from '../services/recurringBudget.js';
import type { BudgetImportItem } from '@ledger/shared/src/types.js';

const router = Router();

function monthRange(month: string): { startDate: string; endDate: string } {
  const [year, m] = month.split('-').map(Number);
  const startDate = `${year}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  const endDate = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
}

// GET /api/budgets?month=YYYY-MM
router.get('/', (req: Request, res: Response) => {
  try {
    const month = req.query.month as string;
    if (!month) {
      res.status(400).json({ error: 'month query parameter is required' });
      return;
    }

    const rows = db.select({
      id: budgets.id,
      category_id: budgets.category_id,
      month: budgets.month,
      amount: budgets.amount,
      group_name: categories.group_name,
      sub_name: categories.sub_name,
      display_name: categories.display_name,
      type: categories.type,
    }).from(budgets)
      .innerJoin(categories, eq(budgets.category_id, categories.id))
      .where(eq(budgets.month, month))
      .all();

    res.json({ data: rows });
  } catch (err) {
    console.error('GET /budgets error:', err);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// POST /api/budgets — upsert
router.post('/', requirePermission('budgets.edit'), (req: Request, res: Response) => {
  try {
    const { categoryId, month, amount } = req.body;
    if (!categoryId || !month || amount == null) {
      res.status(400).json({ error: 'categoryId, month, and amount are required' });
      return;
    }

    // Check if exists
    const existing = db.select().from(budgets)
      .where(and(eq(budgets.category_id, categoryId), eq(budgets.month, month)))
      .get();

    if (existing) {
      db.update(budgets)
        .set({ amount })
        .where(eq(budgets.id, existing.id))
        .run();
      res.json({ data: { ...existing, amount } });
    } else {
      const result = db.insert(budgets)
        .values({ category_id: categoryId, month, amount })
        .run();
      res.status(201).json({ data: { id: result.lastInsertRowid, category_id: categoryId, month, amount } });
    }
  } catch (err) {
    console.error('POST /budgets error:', err);
    res.status(500).json({ error: 'Failed to save budget' });
  }
});

// PUT /api/budgets/:id
router.put('/:id', requirePermission('budgets.edit'), (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { amount } = req.body;
    if (amount == null) {
      res.status(400).json({ error: 'amount is required' });
      return;
    }

    const existing = db.select().from(budgets).where(eq(budgets.id, id)).get();
    if (!existing) {
      res.status(404).json({ error: 'Budget not found' });
      return;
    }

    db.update(budgets).set({ amount }).where(eq(budgets.id, id)).run();
    res.json({ data: { ...existing, amount } });
  } catch (err) {
    console.error('PUT /budgets/:id error:', err);
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

// DELETE /api/budgets/:id
router.delete('/:id', requirePermission('budgets.edit'), (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const existing = db.select().from(budgets).where(eq(budgets.id, id)).get();
    if (!existing) {
      res.status(404).json({ error: 'Budget not found' });
      return;
    }

    db.delete(budgets).where(eq(budgets.id, id)).run();
    res.json({ data: { success: true } });
  } catch (err) {
    console.error('DELETE /budgets/:id error:', err);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

// GET /api/budgets/summary?month=YYYY-MM&owner=all|Robert|Kathleen
router.get('/summary', (req: Request, res: Response) => {
  try {
    const month = req.query.month as string;
    if (!month) {
      res.status(400).json({ error: 'month query parameter is required' });
      return;
    }
    const owner = (req.query.owner as string) || 'all';
    const { startDate, endDate } = monthRange(month);

    // Get all categories
    const allCategories = db.select().from(categories)
      .orderBy(asc(categories.sort_order), asc(categories.sub_name))
      .all();

    // Get budgets for this month
    const monthBudgets = db.select().from(budgets)
      .where(eq(budgets.month, month))
      .all();
    const budgetMap = new Map(monthBudgets.map((b) => [b.category_id, b]));

    // Recurring overlay: each category's recurring total for the month folds into
    // its budget — 'set' = floor (max of manual & recurring), 'add' = manual +
    // recurring. `manual` is the raw stored amount (for editing); `budgeted` is the
    // effective amount used for display + all totals.
    const floors = getRecurringFloors(month);
    type RecMeta = { amount: number; itemCount: number; labels: string[]; mode: 'set' | 'add' };
    const foldBudget = (c: { id: number; recurring_budget_mode: string | null }, stored: number): { budgeted: number; manual: number; recurring: RecMeta | null } => {
      const f = floors.get(c.id);
      if (!f) return { budgeted: stored, manual: stored, recurring: null };
      const mode: 'set' | 'add' = c.recurring_budget_mode === 'add' ? 'add' : 'set';
      const budgeted = mode === 'add' ? +(stored + f.amount).toFixed(2) : Math.max(stored, f.amount);
      return { budgeted, manual: stored, recurring: { amount: f.amount, itemCount: f.itemCount, labels: f.labels, mode } };
    };

    // Get actuals from transactions — optionally filtered by owner
    // Uses UNION to combine non-split transactions with split amounts
    const ownerClause = owner !== 'all'
      ? `AND EXISTS (SELECT 1 FROM account_owners ao JOIN users u ON ao.user_id = u.id WHERE ao.account_id = a.id AND u.display_name = ?)`
      : '';
    const params: (string)[] = [startDate, endDate];
    if (owner !== 'all') params.push(owner);
    params.push(startDate, endDate);
    if (owner !== 'all') params.push(owner);

    const actuals = sqlite.prepare(`
      SELECT category_id, coalesce(sum(amount), 0) as total
      FROM (
        SELECT t.category_id, t.amount
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        WHERE t.category_id IS NOT NULL
          AND t.date >= ? AND t.date <= ? ${ownerClause}
        UNION ALL
        SELECT ts.category_id, ts.amount
        FROM transaction_splits ts
        JOIN transactions t ON ts.transaction_id = t.id
        JOIN accounts a ON t.account_id = a.id
        WHERE t.category_id IS NULL
          AND t.date >= ? AND t.date <= ? ${ownerClause}
      )
      GROUP BY category_id
    `).all(...params) as { category_id: number; total: number }[];
    const actualMap = new Map(actuals.map((a) => [a.category_id, a.total]));

    // Build income summary (group_name = "Income")
    const incomeCategories = allCategories.filter((c) => c.type === 'income');
    const incomeRows = incomeCategories.map((c) => {
      const budget = budgetMap.get(c.id);
      const actual = actualMap.get(c.id) ?? 0;
      // Income transactions are stored negative, so actual income = abs(negative total)
      const actualIncome = actual < 0 ? Math.abs(actual) : 0;
      const fold = foldBudget(c, budget?.amount ?? 0);
      return {
        categoryId: c.id,
        subName: c.sub_name,
        budgeted: fold.budgeted,
        manual: fold.manual,
        recurring: fold.recurring,
        budgetId: budget?.id ?? null,
        actual: actualIncome,
      };
    });

    // Build expense summary grouped by parent
    const expenseCategories = allCategories.filter((c) => c.type === 'expense');
    type SubRow = { categoryId: number; subName: string; budgeted: number; manual: number; recurring: RecMeta | null; budgetId: number | null; actual: number };
    const groupMap = new Map<string, { groupName: string; subs: SubRow[] }>();

    for (const c of expenseCategories) {
      if (!groupMap.has(c.group_name)) {
        groupMap.set(c.group_name, { groupName: c.group_name, subs: [] });
      }
      const budget = budgetMap.get(c.id);
      const actual = actualMap.get(c.id) ?? 0;
      // Net expense amount (refunds reduce the total)
      const actualExpense = actual;
      const fold = foldBudget(c, budget?.amount ?? 0);
      groupMap.get(c.group_name)!.subs.push({
        categoryId: c.id,
        subName: c.sub_name,
        budgeted: fold.budgeted,
        manual: fold.manual,
        recurring: fold.recurring,
        budgetId: budget?.id ?? null,
        actual: actualExpense,
      });
    }

    const expenseGroups = Array.from(groupMap.values()).sort((a, b) =>
      a.groupName.localeCompare(b.groupName)
    );

    // Build savings summary grouped by parent. Savings contributions are
    // outflows (positive), same sign/handling as expenses, but their own section.
    const savingsCategories = allCategories.filter((c) => c.type === 'savings');
    const savingsGroupMap = new Map<string, { groupName: string; subs: SubRow[] }>();
    for (const c of savingsCategories) {
      if (!savingsGroupMap.has(c.group_name)) {
        savingsGroupMap.set(c.group_name, { groupName: c.group_name, subs: [] });
      }
      const budget = budgetMap.get(c.id);
      const actual = actualMap.get(c.id) ?? 0;
      const fold = foldBudget(c, budget?.amount ?? 0);
      savingsGroupMap.get(c.group_name)!.subs.push({
        categoryId: c.id,
        subName: c.sub_name,
        budgeted: fold.budgeted,
        manual: fold.manual,
        recurring: fold.recurring,
        budgetId: budget?.id ?? null,
        actual,
      });
    }
    const savingsGroups = Array.from(savingsGroupMap.values()).sort((a, b) =>
      a.groupName.localeCompare(b.groupName)
    );

    // Totals
    const totalBudgetedIncome = incomeRows.reduce((s, r) => s + r.budgeted, 0);
    const totalActualIncome = incomeRows.reduce((s, r) => s + r.actual, 0);
    const totalBudgetedExpenses = expenseGroups.reduce(
      (s, g) => s + g.subs.reduce((s2, sub) => s2 + sub.budgeted, 0), 0
    );
    const totalActualExpenses = expenseGroups.reduce(
      (s, g) => s + g.subs.reduce((s2, sub) => s2 + sub.actual, 0), 0
    );
    const totalBudgetedSavings = savingsGroups.reduce(
      (s, g) => s + g.subs.reduce((s2, sub) => s2 + sub.budgeted, 0), 0
    );
    const totalActualSavings = savingsGroups.reduce(
      (s, g) => s + g.subs.reduce((s2, sub) => s2 + sub.actual, 0), 0
    );
    // Left to budget: planned income not yet allocated to expenses or savings.
    const leftToBudget = totalBudgetedIncome - totalBudgetedExpenses - totalBudgetedSavings;

    res.json({
      data: {
        income: incomeRows,
        expenseGroups,
        savingsGroups,
        totals: {
          budgetedIncome: totalBudgetedIncome,
          actualIncome: totalActualIncome,
          budgetedExpenses: totalBudgetedExpenses,
          actualExpenses: totalActualExpenses,
          budgetedSavings: totalBudgetedSavings,
          actualSavings: totalActualSavings,
          leftToBudget,
        },
      },
    });
  } catch (err) {
    console.error('GET /budgets/summary error:', err);
    res.status(500).json({ error: 'Failed to fetch budget summary' });
  }
});

// POST /api/budgets/import — batch upsert from template/recurring
// GET /api/budgets/annual?year=YYYY — planned amounts per category for all 12 months
router.get('/annual', (req: Request, res: Response) => {
  try {
    const year = String(req.query.year || new Date().getFullYear());

    const allCategories = db.select().from(categories)
      .orderBy(asc(categories.sort_order), asc(categories.sub_name))
      .all();

    const yearBudgets = sqlite.prepare(
      'SELECT category_id, month, amount FROM budgets WHERE month LIKE ?'
    ).all(`${year}-%`) as { category_id: number; month: string; amount: number }[];

    const plannedMap = new Map<number, number[]>();
    for (const b of yearBudgets) {
      const mi = parseInt(b.month.slice(5, 7), 10) - 1;
      if (mi < 0 || mi > 11) continue;
      if (!plannedMap.has(b.category_id)) plannedMap.set(b.category_id, new Array(12).fill(0));
      plannedMap.get(b.category_id)![mi] = b.amount;
    }
    const plannedFor = (id: number) => plannedMap.get(id) ?? new Array(12).fill(0);

    const income = allCategories.filter((c) => c.type === 'income')
      .map((c) => ({ categoryId: c.id, subName: c.sub_name, planned: plannedFor(c.id) }));

    const buildGroups = (type: string) => {
      const gm = new Map<string, { groupName: string; subs: { categoryId: number; subName: string; planned: number[] }[] }>();
      for (const c of allCategories.filter((c) => c.type === type)) {
        if (!gm.has(c.group_name)) gm.set(c.group_name, { groupName: c.group_name, subs: [] });
        gm.get(c.group_name)!.subs.push({ categoryId: c.id, subName: c.sub_name, planned: plannedFor(c.id) });
      }
      return Array.from(gm.values()).sort((a, b) => a.groupName.localeCompare(b.groupName));
    };

    res.json({
      data: {
        year,
        income,
        expenseGroups: buildGroups('expense'),
        savingsGroups: buildGroups('savings'),
      },
    });
  } catch (err) {
    console.error('GET /budgets/annual error:', err);
    res.status(500).json({ error: 'Failed to fetch annual budget' });
  }
});

router.post('/import', requirePermission('budgets.edit'), (req: Request, res: Response) => {
  try {
    const { month, items } = req.body as { month: string; items: BudgetImportItem[] };
    if (!month || !items || !Array.isArray(items)) {
      res.status(400).json({ error: 'month and items array are required' });
      return;
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    const importTxn = sqlite.transaction(() => {
      for (const item of items) {
        if (item.action === 'skip') {
          skipped++;
          continue;
        }

        const existing = db.select()
          .from(budgets)
          .where(and(eq(budgets.category_id, item.categoryId), eq(budgets.month, month)))
          .get();

        if (existing) {
          if (item.action === 'overwrite') {
            db.update(budgets)
              .set({ amount: item.amount })
              .where(eq(budgets.id, existing.id))
              .run();
            updated++;
          } else if (item.action === 'add') {
            db.update(budgets)
              .set({ amount: existing.amount + item.amount })
              .where(eq(budgets.id, existing.id))
              .run();
            updated++;
          }
        } else {
          db.insert(budgets)
            .values({ category_id: item.categoryId, month, amount: item.amount })
            .run();
          created++;
        }
      }
    });

    importTxn();

    res.json({ data: { created, updated, skipped } });
  } catch (err) {
    console.error('POST /budgets/import error:', err);
    res.status(500).json({ error: 'Failed to import budget' });
  }
});

export default router;
