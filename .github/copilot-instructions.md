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
**Problem:** Original design used an Expense/Income toggle to control sign, but refunds (negative expenses) don't fit cleanly into either category. Displaying all negative amounts as green "+$X" was misleading for refunds.
**Resolution:** The amount field accepts negative values directly. The toggle auto-syncs with category type and sets the default sign, but a manually entered minus sign takes priority. Display logic differentiates between income (negative + income category) and refunds (negative + expense category).
**Rule going forward:** Always check both the amount sign AND the category type when determining how to display a transaction. Never assume negative = income. A negative amount in an expense category is a refund/credit.
