Build the Budget page with owner filtering and month navigation.

## Backend API Routes

### Budgets API (routes/budgets.ts)
- GET /api/budgets?month=YYYY-MM — returns all budgets for the given month with category info
- POST /api/budgets — create or update budget (upsert). Body: { categoryId, month, amount }
- PUT /api/budgets/:id — update budget amount
- DELETE /api/budgets/:id — delete budget entry

- GET /api/budgets/summary?month=YYYY-MM&owner=all|Robert|Kathleen — returns:
  - For income categories: budgeted amount, actual amount (from transactions, filtered by owner's accounts if specified)
  - For expense categories grouped by parent: budgeted amount per sub-category, actual amount per sub-category (from transactions, filtered by owner's accounts if specified)
  - Group totals for both budget and actual

## Frontend — Budget Page

### Header
- Title "Monthly Budget" with subtitle showing current month
- Owner filter toggle (All / Robert / Kathleen) using the shared OwnerFilter component
- Month navigation: "← Previous" and "Next →" buttons with current month displayed between them

### Owner Filter Info Bar
- When filtering by an individual owner, show a blue info bar: "Showing data from {Owner}'s accounts only"
- When "All" is selected, this bar is hidden

### KPI Cards Row (4 columns)
1. Budgeted Income — total of all income category budgets
2. Actual Income — total actual income from transactions (filtered by owner)
3. Budgeted Expenses — total of all expense category budgets
4. Actual Expenses — total actual expenses from transactions (filtered by owner)
- Each shows the difference or "remaining" as subtitle

### Two-Column Layout

#### Left Column: Income
- Green header "Income"
- Table with columns: Category, Budget, Actual, Difference
- One row per income category (these are flat, no parent/sub hierarchy)
- Difference is green if positive (actual > budget), red if negative
- Total row at the bottom with bold values and background highlight
- Budget values should be editable — clicking a budget cell lets you type a new value

#### Right Column: Expenses
- Orange header "Expenses"
- Scrollable container (max height ~460px)
- Grouped by parent category:
  - Group header row: colored dot + group name (uppercase), group actual / group budget totals
  - Under each group, sub-category rows indented with:
    - Sub-category name
    - Small progress bar (colored by group, red if over budget)
    - Actual amount in monospace
    - Difference from budget (red if over)
- Budget values should be editable inline
- When a budget is edited, call the upsert API endpoint
