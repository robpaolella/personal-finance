import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { transactions, categories, accounts } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';

const router = Router();

// GET /api/reports/available-years
router.get('/available-years', (_req: Request, res: Response) => {
  try {
    const rows = db.select({
      year: sql<number>`distinct cast(substr(${transactions.date}, 1, 4) as integer)`,
    }).from(transactions)
      .orderBy(sql`cast(substr(${transactions.date}, 1, 4) as integer) desc`)
      .all();

    res.json({ data: rows.map((r) => r.year) });
  } catch (err) {
    console.error('GET /reports/available-years error:', err);
    res.status(500).json({ error: 'Failed to fetch available years' });
  }
});

// GET /api/reports/annual?year=YYYY&owner=all|Robert|Kathleen
router.get('/annual', (req: Request, res: Response) => {
  try {
    const year = (req.query.year as string) || String(new Date().getFullYear());
    const owner = (req.query.owner as string) || 'all';

    const ownerFilter = owner !== 'all'
      ? sql`AND EXISTS (SELECT 1 FROM account_owners ao JOIN users u ON ao.user_id = u.id WHERE ao.account_id = ${accounts.id} AND u.display_name = ${owner})`
      : sql``;

    // Get monthly totals per category
    const rows = db.select({
      category_id: transactions.category_id,
      group_name: categories.group_name,
      sub_name: categories.sub_name,
      type: categories.type,
      month: sql<number>`cast(substr(${transactions.date}, 6, 2) as integer)`,
      total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
    }).from(transactions)
      .innerJoin(categories, eq(transactions.category_id, categories.id))
      .innerJoin(accounts, eq(transactions.account_id, accounts.id))
      .where(sql`substr(${transactions.date}, 1, 4) = ${year} ${ownerFilter}`)
      .groupBy(transactions.category_id, sql`cast(substr(${transactions.date}, 6, 2) as integer)`)
      .all();

    // Build income data: keyed by sub_name → 12 monthly totals
    // Income is stored as negative, so we take abs
    const incomeByCategory: Record<string, number[]> = {};
    const expensesByGroup: Record<string, Record<string, number[]>> = {};

    for (const row of rows) {
      const monthIdx = row.month - 1;
      if (row.type === 'income') {
        if (!incomeByCategory[row.sub_name]) {
          incomeByCategory[row.sub_name] = new Array(12).fill(0);
        }
        incomeByCategory[row.sub_name][monthIdx] += Math.abs(row.total);
      } else {
        if (!expensesByGroup[row.group_name]) {
          expensesByGroup[row.group_name] = {};
        }
        if (!expensesByGroup[row.group_name][row.sub_name]) {
          expensesByGroup[row.group_name][row.sub_name] = new Array(12).fill(0);
        }
        // Net expenses including refunds (negative amounts reduce the total)
        expensesByGroup[row.group_name][row.sub_name][monthIdx] += row.total;
      }
    }

    // Compute monthly totals
    const monthlyIncomeTotals = new Array(12).fill(0);
    for (const vals of Object.values(incomeByCategory)) {
      for (let i = 0; i < 12; i++) monthlyIncomeTotals[i] += vals[i];
    }

    const monthlyExpenseTotals = new Array(12).fill(0);
    for (const group of Object.values(expensesByGroup)) {
      for (const vals of Object.values(group)) {
        for (let i = 0; i < 12; i++) monthlyExpenseTotals[i] += vals[i];
      }
    }

    const monthlyNetTotals = monthlyIncomeTotals.map((inc, i) => inc - monthlyExpenseTotals[i]);

    res.json({
      data: {
        incomeByCategory,
        expensesByGroup,
        monthlyIncomeTotals,
        monthlyExpenseTotals,
        monthlyNetTotals,
      },
    });
  } catch (err) {
    console.error('GET /reports/annual error:', err);
    res.status(500).json({ error: 'Failed to fetch annual report' });
  }
});

export default router;
