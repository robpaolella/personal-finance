Build the Dashboard page — the main overview when the user logs in.

## Backend API Routes

### Dashboard API (routes/dashboard.ts)
- GET /api/dashboard/summary?month=YYYY-MM — returns:
  - netWorth: sum of all account balances (from latest balance_snapshots) + sum of current asset values (calculated from depreciation) - liabilities
  - liquidAssets: sum of balances for accounts with classification = "liquid"
  - monthIncome: sum of absolute values of negative-amount transactions in the given month
  - monthExpenses: sum of positive-amount transactions in the given month
  - totalBudgetedExpenses: sum of budget amounts for the given month
  - priorMonthIncome and priorMonthExpenses for trend comparison

- GET /api/dashboard/spending-by-category?month=YYYY-MM — returns array of:
  - groupName, totalSpent (sum of positive transactions in that group), totalBudgeted (sum of budgets for sub-categories in that group)
  - Sorted by totalSpent descending
  - Only includes groups that have spending > 0

- GET /api/dashboard/income-vs-expenses?year=YYYY — returns array of 12 objects (one per month):
  - month (1-12), totalIncome, totalExpenses

- GET /api/dashboard/recent-transactions?limit=8 — returns the 8 most recent transactions with account and category info

## Frontend — Dashboard Page

### Header
- Title "Dashboard" with subtitle showing current month and year (e.g., "February 2025 Overview")
- Two buttons: "AI Summary" (gray, with star icon) and "+ Transaction" (dark navy)
- The AI Summary button is non-functional for now (placeholder for future Claude API integration)

### KPI Cards Row (4 columns)
1. Net Worth — with percentage change vs prior month
2. Liquid Assets — with dollar change from interest/deposits
3. Monthly Income — with "On track" or amount remaining vs budget
4. Monthly Expenses — with "X% of budget" indicator

### Two-Column Section

#### Left: Spending by Category
- Card title "Spending by Category" with subtitle "Parent categories total all sub-categories"
- For each category group with spending:
  - Row: colored dot + group name (left), spent / budgeted amounts in monospace (right)
  - Progress bar underneath: color matches category, turns red if over budget
- Category colors (use consistently throughout the app):
  - Auto/Transportation: #ef4444 (red)
  - Clothing: #ec4899 (pink)
  - Daily Living: #10b981 (emerald)
  - Discretionary: #a855f7 (purple)
  - Dues/Subscriptions: #6366f1 (indigo)
  - Entertainment: #8b5cf6 (violet)
  - Household: #3b82f6 (blue)
  - Insurance: #f59e0b (amber)
  - Health: #14b8a6 (teal)
  - Utilities: #f97316 (orange)
  - Savings: #06b6d4 (cyan)

#### Right: Income vs Expenses Bar Chart
- Title "Income vs Expenses (YYYY)"
- 12 small bar pairs (one blue for income, one orange for expenses) for each month
- Month labels underneath in small monospace text
- Future months shown as light gray placeholder bars
- Legend at the bottom with colored dots

### Recent Transactions Table
- Title "Recent Transactions" with "View All →" link to /transactions
- Show 8 most recent transactions in a table
- Columns: Date, Description, Account, Category, Sub-Category, Amount
- Same styling as the main Transactions page table
