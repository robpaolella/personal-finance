# Copilot Instructions for personal-finance

## Project Overview

This is "Ledger" — a locally-hosted personal finance tracking web application built with React, Express, TypeScript, SQLite, and Tailwind CSS. It replaces a manual spreadsheet system for tracking income, expenses, budgets, net worth, and asset depreciation for a two-person household.

## Git Commit Conventions

**You must commit your work at logical checkpoints throughout development.** Do not wait until the end of a task to commit. Follow these rules:

### When to Commit

- After completing any new file or module that compiles/works independently
- After finishing a full API route group (e.g., all CRUD routes for a resource)
- After completing a frontend page or significant component
- After adding or modifying database schema/migrations
- After fixing a bug or resolving an error
- After adding configuration (environment, build, tooling)
- After any refactor that touches multiple files
- Before starting a new, unrelated piece of work

### Commit Message Format

Use conventional commits:

```
type(scope): short description
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`

Scope is the area of the app: `auth`, `db`, `api`, `ui`, `transactions`, `budget`, `reports`, `networth`, `import`, `settings`, `dashboard`, `shell`, `build`

Examples:

- `chore(db): add drizzle schema and seed script`
- `feat(api): add transaction CRUD routes`
- `feat(ui): build transactions page with filters and table`
- `fix(auth): handle expired JWT token redirect`
- `refactor(api): extract category grouping logic to service`
- `chore(build): configure vite proxy and production build`
- `docs: add README with setup instructions`

### Commit Granularity

- Each commit should represent ONE logical change
- A commit should leave the codebase in a working state (compiles, no broken imports)
- Do NOT bundle unrelated changes into a single commit
- When building a full page, commit the backend routes first, then the frontend separately

### Branch Strategy

- Work directly on `main` for now (single developer)
- If experimenting with something risky, create a feature branch first

## Code Style & Conventions

### TypeScript

- Use strict TypeScript throughout (no `any` types except when absolutely necessary)
- Shared types go in `packages/shared/src/types.ts`
- Use interfaces for object shapes, types for unions/aliases

### API Design

- All API routes are prefixed with `/api/`
- Return consistent JSON: `{ data: ... }` for success, `{ error: string }` for errors
- Use proper HTTP status codes (200, 201, 400, 401, 404, 500)
- Validate request bodies before processing

### Frontend

- Use functional components with hooks
- Keep page components in `pages/`, reusable UI in `components/`
- Use the shared formatters from `lib/formatters.ts` for all monetary values
- DM Mono font for all numbers and dates, DM Sans for everything else

### Database

- Never delete data — use soft deletes (is_active flags) where appropriate
- All monetary values stored as numeric (not text)
- Dates stored as ISO strings (YYYY-MM-DD)

## Design Reference

The file `.github/design-reference.jsx` is the approved interactive prototype for this application. **It is the single source of truth for all visual design decisions.** When building any page or component, you MUST match the prototype's design faithfully.

### How to Use the Design Reference
- Before building any frontend page, re-read the corresponding section of the prototype
- Match the exact color values, spacing, font sizes, font weights, and layout structure
- Do not invent new styles or deviate from the prototype unless I explicitly ask for a change
- If a design detail is ambiguous in the written prompts but clear in the prototype, follow the prototype

### Core Design System (extracted from prototype)

#### Colors
- **Background:** #f4f6f9 (main content area), #0f172a (sidebar)
- **Cards:** #fff with 1px #e8ecf1 border, 12px border-radius, shadow: 0 1px 2px rgba(0,0,0,0.04)
- **Primary text:** #0f172a (headings), #475569 (body), #64748b (secondary), #94a3b8 (muted)
- **Primary action:** #0f172a background, white text
- **Positive/Income:** #10b981 (green)
- **Negative/Over budget:** #ef4444 (red)
- **Links/Accents:** #3b82f6 (blue)
- **Category colors:** Auto/Transportation #ef4444, Clothing #ec4899, Daily Living #10b981, Discretionary #a855f7, Dues/Subscriptions #6366f1, Entertainment #8b5cf6, Household #3b82f6, Insurance #f59e0b, Health #14b8a6, Utilities #f97316, Savings #06b6d4

