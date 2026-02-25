# Ledger

[![Docker Hub](https://img.shields.io/docker/v/robpaolella/ledger?sort=semver&label=Docker%20Hub)](https://hub.docker.com/r/robpaolella/ledger)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

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

## Quick Start

Pull and run with Docker Compose:

```bash
curl -O https://raw.githubusercontent.com/robpaolella/ledger/main/docker-compose.yml
docker compose up -d
```

Open [http://localhost:3001](http://localhost:3001). On first launch, the app walks you through creating an owner account — no default credentials.

### Or pull the image directly:

```bash
docker pull robpaolella/ledger:latest
docker run -d -p 3001:3001 -v ./data:/app/packages/server/data robpaolella/ledger:latest
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| Backend | Express 5, TypeScript, Drizzle ORM |
| Database | SQLite (better-sqlite3) |
| Auth | JWT, bcrypt |
| Bank Sync | SimpleFIN Bridge API |
| Deploy | Docker, Docker Compose |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | Auto-generated | Signing key for auth tokens. If not set, a random secret is generated and persisted in the data volume. |
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `production` | Set automatically in Docker |

## Local Development

### Prerequisites

- Node.js 20+ and npm 9+

```bash
npm install
npm run dev
```

This starts the Express API (port 3001) and Vite dev server (port 5173). Open [http://localhost:5173](http://localhost:5173).

## Database Management

```bash
npm run db:backup                              # backup
npm run db:restore backups/ledger-XXXXXX.db    # restore
npm run db:reset                               # reset and re-seed (dev only)
```

The SQLite database is volume-mounted at `./data/` and persists across container rebuilds.

## License

[MIT](LICENSE)
