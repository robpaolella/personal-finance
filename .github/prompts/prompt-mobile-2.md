# Mobile Responsive UI — Prompt 2: Page Layouts

This prompt adapts every page for mobile. The navigation foundation from prompt 1 is already in place. Before starting, re-read `.github/copilot-instructions.md`, `.github/design-system.jsx`, and reference `.github/mobile-prototype.jsx` for the approved mobile designs.

**Critical rule: Do NOT change any desktop layouts.** Every change in this prompt must be wrapped in `@media (max-width: 767px)` or use the `mobile-only` / `desktop-only` classes. After each commit, verify the desktop view is identical to before.

---

## 1. Dashboard Page — Mobile Layout

### KPI Cards
- Desktop: 4-column row (unchanged)
- Mobile: 2×2 grid (`grid-template-columns: 1fr 1fr`)
- Card padding tightens slightly: `12px 14px`
- KPI label: 9px uppercase
- KPI value: 20px, weight 800, DM Mono

### Spending by Category
- Works as-is on mobile (it's already a vertical layout)
- No structural changes needed, just verify it doesn't overflow

### Income vs Expenses Chart
- Reduce bar width from desktop to 6px on mobile
- Month labels: 8px
- Chart height: 80px on mobile
- Legend centered below

### Recent Transactions
- Desktop: table layout (unchanged)
- Mobile: card-based list (match prototype)
- Each transaction is a card with:
  - Left: description (13px, bold, truncated with ellipsis), below that: date (monospace) · category badge
  - Right: amount (14px, monospace, colored), below that: account name (9px, muted)
- "View All →" link in the section header navigates to Transactions page
- Show 5 most recent on mobile (vs whatever desktop shows)

### Implementation approach
Use CSS media queries for the grid changes. For the transaction table → card conversion, either:
- Use CSS to restyle the existing table rows into card layouts (if feasible), OR
- Render a separate mobile component wrapped in a media query check using a `useIsMobile()` hook
- The second approach is cleaner if the desktop table structure can't be restyled purely with CSS

**Commit:** `feat(ui): add mobile layout for Dashboard page`

---

## 2. Transactions Page — Mobile Layout

### Search Bar
- Full width, same styling, padding-left for search icon
- Renders the same on both desktop and mobile

### Date Filter Chips
- Horizontal scrollable row with `overflow-x: auto; scrollbar-width: none`
- Chips: pill-shaped (border-radius: 16px), 11px font
- Active chip: `var(--color-accent)` background, white text
- Inactive chip: `var(--bg-card)` background with inset border

### Transaction Count
- "Showing X transactions" in 11px muted text

### Transaction List
- Desktop: table with sortable columns (unchanged)
- Mobile: card-based list (same pattern as Dashboard recent transactions, but with account badge added)
- Each card: description + amount on top line, date · category badge · account badge on bottom line
- Cards are tappable (navigate to edit) — same click behavior as desktop table rows

### Pagination / Infinite Scroll
- If desktop uses pagination, mobile should too (same mechanism)
- Ensure pagination controls are touch-friendly (min 44px tap targets)

**Commit:** `feat(ui): add mobile layout for Transactions page`

---

## 3. Budget Page — Mobile Layout

### Month Navigation
- Centered with left/right arrows: `← February 2026 →`
- Arrows should be large enough for touch (min 44px tap area)

### Owner Toggle
- Full width toggle group (same as desktop but takes full width)
- This already works well on mobile

### KPI Cards
- 2×2 grid (same as Dashboard KPIs)

### Income Section
- Card with "Income" header and line items
- Each item: name on left, budget and actual on right (two columns)
- Same structure as desktop but in a card container

### Expense Groups
- Each expense group is its own card
- Group header: colored dot + group name (bold)
- Sub-categories: name, budget vs actual, progress bar
- Progress bars work well at mobile width — no changes needed

### Budget Editing
- If desktop uses inline editing (click a cell to edit), mobile should use a bottom sheet or tap-to-edit pattern
- Tapping a budget value on mobile should open a small input overlay or inline expand, NOT a full modal
- This is a stretch goal — if complex, leave budget as read-only on mobile for now and note it as a TODO

**Commit:** `feat(ui): add mobile layout for Budget page`

---

## 4. Reports Page — Mobile Layout

### Year Navigation
- Same centered pattern as Budget month nav: `← 2026 →`

### KPI Cards
- 2×2 grid

### Monthly Breakdown Table
- This is the trickiest table to mobilize because it has many columns (12 months + total)
- **Approach:** Keep it as a horizontally scrollable table inside a card
- Wrap the table in a container with `overflow-x: auto; -webkit-overflow-scrolling: touch`
- The category column should be sticky (`position: sticky; left: 0`) so it stays visible while scrolling horizontally
- Month columns: compact (abbreviated to 3-letter), 10px font, monospace values
- The Total column should also be sticky on the right side if feasible, otherwise just at the end

### Expandable Rows
- Same expand/collapse behavior as desktop
- Tap group row to expand sub-categories
- Indentation reduced slightly for mobile (less padding)

**Commit:** `feat(ui): add mobile layout for Reports page`

---

## 5. Net Worth Page — Mobile Layout

### Hero Card
- Full width, same gradient, slightly tighter padding (20px vs desktop)
- Total value: 28px (slightly smaller than desktop)
- Classification breakdown: wrap if needed (flex-wrap)

### Account Groups
- Section headers: "Liquid Assets", "Investments", "Liabilities" in uppercase muted labels
- Each account as a card: name + last four on left, balance on right, owner below name
- Same card pattern used throughout the mobile UI

### Holdings (if investment accounts have expandable holdings)
- If desktop shows an expandable sub-table, on mobile show holdings as nested cards within the account card when expanded

### Depreciable Assets
- If currently a table, convert to card list
- Each card: asset name, purchase date, method badge (SL/DB), current value

### Update Balances Button
- Full width secondary button at the bottom

**Commit:** `feat(ui): add mobile layout for Net Worth page`

---

## 6. Import Page — Mobile Layout

### Two Action Cards
- Stack vertically (full width each), 16px gap between
- Bank Sync card: centered layout with icon, title, description, primary button
- CSV Import card: same layout with secondary button
- Match the prototype exactly

### Bank Sync Detail (if it shows account selection inline on desktop)
- On mobile, the Sync flow opens as a bottom sheet (handled in prompt 3)
- The Import page itself just shows the two action cards

**Commit:** `feat(ui): add mobile layout for Import page`

---

## 7. Settings Page — Mobile Layout

### Settings Tab

**Desktop:** Side-by-side Accounts and Categories cards, Bank Sync above, Users & Permissions below
**Mobile:** All sections as a drill-through list

- Replace the side-by-side cards with a single navigation card (match prototype):
  - 🏦 Accounts — "Manage bank and credit card accounts" →
  - 🏷️ Categories — "Expense and income categories" →
  - 👥 Users & Permissions — "Manage household members" →
  - 🔗 Bank Sync — "SimpleFIN connections" →
- Each item is a row with icon, title, description, and a chevron (›)
- Tapping an item navigates to a sub-page (see below)

**My Profile card:**
- Avatar circle with first letter
- Display name, username, role badge
- "Edit Profile & Password" button

**App info card:**
- Version number
- Sign out link (red text, centered)

### Settings Sub-Pages (mobile only)

These are rendered within the Settings page component, NOT as separate routes (to keep desktop routing unchanged). Use a state variable to track which sub-page is active.

Each sub-page has:
- "← Back to Settings" link at the top (tapping returns to the settings list)
- The mobile header title updates to show the sub-page name

**Accounts sub-page:**
- Card per account showing: name (last4), owner badge, type, classification badge, chevron for edit
- "+ Add Account" button at bottom

**Categories sub-page:**
- Card per category group with expand/collapse chevron
- Tap to expand shows sub-categories
- "+ Add Category" button at bottom

**Users & Permissions sub-page:**
- Card per user with avatar, name, username, role badge
- Owner card: "Full access. Cannot be restricted."
- Member card: "Show Permissions" expand link
  - Expanded: compact badge grid showing enabled permissions (green) and disabled permissions (gray)
  - This replaces the desktop toggle grid — on mobile, permissions are displayed as badges (read-only view) with a "Manage" button that opens the full edit
- "+ Add User" button at bottom

**Bank Sync sub-page:**
- Connection card with status badge
- List of linked accounts below

### Preferences Tab
- Same on both desktop and mobile — it's already a vertical form layout
- Just verify it fits within mobile width

**Commit:** `feat(ui): add mobile layout for Settings page with sub-page navigation`

---

## 8. Global Mobile Adjustments

### Typography
- Page titles: 17px on mobile (vs 22px desktop)
- Card titles: 13px on mobile (vs 14px desktop)
- These are subtle — only change if they look too large on mobile

### Touch Targets
- All buttons: minimum 44px height (iOS recommendation)
- All tappable rows: minimum 44px height
- All tappable icons: minimum 44px × 44px touch area (even if the icon is smaller, the tap area should be 44px)

### Scroll Behavior
- `scrollbar-width: none` on all scrollable areas on mobile (the gradient scroll indicator handles overflow visibility)
- Smooth scrolling: `-webkit-overflow-scrolling: touch` on iOS

### No Horizontal Overflow
- Check every page at 320px width (smallest common phone)
- No horizontal scrollbar should appear on any page except the Reports table (which has intentional horizontal scroll)

**Commit:** `fix(ui): global mobile touch targets and scroll behavior`

---

## Verification

After all commits, test EVERY page at both widths:

**Desktop (≥768px) — verify NOTHING changed:**
- Dashboard, Transactions, Budget, Reports, Net Worth, Import, Settings
- All tables, charts, modals, forms identical
- Sidebar navigation works

**Mobile (<768px) — verify each page:**
- Dashboard: 2×2 KPIs, card-based transactions, chart fits
- Transactions: search bar, filter chips, card list, pagination
- Budget: month nav, owner toggle, KPI grid, expense group cards
- Reports: year nav, KPI grid, horizontally scrollable table with sticky category column
- Net Worth: hero card, account groups as cards, Update Balances button
- Import: two stacked action cards
- Settings: navigation list, drill-through sub-pages, back links, profile card
- Test at 390px (iPhone 14), 375px (iPhone SE), and 320px (minimum)
- Test in both light and dark mode

**Stop here and wait for confirmation before proceeding to prompt-mobile-3.md.**
