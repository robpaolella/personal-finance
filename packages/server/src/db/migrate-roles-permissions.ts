import Database from 'better-sqlite3';

/**
 * Default permissions for new member users.
 * Admins bypass this table entirely.
 */
export const DEFAULT_MEMBER_PERMISSIONS: Record<string, number> = {
  'transactions.create': 1,
  'transactions.edit': 1,
  'transactions.delete': 0,
  'transactions.bulk_edit': 0,
  'import.csv': 1,
  'import.bank_sync': 1,
  'categories.create': 0,
  'categories.edit': 0,
  'categories.delete': 0,
  'accounts.create': 0,
  'accounts.edit': 0,
  'accounts.delete': 0,
  'budgets.edit': 1,
  'balances.update': 1,
  'assets.create': 0,
  'assets.edit': 0,
  'assets.delete': 0,
  'simplefin.manage': 0,
};

/**
 * Migration: Add roles, permissions, and app_config tables.
 *
 * - Adds role and is_active columns to users table
 * - Creates user_permissions table with default permissions for existing members
 * - Creates app_config table with setup_complete = true for existing installs
 *
 * Idempotent — safe to run multiple times.
 */
export function migrateRolesPermissions(sqlite: Database.Database): void {
  // Skip if users table doesn't exist yet (fresh DB before seed)
  const tableExists = sqlite.prepare(
    "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='users'"
  ).get() as { cnt: number };
  if (tableExists.cnt === 0) return;

  // Add role column if it doesn't exist
  const cols = sqlite.prepare("PRAGMA table_info('users')").all() as { name: string }[];
  const colNames = new Set(cols.map(c => c.name));

  if (!colNames.has('role')) {
    sqlite.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'member'");
    // Set the first user (lowest ID) to admin
    const firstUser = sqlite.prepare('SELECT id FROM users ORDER BY id ASC LIMIT 1').get() as { id: number } | undefined;
    if (firstUser) {
      sqlite.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(firstUser.id);
    }
    console.log('Migration: Added role column to users table.');
  }

  if (!colNames.has('is_active')) {
    sqlite.exec('ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
    console.log('Migration: Added is_active column to users table.');
  }

  // Create user_permissions table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS user_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      permission TEXT NOT NULL,
      granted INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, permission)
    );
  `);

  // Create app_config table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS app_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL
    );
  `);

  // Insert default permissions for existing member users (if not already done)
  const memberUsers = sqlite.prepare("SELECT id FROM users WHERE role = 'member'").all() as { id: number }[];
  const insertPerm = sqlite.prepare('INSERT OR IGNORE INTO user_permissions (user_id, permission, granted) VALUES (?, ?, ?)');

  const txn = sqlite.transaction(() => {
    for (const user of memberUsers) {
      for (const [perm, granted] of Object.entries(DEFAULT_MEMBER_PERMISSIONS)) {
        insertPerm.run(user.id, perm, granted);
      }
    }
  });
  txn();

  if (memberUsers.length > 0) {
    const permCount = sqlite.prepare('SELECT COUNT(*) as cnt FROM user_permissions').get() as { cnt: number };
    console.log(`Migration: Ensured ${permCount.cnt} permission rows for ${memberUsers.length} member user(s).`);
  }

  // Mark setup as complete for existing installs (if users exist)
  const userCount = sqlite.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (userCount.cnt > 0) {
    sqlite.prepare("INSERT OR IGNORE INTO app_config (key, value) VALUES ('setup_complete', 'true')").run();
  }
}
