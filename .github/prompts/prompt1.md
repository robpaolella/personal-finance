# SimpleFIN Integration — Prompt 1: Backend Foundation

This prompt covers the database schema, SimpleFIN service, sign conversion, duplicate detection, transfer detection, auto-categorization updates, and all API routes. No frontend work yet.

---

## 1. Database Changes

### New table: `simplefin_connections`
Stores SimpleFIN access credentials. Supports both app-wide shared connections and per-user personal connections. Multiple rows are allowed.

- id: integer, primary key, autoincrement
- user_id: integer, nullable, foreign key → users.id (NULL = shared/app-wide connection, set = personal connection for that user)
- access_url: text, not null (the full SimpleFIN Access URL including credentials)
- label: text, not null (user-provided name, e.g., "Household Banks" or "Robert's Investments")
- created_at: text, default current timestamp
- updated_at: text, default current timestamp

When user_id is NULL, the connection is shared — all users can see and sync from it. When user_id is set, only that user can see, sync from, edit, or delete it.

### New table: `simplefin_links`
Maps SimpleFIN account IDs to Ledger account IDs.

- id: integer, primary key, autoincrement
- simplefin_connection_id: integer, not null, foreign key → simplefin_connections.id
- simplefin_account_id: text, not null, unique (e.g., "ACT-36f229e9-2966-470f-a6c8-25c0d361c219")
- account_id: integer, not null, foreign key → accounts.id
- simplefin_account_name: text, not null (e.g., "CHASE SAVINGS (6152)")
- simplefin_org_name: text (e.g., "Chase Bank Robert")
- last_synced_at: text (ISO timestamp of last successful sync)
- created_at: text, default current timestamp

### Modify `transactions` table
Add an optional column to track SimpleFIN origin:
- simplefin_transaction_id: text, nullable, unique (e.g., "TRN-c4fead44-f1e4-4850-85ef-2a5e3f719524")

This prevents re-importing the same transaction on subsequent syncs.

### New table: `simplefin_holdings`
Caches investment holdings data from SimpleFIN for display on the Net Worth page.

- id: integer, primary key, autoincrement
- simplefin_link_id: integer, not null, foreign key → simplefin_links.id
- symbol: text, not null
- description: text, not null (fund name)
- shares: numeric, not null
- cost_basis: numeric, not null
- market_value: numeric, not null
- updated_at: text, not null

**Commit:** `feat(db): add simplefin tables for connections, links, holdings, and transaction tracking`

---

## 2. SimpleFIN Service

### services/simplefin.ts

#### `claimAccessUrl(setupToken: string)`
- Base64-decodes the setup token to get a claim URL
- POSTs to the claim URL
- Returns the Access URL
- One-time operation during initial setup

#### `fetchAccounts(accessUrl: string, startDate?: number, endDate?: number)`
- Makes GET request to `{accessUrl}/accounts?start-date={startDate}&end-date={endDate}`
- HTTP Basic Auth credentials are embedded in the access URL
- Returns the parsed JSON response
- Handles errors: network failures, auth errors ("You must reauthenticate"), rate limiting
- Start/end dates are Unix timestamps (seconds)
- If date range exceeds 60 days, split into multiple requests and merge results

### API Response Shape (based on actual tested data)
```typescript
interface SimpleFINAccount {
  id: string;              // "ACT-xxxxx"
  name: string;            // "CHASE SAVINGS (6152)"
  currency: string;        // "USD"
  balance: string;         // "300.00" (string, not number)
  "available-balance": string;
  "balance-date": number;  // Unix timestamp
  transactions: SimpleFINTransaction[];
  holdings: SimpleFINHolding[];
  org: {
    domain: string;        // "www.chase.com"
    name: string;          // "Chase Bank Robert"
    url: string;
    id: string;
  };
}

interface SimpleFINTransaction {
  id: string;              // "TRN-xxxxx"
  posted: number;          // Unix timestamp
  amount: string;          // "-48.78" or "4237.03" (string)
  description: string;     // Raw bank description
  payee: string;           // Cleaned-up payee name
  memo: string;            // Usually empty
  transacted_at: number;   // Unix timestamp — USE THIS as the transaction date
}

interface SimpleFINHolding {
  id: string;
  created: number;
  currency: string;
  cost_basis: string;
  description: string;     // Fund name
  market_value: string;
  purchase_price: string;
  shares: string;
  symbol: string;          // Ticker symbol
}
```

