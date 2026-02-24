// @ts-nocheck
import { useState } from 'react';

const SAMPLE_ROWS = [
  { date: '2026-02-20', description: 'COSTCO WHOLESALE #482', amount: 142.87, categoryGroup: 'Shopping', category: 'Groceries', confidence: 0.95, status: null },
  { date: '2026-02-19', description: 'SHELL OIL 98217832', amount: 48.12, categoryGroup: 'Transportation', category: 'Gas', confidence: 0.92, status: null },
  { date: '2026-02-19', description: 'SPOTIFY PREMIUM', amount: 15.99, categoryGroup: 'Entertainment', category: 'Subscriptions', confidence: 0.98, status: null },
  { date: '2026-02-18', description: 'VENMO PAYMENT FROM SARAH', amount: -85.00, categoryGroup: 'Income', category: 'Reimbursement', confidence: 0.72, status: 'transfer' },
  { date: '2026-02-18', description: 'TARGET #1892 PURCHASE', amount: 67.43, categoryGroup: 'Shopping', category: 'Household', confidence: 0.88, status: null },
  { date: '2026-02-17', description: 'AMAZON MARKETPLACE', amount: 29.99, categoryGroup: 'Shopping', category: 'Online Shopping', confidence: 0.85, status: 'duplicate' },
  { date: '2026-02-17', description: 'STARBUCKS STORE #4812', amount: 6.75, categoryGroup: 'Food & Drink', category: 'Coffee', confidence: 0.97, status: null },
  { date: '2026-02-16', description: 'ELECTRIC COMPANY AUTOPAY', amount: 187.32, categoryGroup: 'Bills & Utilities', category: 'Electric', confidence: 0.99, status: null },
];

const SAMPLE_HEADERS = ['Date', 'Description', 'Amount', 'Category', 'Memo'];
const SAMPLE_CSV_ROWS = [
  ['02/20/2026', 'COSTCO WHOLESALE #482', '-142.87', '', 'POS PURCHASE'],
  ['02/19/2026', 'SHELL OIL 98217832', '-48.12', '', 'POS PURCHASE'],
  ['02/19/2026', 'SPOTIFY PREMIUM', '-15.99', '', 'RECURRING'],
  ['02/18/2026', 'VENMO PAYMENT FROM SARAH', '85.00', '', 'CREDIT'],
  ['02/18/2026', 'TARGET #1892 PURCHASE', '-67.43', '', 'POS PURCHASE'],
];

const CATEGORIES = [
  { group: 'Shopping', subs: ['Groceries', 'Household', 'Online Shopping', 'Clothing'] },
  { group: 'Transportation', subs: ['Gas', 'Auto Insurance', 'Maintenance'] },
  { group: 'Food & Drink', subs: ['Coffee', 'Restaurants', 'Fast Food'] },
  { group: 'Entertainment', subs: ['Subscriptions', 'Movies', 'Games'] },
  { group: 'Bills & Utilities', subs: ['Electric', 'Water', 'Internet', 'Phone'] },
];

