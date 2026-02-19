Build the Net Worth page with account balances, depreciable assets, and the ability to edit assets.

## Backend API Routes

### Balance Snapshots API (routes/balances.ts)
- GET /api/balances/latest — returns the most recent balance snapshot for each active account
- POST /api/balances — create a new balance snapshot. Body: { accountId, date, balance, note? }
- GET /api/balances/history?accountId=X — returns all snapshots for an account, ordered by date

### Assets API (routes/assets.ts)
- GET /api/assets — returns all assets with calculated current value. Current value formula:
  - yearsOwned = (today - purchaseDate) / 365.25
  - annualDepreciation = (cost - salvageValue) / lifespanYears
  - currentValue = max(salvageValue, cost - (annualDepreciation * yearsOwned))
- GET /api/assets/:id — single asset
- POST /api/assets — create asset. Body: { name, purchaseDate, cost, lifespanYears, salvageValue }
- PUT /api/assets/:id — update asset
- DELETE /api/assets/:id — delete asset

### Net Worth API (routes/networth.ts)
- GET /api/networth/summary — returns:
  - liquidTotal: sum of latest balances for liquid-classified accounts
  - investmentTotal: sum of latest balances for investment-classified accounts
  - liabilityTotal: sum of absolute latest balances for liability-classified accounts
  - physicalAssetTotal: sum of current values of all assets
  - netWorth: liquidTotal + investmentTotal + physicalAssetTotal - liabilityTotal
  - accounts: array of all accounts with latest balance and classification
  - assets: array of all assets with calculated current value

## Frontend — Net Worth Page

### Header
- Title "Net Worth" with subtitle "As of {current date}"

### Hero Card (full width)
- Dark gradient background (navy to dark slate)
- "TOTAL NET WORTH" label in small gray uppercase text
- Large net worth value in white, 40px bold monospace
- Four breakdown values underneath in a row:
  1. Liquid Assets — cyan (#38bdf8)
  2. Investments — purple (#a78bfa)
  3. Physical Assets — yellow (#fbbf24)
  4. Liabilities — red (#f87171), shown in parentheses

### Two-Column Layout

#### Left: Accounts
- Section headers with colored left dots and totals:
  - "LIQUID ASSETS" (cyan) — checking, savings, venmo, cash accounts
  - "INVESTMENTS & RETIREMENT" (purple) — investment, retirement accounts
  - "LIABILITIES" (red) — credit card accounts
- Each account row shows: name (last four), owner name in small uppercase, balance in monospace
- Negative balances (liabilities) shown in red with parentheses
- "Update Balances" button that opens a modal to enter current balances for all accounts

#### Right: Depreciable Assets
- "Add" button in the top right
- Table with columns: Asset (with purchase date underneath in small mono text), Cost, Life (Xyr), Current Value, Edit button
- Total row at the bottom
- Clicking the edit pencil icon on any asset expands an inline edit form below the table:
  - Fields: Asset Name, Purchase Date, Original Cost ($), Lifespan (years), Salvage Value ($)
  - Buttons: Cancel, Save, Delete (red)
  - Cancel collapses the form
- "Add" opens the same form but empty, at the top
