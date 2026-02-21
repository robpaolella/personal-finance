import { Router, Request, Response } from 'express';
import multer from 'multer';
import { db } from '../db/index.js';
import { transactions, categories } from '../db/schema.js';
import { eq, sql, like } from 'drizzle-orm';
import { parseVenmoCSV } from '../services/venmoParser.js';
import { detectDuplicates } from '../services/duplicateDetector.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine).filter((r) => r.some((c) => c.trim()));
  return { headers, rows };
}

function detectFormat(headers: string[]): 'chase' | 'venmo' | 'generic' {
  const h = headers.map((x) => x.toLowerCase());
  if (h.some((x) => x.includes('posting date') || x.includes('transaction date')) && h.some((x) => x.includes('description'))) return 'chase';
  if (h.some((x) => x.includes('datetime')) && h.some((x) => x.includes('note') || x.includes('from'))) return 'venmo';
  return 'generic';
}

function suggestMapping(headers: string[]): { date: number; description: number; amount: number } {
  const h = headers.map((x) => x.toLowerCase());
  let date = h.findIndex((x) => /posting\s?date|trans(action)?\s?date|^date$/i.test(x));
  if (date < 0) date = h.findIndex((x) => x.includes('date'));
  let description = h.findIndex((x) => /description|memo|payee|merchant/i.test(x));
  if (description < 0) description = h.findIndex((x) => x.includes('desc'));
  let amount = h.findIndex((x) => /^amount$|^amount.*total/i.test(x));
  if (amount < 0) amount = h.findIndex((x) => x.includes('amount'));
  return { date: date >= 0 ? date : 0, description: description >= 0 ? description : 1, amount: amount >= 0 ? amount : 2 };
}

// POST /api/import/parse
router.post('/parse', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const text = req.file.buffer.toString('utf-8');
    const { headers, rows } = parseCSV(text);

    if (headers.length === 0) {
      res.status(400).json({ error: 'Could not parse CSV headers' });
      return;
    }

    const detectedFormat = detectFormat(headers);
    const suggestedMappingResult = suggestMapping(headers);

    res.json({
      data: {
        headers,
        sampleRows: rows.slice(0, 5),
        totalRows: rows.length,
        detectedFormat,
        suggestedMapping: suggestedMappingResult,
      },
    });
  } catch (err) {
    console.error('POST /import/parse error:', err);
    res.status(500).json({ error: 'Failed to parse CSV' });
  }
});

