I'm building a personal finance tracking web application called "Ledger". Please scaffold the full project with the following stack and structure.

## Tech Stack
- **Frontend:** React 18+ with Vite, TypeScript, Tailwind CSS 3, React Router v6
- **Backend:** Node.js with Express, TypeScript
- **Database:** SQLite via better-sqlite3 with Drizzle ORM
- **Auth:** bcrypt for password hashing, JSON Web Tokens (JWT) for sessions
- **Monorepo structure** using npm workspaces

## Project Structure

```
ledger/
├── packages/
│   ├── client/          # React + Vite + Tailwind
│   │   ├── src/
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── pages/         # Page components (Dashboard, Transactions, etc.)
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── lib/           # API client, utilities, formatters
│   │   │   ├── context/       # Auth context, app context
│   │   │   └── types/         # Shared TypeScript types
│   │   └── index.html
│   ├── server/          # Express + SQLite
│   │   ├── src/
│   │   │   ├── routes/        # API route handlers
│   │   │   ├── db/
│   │   │   │   ├── schema.ts  # Drizzle schema
│   │   │   │   ├── seed.ts    # Seed script for initial data
│   │   │   │   └── index.ts   # DB connection
│   │   │   ├── middleware/    # Auth middleware, error handling
│   │   │   └── services/     # Business logic
│   │   └── index.ts
│   └── shared/          # Shared types & constants
│       └── src/
│           └── types.ts
├── package.json         # Workspace root
└── tsconfig.base.json
```

## Database Schema (Drizzle ORM)

Create the following tables:

### users
- id: integer, primary key, autoincrement
- username: text, unique, not null
- password_hash: text, not null (bcrypt)
- display_name: text, not null
- created_at: text, default current timestamp

### accounts
- id: integer, primary key, autoincrement
- name: text, not null (e.g., "Chase Checking")
- last_four: text (e.g., "2910", nullable for accounts like Venmo)
- type: text, not null (enum: checking, savings, credit, investment, retirement, venmo, cash)
- classification: text, not null (enum: liquid, investment, liability)
- owner: text, not null (e.g., "Robert", "Kathleen" — this is the display name linking to a user)
- is_active: integer, default 1 (boolean)
- created_at: text, default current timestamp

### categories
- id: integer, primary key, autoincrement
- group_name: text, not null (parent category, e.g., "Daily Living", "Household")
- sub_name: text, not null (sub-category, e.g., "Groceries", "Rent")
- display_name: text, not null (computed as "group_name: sub_name")
- type: text, not null (enum: income, expense)
- is_deductible: integer, default 0 (boolean)
- sort_order: integer, default 0

### transactions
- id: integer, primary key, autoincrement
- account_id: integer, not null, foreign key -> accounts.id
- date: text, not null (ISO date string YYYY-MM-DD)
- description: text, not null
- note: text (nullable)
- category_id: integer, not null, foreign key -> categories.id
- amount: numeric, not null (positive = expense/money out, negative = income/money in)
- created_at: text, default current timestamp

### budgets
- id: integer, primary key, autoincrement
- category_id: integer, not null, foreign key -> categories.id
- month: text, not null (format: YYYY-MM)
- amount: numeric, not null
- UNIQUE constraint on (category_id, month)

### balance_snapshots
- id: integer, primary key, autoincrement
- account_id: integer, not null, foreign key -> accounts.id
- date: text, not null
- balance: numeric, not null
- note: text (nullable)

### assets
- id: integer, primary key, autoincrement
- name: text, not null
- purchase_date: text, not null
- cost: numeric, not null
- lifespan_years: numeric, not null
- salvage_value: numeric, not null
- created_at: text, default current timestamp

## Seed Data

Create a seed script that populates:

1. **Two users:** Robert (password: changeme) and Kathleen (password: changeme)

2. **Categories** — Income categories (type: "income", no sub-categories needed, use group_name = sub_name):
   - Take Home Pay
   - 401(k)
   - Gifts Received
   - Tax Refunds
   - Interest Income
   - Refunds/Reimbursements
   - Other Income

3. **Categories** — Expense categories (type: "expense") with these parent groups and sub-categories:
   - Auto/Transportation: Fuel, Service, Transportation, Other Auto/Transportation
   - Business: Unreimbursed, Office At Home, Meeting Expenses, Other Business Expenses
   - Charitable Contributions: Religious, Other Non-Profit
   - Clothing: Clothes/Shoes, Laundry/Dry Cleaning, Other Clothing
   - Daily Living: Dining/Eating Out, Groceries, Personal Supplies, Pets, Other Daily Living
   - Discretionary: Robert, Kathleen
   - Dues/Subscriptions: Digital Services, Gym, Newspaper
   - Education: Tuition, Other Education
   - Entertainment: Books/Magazine, Dates, Film/Photos, Hobby, Other Entertainment
   - Health: Medical Insurance, Medicine/Drug, Doctor/Dentist/Optometrist, Hospital, Other Health
   - Household: Rent, Farm and Garden, Tools, Furnishings, Appliances, Improvements, Maintenance, Other Household
   - Insurance: Auto, Health, Other
   - Loan: Auto, Personal Note, Other
   - Miscellaneous: Short-term Personal Loan (Outbound), Other
   - Non-deductible Expense: Other
   - Other: Gifts Given, Venmo Transaction, Vacation/Travel
   - Savings: Emergency Fund, Investments, Other
   - Tax Not Withheld: Fed, Other
   - Utilities: Internet, Cellphone, Power, Water, Other

4. Mark the following categories as is_deductible = true: all Business sub-categories, all Charitable Contributions sub-categories, all Health sub-categories, and Other: Losses-Unreimbursable, Other: Other Deductible.

## Configuration

- The server should run on port 3001
- The client dev server should run on port 5173 and proxy API requests to the server
- Create a root-level `npm run dev` script that starts both client and server concurrently
- Create a root-level `npm run seed` script to seed the database
- The SQLite database file should be stored at `./data/ledger.db`
- Store JWT_SECRET in a `.env` file (generate a random default)
- Add `.env` and `data/` to `.gitignore`

Please scaffold everything, install all dependencies, and make sure `npm run dev` starts both the client and server successfully. The client should show a basic "Ledger" placeholder page. The server should respond to `GET /api/health` with `{ status: "ok" }`.

Remember to follow the commit conventions in `.github/copilot-instructions.md` — commit at logical checkpoints as you build (e.g., after setting up the monorepo structure, after creating the schema, after the seed script works, etc.). Do not wait until the end to make one giant commit.
