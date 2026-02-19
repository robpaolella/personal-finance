import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { transactions, accounts, categories } from '../db/schema.js';
import { eq, and, gte, lte, like, or, sql, desc, asc } from 'drizzle-orm';

const router = Router();

// GET /api/transactions — list with filters, joins, pagination
router.get('/', (req: Request, res: Response) => {
  try {
    const {
      startDate, endDate,
      accountId, categoryId, groupName,
      type, owner, search,
      limit: limitStr, offset: offsetStr,
      sortBy = 'date', sortOrder = 'desc',
    } = req.query as Record<string, string | undefined>;

    const limit = parseInt(limitStr || '50', 10);
    const offset = parseInt(offsetStr || '0', 10);

    const conditions = [];
    if (startDate) conditions.push(gte(transactions.date, startDate));
    if (endDate) conditions.push(lte(transactions.date, endDate));
    if (accountId) conditions.push(eq(transactions.account_id, parseInt(accountId, 10)));
    if (categoryId) conditions.push(eq(transactions.category_id, parseInt(categoryId, 10)));
    if (groupName) conditions.push(eq(categories.group_name, groupName));
    if (type === 'income') conditions.push(sql`${transactions.amount} < 0`);
    if (type === 'expense') conditions.push(sql`${transactions.amount} >= 0`);
    if (owner) conditions.push(eq(accounts.owner, owner));
    if (search) {
      conditions.push(
        or(
          like(transactions.description, `%${search}%`),
          like(transactions.note, `%${search}%`),
        )!
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      sortBy === 'amount' ? transactions.amount :
      sortBy === 'description' ? transactions.description :
      transactions.date;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const rows = db
      .select({
        id: transactions.id,
        date: transactions.date,
        description: transactions.description,
        note: transactions.note,
        amount: transactions.amount,
        created_at: transactions.created_at,
        account_id: accounts.id,
        account_name: accounts.name,
        account_last_four: accounts.last_four,
        account_owner: accounts.owner,
        category_id: categories.id,
        category_group_name: categories.group_name,
        category_sub_name: categories.sub_name,
        category_display_name: categories.display_name,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.account_id, accounts.id))
      .innerJoin(categories, eq(transactions.category_id, categories.id))
      .where(where)
      .orderBy(orderFn(sortColumn), desc(transactions.id))
      .limit(limit)
      .offset(offset)
      .all();

    // Get total count
    const [{ count }] = db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.account_id, accounts.id))
      .innerJoin(categories, eq(transactions.category_id, categories.id))
      .where(where)
      .all();

    const data = rows.map((r) => ({
      id: r.id,
      date: r.date,
      description: r.description,
      note: r.note,
      amount: r.amount,
      created_at: r.created_at,
      account: {
        id: r.account_id,
        name: r.account_name,
        lastFour: r.account_last_four,
        owner: r.account_owner,
      },
      category: {
        id: r.category_id,
        groupName: r.category_group_name,
        subName: r.category_sub_name,
        displayName: r.category_display_name,
      },
    }));

    res.json({ data, total: count });
  } catch (err) {
    console.error('GET /transactions error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /api/transactions/summary — income/expense totals for filters
router.get('/summary', (req: Request, res: Response) => {
  try {
    const { startDate, endDate, accountId, owner } = req.query as Record<string, string | undefined>;

    const conditions = [];
    if (startDate) conditions.push(gte(transactions.date, startDate));
    if (endDate) conditions.push(lte(transactions.date, endDate));
    if (accountId) conditions.push(eq(transactions.account_id, parseInt(accountId, 10)));
    if (owner) conditions.push(eq(accounts.owner, owner));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [result] = db
      .select({
        totalIncome: sql<number>`coalesce(sum(case when ${transactions.amount} < 0 then abs(${transactions.amount}) else 0 end), 0)`,
        totalExpenses: sql<number>`coalesce(sum(case when ${transactions.amount} >= 0 then ${transactions.amount} else 0 end), 0)`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.account_id, accounts.id))
      .where(where)
      .all();

    res.json({ data: result });
  } catch (err) {
    console.error('GET /transactions/summary error:', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// GET /api/transactions/:id — single transaction
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = db
      .select({
        id: transactions.id,
        date: transactions.date,
        description: transactions.description,
        note: transactions.note,
        amount: transactions.amount,
        created_at: transactions.created_at,
        account_id: accounts.id,
        account_name: accounts.name,
        account_last_four: accounts.last_four,
        account_owner: accounts.owner,
        category_id: categories.id,
        category_group_name: categories.group_name,
        category_sub_name: categories.sub_name,
        category_display_name: categories.display_name,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.account_id, accounts.id))
      .innerJoin(categories, eq(transactions.category_id, categories.id))
      .where(eq(transactions.id, id))
      .all();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const r = rows[0];
    res.json({
      data: {
        id: r.id,
        date: r.date,
        description: r.description,
        note: r.note,
        amount: r.amount,
        created_at: r.created_at,
        account: { id: r.account_id, name: r.account_name, lastFour: r.account_last_four, owner: r.account_owner },
        category: { id: r.category_id, groupName: r.category_group_name, subName: r.category_sub_name, displayName: r.category_display_name },
      },
    });
  } catch (err) {
    console.error('GET /transactions/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// POST /api/transactions — create
router.post('/', (req: Request, res: Response) => {
  try {
    const { accountId, date, description, note, categoryId, amount } = req.body;
    if (!accountId || !date || !description || !categoryId || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = db.insert(transactions).values({
      account_id: accountId,
      date,
      description,
      note: note || null,
      category_id: categoryId,
      amount: parseFloat(amount),
    }).run();

    res.status(201).json({ data: { id: result.lastInsertRowid } });
  } catch (err) {
    console.error('POST /transactions error:', err);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// PUT /api/transactions/:id — update
router.put('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { accountId, date, description, note, categoryId, amount } = req.body;

    const existing = db.select().from(transactions).where(eq(transactions.id, id)).all();
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    db.update(transactions)
      .set({
        account_id: accountId ?? existing[0].account_id,
        date: date ?? existing[0].date,
        description: description ?? existing[0].description,
        note: note !== undefined ? note : existing[0].note,
        category_id: categoryId ?? existing[0].category_id,
        amount: amount !== undefined ? parseFloat(amount) : existing[0].amount,
      })
      .where(eq(transactions.id, id))
      .run();

    res.json({ data: { id } });
  } catch (err) {
    console.error('PUT /transactions/:id error:', err);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// DELETE /api/transactions/:id — delete
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = db.select().from(transactions).where(eq(transactions.id, id)).all();
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    db.delete(transactions).where(eq(transactions.id, id)).run();
    res.json({ data: { id } });
  } catch (err) {
    console.error('DELETE /transactions/:id error:', err);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

export default router;
