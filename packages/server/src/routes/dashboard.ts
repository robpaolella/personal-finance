import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { transactions, accounts, categories, budgets, balanceSnapshots, assets } from '../db/schema.js';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

const router = Router();

function monthRange(month: string): { startDate: string; endDate: string } {
  const [year, m] = month.split('-').map(Number);
  const startDate = `${year}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  const endDate = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
}

function priorMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const d = new Date(year, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// GET /api/dashboard/summary?month=YYYY-MM
router.get('/summary', (req: Request, res: Response) => {
  try {
    const month = (req.query.month as string) || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const { startDate, endDate } = monthRange(month);
    const prior = priorMonth(month);
    const { startDate: priorStart, endDate: priorEnd } = monthRange(prior);

    // Net worth: latest balance per account + current asset values
    const balances = db.select({
      account_id: balanceSnapshots.account_id,
      balance: balanceSnapshots.balance,
      classification: accounts.classification,
    }).from(balanceSnapshots)
      .innerJoin(accounts, eq(balanceSnapshots.account_id, accounts.id))
      .where(eq(accounts.is_active, 1))
      .orderBy(desc(balanceSnapshots.date), desc(balanceSnapshots.id))
      .all();

    // Deduplicate: keep latest per account
    const latestByAccount = new Map<number, { balance: number; classification: string }>();
    for (const b of balances) {
      if (!latestByAccount.has(b.account_id)) {
        latestByAccount.set(b.account_id, { balance: b.balance, classification: b.classification });
      }
    }

    let totalBalances = 0;
    let liquidAssets = 0;
    for (const { balance, classification } of latestByAccount.values()) {
      totalBalances += balance;
      if (classification === 'liquid') liquidAssets += balance;
    }

    // Asset depreciation values
    const allAssets = db.select().from(assets).all();
    const now = new Date();
    let totalAssetValue = 0;
    for (const a of allAssets) {
      const purchaseDate = new Date(a.purchase_date);
      const ageYears = (now.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      const depreciation = ((a.cost - a.salvage_value) / a.lifespan_years) * Math.min(ageYears, a.lifespan_years);
      totalAssetValue += Math.max(a.cost - depreciation, a.salvage_value);
    }

    const netWorth = totalBalances + totalAssetValue;

    // Month income/expenses
    const [monthTotals] = db.select({
      income: sql<number>`coalesce(sum(case when ${transactions.amount} < 0 then abs(${transactions.amount}) else 0 end), 0)`,
      expenses: sql<number>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.amount} else 0 end), 0)`,
    }).from(transactions)
      .where(and(gte(transactions.date, startDate), lte(transactions.date, endDate)))
      .all();

    // Prior month income/expenses
    const [priorTotals] = db.select({
      income: sql<number>`coalesce(sum(case when ${transactions.amount} < 0 then abs(${transactions.amount}) else 0 end), 0)`,
      expenses: sql<number>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.amount} else 0 end), 0)`,
    }).from(transactions)
      .where(and(gte(transactions.date, priorStart), lte(transactions.date, priorEnd)))
      .all();

    // Total budgeted expenses for month
    const [budgetTotal] = db.select({
      total: sql<number>`coalesce(sum(${budgets.amount}), 0)`,
    }).from(budgets)
      .where(eq(budgets.month, month))
      .all();

    res.json({
      data: {
        netWorth,
        liquidAssets,
        monthIncome: monthTotals.income,
        monthExpenses: monthTotals.expenses,
        totalBudgetedExpenses: budgetTotal.total,
        priorMonthIncome: priorTotals.income,
        priorMonthExpenses: priorTotals.expenses,
      },
    });
  } catch (err) {
    console.error('GET /dashboard/summary error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

// GET /api/dashboard/spending-by-category?month=YYYY-MM
router.get('/spending-by-category', (req: Request, res: Response) => {
  try {
    const month = (req.query.month as string) || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const { startDate, endDate } = monthRange(month);

    const spending = db.select({
      groupName: categories.group_name,
      totalSpent: sql<number>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.amount} else 0 end), 0)`,
    }).from(transactions)
      .innerJoin(categories, eq(transactions.category_id, categories.id))
      .where(and(
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        eq(categories.type, 'expense'),
      ))
      .groupBy(categories.group_name)
      .all();

    // Get budgets for each group
    const groupBudgets = db.select({
      groupName: categories.group_name,
      totalBudgeted: sql<number>`coalesce(sum(${budgets.amount}), 0)`,
    }).from(budgets)
      .innerJoin(categories, eq(budgets.category_id, categories.id))
      .where(and(eq(budgets.month, month), eq(categories.type, 'expense')))
      .groupBy(categories.group_name)
      .all();

    const budgetMap = new Map(groupBudgets.map((b) => [b.groupName, b.totalBudgeted]));

    const data = spending
      .filter((s) => s.totalSpent > 0)
      .map((s) => ({
        groupName: s.groupName,
        totalSpent: s.totalSpent,
        totalBudgeted: budgetMap.get(s.groupName) || 0,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);

    res.json({ data });
  } catch (err) {
    console.error('GET /dashboard/spending-by-category error:', err);
    res.status(500).json({ error: 'Failed to fetch spending by category' });
  }
});

