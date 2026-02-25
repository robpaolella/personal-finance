import Database from 'better-sqlite3';

/**
 * Migration: Add two-factor authentication columns to users table
 * and 2FA requirement config entries to app_config.
 *
 * Idempotent — safe to run multiple times.
 */
export function migrate2FA(sqlite: Database.Database): void {
  // Skip if users table doesn't exist yet (fresh DB before seed)
  const tableExists = sqlite.prepare(
    "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='users'"
  ).get() as { cnt: number };
  if (tableExists.cnt === 0) return;

  const cols = sqlite.prepare("PRAGMA table_info('users')").all() as { name: string }[];
  const colNames = new Set(cols.map(c => c.name));

  if (!colNames.has('twofa_enabled')) {
    sqlite.exec('ALTER TABLE users ADD COLUMN twofa_enabled INTEGER NOT NULL DEFAULT 0');
    console.log('Migration: Added twofa_enabled column to users table.');
  }

  if (!colNames.has('twofa_secret')) {
    sqlite.exec('ALTER TABLE users ADD COLUMN twofa_secret TEXT');
    console.log('Migration: Added twofa_secret column to users table.');
  }

  if (!colNames.has('twofa_backup_codes')) {
    sqlite.exec('ALTER TABLE users ADD COLUMN twofa_backup_codes TEXT');
    console.log('Migration: Added twofa_backup_codes column to users table.');
  }

  if (!colNames.has('twofa_enabled_at')) {
    sqlite.exec('ALTER TABLE users ADD COLUMN twofa_enabled_at TEXT');
    console.log('Migration: Added twofa_enabled_at column to users table.');
  }

  // Ensure app_config table exists (should already from roles-permissions migration)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS app_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL
    );
  `);

  // Add 2FA requirement config entries
  sqlite.prepare("INSERT OR IGNORE INTO app_config (key, value) VALUES ('require_2fa_admin', 'false')").run();
  sqlite.prepare("INSERT OR IGNORE INTO app_config (key, value) VALUES ('require_2fa_member', 'false')").run();
}
