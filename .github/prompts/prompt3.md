# SimpleFIN Integration — Prompt 3: Bank Sync Import Flow & Holdings Display

This prompt covers the Bank Sync tab on the Import page and the investment holdings display on the Net Worth page. Before starting, re-read `.github/copilot-instructions.md` (especially the Design Reference section) and `.github/design-reference.jsx`. Also review the DuplicateBadge, DuplicateComparison, and TransferBadge components built in prompt2.md — you'll use them here.

---

## 1. Import Page — Tab Navigation

Add a tab switcher at the top of the Import page.

- Two tabs: **"CSV Import"** | **"Bank Sync"**
- Style: pill-style toggle similar to the Owner Filter component — a container with two buttons, active tab has white background with shadow (light) or dark background (dark mode), inactive is transparent
- CSV Import shows the existing 3-step wizard (completely unchanged)
- Bank Sync shows the new flow described below
- Default tab: Bank Sync (if SimpleFIN connections exist), CSV Import (if no connections)
- Tab state can be controlled via URL query param (e.g., `/import?tab=sync`) so links from other pages can deep-link to the right tab

**Commit:** `feat(ui): add tab navigation to Import page`

---

## 2. Bank Sync — Not Connected State

If no SimpleFIN connections exist:
- Centered content in the card area
- Icon: a bank/institution icon or the sync icon from the nav
- Title: "Bank Sync Not Configured"
- Subtitle: "Connect your bank accounts via SimpleFIN to automatically pull transactions and balances"
- Button: "Set Up in Settings →" — links to the Settings page, scrolled/focused to the Bank Sync section
- Small note underneath: "SimpleFIN connects to 16,000+ financial institutions for $1.50/month"

---

## 3. Bank Sync — Step 1: Select & Fetch

### Account Selection
- List of all linked accounts across all accessible connections (shared + personal)
- Grouped by connection label (e.g., "Household Banks" as a header, accounts indented underneath)
- Each account row has:
  - Checkbox (all checked by default)
  - Account name (bold) with linked Ledger account name in parentheses
  - Institution name in small muted text
  - Last synced date in small muted text (e.g., "Last synced: Feb 20, 2025" or "Never")
- "Select All" / "Deselect All" checkbox in the header

### Date Range
- Positioned to the right of the account list, or below it on narrower screens
- Quick-select dropdown defaulting to "Last 30 Days"
- Presets: Last 7 Days, Last 14 Days, Last 30 Days, Last 60 Days, Custom Range
- Custom Range reveals two date pickers inline
- Note below the date range: "SimpleFIN updates data once per day. Date range limited to 60 days per request."

### Fetch Button
- "Fetch Transactions" button (primary style, full width at the bottom of the card)
- Disabled if zero accounts are selected
- On click:
  - Button shows loading spinner with "Fetching..."
  - Calls POST /api/simplefin/sync with selected account IDs and date range
  - On success: advance to Step 2
  - On error: show error toast (e.g., "Failed to fetch from SimpleFIN. Check your connection in Settings.")

---

## 4. Bank Sync — Step 2: Review & Categorize

### Progress Indicator
- Two-step indicator at the top: "Select & Fetch" (completed) → "Review & Import" (current)
- "← Back to Selection" link to go back to Step 1

### Transaction Review Table
Same card and table pattern as the CSV import review, with these specifics:

**Columns:**
- Checkbox (40px)
- Date (110px) — formatted YYYY-MM-DD, DM Mono font
- Payee (auto/flex) — the SimpleFIN `payee` value, used as the primary description. Bold, standard text color.
- Account (140px) — Ledger account name as a monospace badge
- Amount (110px) — converted to Ledger convention. Color follows the four-case display rules from the project learnings.
- Category (160px) — single grouped dropdown (same component as Add Transaction and CSV import). Pre-selected with auto-categorization suggestion. Uncategorized rows show "Select..." placeholder with the `--bg-needs-attention` highlight.
- Status (130px) — DuplicateBadge and/or TransferBadge components. Can show both badges if applicable.
- Confidence (70px) — percentage, colored: green > 90%, amber 70-90%, red < 70%

