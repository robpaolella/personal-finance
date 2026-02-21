# SimpleFIN Integration — Prompt 2: Settings UI & Duplicate Comparison

This prompt covers the SimpleFIN connection management UI on the Settings page, the account linking interface, and the duplicate comparison UI component that will be shared across import flows. Before starting, re-read `.github/copilot-instructions.md` (especially the Design Reference section) and `.github/design-reference.jsx`.

---

## 1. Settings Page — Bank Sync Section

Add a new section to the Settings page. Position it as a full-width card above the existing two-column Accounts/Categories layout.

### No Connections State
- Title: "Bank Sync"
- Subtitle: "Connect your bank accounts via SimpleFIN for automatic transaction import"
- "Add Connection" button (primary style)
- Small muted note: "Sign up at beta-bridge.simplefin.org · $1.50/month or $15/year"

### Has Connections State
- Title: "Bank Sync" with a green "Connected" badge
- Two sub-sections with headers:
  - **Shared Connections** — connections with user_id = NULL
  - **My Connections** — connections belonging to the logged-in user
  - Only show a section header if connections of that type exist
- Each connection is a card/row showing:
  - Label (e.g., "Household Banks") in bold
  - Badge: "Shared" (gray shared badge style) or "Personal" (blue badge)
  - Linked account count (e.g., "6 accounts linked")
  - Last synced (e.g., "Last synced 2 hours ago" or "Never synced")
  - Expand/collapse chevron to show linked accounts
  - Edit (pencil icon) and Delete buttons
- "Add Connection" button at the bottom

### Add Connection Modal
- Title: "Add Bank Connection"
- Fields:
  - **Label**: text input (e.g., "Household Banks") — required
  - **Scope**: toggle or radio — "Shared (all users)" or "Personal (just me)"
    - Default: Shared
    - Shared subtitle: "Any user can sync from this connection"
    - Personal subtitle: "Only you can see and sync from this connection"
  - **Setup Token**: text input — the token from SimpleFIN's website
    - Small toggle link: "I have an Access URL instead" — switches to an Access URL text input
