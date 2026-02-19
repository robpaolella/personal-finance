Build the Transactions page — the core data entry and viewing page that replaces the General Ledger spreadsheet.

## Backend API Routes

### Transactions API (routes/transactions.ts)
- GET /api/transactions — returns transactions with joined account name and category info. Supports query params:
  - startDate, endDate (ISO date strings, defaults to current month)
  - accountId (filter by account)
  - categoryId (filter by specific category)
  - groupName (filter by parent category group)
  - type (income or expense, determined by amount sign)
  - owner (filter by account owner)
  - search (search description, note fields)
  - limit (default 50), offset (for pagination)
  - sortBy (date, amount, description), sortOrder (asc, desc, default: date desc)
- Each returned transaction should include: id, date, description, note, amount, account { id, name, lastFour, owner }, category { id, groupName, subName, displayName }
- GET /api/transactions/:id — single transaction with full details
- POST /api/transactions — create transaction. Body: { accountId, date, description, note?, categoryId, amount }
- PUT /api/transactions/:id — update transaction
- DELETE /api/transactions/:id — delete transaction
- GET /api/transactions/summary — returns total income and total expenses for the given date range and filters

## Frontend — Transactions Page

### Header
- Title "Transactions" with count of displayed transactions
- "Add Transaction" button (dark navy)

### Filter Bar (inside a card)
- Search input with magnifying glass icon (searches description and notes)
- Account dropdown (populated from accounts, shows "All" by default)
- Type dropdown: All, Income, Expense
- Date range: show current month by default, with ability to change

### Transaction Table
- Columns: Date, Description, Account, Category (parent group), Sub-Category, Amount
- Date column uses DM Mono font, 12px, formatted as YYYY-MM-DD
- Description is bold dark text
- Account shown as a gray monospace badge
- Category (group) shown as small gray text
- Sub-Category shown as a blue badge
- Amount: green with "+" prefix for income (negative values), black for expenses (positive values), DM Mono font
- Rows have hover highlight (#f8fafc)
- Click a row to open an edit modal

### Add/Edit Transaction Modal
- Fields:
  - Date (date picker, defaults to today)
  - Account (dropdown from accounts, grouped by owner)
  - Description (text)
  - Note (text, optional)
  - Category (two-step: first select parent group, then sub-category dropdown filters to that group)
  - Amount (number input)
  - Type toggle: Expense / Income (this controls the sign — user enters positive number, toggle determines if it's stored as positive or negative)
- Save and Cancel buttons
- For edit mode: also show a Delete button with confirmation

### Pagination
- Show "Showing X of Y transactions" at the bottom
- Load more button or infinite scroll
