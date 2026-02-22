import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';

const defaultDir = path.resolve(process.cwd(), 'data');
const dbPath = process.env.DATABASE_PATH || path.join(defaultDir, 'ledger.db');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Delete existing DB for clean seed
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Deleted existing database.');
}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

const db = drizzle(sqlite, { schema });

async function seed() {
  console.log('Creating tables...');

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      last_four TEXT,
      type TEXT NOT NULL,
      classification TEXT NOT NULL,
      owner TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS account_owners (
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      PRIMARY KEY (account_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_name TEXT NOT NULL,
      sub_name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      type TEXT NOT NULL,
      is_deductible INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      note TEXT,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      amount REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      month TEXT NOT NULL,
      amount REAL NOT NULL,
      UNIQUE(category_id, month)
    );

    CREATE TABLE IF NOT EXISTS balance_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      date TEXT NOT NULL,
      balance REAL NOT NULL,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      purchase_date TEXT NOT NULL,
      cost REAL NOT NULL,
      lifespan_years REAL NOT NULL,
      salvage_value REAL NOT NULL,
      depreciation_method TEXT NOT NULL DEFAULT 'straight_line',
      declining_rate REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // --- Users ---
  console.log('Seeding users...');
  const robertHash = await bcrypt.hash('changeme', 10);
  const kathleenHash = await bcrypt.hash('changeme', 10);

  db.insert(schema.users).values([
    { username: 'robert', password_hash: robertHash, display_name: 'Robert' },
    { username: 'kathleen', password_hash: kathleenHash, display_name: 'Kathleen' },
  ]).run();

  // --- Categories ---
  console.log('Seeding categories...');

  let sortOrder = 0;

  // Income categories (all under group_name "Income")
  const incomeCategories = [
    'Take Home Pay', '401(k)', 'Gifts Received', 'Tax Refunds',
    'Interest Income', 'Refunds/Reimbursements', 'Other Income',
  ];

  for (const name of incomeCategories) {
    db.insert(schema.categories).values({
      group_name: 'Income',
      sub_name: name,
      display_name: `Income: ${name}`,
      type: 'income',
      is_deductible: 0,
      sort_order: sortOrder++,
    }).run();
  }

  // Expense categories
  const expenseGroups: Array<{ group: string; subs: string[]; deductible?: boolean }> = [
    { group: 'Auto/Transportation', subs: ['Fuel', 'Service', 'Transportation', 'Other Auto/Transportation'] },
    { group: 'Business', subs: ['Unreimbursed', 'Office At Home', 'Meeting Expenses', 'Other Business Expenses'], deductible: true },
    { group: 'Charitable Contributions', subs: ['Religious', 'Other Non-Profit'], deductible: true },
    { group: 'Clothing', subs: ['Clothes/Shoes', 'Laundry/Dry Cleaning', 'Other Clothing'] },
    { group: 'Daily Living', subs: ['Dining/Eating Out', 'Groceries', 'Personal Supplies', 'Pets', 'Other Daily Living'] },
    { group: 'Discretionary', subs: ['Robert', 'Kathleen'] },
    { group: 'Dues/Subscriptions', subs: ['Digital Services', 'Gym', 'Newspaper'] },
    { group: 'Education', subs: ['Tuition', 'Other Education'] },
    { group: 'Entertainment', subs: ['Books/Magazine', 'Dates', 'Film/Photos', 'Hobby', 'Other Entertainment'] },
    { group: 'Health', subs: ['Medical Insurance', 'Medicine/Drug', 'Doctor/Dentist/Optometrist', 'Hospital', 'Other Health'], deductible: true },
    { group: 'Household', subs: ['Rent', 'Farm and Garden', 'Tools', 'Furnishings', 'Appliances', 'Improvements', 'Maintenance', 'Other Household'] },
    { group: 'Insurance', subs: ['Auto', 'Health', 'Other'] },
    { group: 'Loan', subs: ['Auto', 'Personal Note', 'Other'] },
    { group: 'Miscellaneous', subs: ['Short-term Personal Loan (Outbound)', 'Other'] },
    { group: 'Non-deductible Expense', subs: ['Other'] },
    { group: 'Other', subs: ['Gifts Given', 'Venmo Transaction', 'Vacation/Travel'] },
    { group: 'Savings', subs: ['Emergency Fund', 'Investments', 'Other'] },
    { group: 'Tax Not Withheld', subs: ['Fed', 'Other'] },
    { group: 'Utilities', subs: ['Internet', 'Cellphone', 'Power', 'Water', 'Other'] },
  ];

  for (const { group, subs, deductible } of expenseGroups) {
    for (const sub of subs) {
      db.insert(schema.categories).values({
        group_name: group,
        sub_name: sub,
        display_name: `${group}: ${sub}`,
        type: 'expense',
        is_deductible: deductible ? 1 : 0,
        sort_order: sortOrder++,
      }).run();
    }
  }

  // Count results
  const userCount = sqlite.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  const catCount = sqlite.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  const incCount = sqlite.prepare("SELECT COUNT(*) as count FROM categories WHERE type = 'income'").get() as { count: number };
  const expCount = sqlite.prepare("SELECT COUNT(*) as count FROM categories WHERE type = 'expense'").get() as { count: number };
  const dedCount = sqlite.prepare('SELECT COUNT(*) as count FROM categories WHERE is_deductible = 1').get() as { count: number };

  // --- Sample Assets ---
  console.log('Seeding sample assets...');
  db.insert(schema.assets).values([
    {
      name: 'Living Room Sofa',
      purchase_date: '2024-03-15',
      cost: 1200,
      lifespan_years: 10,
      salvage_value: 100,
      depreciation_method: 'straight_line',
    },
    {
      name: 'MacBook Pro',
      purchase_date: '2025-06-01',
      cost: 2400,
      lifespan_years: 5,
      salvage_value: 200,
      depreciation_method: 'declining_balance',
      declining_rate: 30,
    },
  ]).run();

  console.log(`\nSeed complete!`);
  console.log(`  Users: ${userCount.count}`);
  console.log(`  Categories: ${catCount.count} (${incCount.count} income, ${expCount.count} expense)`);
  console.log(`  Deductible categories: ${dedCount.count}`);

  sqlite.close();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
