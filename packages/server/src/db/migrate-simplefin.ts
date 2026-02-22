import Database from 'better-sqlite3';

/**
 * Migration: Create SimpleFIN tables and add simplefin_transaction_id column.
 *
 * Idempotent — safe to run multiple times.
 */
export function migrateSimplefin(sqlite: Database.Database): void {
  // Skip if accounts table doesn't exist yet (fresh DB before seed)
  const tableExists = sqlite.prepare(
    "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='accounts'"
  ).get() as { cnt: number };
  if (tableExists.cnt === 0) return;

  // SimpleFIN Connections
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS simplefin_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      access_url TEXT NOT NULL,
      label TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // SimpleFIN Account Links
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS simplefin_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      simplefin_connection_id INTEGER NOT NULL REFERENCES simplefin_connections(id),
      simplefin_account_id TEXT NOT NULL UNIQUE,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      simplefin_account_name TEXT NOT NULL,
      simplefin_org_name TEXT,
      last_synced_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // SimpleFIN Holdings
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS simplefin_holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      simplefin_link_id INTEGER NOT NULL REFERENCES simplefin_links(id),
      symbol TEXT NOT NULL,
      description TEXT NOT NULL,
      shares REAL NOT NULL,
      cost_basis REAL NOT NULL,
      market_value REAL NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Add simplefin_transaction_id column to transactions if it doesn't exist
  const cols = sqlite.prepare("PRAGMA table_info('transactions')").all() as { name: string }[];
  const hasCol = cols.some((c) => c.name === 'simplefin_transaction_id');
  if (!hasCol) {
    sqlite.exec('ALTER TABLE transactions ADD COLUMN simplefin_transaction_id TEXT');
    sqlite.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_simplefin_id ON transactions(simplefin_transaction_id) WHERE simplefin_transaction_id IS NOT NULL');
    console.log('Added simplefin_transaction_id column to transactions table.');
  }

  console.log('SimpleFIN migration complete.');
}
