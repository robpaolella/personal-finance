import Database from 'better-sqlite3';
import path from 'path';

/**
 * Migration: Create account_owners junction table and populate it
 * from the existing accounts.owner column.
 *
 * Idempotent — safe to run multiple times.
 */
export function migrateAccountOwners(sqlite: Database.Database): void {
  // Create table if it doesn't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS account_owners (
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      PRIMARY KEY (account_id, user_id)
    );
  `);

  // Check if migration already populated data
  const existing = sqlite.prepare('SELECT COUNT(*) as cnt FROM account_owners').get() as { cnt: number };
  if (existing.cnt > 0) return;

  // Migrate: for each active account, map owner display_name → user_id
  const accountRows = sqlite.prepare('SELECT id, owner FROM accounts WHERE is_active = 1').all() as { id: number; owner: string }[];
  const userRows = sqlite.prepare('SELECT id, display_name FROM users').all() as { id: number; display_name: string }[];
  const userByName = new Map(userRows.map((u) => [u.display_name, u.id]));

  const insert = sqlite.prepare('INSERT OR IGNORE INTO account_owners (account_id, user_id) VALUES (?, ?)');
  const txn = sqlite.transaction(() => {
    for (const acct of accountRows) {
      const userId = userByName.get(acct.owner);
      if (userId) {
        insert.run(acct.id, userId);
      } else {
        console.warn(`Migration: No user found for account "${acct.owner}" (account_id=${acct.id})`);
      }
    }
  });
  txn();

  const migrated = sqlite.prepare('SELECT COUNT(*) as cnt FROM account_owners').get() as { cnt: number };
  console.log(`Migrated ${migrated.cnt} account-owner relationships to account_owners table.`);
}
