import Database from 'better-sqlite3';
import { sqlite as defaultSqlite } from './index.js';

/**
 * Resolve a merchant name to a merchant id, creating the merchant if needed.
 *
 * Returns null for empty/blank names (so a transaction can be merchant-less).
 * Names are matched exactly (case-sensitive) so the caller controls dedup via
 * the exact string. Safe to call inside a better-sqlite3 transaction — pass the
 * same handle so the lookup/insert stays atomic with surrounding writes.
 */
export function findOrCreateMerchant(name: string | null | undefined, sqlite: Database.Database = defaultSqlite): number | null {
  const clean = (name ?? '').trim();
  if (!clean) return null;

  const existing = sqlite.prepare('SELECT id FROM merchants WHERE name = ?').get(clean) as { id: number } | undefined;
  if (existing) return existing.id;

  // INSERT OR IGNORE guards against a race on the UNIQUE(name) index; re-select
  // to get the id whether we inserted or lost the race.
  sqlite.prepare('INSERT OR IGNORE INTO merchants (name) VALUES (?)').run(clean);
  const row = sqlite.prepare('SELECT id FROM merchants WHERE name = ?').get(clean) as { id: number };
  return row.id;
}
