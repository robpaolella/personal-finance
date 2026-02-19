Build the Annual Reports page with expandable/collapsible rows and year selection.

## Backend API Routes

### Reports API (routes/reports.ts)
- GET /api/reports/annual?year=YYYY&owner=all|Robert|Kathleen — returns:
  - incomeByCategory: object keyed by income category name, each containing an array of 12 monthly totals
  - expensesByGroup: object keyed by parent category group, each containing an object keyed by sub-category name, each containing an array of 12 monthly totals
  - monthlyIncomeTotals: array of 12 numbers (sum of all income per month)
  - monthlyExpenseTotals: array of 12 numbers (sum of all expenses per month)
  - monthlyNetTotals: array of 12 numbers (income - expenses per month)
  - All filtered by owner's accounts if owner is specified

- GET /api/reports/available-years — returns array of distinct years that have transactions

## Frontend — Reports Page

### Header
- Title "Annual Report" with subtitle showing year and "Year-to-Date" if current year, "Full Year" otherwise
- Year selector dropdown (populated from available years API)
- Optional: Owner filter toggle

### KPI Cards Row (4 columns)
1. YTD Income — with percentage change vs prior year
2. YTD Expenses — with percentage change vs prior year
3. YTD Net — income minus expenses
4. Avg Monthly Savings — net divided by months elapsed, with savings rate percentage

### Monthly Breakdown Table (inside a card)
- Title "Monthly Breakdown" with subtitle "Click rows to expand into categories → sub-categories"
- Columns: Category (wider, ~200px min), Jan through Dec, Total
- Month headers are short 3-letter abbreviations

#### Total Income Row (expandable)
- Green background (#f0fdf4), green text, 2px green bottom border
- Click to expand → shows individual income category rows underneath
  - Income categories are indented (paddingLeft: 36px), lighter text
  - Each shows monthly values and total
- Chevron icon rotates when expanded/collapsed

#### Total Expenses Row (expandable)
- Orange background (#fff7ed), orange text, 2px orange bottom border
- Click to expand → shows parent category group rows underneath
  - Each group row is slightly indented (28px), bold, with a colored dot matching the category color
  - Each group row is ALSO expandable → click to show sub-category rows
    - Sub-category rows are further indented (52px), smaller lighter text
- Two levels of expand/collapse: Expenses → Groups → Sub-categories

#### NET Row
- Gray background, bold
- Shows income minus expenses per month
- Green for positive, red for negative

### Value Formatting
- Use fmtShort for values in the table cells (e.g., "$3.2k" instead of "$3,245.00")
- Use "—" for zero/empty months
- Future months (no data) show "—" in lighter gray
- Total column uses slightly bolder styling
