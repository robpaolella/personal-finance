import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { fmt } from '../lib/formatters';

interface Account {
  id: number;
  name: string;
  last_four: string | null;
  owner: string;
}

interface Category {
  id: number;
  group_name: string;
  sub_name: string;
  display_name: string;
  type: string;
}

interface ParseResult {
  headers: string[];
  sampleRows: string[][];
  totalRows: number;
  detectedFormat: string;
  suggestedMapping: { date: number; description: number; amount: number };
}

interface CategorizedRow {
  date: string;
  description: string;
  amount: number;
  suggestedCategoryId: number | null;
  suggestedGroupName: string | null;
  suggestedSubName: string | null;
  confidence: number;
  // User overrides
  categoryId: number | null;
  groupName: string | null;
  subName: string | null;
}

const STEPS = ['Upload File', 'Map Columns', 'Review & Categorize'];

export default function ImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [allRows, setAllRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState({ date: 0, description: 1, amount: 2 });
  const [categorizedRows, setCategorizedRows] = useState<CategorizedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [editingCatIdx, setEditingCatIdx] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [selectedImportRows, setSelectedImportRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (notification) { const t = setTimeout(() => setNotification(null), 5000); return () => clearTimeout(t); }
  }, [notification]);

  useEffect(() => {
    apiFetch<{ data: Account[] }>('/accounts').then((r) => setAccounts(r.data));
    apiFetch<{ data: Category[] }>('/categories').then((r) => setCategories(r.data));
  }, []);

  const handleFile = async (f: File) => {
    if (!selectedAccountId) {
      setNotification({ type: 'error', message: 'Please select an account first.' });
      return;
    }
    setFile(f);
    const formData = new FormData();
    formData.append('file', f);

    try {
      const res = await apiFetch<{ data: ParseResult }>('/import/parse', {
        method: 'POST',
        body: formData,
      });

      setParseResult(res.data);
      setMapping(res.data.suggestedMapping);
    } catch (err) {
      console.error('Failed to parse CSV:', err);
      setNotification({ type: 'error', message: 'Failed to parse CSV file. Check console for details.' });
      setFile(null);
      return;
    }

    // Store all rows (we'll need them for step 3)
    // Re-parse locally to get all rows
    const text = await f.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const parsedRows = lines.slice(1).map((line) => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
          else inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      result.push(current.trim());
      return result;
    }).filter((r) => r.some((c) => c.trim()));

    setAllRows(parsedRows);
    setStep(1);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleAutoCategorize = async () => {
    if (!parseResult) return;

    const items = allRows.map((row) => {
      const rawAmt = row[mapping.amount]?.replace(/[$,+\s"]/g, '') || '0';
      return {
        description: row[mapping.description] || '',
        amount: parseFloat(rawAmt),
      };
    }).filter((item) => item.description.trim());

    const res = await apiFetch<{ data: CategorizedRow[] }>('/import/categorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });

    // Merge with row data (date + amount)
    const merged = res.data.map((cat, i) => {
      const row = allRows[i];
      const dateStr = row?.[mapping.date] || '';
      const rawAmt = row?.[mapping.amount]?.replace(/[$,+\s"]/g, '') || '0';
      const amt = parseFloat(rawAmt);

      // Parse date
      let date = dateStr;
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        date = parsed.toISOString().slice(0, 10);
      }

      // Convert amount: negative in CSV means money out = expense = positive in our system
      const amount = isNaN(amt) ? 0 : -amt;

      return {
        date,
        description: cat.description,
        amount,
        suggestedCategoryId: cat.suggestedCategoryId,
        suggestedGroupName: cat.suggestedGroupName,
        suggestedSubName: cat.suggestedSubName,
        confidence: cat.confidence,
        categoryId: cat.suggestedCategoryId,
        groupName: cat.suggestedGroupName,
        subName: cat.suggestedSubName,
      };
    });

    setCategorizedRows(merged);
    setSelectedImportRows(new Set(merged.map((_, i) => i)));
    setStep(2);
  };

  const handleImport = async () => {
    if (!selectedAccountId) return;
    const validRows = categorizedRows.filter((r, i) => selectedImportRows.has(i) && r.categoryId != null);
    if (validRows.length === 0) { setNotification({ type: 'error', message: 'No transactions with assigned categories to import.' }); return; }

    setImporting(true);
    try {
      await apiFetch('/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccountId,
          transactions: validRows.map((r) => ({
            date: r.date,
            description: r.description,
            categoryId: r.categoryId,
            amount: r.amount,
          })),
        }),
      });
      navigate('/transactions');
    } catch (err) {
      setNotification({ type: 'error', message: 'Import failed. Please try again.' });
    } finally {
      setImporting(false);
    }
  };

  const updateRowCategory = (idx: number, catId: number) => {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    setCategorizedRows((prev) => prev.map((r, i) => i === idx ? {
      ...r,
      categoryId: catId,
      groupName: cat.group_name,
      subName: cat.sub_name,
      confidence: 1.0,
    } : r));
    setEditingCatIdx(null);
  };

  // Group categories for dropdown
  const expenseCats = categories.filter((c) => c.type === 'expense');
  const incomeCats = categories.filter((c) => c.type === 'income');
  const catGroups = new Map<string, Category[]>();
  for (const c of expenseCats) {
    if (!catGroups.has(c.group_name)) catGroups.set(c.group_name, []);
    catGroups.get(c.group_name)!.push(c);
  }

  const validImportCount = categorizedRows.filter((r, i) => selectedImportRows.has(i) && r.categoryId != null).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#0f172a] m-0">Import Transactions</h1>
        <p className="text-[#64748b] text-[13px] mt-1">Import CSV from your bank, credit card, or Venmo</p>
      </div>

      {/* Step Indicator */}
      <div className="flex gap-1 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1 text-center">
            <div className={`h-[3px] rounded-sm mb-1.5 ${i <= step ? 'bg-[#3b82f6]' : 'bg-[#e2e8f0]'}`} />
            <span className={`text-[11px] ${i === step ? 'text-[#3b82f6] font-bold' : i < step ? 'text-[#3b82f6]' : 'text-[#94a3b8]'}`}>
              {s}
            </span>
          </div>
        ))}
      </div>

      {/* Inline notification banner */}
      {notification && (
        <div className={`rounded-lg p-3 text-[13px] mb-4 flex items-center justify-between border ${
          notification.type === 'error' ? 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b]' : 'bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]'
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className={`ml-2 bg-transparent border-none cursor-pointer font-bold text-[14px] leading-none ${
            notification.type === 'error' ? 'text-[#991b1b]' : 'text-[#166534]'
          }`}>×</button>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 0 && (
        <div>
          {/* Account selector */}
          <div className="mb-4">
            <label className="text-[12px] text-[#64748b] font-medium block mb-1">Import to Account</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value ? parseInt(e.target.value) : '')}
              className="border border-[#e2e8f0] rounded-lg bg-[#f8fafc] px-3 py-2 text-[13px] outline-none w-[300px]"
            >
              <option value="">Select an account...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}{a.last_four ? ` (${a.last_four})` : ''} — {a.owner}
                </option>
              ))}
            </select>
          </div>

          {/* Drop zone */}
          <div
            className="bg-white rounded-xl border border-[#e8ecf1] p-10 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className={`border-2 border-dashed rounded-2xl py-12 px-6 ${dragOver ? 'border-[#3b82f6] bg-[#eff6ff]' : 'border-[#cbd5e1] bg-[#fafbfc]'}`}>
              <div className={`mb-3 ${dragOver ? 'text-[#3b82f6]' : 'text-[#94a3b8]'}`}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="mx-auto">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <p className="font-semibold text-[#334155] text-[15px] mb-1">Drop your CSV file here</p>
              <p className="text-[#94a3b8] text-[13px]">
                or <span className="text-[#3b82f6] cursor-pointer font-medium" onClick={() => fileInputRef.current?.click()}>browse files</span>
              </p>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }} />
              <div className="flex gap-2 justify-center mt-4">
                {['Chase', 'Venmo', 'Generic CSV'].map((t) => (
                  <span key={t} className="text-[11px] px-2.5 py-0.5 bg-[#f1f5f9] rounded-full text-[#64748b]">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Map Columns */}
      {step === 1 && parseResult && (
        <div className="bg-white rounded-xl border border-[#e8ecf1] px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="font-semibold text-[#0f172a] m-0">{file?.name}</p>
              <p className="text-[12px] text-[#64748b] mt-1 m-0">
                Account: {accounts.find((a) => a.id === selectedAccountId)?.name} · {parseResult.totalRows} transactions · Format: {parseResult.detectedFormat}
              </p>
            </div>
            <button
              onClick={handleAutoCategorize}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0f172a] text-white rounded-lg text-[13px] font-semibold border-none cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/>
              </svg>
              Auto-Categorize
            </button>
          </div>

          {/* Column mapping */}
          <div className="bg-[#f8fafc] rounded-lg p-4 mb-4">
            <p className="text-[12px] font-medium text-[#475569] m-0 mb-2">Column Mapping</p>
            <div className="flex gap-4">
              {(['date', 'description', 'amount'] as const).map((field) => (
                <div key={field} className="flex-1">
                  <label className="text-[11px] text-[#64748b] block mb-1 capitalize">{field}</label>
                  <select
                    value={mapping[field]}
                    onChange={(e) => setMapping({ ...mapping, [field]: parseInt(e.target.value) })}
                    className="w-full border border-[#e2e8f0] rounded-md bg-white px-2 py-1.5 text-[12px] outline-none"
                  >
                    {parseResult.headers.map((h, i) => (
                      <option key={i} value={i}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Sample preview */}
          <p className="text-[11px] text-[#94a3b8] m-0 mb-2">Preview (first 5 rows)</p>
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                {parseResult.headers.map((h, i) => (
                  <th key={i} className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2 py-1.5 border-b border-[#e2e8f0] text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parseResult.sampleRows.map((row, i) => (
                <tr key={i} className="border-b border-[#f1f5f9]">
                  {row.map((cell, j) => (
                    <td key={j} className="px-2 py-1.5 text-[#475569] font-mono text-[11px]">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Step 3: Review & Categorize */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-[#e8ecf1] px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 px-2.5 py-1 bg-[#eff6ff] rounded-lg text-[11px] text-[#3b82f6] font-semibold">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/>
                </svg>
                AI-categorized
              </span>
              <span className="text-[12px] text-[#64748b]">Click any category to change it</span>
            </div>
            <button
              onClick={handleImport}
              disabled={importing || validImportCount === 0}
              className="px-4 py-2 bg-[#10b981] text-white rounded-lg text-[13px] font-semibold border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing...' : `Import ${validImportCount} of ${categorizedRows.length} Transactions`}
            </button>
          </div>

          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="w-8 px-2 py-2 border-b-2 border-[#e2e8f0]">
                  <input type="checkbox"
                    checked={selectedImportRows.size === categorizedRows.length && categorizedRows.length > 0}
                    onChange={() => {
                      if (selectedImportRows.size === categorizedRows.length) setSelectedImportRows(new Set());
                      else setSelectedImportRows(new Set(categorizedRows.map((_, i) => i)));
                    }}
                    className="cursor-pointer" />
                </th>
                <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-left">Date</th>
                <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-left">Description</th>
                <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-right">Amount</th>
                <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-left">Category</th>
                <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-left">Sub-Category</th>
                <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-center">Conf.</th>
              </tr>
            </thead>
            <tbody>
              {categorizedRows.map((r, i) => (
                <tr key={i} className={`border-b border-[#f1f5f9] ${!selectedImportRows.has(i) ? 'opacity-50' : ''} ${r.confidence < 0.5 && selectedImportRows.has(i) ? 'bg-[#fffbeb]' : ''}`}>
                  <td className="px-2 py-2 text-center">
                    <input type="checkbox" checked={selectedImportRows.has(i)}
                      onChange={() => {
                        setSelectedImportRows(prev => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i); else next.add(i);
                          return next;
                        });
                      }}
                      className="cursor-pointer" />
                  </td>
                  <td className="px-2.5 py-2 font-mono text-[12px] text-[#475569]">{r.date}</td>
                  <td className="px-2.5 py-2 font-medium text-[#0f172a]">{r.description}</td>
                  <td className={`px-2.5 py-2 text-right font-mono font-semibold ${r.amount < 0 ? 'text-[#10b981]' : 'text-[#0f172a]'}`}>
                    {r.amount < 0 ? '+' : ''}{fmt(Math.abs(r.amount))}
                  </td>
                  <td className="px-2.5 py-2">
                    <span className="text-[11px] text-[#64748b]">{r.groupName || '—'}</span>
                  </td>
                  <td className="px-2.5 py-2 relative">
                    {editingCatIdx === i ? (
                      <select
                        autoFocus
                        className="text-[11px] border border-[#3b82f6] rounded-md px-1.5 py-1 outline-none bg-white min-w-[160px]"
                        value={r.categoryId || ''}
                        onChange={(e) => updateRowCategory(i, parseInt(e.target.value))}
                        onBlur={() => setEditingCatIdx(null)}
                      >
                        <option value="">Select...</option>
                        {Array.from(catGroups.entries()).map(([group, cats]) => (
                          <optgroup key={group} label={group}>
                            {cats.map((c) => <option key={c.id} value={c.id}>{c.sub_name}</option>)}
                          </optgroup>
                        ))}
                        <optgroup label="Income">
                          {incomeCats.map((c) => <option key={c.id} value={c.id}>{c.sub_name}</option>)}
                        </optgroup>
                      </select>
                    ) : (
                      <span
                        onClick={() => setEditingCatIdx(i)}
                        className="text-[11px] bg-[#eff6ff] text-[#3b82f6] px-2 py-0.5 rounded-md cursor-pointer border-b border-dashed border-[#94a3b8]"
                      >
                        {r.subName || 'Uncategorized'}
                      </span>
                    )}
                  </td>
                  <td className="px-2.5 py-2 text-center">
                    <span className={`text-[11px] font-semibold font-mono ${
                      r.confidence > 0.9 ? 'text-[#10b981]' : r.confidence > 0.6 ? 'text-[#f59e0b]' : 'text-[#ef4444]'
                    }`}>
                      {Math.round(r.confidence * 100)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
