import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'ledger.db');

if (!fs.existsSync(dbPath)) {
  console.log('No database found — nothing to migrate.');
  process.exit(0);
}

const sqlite = new Database(dbPath);
sqlite.pragma('foreign_keys = ON');

console.log('Migrating income categories to group/sub hierarchy...');

const before = sqlite.prepare("SELECT id, group_name, sub_name, display_name FROM categories WHERE type = 'income'").all() as {
  id: number; group_name: string; sub_name: string; display_name: string;
}[];

console.log(`Found ${before.length} income categories to migrate.`);

const update = sqlite.prepare(
  "UPDATE categories SET group_name = 'Income', display_name = 'Income: ' || sub_name WHERE type = 'income' AND group_name != 'Income'"
);
const result = update.run();
console.log(`Updated ${result.changes} rows.`);

const after = sqlite.prepare("SELECT id, group_name, sub_name, display_name FROM categories WHERE type = 'income'").all();
console.log('\nAfter migration:');
for (const row of after) {
  console.log(`  id=${(row as Record<string, unknown>).id} group="${(row as Record<string, unknown>).group_name}" sub="${(row as Record<string, unknown>).sub_name}" display="${(row as Record<string, unknown>).display_name}"`);
}

sqlite.close();
console.log('\nMigration complete.');
