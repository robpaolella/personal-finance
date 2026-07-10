import Database from 'better-sqlite3';

/**
 * Migration: seed the Savings section categories (Retheme v2).
 *
 * Savings is the third category section (alongside income/expense). Categories
 * carry type='savings' — a distinct value so existing income/expense sums exclude
 * them by default. Savings contributions are outflows (positive amount), handled
 * like expenses for sign but rolled up in their own section.
 *
 * This is the single seeding path for savings categories: it runs on every
 * startup and is idempotent (seeds only when no savings categories exist yet),
 * so both fresh installs and existing databases converge to the same model.
 */
export const SAVINGS_CATEGORIES: Array<{ group: string; sub: string }> = [
  { group: 'Savings Account', sub: 'Traditional Savings' },
  { group: 'Savings Account', sub: 'High Yield Savings' },
  { group: 'Investment Account', sub: 'IRA' },
  { group: 'Investment Account', sub: '401k' },
  { group: 'Investment Account', sub: 'Brokerage' },
  { group: 'Investment Account', sub: 'Education' },
];

export function migrateSavingsCategories(sqlite: Database.Database): void {
  const tableExists = sqlite.prepare(
    "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='categories'"
  ).get() as { cnt: number };
  if (tableExists.cnt === 0) return;

  const existing = sqlite.prepare(
    "SELECT COUNT(*) as cnt FROM categories WHERE type = 'savings'"
  ).get() as { cnt: number };
  if (existing.cnt > 0) return; // already seeded / customized — leave alone

  const maxSort = sqlite.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) as m FROM categories'
  ).get() as { m: number };
  let sortOrder = maxSort.m + 1;

  const insert = sqlite.prepare(
    'INSERT INTO categories (group_name, sub_name, display_name, type, is_deductible, sort_order) VALUES (?, ?, ?, ?, 0, ?)'
  );
  const run = sqlite.transaction(() => {
    for (const { group, sub } of SAVINGS_CATEGORIES) {
      insert.run(group, sub, `${group}: ${sub}`, 'savings', sortOrder++);
    }
  });
  run();
  console.log(`Seeded ${SAVINGS_CATEGORIES.length} savings categories.`);
}