**Table behavior:**
- `table-layout: fixed` with the column widths above — no width shifting when dropdowns change
- All rows have checkboxes
- "Select All" / "Deselect All" in header
- Likely Duplicate rows: unchecked by default, red badge
- Possible Duplicate rows: checked, yellow badge
- Likely Transfer rows: checked, orange badge
- Uncategorized rows: highlighted with `--bg-needs-attention` background
- Clicking a duplicate badge expands the DuplicateComparison panel inline below that row
- Transaction count above the table: "X of Y transactions selected for import"
- Sort by date descending by default

**Empty state:**
- If the fetch returns zero new transactions (all already imported via SimpleFIN ID dedup): "No new transactions found for the selected date range. All transactions have already been imported."

### Balance Updates Panel
Below the transaction table, in a separate card:

- Title: "Balance Updates"
- Subtitle: "Approving updates will create new balance snapshots on the Net Worth page"
- Table columns: Checkbox, Account Name, Previous Balance (from latest balance_snapshot, or "—" if none), New Balance (from SimpleFIN), Change
- Change column: shows absolute difference and percentage. Green for positive, red for negative.
- All rows checked by default
- If previous balance equals new balance, show the change as "No change" in muted text — still checked but visually de-emphasized

### Holdings Updates Panel
Below balance updates, in a separate card. Only shown if any linked accounts returned holdings data.

- Title: "Holdings Updates"
- Per-account expandable sections:
  - Account name as header with checkbox
  - Sub-table: Symbol, Fund Name, Shares, Cost Basis, Market Value
  - All checked by default

### Import Button
- Fixed at the bottom or clearly visible: "Import X Transactions & Update Y Balances" (green, primary)
- Dynamically updates X and Y based on selections
- If X = 0 and Y = 0 and no holdings selected: button is disabled
- On click:
  - Calls POST /api/simplefin/commit with selected transactions, balance updates, and holdings updates
  - Loading state on the button
  - On success: toast "Imported X transactions. Updated Y account balances."
  - Redirect to the Transactions page (with date filter set to the sync date range)
  - On error: toast with error message, stay on the page

**Commit:** `feat(ui): add Bank Sync review and import flow to Import page`

---

## 5. Holdings Display on Net Worth Page

For investment/retirement accounts that have cached holdings data (from the simplefin_holdings table), show an expandable breakdown on the Net Worth page.

### Backend Addition
- Add a GET /api/assets/holdings endpoint (or extend the existing /api/networth/summary response) that returns holdings grouped by account:
```json
{
  "accountHoldings": [
    {
      "accountId": 8,
      "accountName": "Roth IRA",
      "holdings": [
        { "symbol": "SWTSX", "description": "Schwab Total Stock Market Index Fund", "shares": 1056.60, "costBasis": 17108.62, "marketValue": 17571.32 },
        { "symbol": "SWISX", "description": "Schwab International Index Fund", "shares": 155.20, "costBasis": 4382.78, "marketValue": 4873.22 }
      ]
    }
  ]
}
```

