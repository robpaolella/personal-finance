Build the Settings page with full CRUD for accounts and categories. This page establishes the foundation data that all other pages depend on.

## Backend API Routes

### Accounts API (routes/accounts.ts)
- GET /api/accounts — returns all accounts, ordered by owner then type
- GET /api/accounts/:id — returns single account
- POST /api/accounts — create account. Body: { name, lastFour?, type, classification, owner }
- PUT /api/accounts/:id — update account
- DELETE /api/accounts/:id — soft delete (set is_active = 0). Reject if account has transactions.

### Categories API (routes/categories.ts)
- GET /api/categories — returns all categories, ordered by type (income first) then sort_order then group_name then sub_name
- GET /api/categories/groups — returns distinct group names with their category counts
- POST /api/categories — create category. Body: { groupName, subName, type, isDeductible? }. Auto-generate displayName as "groupName: subName".
- PUT /api/categories/:id — update category
- DELETE /api/categories/:id — reject if category has transactions

## Frontend — Settings Page

### Accounts Section (left column)
- Table with columns: Account, Owner, Type, Classification
- Owner shown as colored badge (Robert = blue #dbeafe/#2563eb, Kathleen = pink #fce7f3/#db2777)
- Classification shown as colored badge (liquid = green, investment = purple, liability = red)
- Type shown as gray lowercase text
- "Add Account" button at the bottom opens a modal/form with fields:
  - Account Name (text)
  - Last Four (text, optional)
  - Type (dropdown: checking, savings, credit, investment, retirement, venmo, cash)
  - Classification (dropdown: liquid, investment, liability) — auto-suggest based on type:
    - checking/savings/venmo/cash → liquid
    - investment/retirement → investment
    - credit → liability
  - Owner (dropdown populated from users table display names)
- Click any row to edit, with a delete option

### Categories Section (right column)
- Grouped display: parent category name as a header with colored dot, sub-categories listed underneath
- Each sub-category shows its budget amount per month if set (from budgets table)
- "Add Category" button opens a modal with:
  - Type (toggle: Income / Expense)
  - Group Name (text with autocomplete from existing groups, or type new)
  - Sub-Category Name (text)
  - Deductible (checkbox, only shown for expense type)
- Click any sub-category to edit, with delete option

### General Design Notes
- Two-column grid layout
- Use the shared card style (white, rounded corners, subtle border and shadow)
- Modals should have a semi-transparent backdrop, centered white card with form fields
- Form inputs: 1px #e2e8f0 border, 8px border radius, #f8fafc background, 13px font size
- Action buttons: primary is dark navy (#0f172a), destructive is red on light red background
