import { sqliteTable, text, integer, real, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core';

// === Users ===
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  display_name: text('display_name').notNull(),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

// === Accounts ===
export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  last_four: text('last_four'),
  type: text('type').notNull(), // checking, savings, credit, investment, retirement, venmo, cash
  classification: text('classification').notNull(), // liquid, investment, liability
  owner: text('owner').notNull(), // legacy — kept for backward compat; use account_owners instead
  is_active: integer('is_active').default(1),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

// === Account Owners (junction table) ===
export const accountOwners = sqliteTable('account_owners', {
  account_id: integer('account_id').notNull().references(() => accounts.id),
  user_id: integer('user_id').notNull().references(() => users.id),
}, (table) => [
  primaryKey({ columns: [table.account_id, table.user_id] }),
]);

// === Categories ===
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  group_name: text('group_name').notNull(),
  sub_name: text('sub_name').notNull(),
  display_name: text('display_name').notNull(),
  type: text('type').notNull(), // income, expense
  is_deductible: integer('is_deductible').default(0),
  sort_order: integer('sort_order').default(0),
});

// === Transactions ===
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  account_id: integer('account_id').notNull().references(() => accounts.id),
  date: text('date').notNull(),
  description: text('description').notNull(),
  note: text('note'),
  category_id: integer('category_id').notNull().references(() => categories.id),
  amount: real('amount').notNull(),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

// === Budgets ===
export const budgets = sqliteTable('budgets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category_id: integer('category_id').notNull().references(() => categories.id),
  month: text('month').notNull(),
  amount: real('amount').notNull(),
}, (table) => [
  uniqueIndex('budgets_category_month_idx').on(table.category_id, table.month),
]);

// === Balance Snapshots ===
export const balanceSnapshots = sqliteTable('balance_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  account_id: integer('account_id').notNull().references(() => accounts.id),
  date: text('date').notNull(),
  balance: real('balance').notNull(),
  note: text('note'),
});

// === Assets ===
export const assets = sqliteTable('assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  purchase_date: text('purchase_date').notNull(),
  cost: real('cost').notNull(),
  lifespan_years: real('lifespan_years').notNull(),
  salvage_value: real('salvage_value').notNull(),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});