function fmt(n: number) {
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function MockupPage() {
  const [dark, setDark] = useState(document.documentElement.classList.contains('dark'));
  const [view, setView] = useState<'review' | 'mapping'>('review');
  const [selected, setSelected] = useState<Set<number>>(new Set(SAMPLE_ROWS.map((_, i) => i)));
  const [categories, setCategories] = useState(SAMPLE_ROWS.map(r => r.category));

  const toggleTheme = () => {
    setDark(!dark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] p-4">
      {/* Theme toggle */}
      <button onClick={toggleTheme}
        className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full flex items-center justify-center text-lg"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-card-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', color: dark ? '#fbbf24' : '#64748b' }}>
        {dark ? '☀' : '☾'}
      </button>

      {/* Phone frame */}
      <div className="mx-auto" style={{ maxWidth: 390, background: 'var(--bg-main)', borderRadius: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.15)', overflow: 'hidden', border: '1px solid var(--bg-card-border)' }}>
        {/* Header */}
        <div style={{ padding: '16px 16px 0' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 8px' }}>
            📱 Import Page Mobile Mockup — {view === 'review' ? 'Review & Categorize' : 'Column Mapping Preview'}
          </p>
          
          {/* View toggle */}
          <div className="flex bg-[var(--bg-hover)] rounded-lg p-0.5 mb-3">
            <button onClick={() => setView('review')}
              className={`flex-1 px-3 py-1.5 text-[12px] border-none cursor-pointer rounded-md ${view === 'review' ? 'bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold shadow-sm' : 'bg-transparent text-[var(--text-secondary)]'}`}>
              Review & Categorize
            </button>
            <button onClick={() => setView('mapping')}
              className={`flex-1 px-3 py-1.5 text-[12px] border-none cursor-pointer rounded-md ${view === 'mapping' ? 'bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold shadow-sm' : 'bg-transparent text-[var(--text-secondary)]'}`}>
              Column Mapping
            </button>
          </div>
        </div>

        {view === 'review' ? (
          <ReviewMockup selected={selected} setSelected={setSelected} categories={categories} setCategories={setCategories} />
        ) : (
          <MappingMockup />
        )}
      </div>
    </div>
  );
}

function ReviewMockup({ selected, setSelected, categories, setCategories }: {
  selected: Set<number>;
  setSelected: (s: Set<number>) => void;
  categories: string[];
  setCategories: (c: string[]) => void;
}) {
  return (
    <div style={{ padding: '0 12px 16px' }}>
      {/* Sticky header card */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] px-3 py-3 shadow-[var(--bg-card-shadow)] mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-1 px-2 py-0.5 bg-[var(--badge-category-bg)] rounded-lg text-[10px] text-[var(--badge-category-text)] font-semibold">
            ⭐ AI-categorized
          </span>
          <span className="text-[11px] text-[var(--text-secondary)]">
            {selected.size} of {SAMPLE_ROWS.length} selected
          </span>
        </div>
        <button
          className="w-full py-2 bg-[var(--color-positive)] text-white rounded-lg text-[13px] font-semibold border-none cursor-pointer btn-success">
          Import {selected.size} of {SAMPLE_ROWS.length} Transactions
        </button>
      </div>

      {/* Transaction cards */}
      <div className="flex flex-col gap-2">
        {SAMPLE_ROWS.map((r, i) => (
          <div key={i}
            className={`rounded-xl border px-3 py-2.5 transition-opacity ${
              !selected.has(i) ? 'opacity-50 border-[var(--bg-card-border)]' :
              r.status === 'duplicate' ? 'border-[var(--bg-card-border)] bg-[var(--bg-needs-attention)]' :
              'border-[var(--bg-card-border)] bg-[var(--bg-card)]'
            }`}>
            <div className="flex items-start gap-2.5">
              {/* Checkbox */}
              <input type="checkbox" checked={selected.has(i)}
                onChange={() => {
                  const next = new Set(selected);
                  if (next.has(i)) next.delete(i); else next.add(i);
                  setSelected(next);
                }}
                className="cursor-pointer mt-0.5 flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                {/* Row 1: Description + Amount */}
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                    {r.description}
                  </span>
                  <span className={`text-[13px] font-mono font-semibold flex-shrink-0 ${r.amount < 0 ? 'text-[#10b981]' : 'text-[var(--text-primary)]'}`}>
                    {r.amount < 0 ? '+' : ''}{fmt(r.amount)}
                  </span>
                </div>
                
                {/* Row 2: Date + Badges + Confidence */}
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">{r.date}</span>
                  {r.status === 'duplicate' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#fef3c7] text-[#92400e] font-semibold">DUPE</span>
                  )}
                  {r.status === 'transfer' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#dbeafe] text-[#1e40af] font-semibold">TRANSFER</span>
                  )}
                  <span className={`text-[10px] font-semibold font-mono ml-auto ${
                    r.confidence > 0.9 ? 'text-[#10b981]' : r.confidence > 0.6 ? 'text-[#f59e0b]' : 'text-[#ef4444]'
                  }`}>
                    {Math.round(r.confidence * 100)}%
                  </span>
                </div>
                
                {/* Row 3: Category dropdown */}
                <div className="mt-2">
                  <div className="text-[10px] text-[var(--text-muted)] mb-0.5">{r.categoryGroup}</div>
                  <select
                    className="w-full text-[12px] border border-[var(--table-border)] rounded-md px-2 py-1.5 outline-none bg-[var(--bg-card)] text-[var(--text-body)]"
                    value={categories[i]}
                    onChange={(e) => {
                      const next = [...categories];
                      next[i] = e.target.value;
                      setCategories(next);
                    }}>
                    <option value="">Select category...</option>
                    {CATEGORIES.map(g => (
                      <optgroup key={g.group} label={g.group}>
                        {g.subs.map(s => <option key={s} value={s}>{s}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MappingMockup() {
  const [mapping, setMapping] = useState({ date: 0, description: 1, amount: 2 });

  return (
    <div style={{ padding: '0 12px 16px' }}>
      {/* Column Mapping Card */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] px-3 py-3 shadow-[var(--bg-card-shadow)] mb-3">
        <p className="text-[12px] font-medium text-[var(--text-body)] m-0 mb-2">Column Mapping</p>
        <div className="flex flex-col gap-3">
          {(['date', 'description', 'amount'] as const).map((field) => (
            <div key={field}>
              <label className="text-[11px] text-[var(--text-secondary)] block mb-1 capitalize">{field}</label>
              <select
                value={mapping[field]}
                onChange={(e) => setMapping({ ...mapping, [field]: parseInt(e.target.value) })}
                className="w-full border border-[var(--table-border)] rounded-md bg-[var(--bg-card)] px-2 py-1.5 text-[12px] outline-none text-[var(--text-body)]">
                {SAMPLE_HEADERS.map((h, i) => (
                  <option key={i} value={i}>{h}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Preview — mapped columns only */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] px-3 py-3 shadow-[var(--bg-card-shadow)] mb-3">
        <p className="text-[11px] text-[var(--text-muted)] m-0 mb-2">Preview (first 5 rows — mapped columns only)</p>
        <div className="flex flex-col gap-1.5">
          {SAMPLE_CSV_ROWS.map((row, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5" style={{ borderBottom: i < SAMPLE_CSV_ROWS.length - 1 ? '1px solid var(--bg-card-border)' : 'none' }}>
              <span className="text-[11px] font-mono text-[var(--text-muted)] flex-shrink-0 w-[72px]">
                {row[mapping.date]}
              </span>
              <span className="text-[11px] text-[var(--text-body)] flex-1 min-w-0 truncate">
                {row[mapping.description]}
              </span>
              <span className={`text-[11px] font-mono font-semibold flex-shrink-0 ${
                row[mapping.amount].startsWith('-') ? 'text-[var(--text-primary)]' : 'text-[#10b981]'
              }`}>
                {row[mapping.amount]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] px-3 py-3 shadow-[var(--bg-card-shadow)]">
        <div className="flex items-center justify-between mb-3">
          <label className="text-[12px] font-medium text-[var(--text-body)]">Account</label>
          <select className="border border-[var(--table-border)] rounded-md bg-[var(--bg-card)] px-2 py-1 text-[12px] outline-none text-[var(--text-body)]">
            <option>Chase Checking (4821)</option>
            <option>Amex Gold (1004)</option>
          </select>
        </div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-[12px] font-medium text-[var(--text-body)]">Sign Convention</label>
          <select className="border border-[var(--table-border)] rounded-md bg-[var(--bg-card)] px-2 py-1 text-[12px] outline-none text-[var(--text-body)]">
            <option>Auto-detect</option>
            <option>Bank (positive = deposit)</option>
            <option>Credit card (positive = charge)</option>
          </select>
        </div>
        <button className="w-full py-2 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] rounded-lg text-[13px] font-semibold border-none cursor-pointer btn-primary">
          Continue to Review →
        </button>
      </div>
    </div>
  );
}
