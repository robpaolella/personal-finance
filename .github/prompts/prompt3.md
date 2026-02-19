Build the main application shell that wraps all authenticated pages.

## Layout
- Left sidebar (220px wide) with dark navy (#0f172a) background
- Logo at the top: a 28px gradient square (blue #3b82f6 to green #10b981) with a white "$" inside, next to the text "Ledger" in white
- Navigation items in the sidebar, each with an icon and label:
  1. Dashboard (grid icon)
  2. Transactions (list icon)
  3. Budget (credit card icon)
  4. Reports (bar chart icon)
  5. Net Worth (activity/pulse icon)
  6. Import (download icon)
  7. Settings (gear icon)
- Active nav item has a blue-tinted background (rgba(59,130,246,0.15)) and light blue text (#93c5fd)
- Inactive items are gray (#94a3b8) with a subtle hover effect
- At the bottom of the sidebar, show "v1.0 · {username}" in small muted text
- Main content area has a light gray background (#f4f6f9) with 28px vertical and 36px horizontal padding, and scrolls independently

## Routing
- Set up React Router with these routes:
  - / → Dashboard
  - /transactions → Transactions
  - /budget → Budget
  - /reports → Reports
  - /net-worth → Net Worth
  - /import → Import
  - /settings → Settings
  - /login → Login (outside the shell)

## Shared Components
Create these reusable components in the components/ directory:

### KPICard
- Accepts: label, value, subtitle (optional), trend direction (up/down/neutral)
- Displays: uppercase label in small gray text, large monospace value, colored subtitle with arrow icon

### DataTable
- Accepts: columns config, data array, onRowClick (optional)
- Renders: styled table with header row, hover states on rows, proper alignment
- Column config supports: label, key, align (left/right), render function (optional)

### OwnerFilter
- Toggle button group with three options: All, Robert, Kathleen
- Uses user icons and styled pill buttons
- Active state is white with shadow, inactive is transparent

### Currency Formatter Utility (lib/formatters.ts)
- fmt(n) — full format: $1,234.56, returns "—" for zero
- fmtShort(n) — abbreviated: $1.2k for values >= 1000
- fmtWhole(n) — no decimals: $1,235

## Fonts
- Import DM Sans (weights: 400, 500, 600, 700, 800) and DM Mono (weights: 400, 500) from Google Fonts
- DM Sans is the default body font
- DM Mono is used for all monetary values and dates

For now, each page should just render a placeholder heading with the page name. We'll build each page in subsequent prompts.
