import { sqliteTable, text, integer, real, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core';

// === Users ===
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  display_name: text('display_name').notNull(),
  role: text('role').notNull().default('member'),
  is_active: integer('is_active').notNull().default(1),
  twofa_enabled: integer('twofa_enabled').notNull().default(0),
  twofa_secret: text('twofa_secret'),
  twofa_backup_codes: text('twofa_backup_codes'),
  twofa_enabled_at: text('twofa_enabled_at'),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

// === User Permissions ===
export const userPermissions = sqliteTable('user_permissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id),
  permission: text('permission').notNull(),
  granted: integer('granted').notNull().default(0),
}, (table) => [
  uniqueIndex('user_permissions_user_perm_idx').on(table.user_id, table.permission),
]);

// === App Config ===
export const appConfig = sqliteTable('app_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
});

// === Dev Storage (QA checklists, dev tool state) ===
export const devStorage = sqliteTable('dev_storage', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updated_at: text('updated_at').notNull(),
});

// === Accounts ===
export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  last_four: text('last_four'),
  type: text('type').notNull(), // checking, savings, credit, investment, retirement, venmo, cash
  classification: text('classification').notNull(), // liquid, investment, liability
  institution: text('institution'), // bank/brokerage name (backfilled from simplefin_links.simplefin_org_name)
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
  type: text('type').notNull(), // income, expense, savings
  is_deductible: integer('is_deductible').default(0),
  sort_order: integer('sort_order').default(0),
});

// === Merchants ===
// First-class vendor/payee. transactions.description keeps the raw statement
// text; transactions.merchant_id links to the clean, dedup'd display name.
export const merchants = sqliteTable('merchants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

// === Transactions ===
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  account_id: integer('account_id').notNull().references(() => accounts.id),
  date: text('date').notNull(),
  description: text('description').notNull(),
  note: text('note'),
  category_id: integer('category_id').references(() => categories.id),
  merchant_id: integer('merchant_id').references(() => merchants.id),
  amount: real('amount').notNull(),
  simplefin_transaction_id: text('simplefin_transaction_id').unique(),
  // Auto-categorization: confidence of the assigned category (0–1, null = manual),
  // and a flag for low-confidence rows queued for user review.
  categorize_confidence: real('categorize_confidence'),
  needs_review: integer('needs_review').default(0),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

// === Transaction Splits ===
export const transactionSplits = sqliteTable('transaction_splits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  transaction_id: integer('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  category_id: integer('category_id').notNull().references(() => categories.id),
  amount: real('amount').notNull(),
  // Per-split (full-Monarch model): each split leg can carry its OWN merchant
  // and note. NULL merchant_id = inherit the parent transaction's merchant.
  merchant_id: integer('merchant_id').references(() => merchants.id),
  note: text('note'),
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

// === SimpleFIN Connections ===
export const simplefinConnections = sqliteTable('simplefin_connections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').references(() => users.id),
  access_url: text('access_url').notNull(),
  label: text('label').notNull(),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
  updated_at: text('updated_at').default('CURRENT_TIMESTAMP'),
});

// === SimpleFIN Account Links ===
export const simplefinLinks = sqliteTable('simplefin_links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  simplefin_connection_id: integer('simplefin_connection_id').notNull().references(() => simplefinConnections.id),
  simplefin_account_id: text('simplefin_account_id').notNull().unique(),
  account_id: integer('account_id').notNull().references(() => accounts.id),
  simplefin_account_name: text('simplefin_account_name').notNull(),
  simplefin_org_name: text('simplefin_org_name'),
  last_synced_at: text('last_synced_at'),
  // Daily auto-pull status per account: 'ok' | 'error' (null = never attempted).
  last_sync_status: text('last_sync_status'),
  last_sync_error: text('last_sync_error'),
  last_sync_attempt_at: text('last_sync_attempt_at'),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

// === SimpleFIN Holdings ===
export const simplefinHoldings = sqliteTable('simplefin_holdings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  simplefin_link_id: integer('simplefin_link_id').notNull().references(() => simplefinLinks.id),
  symbol: text('symbol').notNull(),
  description: text('description').notNull(),
  shares: real('shares').notNull(),
  cost_basis: real('cost_basis').notNull(),
  market_value: real('market_value').notNull(),
  updated_at: text('updated_at').notNull(),
});

