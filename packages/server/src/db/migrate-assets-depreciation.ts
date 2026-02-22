import Database from 'better-sqlite3';

/**
 * Migration: Add depreciation_method and declining_rate columns to assets.
 *
 * Idempotent — safe to run multiple times.
 */
export function migrateAssetsDepreciation(sqlite: Database.Database): void {
  const tableExists = sqlite.prepare(
    "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='assets'"
  ).get() as { cnt: number };
  if (tableExists.cnt === 0) return;

  const cols = sqlite.prepare("PRAGMA table_info('assets')").all() as { name: string }[];
  const colNames = new Set(cols.map((c) => c.name));

  if (!colNames.has('depreciation_method')) {
    sqlite.exec("ALTER TABLE assets ADD COLUMN depreciation_method TEXT NOT NULL DEFAULT 'straight_line'");
    console.log('Added depreciation_method column to assets table.');
  }

  if (!colNames.has('declining_rate')) {
    sqlite.exec('ALTER TABLE assets ADD COLUMN declining_rate REAL');
    console.log('Added declining_rate column to assets table.');
  }

  console.log('Assets depreciation migration complete.');
}