### Frontend
- In the Accounts section of the Net Worth page, account rows that have holdings data show a small expand chevron on the left
- Clicking the chevron expands a sub-table below the account row (pushes other rows down, doesn't overlap)
- Sub-table columns: Symbol (monospace, bold), Fund Name, Shares (monospace), Cost Basis (monospace, muted), Market Value (monospace, bold), Gain/Loss
- Gain/Loss = Market Value - Cost Basis:
  - Positive: green text, "+$X,XXX.XX (+X.X%)"
  - Negative: red text, "-$X,XXX.XX (-X.X%)"
- Sub-table has a subtle background tint to distinguish it from the main table (use `--bg-hover` or similar)
- If no holdings data exists for an account, no chevron is shown — it renders as before
- The account's balance in the main row should match the sum of holding market values (it should, since SimpleFIN provides both)
- Small muted note below the holdings: "Last updated: {date}" based on the holdings updated_at timestamp

**Commit:** `feat(networth): display investment holdings from SimpleFIN sync`

---

## 6. Learnings to Add

Add ALL of the following to the Project Learnings section of `.github/copilot-instructions.md`:

### SimpleFIN Connection Scoping (YYYY-MM-DD)
**Context:** Designing SimpleFIN integration for a multi-user household app
**Problem:** A single global connection doesn't support households where each person has their own SimpleFIN account, but per-user-only doesn't support shared connections
**Resolution:** simplefin_connections supports both: user_id = NULL for shared (all users can sync), user_id set for personal. Multiple connections allowed.
**Rule going forward:** Always scope SimpleFIN queries to connections the current user has access to (shared + their own). Never expose one user's personal connection to another user.

### SimpleFIN Sign Conventions (YYYY-MM-DD)
**Context:** SimpleFIN API returns amounts in each bank's native convention
**Problem:** Checking accounts use positive = deposit. Credit cards use negative = charge. This is inconsistent across account types and differs from Ledger's internal convention.
**Resolution:** Convert all amounts during sync based on linked Ledger account classification. Liquid: flip sign. Liability: flip sign.
**Rule going forward:** Never store raw SimpleFIN amounts. Always convert to internal convention (positive = money out, negative = money in) before display or storage.

### SimpleFIN Transaction IDs for Dedup (YYYY-MM-DD)
**Context:** Bank sync can be run multiple times for overlapping date ranges
**Problem:** Without tracking imported SimpleFIN transaction IDs, re-syncing creates duplicates
**Resolution:** Store simplefin_transaction_id on each imported transaction. Filter out already-imported IDs before showing review screen. Separate from fuzzy duplicate detection.
**Rule going forward:** Always check simplefin_transaction_id first (exact dedup), then run fuzzy detection (date + amount + description) for cross-source matching.

### SimpleFIN API Limits (YYYY-MM-DD)
**Context:** Integrating with SimpleFIN Bridge API
**Problem:** Rate limited to 24 requests/day, 60 days max per request
**Resolution:** User-initiated sync only (no auto-polling). Split ranges > 60 days. Clear errors on rate limit.
**Rule going forward:** Never auto-poll SimpleFIN. Always user-initiated. Split date ranges > 60 days. Show clear errors if rate limited.

### Transfer Detection Should Be Dynamic (YYYY-MM-DD)
**Context:** Detecting credit card payments and inter-account transfers during import
**Problem:** Hardcoding bank-specific patterns is fragile across different users' banks
**Resolution:** Generic keywords plus dynamic matching against the user's own Ledger account names.
**Rule going forward:** Never hardcode bank-specific transfer patterns. Match against the user's actual account names for dynamic detection.

**Commit:** `docs: add SimpleFIN integration learnings`

---

## Final Verification

After all commits, run the complete end-to-end flow:

1. **Settings:** Verify connections and links are visible and functional
2. **Import → Bank Sync:** Select accounts → set date range to Last 30 Days → Fetch
3. **Review:** Verify transactions appear with:
   - Correct sign (expenses positive/black, income negative/green)
   - Payee names as descriptions (not raw bank descriptions)
   - Auto-categorization suggestions with confidence scores
   - Duplicate badges on any transactions that match existing DB records
   - Transfer badges on credit card payments
   - Uncategorized row highlights (light and dark mode)
4. **Balance updates:** Verify previous vs new balances display correctly
5. **Holdings:** Verify Schwab holdings appear (if connected)
6. **Import:** Click import → verify toast → verify transactions appear on Transactions page
7. **Re-sync:** Run sync again for the same date range → verify "No new transactions found" or that already-imported transactions are filtered out
8. **CSV overlap:** Import a CSV that contains some of the same transactions → verify fuzzy duplicate detection flags them
9. **Manual entry:** Add a transaction manually that matches an existing one → verify duplicate warning toast
10. **Net Worth:** Verify balance snapshots were created, holdings expand correctly under the Schwab account
11. **Dark mode:** Verify all new UI elements look correct in both light and dark mode
