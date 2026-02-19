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

_(Entries will be added here as the project progresses)_
