import { Router, Request, Response } from 'express';
import { db, sqlite } from '../db/index.js';
import { balanceSnapshots, accounts, assets } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { calculateCurrentValue } from '../utils/depreciation.js';

const router = Router();

// GET /api/networth/summary
router.get('/summary', (_req: Request, res: Response) => {
  try {
    // Get latest balance per active account
    const balances = db.select({
      account_id: balanceSnapshots.account_id,
      date: balanceSnapshots.date,
      balance: balanceSnapshots.balance,
      name: accounts.name,
      last_four: accounts.last_four,
      owner: accounts.owner,
      classification: accounts.classification,
    }).from(balanceSnapshots)
      .innerJoin(accounts, eq(balanceSnapshots.account_id, accounts.id))
      .where(eq(accounts.is_active, 1))
      .orderBy(desc(balanceSnapshots.date), desc(balanceSnapshots.id))
      .all();

    const seen = new Set<number>();
    const accountList: {
      accountId: number; name: string; lastFour: string | null;
      owner: string; classification: string; balance: number; date: string;
    }[] = [];
    for (const b of balances) {
      if (!seen.has(b.account_id)) {
        seen.add(b.account_id);
        accountList.push({
          accountId: b.account_id,
          name: b.name,
          lastFour: b.last_four,
          owner: b.owner,
          classification: b.classification,
          balance: b.balance,
          date: b.date,
        });
      }
    }

    // Also include accounts with no balance snapshots (balance = 0)
    const allAccounts = db.select().from(accounts).where(eq(accounts.is_active, 1)).all();
    for (const a of allAccounts) {
      if (!seen.has(a.id)) {
        accountList.push({
          accountId: a.id,
          name: a.name,
          lastFour: a.last_four,
          owner: a.owner,
          classification: a.classification,
          balance: 0,
          date: '',
        });
      }
    }

    let liquidTotal = 0;
    let investmentTotal = 0;
    let liabilityTotal = 0;
    for (const a of accountList) {
      if (a.classification === 'liquid') liquidTotal += a.balance;
      else if (a.classification === 'investment') investmentTotal += a.balance;
      else if (a.classification === 'liability') liabilityTotal += Math.abs(a.balance);
    }

    // Assets
    const allAssets = db.select().from(assets).all();
    const assetList = allAssets.map((a) => ({
      id: a.id,
      name: a.name,
      purchaseDate: a.purchase_date,
      cost: a.cost,
      lifespanYears: a.lifespan_years,
      salvageValue: a.salvage_value,
      depreciationMethod: a.depreciation_method,
      decliningRate: a.declining_rate,
      currentValue: calculateCurrentValue({
        cost: a.cost, salvageValue: a.salvage_value, lifespanYears: a.lifespan_years,
        purchaseDate: a.purchase_date, depreciationMethod: a.depreciation_method as 'straight_line' | 'declining_balance',
        decliningRate: a.declining_rate,
      }),
    }));

    const physicalAssetTotal = assetList.reduce((s, a) => s + a.currentValue, 0);
    const netWorth = liquidTotal + investmentTotal + physicalAssetTotal - liabilityTotal;

    // Enrich accounts with owners from junction table
    const acctIds = accountList.map((a) => a.accountId);
    const ownerRows = acctIds.length > 0 ? (sqlite.prepare(`
      SELECT ao.account_id, u.id as user_id, u.display_name
      FROM account_owners ao
      JOIN users u ON ao.user_id = u.id
      WHERE ao.account_id IN (${acctIds.map(() => '?').join(',')})
      ORDER BY u.display_name
    `).all(...acctIds) as { account_id: number; user_id: number; display_name: string }[]) : [];

    const ownerMap = new Map<number, { id: number; displayName: string }[]>();
    for (const o of ownerRows) {
      if (!ownerMap.has(o.account_id)) ownerMap.set(o.account_id, []);
      ownerMap.get(o.account_id)!.push({ id: o.user_id, displayName: o.display_name });
    }

    const enrichedAccounts = accountList.map((a) => {
      const owners = ownerMap.get(a.accountId) || [];
      return { ...a, owners, isShared: owners.length > 1 };
    });

    res.json({
      data: {
        liquidTotal,
        investmentTotal,
        liabilityTotal,
        physicalAssetTotal,
        netWorth,
        accounts: enrichedAccounts,
        assets: assetList,
      },
    });
  } catch (err) {
    console.error('GET /networth/summary error:', err);
    res.status(500).json({ error: 'Failed to fetch net worth summary' });
  }
});

export default router;
