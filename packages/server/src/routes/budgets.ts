import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { budgets, categories, transactions, accounts } from '../db/schema.js';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

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
router.post('/', (req: Request, res: Response) => {
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
router.put('/:id', (req: Request, res: Response) => {
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
router.delete('/:id', (req: Request, res: Response) => {
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
    const allCategories = db.select().from(categories).all();

    // Get budgets for this month
    const monthBudgets = db.select().from(budgets)
      .where(eq(budgets.month, month))
      .all();
    const budgetMap = new Map(monthBudgets.map((b) => [b.category_id, b]));

    // Get actuals from transactions — optionally filtered by owner
    const ownerFilter = owner !== 'all'
      ? sql`AND ${accounts.owner} = ${owner}`
      : sql``;

    const actuals = db.select({
      category_id: transactions.category_id,
      total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
    }).from(transactions)
      .innerJoin(accounts, eq(transactions.account_id, accounts.id))
      .where(sql`${transactions.date} >= ${startDate} AND ${transactions.date} <= ${endDate} ${ownerFilter}`)
      .groupBy(transactions.category_id)
      .all();
    const actualMap = new Map(actuals.map((a) => [a.category_id, a.total]));

    // Build income summary (group_name = "Income")
    const incomeCategories = allCategories.filter((c) => c.type === 'income');
    const incomeRows = incomeCategories.map((c) => {
      const budget = budgetMap.get(c.id);
      const actual = actualMap.get(c.id) ?? 0;
      // Income transactions are stored negative, so actual income = abs(negative total)
      const actualIncome = actual < 0 ? Math.abs(actual) : 0;
      return {
        categoryId: c.id,
        subName: c.sub_name,
        budgeted: budget?.amount ?? 0,
        budgetId: budget?.id ?? null,
        actual: actualIncome,
      };
    });

    // Build expense summary grouped by parent
    const expenseCategories = allCategories.filter((c) => c.type === 'expense');
    const groupMap = new Map<string, {
      groupName: string;
      subs: { categoryId: number; subName: string; budgeted: number; budgetId: number | null; actual: number }[];
    }>();

    for (const c of expenseCategories) {
      if (!groupMap.has(c.group_name)) {
        groupMap.set(c.group_name, { groupName: c.group_name, subs: [] });
      }
      const budget = budgetMap.get(c.id);
      const actual = actualMap.get(c.id) ?? 0;
      // Expense transactions are positive for money out
      const actualExpense = actual > 0 ? actual : 0;
      groupMap.get(c.group_name)!.subs.push({
        categoryId: c.id,
        subName: c.sub_name,
        budgeted: budget?.amount ?? 0,
        budgetId: budget?.id ?? null,
        actual: actualExpense,
      });
    }

    const expenseGroups = Array.from(groupMap.values()).sort((a, b) =>
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

    res.json({
      data: {
        income: incomeRows,
        expenseGroups,
        totals: {
          budgetedIncome: totalBudgetedIncome,
          actualIncome: totalActualIncome,
          budgetedExpenses: totalBudgetedExpenses,
          actualExpenses: totalActualExpenses,
        },
      },
    });
  } catch (err) {
    console.error('GET /budgets/summary error:', err);
    res.status(500).json({ error: 'Failed to fetch budget summary' });
  }
});

export default router;