#### Typography
- **Font families:** DM Sans (body, UI), DM Mono (monetary values, dates, code)
- **Page titles:** 22px, weight 700, #0f172a
- **Page subtitles:** 13px, #64748b
- **Card titles:** 14px, weight 700, #0f172a
- **KPI labels:** 11px, uppercase, letter-spacing 0.05em, weight 500, #64748b
- **KPI values:** 22px, weight 800, DM Mono, letter-spacing -0.02em
- **Table headers:** 11px, uppercase, weight 600, letter-spacing 0.04em, #64748b, 2px #e2e8f0 bottom border
- **Table cells:** 13px, padding 8px 10px
- **Monospace badges (accounts):** 11px, DM Mono, #f1f5f9 background, #475569 text, 6px border-radius
- **Blue badges (categories):** 11px, DM Sans, #eff6ff background, #3b82f6 text, 6px border-radius
- **Owner badges:** Robert = #dbeafe bg / #2563eb text, Kathleen = #fce7f3 bg / #db2777 text
- **Classification badges:** liquid = #d1fae5/#059669, investment = #ede9fe/#7c3aed, liability = #fef2f2/#dc2626

#### Layout
- **Sidebar:** 220px wide, #0f172a background
- **Logo:** 28px gradient square (#3b82f6 → #10b981) with white "$", next to "Ledger" in 16px weight 700
- **Nav items:** 13px, 9px 12px padding, 8px border-radius, 10px gap for icon
- **Active nav:** rgba(59,130,246,0.15) background, #93c5fd text, weight 600
- **Main content:** 28px top/bottom padding, 36px left/right padding
- **KPI card grid:** 4 columns, 16px gap
- **Two-column layouts:** 1fr 1fr grid, 20px gap
- **Section spacing:** 28px between major sections, 24px after headers

#### Interactive Elements
- **Buttons (primary):** #0f172a background, white text, 8px border-radius, 8px 16px padding, weight 600
- **Buttons (secondary):** #f1f5f9 background, #334155 text
- **Select dropdowns:** 1px #e2e8f0 border, 8px border-radius, #f8fafc background
- **Search inputs:** #f8fafc background, 1px #e2e8f0 border, 34px left padding for icon
- **Table row hover:** #f8fafc background
- **Owner filter:** pill toggle group, #f1f5f9 container, active pill is white with shadow
- **Expandable rows (reports):** chevron icon rotates on expand, indentation increases per level (28px → 52px)

#### Dark Mode
The app supports light and dark modes via CSS custom properties defined in `index.css`. All component colors must reference CSS variables (`var(--*)`, never hardcoded hex values. The dark palette uses deep navy/charcoal backgrounds (#0b0f1a, #141926) — not pure black. Accent colors (green, red, blue, category colors) remain the same in both modes. Badge backgrounds get darker but more saturated equivalents. Text inverts: primary becomes #f1f5f9, body becomes #94a3b8. The toggle is in the sidebar footer, preference stored in `localStorage('ledger-theme')` with system preference fallback.

## Project Learnings

This is a living document. You MUST maintain this section throughout the life of the project. It captures hard-won lessons — things that broke, things that were non-obvious, decisions that were made and why — so we never repeat mistakes or lose context.

### Rules for Maintaining Learnings

1. **When to add a learning:**
   - You encounter a bug or error that took more than a trivial fix
   - A library or API behaves differently than expected
   - You discover a compatibility issue between dependencies
   - A design decision is made that future work needs to respect
   - I (the developer) tell you something to remember — if I say "remember this", "note this", "save this for later", or anything similar, add it here immediately
   - You try an approach that fails and switch to a different one
   - You find that something in these instructions needs clarification based on real usage

2. **Format for each learning:**
   ```
   ### [SHORT TITLE] (YYYY-MM-DD)
   **Context:** What we were doing when this came up
   **Problem:** What went wrong or what was non-obvious
   **Resolution:** What we did to fix it / what the correct approach is
   **Rule going forward:** The specific thing to always/never do
   ```

3. **When to commit learnings:**
   - Add the learning to this file as part of the same commit where you fix the issue, OR
   - If I provide a learning verbally, add it and commit immediately: `docs: add learning — {short title}`

4. **Never delete learnings.** They are append-only. If a learning becomes outdated, mark it as `[SUPERSEDED]` with a note pointing to the newer learning, but keep the original.

5. **Reference learnings proactively.** Before starting work on any task, scan this section for relevant learnings. If a learning applies to what you're about to do, follow it without being asked.

### Learnings Log

### Transaction Amount Sign Convention (2026-02-20)
**Context:** Designing the transaction entry form and display logic
**Problem:** Original design used an Expense/Income toggle to control sign, but refunds (negative expenses) and income reversals (positive income) don't fit cleanly into a simple positive/negative split. Displaying all negative amounts as green "+$X" was misleading for refunds.
**Resolution:** Minus in the amount field = "reverse this category's normal direction." Storage: Positive = money out, Negative = money in. Always. Display: Check BOTH the sign AND the category type. Never assume negative = income. Use `fmtTransaction()` from `lib/formatters.ts` everywhere.

Form Input → Storage → Display:
| Toggle   | User Types | Stored As | Category Type | Display          |
|----------|-----------|-----------|---------------|------------------|
| Expense  | 50        | +50       | expense       | Black "$50.00"   |
| Expense  | -50       | -50       | expense       | Green "-$50.00"  |
| Income   | 5000      | -5000     | income        | Green "+$5,000"  |
| Income   | -500      | +500      | income        | Red "-$500.00"   |

**Rule going forward:** Always check both the amount sign AND the category type when determining how to display a transaction. Green = money coming to you (income or refund). Red = money leaving against an income category. Black = normal expense.

### Income Categories Must Follow Group/Sub Pattern (2026-02-20)
**Context:** Income categories were originally seeded with group_name = sub_name, making each item its own parent group.
**Problem:** This caused duplicate display in the category dropdown (bold header + identical child for each income type) and was inconsistent with the expense category hierarchy.
**Resolution:** Changed all income categories to use group_name = "Income" with each income type as a sub_name, matching the exact pattern used by expense categories.
**Rule going forward:** ALL categories — income and expense — must follow the same group → sub-category hierarchy. Never create a category where group_name equals sub_name. If a new category type is added in the future (e.g., "Transfer"), it should follow this same pattern.

### No Browser Alerts (2026-02-19)
**Context:** Delete confirmations and error messages were using browser alert/confirm dialogs
**Problem:** Browser dialogs are jarring, unstyled, and inconsistent with the app's design
**Resolution:** Replaced with inline notification banners (red for errors, inline confirm state for destructive actions)
**Rule going forward:** Never use alert(), confirm(), or window.confirm() anywhere in the app. All user notifications must be inline UI elements.

### Credit Card CSV Sign Convention (2026-02-19)
**Context:** Importing credit card CSV statements
**Problem:** Credit card statements use inverted signs — positive = charge (expense), negative = credit (refund). Bank accounts use the opposite. Importing without accounting for this produces incorrect transaction amounts.
**Resolution:** Auto-detect sign convention based on account type and allow manual override on the import screen.
**Rule going forward:** Always consider the source account type when interpreting CSV amounts. Never assume a single sign convention for all account types.

### Parenthesized Amounts in CSVs (2026-02-19)
**Context:** Parsing CSV files from financial institutions
**Problem:** Some institutions format negative amounts as (123.45) instead of -123.45
**Resolution:** Added parsing for parenthesized amounts, stripping $, commas, and whitespace before numeric conversion
**Rule going forward:** Always normalize amount strings before parsing — handle parentheses, currency symbols, commas, and whitespace.

### Reusable Confirmation Pattern (2026-02-20)
**Context:** Delete actions across the app had inconsistent confirmation UX
**Problem:** Some used the inline "Confirm Delete?" pattern, others required double-click with no visual feedback, one had no confirmation at all
**Resolution:** Extracted a reusable `<ConfirmDeleteButton>` component (in `components/ConfirmDeleteButton.tsx`) with props for onConfirm, label, confirmLabel, and timeout (default 3s). Applied consistently across SettingsPage, TransactionsPage, and NetWorthPage.
**Rule going forward:** All destructive actions must use the shared ConfirmDeleteButton component. Never implement delete confirmation ad-hoc.

### Notification Strategy (2026-02-20)
**Context:** Some actions showed both inline notifications and toasts simultaneously
**Problem:** Redundant and cluttered — user sees the same message twice in different places
**Resolution:** Established clear rules: toasts for action results (success/failure), inline for validation errors and constraint messages, never both. Removed duplicate setBulkNotification + addToast calls from TransactionsPage and duplicate setNotification + addToast from ImportPage.
**Rule going forward:** One notification per action, maximum. Toasts for outcomes, inline for input problems. Never use both for the same action.

### Multi-Owner Accounts (2026-02-21)
**Context:** Some accounts (joint checking, shared credit card) are owned by multiple household members
**Problem:** The original schema used a single `owner` text field, which couldn't represent shared ownership. This affected the Budget page owner filter — shared account transactions would only appear under one person.
**Resolution:** Created an `account_owners` junction table supporting many-to-many relationships. Individual owner views on the Budget page include both sole and shared accounts. The "All" view remains the source of truth with no double-counting. Shared accounts display a "Shared" badge and multiple owner badges.
**Rule going forward:** Always use the account_owners junction table for ownership. Never assume an account has exactly one owner. When filtering by owner, include accounts where the user is ANY of the owners, not just the sole owner. The legacy `owner` column on `accounts` is kept for backward compat but should not be used in new app logic.
