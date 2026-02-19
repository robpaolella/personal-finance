Build the Import page — a 3-step wizard for importing CSV files from banks and Venmo.

## Backend API Routes

### Import API (routes/import.ts)
- POST /api/import/parse — accepts a CSV file upload (multipart form data), parses it, and returns:
  - headers: array of column headers detected
  - sampleRows: first 5 rows of data
  - detectedFormat: "chase" | "venmo" | "generic" (auto-detect based on headers)
  - suggestedMapping: { date: columnIndex, description: columnIndex, amount: columnIndex }

- POST /api/import/categorize — accepts an array of { description, amount } and returns AI-suggested categories. For now (without Claude integration), implement a simple rule-based matcher:
  - Match descriptions against common patterns (e.g., "SHELL" or "CHEVRON" → Auto: Fuel, "COSTCO" or "GIANT" or "GROCERY" → Daily Living: Groceries, etc.)
  - Return: { description, suggestedCategoryId, suggestedGroupName, suggestedSubName, confidence }
  - Confidence: 1.0 for exact matches, 0.7 for partial, 0.5 for guesses, 0.0 for no match
  - Build the matcher from existing transaction history — look at what category was previously assigned to similar descriptions

- POST /api/import/commit — accepts an array of finalized transactions and inserts them all. Body: { accountId, transactions: [{ date, description, note?, categoryId, amount }] }

### Venmo Parser Service (services/venmoParser.ts)
- Parse Venmo CSV format which has columns: Date, Type, Status, Note, From, To, Amount
- Convert Venmo's format into standard transaction format:
  - If From is the account owner and To is someone else → expense (positive amount), description: "To {To}: \"{Note}\""
  - If To is the account owner and From is someone else → could be income or negative expense depending on context, description: "{From}: \"{Note}\""
  - Handle "Charge" type (requests) vs "Payment" type
  - Skip incomplete/declined transactions

## Frontend — Import Page

### Step Indicator
- Three steps shown as a progress bar at the top: "Upload File", "Map Columns", "Review & Categorize"
- Current step highlighted in blue, completed steps filled, future steps gray

### Step 1: Upload File
- Large drop zone with dashed border
- Drag and drop a CSV file, or click to browse
- Show format badges: "Chase", "Venmo", "Generic CSV"
- Also show a dropdown to select which account this import is for (required)
- On file drop/select, upload to /api/import/parse and advance to step 2

### Step 2: Map Columns
- Show the detected file info: filename, account, number of transactions detected
- If auto-detection worked, show the suggested column mapping
- Allow the user to override: dropdowns for Date column, Description column, Amount column
- "Auto-Categorize" button (dark navy with star icon) that sends descriptions to /api/import/categorize
- Clicking auto-categorize advances to step 3

### Step 3: Review & Categorize
- Blue badge "AI-categorized" with note "Click any category to change it"
- "Import X Transactions" button (green)
- Table with columns: Date, Description, Amount, Category (parent group), Sub-Category, Confidence
- Confidence shown as a colored percentage: green > 90%, amber 70-90%, red < 70%
- Clicking a sub-category cell opens a dropdown to change the category (same two-step group → sub picker as transaction edit)
- Rows with low confidence should be highlighted with a subtle yellow background
- Import button calls /api/import/commit and then redirects to /transactions