- "Connect" button (primary)
- On submit: calls POST /api/simplefin/connections
- On success: dismiss the modal and immediately fetch/display the discovered SimpleFIN accounts for linking (expand the new connection's account linking section)
- On error: show inline error banner (e.g., "Invalid token" or "Failed to connect")

### Edit Connection Modal
- Same fields as Add, pre-populated
- Cannot change scope after creation (shared stays shared, personal stays personal)
- Can update label and access URL/token

### Delete Connection
- Uses the shared ConfirmDeleteButton component
- Warning text: "This will remove all account links for this connection. Previously imported transactions will not be affected."
- On confirm: calls DELETE /api/simplefin/connections/:id
- Toast on success: "Connection removed"

**Commit:** `feat(ui): add SimpleFIN connection management to Settings page`

---

## 2. Account Linking Section

Shown as an expandable section under each connection. Automatically expanded when a new connection is first created.

### Layout
- Table with columns:
  - **SimpleFIN Account**: account name and institution on two lines
    - Line 1: account name in bold (e.g., "CHASE SAVINGS (6152)")
    - Line 2: institution in small muted text (e.g., "Chase Bank Robert")
  - **Balance**: current SimpleFIN balance in monospace (for reference when linking)
    - Negative balances (credit cards) shown in red with parentheses
  - **Ledger Account**: dropdown selector
    - Options: all active Ledger accounts, grouped by classification (Liquid, Investment, Liability)
    - First option: "— Not Linked —"
    - Last option: "+ Create New Account"
    - Pre-selected if a link already exists

### Linking Behavior
- Selecting a Ledger account from the dropdown: immediately calls POST /api/simplefin/links (or PUT if updating an existing link)
- Selecting "— Not Linked —": calls DELETE on the existing link
- Selecting "+ Create New Account": opens the Add Account modal pre-populated with smart defaults:
  - Name: derived from SimpleFIN account name (strip parenthetical last-four if it's already there)
  - Last Four: extracted from the SimpleFIN account name (the number in parentheses at the end)
  - Type: guessed from SimpleFIN data:
    - Negative balance → credit
    - "savings" in name (case-insensitive) → savings
    - "checking" in name → checking
    - "ira" or "roth" or "401k" in name → retirement
    - Otherwise → checking as default
  - Classification: auto-set from type (checking/savings → liquid, credit → liability, retirement → investment)
  - Owner: defaults to current logged-in user
  - After the new account is created, automatically link it
- Unlinked SimpleFIN accounts show a subtle yellow highlight row background (using the existing `--bg-needs-attention` CSS variable)
- Show a summary below the table: "X of Y accounts linked" — if not all are linked, show in amber text

### Toast Feedback
- "Account linked: Chase Savings → Chase Savings (6152)"
- "Account unlinked: Chase Savings (6152)"

**Commit:** `feat(ui): add account linking interface to SimpleFIN settings`

---

## 3. Duplicate Comparison UI Component

Build a reusable component that will be used on both the Bank Sync and CSV Import review screens.

### DuplicateBadge Component
- Props: `status: "exact" | "possible" | "none"`, `onClick: () => void`
- Renders:
  - `"exact"`: Red badge "Likely Duplicate" — clickable to expand comparison
  - `"possible"`: Yellow/amber badge "Possible Duplicate" — clickable to expand comparison
  - `"none"`: nothing rendered

### DuplicateComparison Component
- Props: `incoming: Transaction`, `existing: Transaction`, `onImportAnyway: () => void`, `onSkip: () => void`
- Renders an inline panel that expands below the transaction row (not a modal — it pushes content down)
- Two-column layout:
  - Left column header: "Incoming" (with a blue accent)
  - Right column header: "Existing" (with a gray accent)
  - Rows comparing: Date, Description, Amount, Account, Category
  - Highlight any fields that differ between the two with a subtle background color
- Action buttons at the bottom-right of the panel:
  - "Import Anyway" (primary button — checks the row for import)
  - "Skip" (secondary button — keeps the row unchecked)

### TransferBadge Component
- Props: `isLikelyTransfer: boolean`, `tooltipText?: string`
- Renders: orange badge "Likely Transfer" with a tooltip on hover
- Default tooltip: "This looks like a transfer between your accounts, not an expense or income."

### Integration with CSV Import
- Add the DuplicateBadge and DuplicateComparison components to the existing CSV Import Step 3 review table
- Add a "Status" column to the CSV import review table (between the Category and Confidence columns)
- Call the duplicate detection API endpoint when processing CSV imports (add this to the existing /api/import/categorize or as a separate step)
- Likely Duplicate rows are unchecked by default
- Possible Duplicate rows remain checked but highlighted

### Integration with Manual Entry
- When saving a new transaction via the Add Transaction modal, call a duplicate check endpoint
- If a match is found, show a warning toast: "This looks similar to an existing transaction from {date} ({description}, {amount}). Save anyway?"
- Toast has two action buttons: "Save Anyway" and "Cancel"
- Same check when editing a transaction's date, amount, or description

**Commit:** `feat(ui): add duplicate and transfer badge components with comparison panel`

---

## Verification

After all 3 commits, verify:
- Settings page shows the Bank Sync section
- Can add a shared connection with a SimpleFIN setup token or access URL
- After connecting, SimpleFIN accounts appear in the linking table with correct names, institutions, and balances
- Can link a SimpleFIN account to an existing Ledger account
- Can create a new Ledger account from the "+ Create New Account" option with smart defaults
- Can unlink and re-link accounts
- Can delete a connection (with confirmation)
- Duplicate badge components render correctly (test with mock data if needed)
- CSV Import Step 3 now shows a Status column with duplicate badges (may not have real duplicates yet — just verify the column exists and renders)

**Stop here and wait for confirmation before proceeding to prompt3.md.**
