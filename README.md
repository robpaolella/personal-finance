# Ledger

**Your Money. Your Data.**

A self-hosted personal finance app for households. Track income, expenses, budgets, net worth, and investments — with role-based access, bank sync, and a mobile-friendly UI. All data stays on your server in a single SQLite file.

## Features

- **Dashboard** — KPI cards, spending breakdown, recent transactions
- **Transactions** — Full CRUD with filters, search, bulk edit, and pagination
- **Budget** — Monthly budget vs. actual by category, filterable by household member
- **Reports** — Annual income/expense breakdown with expandable categories
- **Net Worth** — Account balances, investment holdings, and depreciable assets (straight-line & declining balance)
- **Bank Sync** — Automated transaction and balance import via [SimpleFIN Bridge](https://beta-bridge.simplefin.org/)
- **CSV Import** — Auto-categorization, duplicate detection, transfer detection, multi-format support
- **Multi-User** — Owner / Admin / Member roles with 18 granular permissions
- **Joint Accounts** — Multi-owner support for shared accounts
- **Mobile Responsive** — Bottom sheets, tab navigation, and card layouts on small screens
- **Dark Mode** — System-aware with manual toggle

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Express, TypeScript, Drizzle ORM |
| Database | SQLite (better-sqlite3) |
| Auth | JWT, bcrypt |
| Bank Sync | SimpleFIN Bridge API |
| Deploy | Docker, Docker Compose |

## Getting Started

### Prerequisites

- Node.js 20+ and npm 9+, **or** Docker

### Local Development

```bash
npm install
npm run dev
```

This starts the Express API (port 3001) and Vite dev server (port 5173). Open [http://localhost:5173](http://localhost:5173).

On first launch, the app walks you through creating an owner account — no default credentials or seed users.

### Production (Docker)

```bash
docker compose up -d
```

The SQLite database is volume-mounted at `./data/` and persists across container rebuilds. Set `JWT_SECRET` in your environment or `.env` file.

## Database Management

```bash
npm run db:backup                              # backup
npm run db:restore backups/ledger-XXXXXX.db    # restore
npm run db:reset                               # reset and re-seed (dev only)
```

## Deploy

```bash
npm run deploy
```

Pushes to GitHub, builds the Docker image on the server, backs up the database, restarts the container, and runs a health check.