**Commit:** `feat(api): add SimpleFIN service for API communication`

---

## 3. Sign Convention Conversion

### services/signConversion.ts

SimpleFIN returns amounts in the bank's native convention. Convert to Ledger's internal convention (positive = money out, negative = money in) based on the linked Ledger account's classification:

**Liquid accounts (checking, savings, venmo, cash):**
- SimpleFIN positive (deposit/income) → Ledger negative (money in)
- SimpleFIN negative (withdrawal/expense) → Ledger positive (money out)

**Liability accounts (credit cards):**
- SimpleFIN negative (charge/purchase) → Ledger positive (expense/money out)
- SimpleFIN positive (payment/credit/refund) → Ledger negative (money in/credit)

**Investment/retirement accounts:**
- Same as liquid (positive = contribution in → negative, negative = withdrawal → positive)

Conversion must happen before display or storage.

**Commit:** `feat(api): add sign convention conversion for SimpleFIN transactions`

---

## 4. Duplicate Detection Service

### services/duplicateDetector.ts

This is a shared system used by Bank Sync, CSV Import, AND Manual Entry.

#### `detectDuplicates(incomingTransactions: Transaction[], accountId?: number): DuplicateResult[]`

For each incoming transaction, search existing transactions:

**Exact match → red "Likely Duplicate":**
- Same date (exact)
- Same amount (exact, after sign conversion)
- Description similarity ≥ 80% (Levenshtein distance or trigram similarity)
- Returns the existing transaction ID for comparison

**Partial match → yellow "Possible Duplicate":**
- Same date (exact)
- Same amount (exact)
- Description similarity < 80%
- Catches cases where bank description differs between CSV and API

**Within-batch duplicates:**
- Check incoming transactions against each other too
- If two incoming transactions have same date + amount + similar description, flag both

#### Integration points:

**Bank Sync:** Runs after SimpleFIN ID dedup (which filters already-imported transactions), catching cross-source duplicates.

**CSV Import:** Add to existing Step 3 review. Same flags and UI.

**Manual Entry:** When saving a new transaction, run a quick check. If match found, show warning toast: "This looks similar to an existing transaction from {date}. Continue anyway?" with "Save Anyway" and "Cancel".

**Commit:** `feat(api): add duplicate detection service`

---

## 5. Transfer Detection

### services/transferDetector.ts

Credit card payments and bank transfers appear on both sides. Flag them so the user can decide whether to import.

#### Detection logic — flag as "likely transfer" if:

**Generic keyword matching** on payee or description:
- "payment", "transfer", "thank you", "ach pmt", "mobile payment", "online.*transfer", "autopay"

**Dynamic account name matching:**
- The payee field matches the name of another account in the user's Ledger
- e.g., payee "American Express Credit Card" matches the user's Amex account
- e.g., payee "Chase Credit Card" matches the user's Chase Visa

**Amount threshold:**
- Only flag if amount > $100 (avoids flagging small merchants with "payment" or "thank you" in the name)

**Commit:** `feat(api): add transfer detection for bank sync and CSV imports`

---

## 6. Auto-Categorization Update

SimpleFIN provides a cleaned-up `payee` field. Examples from actual data:
- description: "CHICK-FIL-A #03243" → payee: "Chick-fil-A"
- description: "GglPay JIMBO'S NATURESCONDIDO CA" → payee: "Gglpay Jimbo's"
- description: "COSTCO WHSE #1080" → payee: "Costco"

Update the auto-categorizer:
- Use `payee` as the primary field when available (bank sync imports)
- Fall back to `description` for CSV imports
- Store raw SimpleFIN `description` in the transaction's `note` field
- Display the `payee` value as the transaction description in the app
- Update history-based matching to check against both payee values and descriptions