// GET /api/dashboard/income-vs-expenses?year=YYYY
router.get('/income-vs-expenses', (req: Request, res: Response) => {
  try {
    const year = (req.query.year as string) || String(new Date().getFullYear());

    const monthly = db.select({
      month: sql<number>`cast(substr(${transactions.date}, 6, 2) as integer)`,
      totalIncome: sql<number>`coalesce(sum(case when ${transactions.amount} < 0 then abs(${transactions.amount}) else 0 end), 0)`,
      totalExpenses: sql<number>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.amount} else 0 end), 0)`,
    }).from(transactions)
      .where(sql`substr(${transactions.date}, 1, 4) = ${year}`)
      .groupBy(sql`cast(substr(${transactions.date}, 6, 2) as integer)`)
      .all();

    const monthMap = new Map(monthly.map((m) => [m.month, m]));
    const data = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      totalIncome: monthMap.get(i + 1)?.totalIncome ?? 0,
      totalExpenses: monthMap.get(i + 1)?.totalExpenses ?? 0,
    }));

    res.json({ data });
  } catch (err) {
    console.error('GET /dashboard/income-vs-expenses error:', err);
    res.status(500).json({ error: 'Failed to fetch income vs expenses' });
  }
});

// GET /api/dashboard/recent-transactions?limit=8
router.get('/recent-transactions', (req: Request, res: Response) => {
  try {
    const limit = parseInt((req.query.limit as string) || '8', 10);

    const rows = db.select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      note: transactions.note,
      amount: transactions.amount,
      account_id: accounts.id,
      account_name: accounts.name,
      account_last_four: accounts.last_four,
      account_owner: accounts.owner,
      category_id: categories.id,
      category_group_name: categories.group_name,
      category_sub_name: categories.sub_name,
      category_display_name: categories.display_name,
      category_type: categories.type,
    }).from(transactions)
      .innerJoin(accounts, eq(transactions.account_id, accounts.id))
      .innerJoin(categories, eq(transactions.category_id, categories.id))
      .orderBy(desc(transactions.date), desc(transactions.id))
      .limit(limit)
      .all();

    const data = rows.map((r) => ({
      id: r.id,
      date: r.date,
      description: r.description,
      note: r.note,
      amount: r.amount,
      account: { id: r.account_id, name: r.account_name, lastFour: r.account_last_four, owner: r.account_owner },
      category: { id: r.category_id, groupName: r.category_group_name, subName: r.category_sub_name, displayName: r.category_display_name, type: r.category_type },
    }));

    res.json({ data });
  } catch (err) {
    console.error('GET /dashboard/recent-transactions error:', err);
    res.status(500).json({ error: 'Failed to fetch recent transactions' });
  }
});

export default router;
