import { db } from '../db/index.js';
import { transactions, accounts } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { DuplicateStatus } from '@ledger/shared/src/types.js';

export interface DuplicateResult {
  index: number;
  status: DuplicateStatus;
  matchId: number | null;
  matchDescription?: string;
  matchDate?: string;
  matchAmount?: number;
  matchAccountName?: string;
}

export interface IncomingTransaction {
  date: string;
  amount: number;
  description: string;
  accountId?: number;
}

/**
 * Trigram similarity between two strings (0..1).
 * Higher = more similar.
 */
function trigramSimilarity(a: string, b: string): number {
  const trigramsOf = (s: string): Set<string> => {
    const padded = `  ${s.toLowerCase()}  `;
    const set = new Set<string>();
    for (let i = 0; i <= padded.length - 3; i++) {
      set.add(padded.slice(i, i + 3));
    }
    return set;
  };

  const triA = trigramsOf(a);
  const triB = trigramsOf(b);
  if (triA.size === 0 && triB.size === 0) return 1;
  if (triA.size === 0 || triB.size === 0) return 0;

  let intersection = 0;
  for (const t of triA) {
    if (triB.has(t)) intersection++;
  }

  const union = triA.size + triB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Check similarity between two description strings.
 * Returns a score 0..1.
 */
export function descriptionSimilarity(a: string, b: string): number {
  // Fast exact match check
  if (a.toLowerCase().trim() === b.toLowerCase().trim()) return 1;
  return trigramSimilarity(a, b);
}

/**
 * Detect duplicates for incoming transactions against existing DB records.
 *
 * - Exact match (date + amount + description ≥80% similar) → "exact" (Likely Duplicate)
 * - Partial match (date + amount + description <80%) → "possible" (Possible Duplicate)
 * - Also detects within-batch duplicates
 */
export function detectDuplicates(incoming: IncomingTransaction[]): DuplicateResult[] {
  if (incoming.length === 0) return [];

  // Gather unique dates from incoming to limit DB query scope
  const dates = [...new Set(incoming.map((t) => t.date))];

  // Fetch all existing transactions on those dates
  const existing: { id: number; date: string; amount: number; description: string; account_id: number; account_name: string | null }[] = [];
  for (const date of dates) {
    const rows = db.select({
      id: transactions.id,
      date: transactions.date,
      amount: transactions.amount,
      description: transactions.description,
      account_id: transactions.account_id,
      account_name: accounts.name,
    })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.account_id, accounts.id))
      .where(eq(transactions.date, date))
      .all();
    existing.push(...rows);
  }

  const results: DuplicateResult[] = incoming.map((_, i) => ({
    index: i,
    status: 'none' as DuplicateStatus,
    matchId: null,
  }));

  // Check each incoming against existing DB transactions
  for (let i = 0; i < incoming.length; i++) {
    const inc = incoming[i];

    for (const ex of existing) {
      if (inc.date !== ex.date) continue;
      if (Math.abs(inc.amount - ex.amount) > 0.005) continue;

      // Same date + same amount — check description similarity
      const sim = descriptionSimilarity(inc.description, ex.description);

      if (sim >= 0.8) {
        results[i] = {
          index: i,
          status: 'exact',
          matchId: ex.id,
          matchDescription: ex.description,
          matchDate: ex.date,
          matchAmount: ex.amount,
          matchAccountName: ex.account_name || undefined,
        };
        break; // Found exact match, stop checking
      } else if (results[i].status !== 'exact') {
        results[i] = {
          index: i,
          status: 'possible',
          matchId: ex.id,
          matchDescription: ex.description,
          matchDate: ex.date,
          matchAmount: ex.amount,
          matchAccountName: ex.account_name || undefined,
        };
      }
    }
  }

  // Within-batch duplicate detection
  for (let i = 0; i < incoming.length; i++) {
    if (results[i].status === 'exact') continue; // Already flagged

    for (let j = i + 1; j < incoming.length; j++) {
      if (results[j].status === 'exact') continue;

      const a = incoming[i];
      const b = incoming[j];

      if (a.date !== b.date) continue;
      if (Math.abs(a.amount - b.amount) > 0.005) continue;

      const sim = descriptionSimilarity(a.description, b.description);
      if (sim >= 0.8) {
        // Flag the second occurrence as a batch duplicate
        if (results[j].status !== 'exact') {
          results[j] = {
            index: j,
            status: 'possible',
            matchId: null,
            matchDescription: a.description,
            matchDate: a.date,
          };
        }
      }
    }
  }

  return results;
}

/**
 * Quick duplicate check for a single transaction (used by manual entry).
 * Returns the best match if found.
 */
export function checkSingleDuplicate(
  date: string,
  amount: number,
  description: string
): { status: DuplicateStatus; matchId: number | null; matchDescription?: string } {
  const results = detectDuplicates([{ date, amount, description }]);
  return results[0] || { status: 'none', matchId: null };
}