// === Assets ===
export const assets = sqliteTable('assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  purchase_date: text('purchase_date').notNull(),
  cost: real('cost').notNull(),
  lifespan_years: real('lifespan_years').notNull(),
  salvage_value: real('salvage_value').notNull(),
  depreciation_method: text('depreciation_method').notNull().default('straight_line'),
  declining_rate: real('declining_rate'),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

// === Budget Templates ===
export const budgetTemplates = sqliteTable('budget_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category_id: integer('category_id').notNull().references(() => categories.id),
  amount: real('amount').notNull(),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
  updated_at: text('updated_at').default('CURRENT_TIMESTAMP'),
}, (table) => [
  uniqueIndex('budget_templates_category_idx').on(table.category_id),
]);

// === Budget Recurring ===
export const budgetRecurring = sqliteTable('budget_recurring', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(),
  category_id: integer('category_id').notNull().references(() => categories.id),
  amount: real('amount'),
  months: text('months').notNull(), // JSON array of month numbers, e.g. '[1,7]'
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
  updated_at: text('updated_at').default('CURRENT_TIMESTAMP'),
});

// === Dismissed Transfers ===
export const dismissedTransfers = sqliteTable('dismissed_transfers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  account_id: integer('account_id').notNull().references(() => accounts.id),
  signature: text('signature').notNull(),
  date: text('date').notNull(),
  amount: real('amount').notNull(),
  description: text('description').notNull(),
  dismissed_at: text('dismissed_at').default('CURRENT_TIMESTAMP'),
}, (table) => [
  uniqueIndex('dismissed_transfers_acct_sig_idx').on(table.account_id, table.signature),
]);

// === Notifications (per-user, persistent) ===
// General-purpose in-app notification center. First driver: daily-sync failures.
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),        // sync_failure | needs_review | ...
  severity: text('severity').notNull().default('info'), // info | success | warning | error
  title: text('title').notNull(),
  body: text('body'),
  action_label: text('action_label'),  // e.g. 'Retry'
  action_target: text('action_target'),// e.g. '/settings?tab=banksync' or an account id
  dedupe_key: text('dedupe_key'),       // collapse repeats (e.g. 'sync_failure:acct:12')
  is_read: integer('is_read').notNull().default(0),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
}, (table) => [
  uniqueIndex('notifications_user_dedupe_idx').on(table.user_id, table.dedupe_key),
]);

// === Category Rules (explicit merchant/description → category, user-managed) ===
// Highest-priority layer of auto-categorization; overrides learned + heuristic.
export const categoryRules = sqliteTable('category_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  match_type: text('match_type').notNull().default('merchant'), // merchant | contains | regex
  pattern: text('pattern').notNull(),                            // merchant_id (as text) or text pattern
  category_id: integer('category_id').notNull().references(() => categories.id),
  priority: integer('priority').notNull().default(0),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

// === Pay Cycles (dynamic take-home income schedules) ===
// Feeds the budget import wizard's "Expected Income" step. amount is the
// per-paycheck take-home, stored POSITIVE (income budget rows are positive,
// unlike income transactions which are stored negative).
export const payCycles = sqliteTable('pay_cycles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(),
  category_id: integer('category_id').notNull().references(() => categories.id), // target income category
  user_id: integer('user_id').references(() => users.id), // nullable — owner/attribution
  frequency: text('frequency').notNull(), // weekly | biweekly | semi_monthly | monthly
  amount: real('amount').notNull(), // per-paycheck take-home, positive
  anchor_date: text('anchor_date'), // 'YYYY-MM-DD' phase reference (weekly/biweekly)
  day_of_month_1: integer('day_of_month_1'), // semi_monthly first day (0 = last day of month)
  day_of_month_2: integer('day_of_month_2'), // semi_monthly second day (0 = last day of month)
  day_of_month: integer('day_of_month'), // monthly day (0 = last day of month)
  effective_start: text('effective_start'), // 'YYYY-MM-DD' inclusive lower bound, nullable
  effective_end: text('effective_end'), // 'YYYY-MM-DD' inclusive upper bound, nullable
  is_active: integer('is_active').notNull().default(1),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
  updated_at: text('updated_at').default('CURRENT_TIMESTAMP'),
});
