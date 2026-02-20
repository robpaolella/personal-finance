# Ledger — Personal Finance

A locally-hosted personal finance tracking web application for a two-person household. Track income, expenses, budgets, net worth, and asset depreciation — all from a clean, modern UI.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** Express, TypeScript, Drizzle ORM
- **Database:** SQLite (via better-sqlite3)
- **Auth:** JWT (Bearer tokens)
- **Fonts:** DM Sans (UI), DM Mono (numbers/dates)

## Project Structure

```
packages/
  client/          # React SPA (Vite)
    src/
      pages/       # Page components (Dashboard, Transactions, Budget, etc.)
      components/  # Reusable UI (KPICard, DataTable, Spinner, etc.)
      context/     # Auth and Toast contexts
      lib/         # API helpers, formatters
  server/          # Express API
    src/
      routes/      # REST endpoints (/api/*)
      middleware/   # Auth, error handling
      db/          # Drizzle schema, seed, migrations
      services/    # Business logic (Venmo parser, etc.)
      utils/       # Sanitization, helpers
  shared/          # Shared TypeScript types
```

## Setup

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Seed the Database

```bash
npm run seed
```

This creates the SQLite database with default users, accounts, and categories.

### Development

```bash
npm run dev
```

Starts both the Express server (port 3001) and Vite dev server (port 5173) concurrently. The Vite dev server proxies `/api` requests to the Express server.

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
npm start
```

Builds all packages and starts the production server on port 3001, serving the React app as static files.

## Default Credentials

| Username   | Password   |
|------------|------------|
| robert     | changeme   |
| kathleen   | changeme   |

> Change these after first login via the Settings page.

## Features

- **Dashboard** — KPI cards, spending breakdown chart, recent transactions
- **Transactions** — Full CRUD, filters, search, bulk edit, pagination
- **Budget** — Monthly budget vs. actual by category with progress bars
- **Reports** — Annual breakdown with expandable income/expense categories
- **Net Worth** — Account balances, depreciable assets, classification breakdown
- **Import** — CSV import with auto-categorization, format detection (Chase, Venmo, generic)
- **Settings** — Manage accounts, categories, and users
- **Dark Mode** — Full dark theme with toggle, persisted to localStorage

## Screenshots

_Coming soon._