**Commit:** `feat(api): use SimpleFIN payee field for auto-categorization`

---

## 7. API Routes

### routes/simplefin.ts

#### POST /api/simplefin/connections
- Accepts: `{ setupToken?: string, accessUrl?: string, label: string, shared: boolean }`
- If setupToken provided, claims Access URL first
- If shared is true, stores with user_id = NULL; otherwise user_id = current user
- Returns the created connection

#### GET /api/simplefin/connections
- Returns all connections the current user can access:
  - All shared connections (user_id = NULL)
  - Current user's personal connections
- Includes: id, label, isShared, linkedAccountCount, lastSyncedAt

#### PUT /api/simplefin/connections/:id
- Update label or access URL
- Only if shared or belongs to current user

#### DELETE /api/simplefin/connections/:id
- Deletes connection and all associated links
- Does NOT delete Ledger accounts or previously imported transactions
- Only if shared or belongs to current user

#### GET /api/simplefin/connections/:id/accounts
- Fetches account list from SimpleFIN (no transactions)
- Returns accounts with existing link info

#### POST /api/simplefin/links
- Accepts: `{ simplefinConnectionId, simplefinAccountId, accountId, simplefinAccountName, simplefinOrgName? }`
- Creates link row

#### DELETE /api/simplefin/links/:id
- Removes link only (not accounts or transactions)

#### POST /api/simplefin/sync
- Accepts: `{ connectionIds?: number[], accountIds?: number[], startDate: string, endDate: string }`
- For each accessible connection, fetches from its access URL
- Date range > 60 days split into multiple requests
- For each linked account:
  1. Filter out transactions with existing simplefin_transaction_id in DB
  2. Apply sign conversion
  3. Run auto-categorization (using payee)
  4. Run duplicate detection
  5. Run transfer detection
- Collects balance and holdings updates
- Returns processed data for review (NOT committed):
```json
{
  "transactions": [{
    "simplefinId": "TRN-xxxxx",
    "accountId": 1,
    "accountName": "Chase Checking (2910)",
    "date": "2025-02-14",
    "description": "Chick-fil-A",
    "rawDescription": "CHICK-FIL-A #03243",
    "amount": 25.97,
    "suggestedCategoryId": 22,
    "suggestedGroupName": "Daily Living",
    "suggestedSubName": "Dining/Eating Out",
    "confidence": 0.7,
    "duplicateStatus": "none",
    "duplicateMatchId": null,
    "isLikelyTransfer": false
  }],
  "balanceUpdates": [{
    "accountId": 1,
    "accountName": "Chase Checking (2910)",
    "currentBalance": 11544.84,
    "previousBalance": 7997.18,
    "balanceDate": "2025-02-21"
  }],
  "holdingsUpdates": [{
    "accountId": 8,
    "accountName": "Roth IRA (928)",
    "holdings": [
      { "symbol": "SWTSX", "description": "Schwab Total Stock Market Index Fund", "shares": 1056.60, "costBasis": 17108.62, "marketValue": 17571.32 }
    ]
  }]
}
```

#### POST /api/simplefin/commit
- Accepts: `{ transactions: [...], balanceUpdates: [...], holdingsUpdates: [...] }`
- Stores simplefin_transaction_id on each imported transaction
- Creates balance_snapshot entries for approved balance updates
- Upserts simplefin_holdings for approved holdings updates
- Updates last_synced_at on each linked account
- Returns counts

**Commit:** `feat(api): add SimpleFIN API routes for connections, linking, sync, and commit`

---

## Verification

After all 7 commits, verify:
- `npm run dev` starts without errors
- Database has the new tables (check with a SQLite browser or `sqlite3 data/ledger.db ".tables"`)
- `POST /api/simplefin/connections` creates a connection
- `GET /api/simplefin/connections` returns it
- `GET /api/simplefin/connections/:id/accounts` fetches from SimpleFIN and returns accounts
- Linking and syncing routes respond correctly

**Stop here and wait for confirmation before proceeding to prompt2.md.**