// POST /api/import/categorize
router.post('/categorize', (req: Request, res: Response) => {
  try {
    const { items } = req.body as { items: { description: string; amount: number; payee?: string }[] };
    if (!items || !Array.isArray(items)) {
      res.status(400).json({ error: 'items array is required' });
      return;
    }

    // Build pattern map from existing transaction history
    const history = db.select({
      description: transactions.description,
      category_id: transactions.category_id,
      group_name: categories.group_name,
      sub_name: categories.sub_name,
      type: categories.type,
    }).from(transactions)
      .innerJoin(categories, eq(transactions.category_id, categories.id))
      .all();

    // Build frequency map: description pattern → most common category
    const descCatMap = new Map<string, { categoryId: number; groupName: string; subName: string; type: string; count: number }>();
    for (const h of history) {
      const key = h.description.toLowerCase().trim();
      const existing = descCatMap.get(key);
      if (!existing || existing.count < 1) {
        descCatMap.set(key, {
          categoryId: h.category_id,
          groupName: h.group_name,
          subName: h.sub_name,
          type: h.type,
          count: (existing?.count || 0) + 1,
        });
      }
    }

    // Keyword rules for common merchants
    const RULES: { pattern: RegExp; groupName: string; subName: string }[] = [
      { pattern: /shell|chevron|exxon|mobil|bp |sunoco|gas|fuel|wawa.*gas/i, groupName: 'Auto/Transportation', subName: 'Fuel' },
      { pattern: /costco gas/i, groupName: 'Auto/Transportation', subName: 'Fuel' },
      { pattern: /costco|giant|groceries|grocery|aldi|trader joe|whole foods|safeway|kroger|publix|wegmans|food lion|jimbo/i, groupName: 'Daily Living', subName: 'Groceries' },
      { pattern: /amazon|amzn/i, groupName: 'Daily Living', subName: 'Online Shopping' },
      { pattern: /walmart|target|dollar/i, groupName: 'Daily Living', subName: 'General Merchandise' },
      { pattern: /netflix|hulu|disney|spotify|apple.*music|hbo|paramount|peacock/i, groupName: 'Dues/Subscriptions', subName: 'Streaming Services' },
      { pattern: /restaurant|mcdonald|wendy|burger|chick-fil|chipotle|panera|starbucks|dunkin|coffee|pizza|taco bell|diner|jersey mike|in-n-out|del taco|subway|on the border|chili|peet/i, groupName: 'Daily Living', subName: 'Dining/Eating Out' },
      { pattern: /uber eats|doordash|grubhub|postmates/i, groupName: 'Daily Living', subName: 'Dining/Eating Out' },
      { pattern: /uber|lyft|taxi|cab/i, groupName: 'Auto/Transportation', subName: 'Ride Share' },
      { pattern: /geico|progressive|allstate|state farm|insurance/i, groupName: 'Insurance', subName: 'Auto Insurance' },
      { pattern: /at&t|verizon|t-mobile|sprint|comcast|xfinity|internet|wifi/i, groupName: 'Utilities', subName: 'Cellphone' },
      { pattern: /electric|power|energy|ppl|duke energy|sd gas|sdge/i, groupName: 'Utilities', subName: 'Electric' },
      { pattern: /water.*sewer|water bill|sewer/i, groupName: 'Utilities', subName: 'Water/Sewer' },
      { pattern: /home depot|lowes|hardware/i, groupName: 'Household', subName: 'Improvements' },
      { pattern: /cvs|walgreens|pharmacy|rx|doctor|dr\.|medical|hospital|urgent care/i, groupName: 'Health', subName: 'Medical' },
      { pattern: /gym|fitness|planet fitness|equinox|yoga/i, groupName: 'Health', subName: 'Gym/Fitness' },
      { pattern: /payroll|direct deposit|salary|wages/i, groupName: 'Income', subName: 'Take Home Pay' },
      { pattern: /interest.*payment|interest.*earned|interest paid|interest$/i, groupName: 'Income', subName: 'Interest Income' },
      { pattern: /cloudflare|github|namecheap|elevenlabs|steam/i, groupName: 'Dues/Subscriptions', subName: 'Online Services' },
      { pattern: /southwest|american airlines|united airlines|delta|frontier/i, groupName: 'Discretionary', subName: 'Travel' },
    ];

    // Get all categories for ID lookup
    const allCats = db.select().from(categories).all();
    const catLookup = new Map(allCats.map((c) => [`${c.group_name}:${c.sub_name}`, c.id]));

    const results = items.map((item) => {
      // Use payee as primary match text when available (bank sync), fall back to description (CSV)
      const primaryText = item.payee || item.description;
      const primaryLower = primaryText.toLowerCase().trim();
      const descLower = item.description.toLowerCase().trim();

      // 1. Exact match from history — check payee first, then description
      const exactPayee = descCatMap.get(primaryLower);
      if (exactPayee) {
        return {
          description: item.description,
          payee: item.payee,
          suggestedCategoryId: exactPayee.categoryId,
          suggestedGroupName: exactPayee.groupName,
          suggestedSubName: exactPayee.subName,
          confidence: 1.0,
        };
      }
      if (item.payee) {
        const exactDesc = descCatMap.get(descLower);
        if (exactDesc) {
          return {
            description: item.description,
            payee: item.payee,
            suggestedCategoryId: exactDesc.categoryId,
            suggestedGroupName: exactDesc.groupName,
            suggestedSubName: exactDesc.subName,
            confidence: 0.9,
          };
        }
      }

      // 2. Partial match from history — check both payee and description
      for (const [key, val] of descCatMap.entries()) {
        if (primaryLower.includes(key) || key.includes(primaryLower) ||
            (item.payee && (descLower.includes(key) || key.includes(descLower)))) {
          return {
            description: item.description,
            payee: item.payee,
            suggestedCategoryId: val.categoryId,
            suggestedGroupName: val.groupName,
            suggestedSubName: val.subName,
            confidence: 0.7,
          };
        }
      }

      // 3. Rule-based matching — check payee first, then description
      for (const rule of RULES) {
        if (rule.pattern.test(primaryText) || (item.payee && rule.pattern.test(item.description))) {
          const catId = catLookup.get(`${rule.groupName}:${rule.subName}`);
          return {
            description: item.description,
            payee: item.payee,
            suggestedCategoryId: catId || null,
            suggestedGroupName: rule.groupName,
            suggestedSubName: rule.subName,
            confidence: 0.7,
          };
        }
      }

      // 4. No match
      return {
        description: item.description,
        payee: item.payee,
        suggestedCategoryId: null,
        suggestedGroupName: null,
        suggestedSubName: null,
        confidence: 0.0,
      };
    });

    res.json({ data: results });
  } catch (err) {
    console.error('POST /import/categorize error:', err);
    res.status(500).json({ error: 'Failed to categorize' });
  }
});

// POST /api/import/commit
router.post('/commit', (req: Request, res: Response) => {
  try {
    const { accountId, transactions: txns } = req.body as {
      accountId: number;
      transactions: { date: string; description: string; note?: string; categoryId: number; amount: number }[];
    };

    if (!accountId || !txns || !Array.isArray(txns) || txns.length === 0) {
      res.status(400).json({ error: 'accountId and transactions array are required' });
      return;
    }

    // Validate all required fields
    for (const t of txns) {
      if (!t.date || !t.description || !t.categoryId || t.amount == null) {
        res.status(400).json({ error: 'Each transaction requires date, description, categoryId, and amount' });
        return;
      }
    }

    // Insert all transactions
    let count = 0;
    for (const t of txns) {
      db.insert(transactions).values({
        account_id: accountId,
        category_id: t.categoryId,
        date: t.date,
        description: t.description,
        note: t.note || null,
        amount: t.amount,
      }).run();
      count++;
    }

    res.status(201).json({ data: { imported: count } });
  } catch (err) {
    console.error('POST /import/commit error:', err);
    res.status(500).json({ error: 'Failed to import transactions' });
  }
});

// POST /api/import/check-duplicates — batch duplicate check for CSV import
router.post('/check-duplicates', (req: Request, res: Response) => {
  try {
    const { items } = req.body as { items: { date: string; amount: number; description: string }[] };
    if (!items || !Array.isArray(items)) {
      res.status(400).json({ error: 'items array is required' });
      return;
    }
    const results = detectDuplicates(items);
    res.json({ data: results });
  } catch (err) {
    console.error('POST /import/check-duplicates error:', err);
    res.status(500).json({ error: 'Duplicate check failed' });
  }
});

export default router;
