import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { fmt, fmtTransaction } from '../lib/formatters';
import { getCategoryColor } from '../lib/categoryColors';
import { getCategoryColorHex, getCategoryEmoji } from '../lib/categoryMeta';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import ConfirmDeleteButton from '../components/ConfirmDeleteButton';
import CurrencyInput from '../components/CurrencyInput';
import PermissionGate from '../components/PermissionGate';
import { CategoryBadge, SplitBadge, ReimbursementBadge } from '../components/badges';
import InlineNotification from '../components/InlineNotification';
import ResponsiveModal from '../components/ResponsiveModal';
import SplitEditor from '../components/SplitEditor';
import type { SplitRow } from '../components/SplitEditor';
import { useIsMobile } from '../hooks/useIsMobile';

interface DuplicateMatch {
  id: number;
  date: string;
  description: string;
  amount: number;
  notes: string | null;
  accountName: string | null;
  category: string | null;
}

interface TransactionAccount {
  id: number;
  name: string;
  lastFour: string | null;
  owner: string;
  owners?: { id: number; displayName: string }[];
  isShared?: boolean;
}

interface TransactionCategory {
  id: number;
  groupName: string;
  subName: string;
  displayName: string;
  type: string;
}

interface TransactionSplit {
  id: number;
  categoryId: number;
  groupName: string;
  subName: string;
  displayName: string;
  type: string;
  amount: number;
}

interface Transaction {
  id: number;
  date: string;
  description: string;
  note: string | null;
  amount: number;
  account: TransactionAccount;
  category: TransactionCategory | null;
  splits: TransactionSplit[] | null;
}

interface Account {
  id: number;
  name: string;
  last_four: string | null;
  owner: string;
  owners?: { id: number; displayName: string }[];
  isShared?: boolean;
}

interface Category {
  id: number;
  group_name: string;
  sub_name: string;
  display_name: string;
  type: string;
}

// Field wrapper with validation error display
function Field({
  label,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">{label}</label>
      {children}
      {error && <span className="text-[10px] text-[#ef4444] mt-0.5 block">Required</span>}
    </div>
  );
}

function TransactionForm({
  transaction,
  accounts,
  categories,
  onSave,
  onDelete,
  onClose,
  duplicateMatch,
}: {
  transaction?: Transaction;
  accounts: Account[];
  categories: Category[];
  onSave: (data: Record<string, unknown>) => void;
  onDelete?: () => void;
  onClose: () => void;
  duplicateMatch?: DuplicateMatch | null;
}) {
  const [date, setDate] = useState(transaction?.date ?? new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState<number>(transaction?.account.id ?? (accounts[0]?.id ?? 0));
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [note, setNote] = useState(transaction?.note ?? '');
  const [categoryId, setCategoryId] = useState<number>(transaction?.category?.id ?? 0);
  const [splitMode, setSplitMode] = useState<boolean>(!!(transaction?.splits && transaction.splits.length > 0));
  const [splits, setSplits] = useState<SplitRow[] | null>(
    transaction?.splits?.map(s => ({
      categoryId: s.categoryId,
      amount: Math.abs(s.amount),
      // Detect reimbursement: split category type differs from first split's type
      isReimbursement: transaction?.splits && transaction.splits.length > 0
        ? s.type !== transaction.splits[0].type
        : false,
    })) ?? null
  );
  // Show user-facing amount: for income, negate stored value (stored -5000 → show 5000)
  // For reversals (positive+income or negative+expense), show as negative to indicate reversal
  const [amount, setAmount] = useState(() => {
    if (!transaction) return '';
    // For split transactions, determine type from first split's category
    const catType = transaction.category?.type ?? (transaction.splits?.[0]?.type) ?? 'expense';
    const stored = transaction.amount;
    if (catType === 'income') {
      return (-stored).toString();
    }
    return stored.toString();
  });
  const [txType, setTxType] = useState<'expense' | 'income'>(() => {
    if (transaction?.category?.type === 'income') return 'income';
    if (transaction?.splits?.[0]?.type === 'income') return 'income';
    return 'expense';
  });
  const [showErrors, setShowErrors] = useState(false);
  const [dupeExpanded, setDupeExpanded] = useState(false);
  const [splitNotification, setSplitNotification] = useState<string | null>(null);

  // Refs for focusing first invalid field
  const dateRef = useRef<HTMLInputElement>(null);
  const accountRef = useRef<HTMLSelectElement>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  // Filter categories by current toggle type
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => c.type === txType);
  }, [categories, txType]);

  // Group filtered categories for the dropdown
  const groupedCategories = useMemo(() => {
    const groups: { group: string; cats: Category[] }[] = [];
    const groupMap = new Map<string, Category[]>();
    for (const c of filteredCategories) {
      if (!groupMap.has(c.group_name)) {
        const arr: Category[] = [];
        groupMap.set(c.group_name, arr);
        groups.push({ group: c.group_name, cats: arr });
      }
      groupMap.get(c.group_name)!.push(c);
    }
    return groups;
  }, [filteredCategories]);

  // Grouped accounts by owner
  const accountsByOwner = useMemo(() => {
    const map = new Map<string, Account[]>();
    for (const a of accounts) {
      if (a.isShared) {
        if (!map.has('Shared')) map.set('Shared', []);
        map.get('Shared')!.push(a);
      } else {
        const name = a.owners?.[0]?.displayName || a.owner;
        if (!map.has(name)) map.set(name, []);
        map.get(name)!.push(a);
      }
    }
    return map;
  }, [accounts]);

  // When category changes, auto-sync type toggle
  const handleCategoryChange = (id: number) => {
    setCategoryId(id);
    const cat = categories.find((c) => c.id === id);
    if (cat) {
      setTxType(cat.type === 'income' ? 'income' : 'expense');
    }
  };

  // When toggle changes, clear category if it doesn't match
  const handleTypeChange = (newType: 'expense' | 'income') => {
    setTxType(newType);
    const current = categories.find((c) => c.id === categoryId);
    if (current && current.type !== newType) {
      setCategoryId(0);
    }
  };

  // Validation
  const parsedAmount = parseFloat(amount);
  const splitsValid = splitMode && splits
    ? splits.length >= 2 &&
      splits.every(s => s.categoryId && s.amount !== 0) &&
      Math.abs(Math.abs(parsedAmount) - splits.reduce((sum, s) => sum + s.amount, 0)) < 0.01
    : false;
  const hasCategoryOrSplits = splitMode ? splitsValid : categoryId > 0;
  const isValid = !!(
    date &&
    accountId > 0 &&
    description.trim() &&
    hasCategoryOrSplits &&
    amount !== '' &&
    !isNaN(parsedAmount)
  );

  const getFirstInvalidRef = () => {
    if (!date) return dateRef;
    if (accountId <= 0) return accountRef;
    if (!description.trim()) return descRef;
    if (!splitMode && categoryId <= 0) return categoryRef;
    if (amount === '' || isNaN(parsedAmount)) return amountRef;
    return null;
  };

  const handleSaveClick = () => {
    if (!isValid) {
      setShowErrors(true);
      const ref = getFirstInvalidRef();
      ref?.current?.focus();
      return;
    }

    // Sign logic: explicit negative takes priority and reverses the default
    let finalAmount: number;
    if (parsedAmount < 0) {
      finalAmount = txType === 'income' ? Math.abs(parsedAmount) : parsedAmount;
    } else {
      finalAmount = txType === 'income' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
    }

    if (splitMode && splits) {
      // Splits are stored with absolute amounts in editor; apply sign from finalAmount
      const sign = finalAmount < 0 ? -1 : 1;
      const finalSplits = splits.map(s => ({
        categoryId: s.categoryId,
        amount: +(s.amount * sign).toFixed(2),
      }));
      onSave({ accountId, date, description, note: note || null, splits: finalSplits, amount: finalAmount });
    } else {
      onSave({ accountId, date, description, note: note || null, categoryId, amount: finalAmount });
    }
  };

  const handleSplitApply = (appliedSplits: SplitRow[]) => {
    const stored = appliedSplits.map(s => ({ categoryId: s.categoryId, amount: Math.abs(s.amount) }));
    setSplits(stored);
    setSplitNotification(`Split applied across ${stored.length} categories`);
  };

  const handleCancelSplit = () => {
    setSplitMode(false);
    setSplits(null);
    setSplitNotification(null);
    // Restore category if we had one before
    if (transaction?.category?.id) {
      setCategoryId(transaction.category.id);
    }
  };

  const handleEnterSplitMode = () => {
    const amt = parseFloat(amount) || 0;
    setSplitMode(true);
    if (!splits) {
      const initialSplits: SplitRow[] = categoryId > 0
        ? [{ categoryId, amount: Math.abs(amt) }, { categoryId: null, amount: 0 }]
        : [{ categoryId: null, amount: Math.abs(amt) }, { categoryId: null, amount: 0 }];
      setSplits(initialSplits);
    }
  };

  const errDate = showErrors && !date;
  const errAccount = showErrors && accountId <= 0;
  const errDesc = showErrors && !description.trim();
  const errCategory = showErrors && !splitMode && categoryId <= 0;
  const errAmount = showErrors && (amount === '' || isNaN(parsedAmount));

  const inputCls = (hasError: boolean) =>
    `w-full px-3 py-2 border rounded-lg text-[13px] outline-none text-[var(--text-body)] ${
      hasError ? 'border-[#ef4444] bg-[var(--bg-inline-error)]' : 'border-[var(--table-border)] bg-[var(--bg-input)]'
    }`;

  return (
    <ResponsiveModal isOpen={true} onClose={onClose} maxWidth="32rem">
      <h3 className="text-[15px] font-bold text-[var(--text-primary)] mb-4">
        {transaction ? 'Edit Transaction' : 'Add Transaction'}
      </h3>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" required error={errDate}>
            <input ref={dateRef} type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className={`${inputCls(!!errDate)} font-mono`} />
          </Field>
          <Field label="Account" required error={errAccount}>
            <select ref={accountRef} value={accountId} onChange={(e) => setAccountId(parseInt(e.target.value, 10))}
              className={inputCls(!!errAccount)}>
              <option value={0} disabled>Select account</option>
              {[...accountsByOwner.entries()].map(([owner, accts]) => (
                <optgroup key={owner} label={owner}>
                  {accts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}{a.last_four ? ` (${a.last_four})` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Description" required error={errDesc}>
          <input ref={descRef} value={description} onChange={(e) => setDescription(e.target.value)}
            className={inputCls(!!errDesc)} />
        </Field>
        <Field label="Note (optional)">
          <input value={note} onChange={(e) => setNote(e.target.value)}
            className={inputCls(false)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <div className="flex gap-2">
              {(['expense', 'income'] as const).map((t) => (
                <button key={t} onClick={() => handleTypeChange(t)}
                  disabled={splitMode}
                  className={`flex-1 py-2 text-[12px] font-semibold rounded-lg border-none cursor-pointer capitalize ${
                    txType === t ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] btn-primary' : 'bg-[var(--btn-secondary-bg)] text-[var(--text-secondary)] btn-secondary'
                  } ${splitMode ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {t}
                </button>
              ))}
            </div>
          </Field>
          {!splitMode ? (
            <div>
              <Field label="Category" required error={errCategory}>
                <select ref={categoryRef} value={categoryId} onChange={(e) => handleCategoryChange(parseInt(e.target.value, 10))}
                  className={inputCls(!!errCategory)}>
                  <option value={0} disabled>Select category</option>
                  {groupedCategories.map((g) => (
                    <optgroup key={g.group} label={g.group}>
                      {g.cats.map((c) => (
                        <option key={c.id} value={c.id}>{c.sub_name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Field>
              <button onClick={handleEnterSplitMode}
                className="text-[11px] text-[var(--color-accent)] bg-transparent border-none cursor-pointer mt-1 p-0 hover:underline">
                Split across categories
              </button>
            </div>
          ) : (
            <div>
              <div className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] mb-1">
                Category <span className="text-[var(--color-accent)] normal-case font-normal">(split mode)</span>
              </div>
              {splits && splits.length >= 2 ? (
                <div className="text-[12px] text-[var(--color-positive)] font-medium">
                  ✓ {splits.length} categories assigned
                  <button onClick={handleCancelSplit}
                    className="ml-2 text-[11px] text-[var(--text-muted)] bg-transparent border-none cursor-pointer p-0 hover:underline">
                    Remove split
                  </button>
                </div>
              ) : (
                <div className="text-[12px] text-[var(--text-muted)]">
                  Configure splits below
                  <button onClick={handleCancelSplit}
                    className="ml-2 text-[11px] text-[var(--text-muted)] bg-transparent border-none cursor-pointer p-0 hover:underline">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <Field label="Amount" required error={errAmount}>
          <CurrencyInput ref={amountRef} allowNegative value={amount}
            onChange={(val) => setAmount(val)}
            className={`${inputCls(!!errAmount)} font-mono`} />
        </Field>
        {splitMode && (
          <SplitEditor
            totalAmount={parseFloat(amount) || 0}
            initialSplits={splits ?? undefined}
            categories={filteredCategories}
            allCategories={categories}
            txType={txType}
            onApply={handleSplitApply}
            onCancel={handleCancelSplit}
            onChange={(current) => setSplits(current.map(s => ({ categoryId: s.categoryId, amount: Math.abs(s.amount), isReimbursement: s.isReimbursement })))}
          />
        )}
        {splitNotification && (
          <InlineNotification
            type="success"
            message={splitNotification}
            dismissible
            onDismiss={() => setSplitNotification(null)}
          />
        )}
      </div>

      {/* Duplicate Warning */}
      {duplicateMatch && (
        <div className="mt-4 rounded-lg border border-[var(--bg-inline-warning-border)] bg-[var(--bg-inline-warning)] p-3">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-[var(--color-warning)] mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold text-[var(--text-inline-warning)] m-0">
                  Possible duplicate detected — click Save again to confirm
                </p>
                <button onClick={() => setDupeExpanded(!dupeExpanded)}
                  className="bg-transparent border-none cursor-pointer p-0.5 text-[var(--text-inline-warning)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: dupeExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
              {dupeExpanded && (
                <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12px]">
                  <span className="text-[var(--text-inline-warning)]">Date</span>
                  <span className="font-mono text-[var(--text-inline-warning)]">{duplicateMatch.date}</span>
                  <span className="text-[var(--text-inline-warning)]">Description</span>
                  <span className="text-[var(--text-inline-warning)]">{duplicateMatch.description}</span>
                  <span className="text-[var(--text-inline-warning)]">Amount</span>
                  <span className="font-mono font-semibold text-[var(--text-inline-warning)]">{fmt(Math.abs(duplicateMatch.amount))}</span>
                  {duplicateMatch.accountName && <>
                    <span className="text-[var(--text-inline-warning)]">Account</span>
                    <span className="text-[var(--text-inline-warning)]">{duplicateMatch.accountName}</span>
                  </>}
                  {duplicateMatch.category && <>
                    <span className="text-[var(--text-inline-warning)]">Category</span>
                    <span className="text-[var(--text-inline-warning)]">{duplicateMatch.category}</span>
                  </>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-5 justify-end">
        {transaction && onDelete && (
          <div className="mr-auto">
            <ConfirmDeleteButton onConfirm={onDelete} />
          </div>
        )}
        <button onClick={onClose}
          className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[var(--btn-secondary-bg)] text-[var(--text-secondary)] border-none cursor-pointer btn-secondary">
          Cancel
        </button>
        <button onClick={handleSaveClick}
          className={`px-4 py-2 text-[12px] font-semibold rounded-lg border-none ${
            isValid
              ? duplicateMatch
                ? 'bg-[var(--color-warning)] text-white cursor-pointer'
                : 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] cursor-pointer btn-primary'
              : 'bg-[var(--text-muted)] text-white cursor-not-allowed'
          }`}>
          {duplicateMatch ? 'Save Anyway' : 'Save'}
        </button>
      </div>
    </ResponsiveModal>
  );
}

export default function TransactionsPage() {
  const { addToast } = useToast();
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const allGroupNames = useMemo(() => [...new Set(categories.map(c => c.group_name))], [categories]);
  const categoryGroups = useMemo(() => {
    const groups: { group: string; subs: { id: number; sub: string }[] }[] = [];
    const seen = new Set<string>();
    for (const c of categories) {
      if (!seen.has(c.group_name)) {
        seen.add(c.group_name);
        groups.push({ group: c.group_name, subs: categories.filter(x => x.group_name === c.group_name).map(x => ({ id: x.id, sub: x.sub_name })) });
      }
    }
    return groups;
  }, [categories]);
  const [pendingSave, setPendingSave] = useState<Record<string, unknown> | null>(null);
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateMatch | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterAccount, setFilterAccount] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [amountOp, setAmountOp] = useState('');   // '' | 'gt' | 'lt' | 'eq' | 'bt'
  const [amountValue, setAmountValue] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  const [datePreset, setDatePreset] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(() => {
    const stored = localStorage.getItem('ledger-page-size');
    return stored ? parseInt(stored, 10) : 50;
  });
  const [sortOpen, setSortOpen] = useState(false);
  const [sortTouched, setSortTouched] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterTab, setFilterTab] = useState('Categories');
  const [filterSearch, setFilterSearch] = useState('');
  const [dateDraft, setDateDraft] = useState<{ preset: string; start: string; end: string }>({ preset: 'all', start: '', end: '' });
  const [filterDraft, setFilterDraft] = useState<{ account: string; type: string; category: string[]; op: string; val: string; min: string; max: string }>({ account: 'All', type: 'All', category: [], op: '', val: '', min: '', max: '' });
  const [editCell, setEditCell] = useState<{ id: number; field: 'vendor' | 'category' } | null>(null);
  const [cellSearch, setCellSearch] = useState('');
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [detailNote, setDetailNote] = useState('');
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitDraft, setSplitDraft] = useState<{ categoryId: number | ''; amount: string }[]>([]);

  const getDateRange = useCallback((): { startDate?: string; endDate?: string } => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const monthStart = (yr: number, mo: number) => `${yr}-${String(mo + 1).padStart(2, '0')}-01`;
    const monthEnd = (yr: number, mo: number) => fmt(new Date(yr, mo + 1, 0));
    const q = Math.floor(m / 3);
    switch (datePreset) {
      case 'all': return {};
      case 'this-month': return { startDate: monthStart(y, m), endDate: monthEnd(y, m) };
      case 'last-month': {
        const d = new Date(y, m - 1, 1);
        return { startDate: monthStart(d.getFullYear(), d.getMonth()), endDate: monthEnd(d.getFullYear(), d.getMonth()) };
      }
      case 'this-quarter': return { startDate: monthStart(y, q * 3), endDate: monthEnd(y, q * 3 + 2) };
      case 'last-quarter': {
        const pq = q === 0 ? 3 : q - 1;
        const py = q === 0 ? y - 1 : y;
        return { startDate: monthStart(py, pq * 3), endDate: monthEnd(py, pq * 3 + 2) };
      }
      case 'this-year': return { startDate: `${y}-01-01`, endDate: `${y}-12-31` };
      case 'last-year': return { startDate: `${y - 1}-01-01`, endDate: `${y - 1}-12-31` };
      case 'ytd': return { startDate: `${y}-01-01`, endDate: fmt(now) };
      case 'custom': return { startDate: customStart || undefined, endDate: customEnd || undefined };
      default: return {};
    }
  }, [datePreset, customStart, customEnd]);

  // Modal
  const [editing, setEditing] = useState<Transaction | null | 'new'>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Open add form from FAB (via URL param or custom event)
  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setEditing('new');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const handler = () => setEditing('new');
    window.addEventListener('open-add-transaction', handler);
    return () => window.removeEventListener('open-add-transaction', handler);
  }, []);

  // Bulk edit mode
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [_bulkAction, setBulkAction] = useState<string | null>(null);
  const [bulkDate, setBulkDate] = useState('');
  const [bulkAccountId, setBulkAccountId] = useState<number | ''>('');
  const [bulkCategoryId, setBulkCategoryId] = useState<number | ''>('');
  const [bulkFind, setBulkFind] = useState('');
  const [bulkReplace, setBulkReplace] = useState('');
  const [bulkConfirmDelete, setBulkConfirmDelete] = useState(false);

  const loadTransactions = useCallback(async () => {
    const params = new URLSearchParams();
    const { startDate, endDate } = getDateRange();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    params.set('limit', pageSize.toString());
    params.set('offset', ((page - 1) * pageSize).toString());
    if (search) params.set('search', search);
    if (filterAccount !== 'All') params.set('accountId', filterAccount);
    if (filterType !== 'All') params.set('type', filterType.toLowerCase());
    if (filterCategory.length > 0) {
      const groupNames = filterCategory.filter(v => v.startsWith('group:')).map(v => v.slice(6));
      const catIds = filterCategory.filter(v => v.startsWith('sub:')).map(v => v.slice(4));
      if (groupNames.length) params.set('groupNames', groupNames.join(','));
      if (catIds.length) params.set('categoryIds', catIds.join(','));
    }
    if (amountOp) {
      params.set('amountOp', amountOp);
      if (amountOp === 'bt') { if (amountMin) params.set('amountMin', amountMin); if (amountMax) params.set('amountMax', amountMax); }
      else if (amountValue) params.set('amountValue', amountValue);
    }
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);

    const res = await apiFetch<{ data: Transaction[]; total: number }>(`/transactions?${params.toString()}`);
    setTransactions(res.data);
    setTotal(res.total);
  }, [getDateRange, search, filterAccount, filterType, filterCategory, amountOp, amountValue, amountMin, amountMax, page, pageSize, sortBy, sortOrder]);

  const loadMeta = useCallback(async () => {
    const [acctRes, catRes] = await Promise.all([
      apiFetch<{ data: Account[] }>('/accounts'),
      apiFetch<{ data: Category[] }>('/categories'),
    ]);
    setAccounts(acctRes.data);
    setCategories(catRes.data);
  }, []);

  const SORT_OPTIONS: { by: string; order: 'asc' | 'desc'; label: string }[] = [
    { by: 'date', order: 'desc', label: 'Date (new → old)' },
    { by: 'date', order: 'asc', label: 'Date (old → new)' },
    { by: 'amount', order: 'desc', label: 'Amount (high → low)' },
    { by: 'amount', order: 'asc', label: 'Amount (low → high)' },
  ];
  const applySort = (by: string, order: 'asc' | 'desc') => {
    setSortBy(by); setSortOrder(order); setSortTouched(true); setSortOpen(false); setPage(1);
  };

  // Date / Filters overlays — edits are staged in a draft, committed on Apply.
  const openDatePopover = () => { setDateDraft({ preset: datePreset, start: customStart, end: customEnd }); setSortOpen(false); setFilterOpen(false); setDateOpen(true); };
  const applyDate = () => { setDatePreset(dateDraft.preset); setCustomStart(dateDraft.start); setCustomEnd(dateDraft.end); setDateOpen(false); };
  const openFilterPopover = () => { setFilterDraft({ account: filterAccount, type: filterType, category: [...filterCategory], op: amountOp, val: amountValue, min: amountMin, max: amountMax }); setFilterTab('Categories'); setFilterSearch(''); setSortOpen(false); setDateOpen(false); setFilterOpen(true); };
  const applyFilters = () => {
    setFilterAccount(filterDraft.account); setFilterType(filterDraft.type); setFilterCategory(filterDraft.category);
    setAmountOp(filterDraft.op); setAmountValue(filterDraft.val); setAmountMin(filterDraft.min); setAmountMax(filterDraft.max);
    setFilterOpen(false);
  };
  const toggleDraftCategory = (value: string) => setFilterDraft((d) => ({ ...d, category: d.category.includes(value) ? d.category.filter((v) => v !== value) : [...d.category, value] }));

  // Inline/panel edit — rebuilds the txn body (preserving splits) and PUTs.
  const updateTxnField = async (t: Transaction, changes: { description?: string; categoryId?: number; date?: string; note?: string | null }) => {
    const isSplit = !!(t.splits && t.splits.length > 0);
    let newAmount = t.amount;
    const body: Record<string, unknown> = {
      accountId: t.account.id,
      date: changes.date ?? t.date,
      description: changes.description ?? t.description,
      note: changes.note !== undefined ? changes.note : t.note,
    };
    if (isSplit) {
      body.splits = t.splits!.map((s) => ({ categoryId: s.categoryId, amount: s.amount }));
      body.amount = t.amount;
    } else {
      const categoryId = changes.categoryId ?? t.category?.id ?? null;
      if (changes.categoryId != null) {
        const newCat = categories.find((c) => c.id === changes.categoryId);
        if (newCat) newAmount = newCat.type === 'income' ? -Math.abs(t.amount) : Math.abs(t.amount);
      }
      body.categoryId = categoryId;
      body.amount = newAmount;
    }
    try {
      await apiFetch(`/transactions/${t.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setEditCell(null); setCellSearch('');
      // keep the detail panel in sync if it's showing this txn
      if (detail && detail.id === t.id) {
        const merged: Transaction = { ...detail };
        if (changes.description !== undefined) merged.description = changes.description;
        if (changes.date !== undefined) merged.date = changes.date;
        if (changes.note !== undefined) merged.note = changes.note;
        if (changes.categoryId != null) {
          const c = categories.find((x) => x.id === changes.categoryId);
          if (c) { merged.category = { id: c.id, groupName: c.group_name, subName: c.sub_name, displayName: c.display_name, type: c.type }; merged.splits = null; merged.amount = newAmount; }
        }
        setDetail(merged);
      }
      await loadTransactions();
    } catch {
      addToast('Failed to update transaction', 'error');
    }
  };

  const openDetail = (t: Transaction) => { setDetail(t); setDetailNote(t.note ?? ''); };

  const deleteFromDetail = async () => {
    if (!detail) return;
    try {
      await apiFetch(`/transactions/${detail.id}`, { method: 'DELETE' });
      setDetail(null);
      addToast('Transaction deleted');
      await loadTransactions();
    } catch { addToast('Failed to delete transaction', 'error'); }
  };

  const openSplit = () => {
    if (!detail) return;
    const rows = (detail.splits && detail.splits.length > 0)
      ? detail.splits.map((s) => ({ categoryId: s.categoryId as number | '', amount: Math.abs(s.amount).toFixed(2) }))
      : [
          { categoryId: (detail.category?.id ?? '') as number | '', amount: Math.abs(detail.amount).toFixed(2) },
          { categoryId: '' as number | '', amount: '' },
        ];
    setSplitDraft(rows);
    setSplitOpen(true);
  };

  const saveSplit = async () => {
    if (!detail) return;
    const sign = detail.amount < 0 ? -1 : 1;
    const rows = splitDraft.filter((r) => r.categoryId !== '' && parseFloat(r.amount) > 0);
    const body = {
      accountId: detail.account.id,
      date: detail.date,
      description: detail.description,
      note: detail.note,
      amount: detail.amount,
      splits: rows.map((r) => ({ categoryId: r.categoryId, amount: +(Math.abs(parseFloat(r.amount)) * sign).toFixed(2) })),
    };
    try {
      await apiFetch(`/transactions/${detail.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setSplitOpen(false);
      setDetail(null);
      addToast('Split saved');
      await loadTransactions();
    } catch { addToast('Failed to save split', 'error'); }
  };

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { setPage(1); }, [datePreset, customStart, customEnd, search, filterAccount, filterType, filterCategory, amountOp, amountValue, amountMin, amountMax]);
  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (editCell) { setEditCell(null); setCellSearch(''); }
      else if (bulkMode) { setBulkMode(false); setSelectedIds(new Set()); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editCell, bulkMode]);

  const handleSave = async (data: Record<string, unknown>) => {
    try {
      // On new transactions, check for duplicates before saving
      if (editing === 'new' && !pendingSave) {
        try {
          const dupeRes = await apiFetch<{ data: { status: string; match?: DuplicateMatch } }>(
            '/transactions/check-duplicate',
            { method: 'POST', body: JSON.stringify({ date: data.date, amount: data.amount, description: data.description }) }
          );
          if (dupeRes.data.status !== 'none' && dupeRes.data.match) {
            setPendingSave(data);
            setDuplicateMatch(dupeRes.data.match);
            return;
          }
        } catch {
          // Duplicate check failed — proceed with save
        }
      }
      setPendingSave(null);
      setDuplicateMatch(null);

      if (editing === 'new') {
        await apiFetch('/transactions', { method: 'POST', body: JSON.stringify(data) });
      } else if (editing) {
        await apiFetch(`/transactions/${editing.id}`, { method: 'PUT', body: JSON.stringify(data) });
      }
      setEditing(null);
      addToast('Transaction saved');
      loadTransactions();
    } catch {
      addToast('Failed to save transaction', 'error');
    }
  };

  const handleDelete = async () => {
    if (editing && editing !== 'new') {
      try {
        await apiFetch(`/transactions/${editing.id}`, { method: 'DELETE' });
        setEditing(null);
        addToast('Transaction deleted');
        loadTransactions();
      } catch {
        addToast('Failed to delete transaction', 'error');
      }
    }
  };


  const accountLabel = (a: { name: string; last_four?: string | null; lastFour?: string | null }) => {
    const lf = a.lastFour ?? a.last_four;
    return lf ? `${a.name} (${lf})` : a.name;
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  };

  const exitBulkMode = () => {
    setBulkMode(false);
    setSelectedIds(new Set());
    setBulkAction(null);
    setBulkConfirmDelete(false);
  };

  const applyBulkAction = async (action: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      if (action === 'date' && bulkDate) {
        await apiFetch('/transactions/bulk-update', { method: 'POST', body: JSON.stringify({ ids, updates: { date: bulkDate } }) });
      } else if (action === 'account' && bulkAccountId) {
        await apiFetch('/transactions/bulk-update', { method: 'POST', body: JSON.stringify({ ids, updates: { accountId: bulkAccountId } }) });
      } else if (action === 'category' && bulkCategoryId) {
        await apiFetch('/transactions/bulk-update', { method: 'POST', body: JSON.stringify({ ids, updates: { categoryId: bulkCategoryId } }) });
      } else if (action === 'findReplace' && bulkFind) {
        await apiFetch('/transactions/bulk-update', { method: 'POST', body: JSON.stringify({ ids, updates: { description: { find: bulkFind, replace: bulkReplace } } }) });
      } else if (action === 'delete') {
        if (!bulkConfirmDelete) { setBulkConfirmDelete(true); setTimeout(() => setBulkConfirmDelete(false), 3000); return; }
        await apiFetch('/transactions/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) });
      } else { return; }
      setBulkAction(null);
      setBulkConfirmDelete(false);
      const msg = action === 'delete' ? `Deleted ${ids.length} transactions` : `Updated ${ids.length} transactions`;
      addToast(msg);
      setSelectedIds(new Set());
      loadTransactions();
    } catch (_err) {
      addToast('Bulk operation failed', 'error');
    }
  };

  // Group categories for bulk dropdown
  const expenseCats = categories.filter((c) => c.type === 'expense');
  const incomeCats = categories.filter((c) => c.type === 'income');
  const catGroupsForBulk = new Map<string, Category[]>();
  for (const c of [...expenseCats, ...incomeCats]) {
    if (!catGroupsForBulk.has(c.group_name)) catGroupsForBulk.set(c.group_name, []);
    catGroupsForBulk.get(c.group_name)!.push(c);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showTo = Math.min(page * pageSize, total);

  const canEdit = hasPermission('transactions.edit');
  const formatDateHeader = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const vendorOptions = [...new Set(transactions.map((t) => t.description).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const sortLabel = !sortTouched ? 'Sort' : (SORT_OPTIONS.find((o) => o.by === sortBy && o.order === sortOrder)?.label ?? 'Sort');
  const DATE_PRESETS: { value: string; label: string }[] = [
    { value: 'all', label: 'All time' }, { value: 'this-month', label: 'This month' }, { value: 'last-month', label: 'Last month' },
    { value: 'this-quarter', label: 'This quarter' }, { value: 'last-quarter', label: 'Last quarter' },
    { value: 'this-year', label: 'This year' }, { value: 'last-year', label: 'Last year' }, { value: 'ytd', label: 'Year to date' },
    { value: 'custom', label: 'Custom range…' },
  ];
  const dateLabel = datePreset === 'all' ? 'Date' : (DATE_PRESETS.find((p) => p.value === datePreset)?.label ?? 'Date');
  const filterCount = (filterAccount !== 'All' ? 1 : 0) + (filterType !== 'All' ? 1 : 0) + filterCategory.length + (amountOp ? 1 : 0);
  const groupedAll = Array.from(
    categories.reduce((m, c) => { if (!m.has(c.group_name)) m.set(c.group_name, []); m.get(c.group_name)!.push(c); return m; }, new Map<string, Category[]>()).entries()
  );
  const splitAlloc = splitDraft.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const splitRemainingVal = detail ? Math.abs(detail.amount) - splitAlloc : 0;
  const splitValid = splitDraft.filter((r) => r.categoryId !== '' && parseFloat(r.amount) > 0).length >= 2 && Math.abs(splitRemainingVal) < 0.01;
  const dateGroups: { date: string; rows: Transaction[]; net: number }[] = [];
  for (const t of transactions) {
    const last = dateGroups[dateGroups.length - 1];
    if (last && last.date === t.date) { last.rows.push(t); last.net += t.amount; }
    else dateGroups.push({ date: t.date, rows: [t], net: t.amount });
  }

  const renderRow = (t: Transaction) => {
    const catType = t.category?.type ?? t.splits?.[0]?.type ?? 'expense';
    const { text: amtText, className: amtClass } = fmtTransaction(t.amount, catType);
    const isSplit = !!(t.splits && t.splits.length > 0);
    const emoji = isSplit ? '🔀' : getCategoryEmoji(t.category?.groupName);
    const color = getCategoryColorHex(t.category?.groupName);
    const initial = (t.description?.trim()?.[0] ?? '?').toUpperCase();
    const checked = selectedIds.has(t.id);
    const vendorEditing = editCell?.id === t.id && editCell.field === 'vendor';
    const categoryEditing = editCell?.id === t.id && editCell.field === 'category';
    const vendorMatches = vendorOptions.filter((v) => v.toLowerCase().includes(cellSearch.toLowerCase())).slice(0, 40);
    const catMatches = categories.filter((c) => `${c.sub_name} ${c.group_name}`.toLowerCase().includes(cellSearch.toLowerCase())).slice(0, 60);
    return (
      <div key={t.id}
        onClick={() => { if (bulkMode) toggleSelect(t.id); else if (canEdit) openDetail(t); }}
        className="flex items-center gap-3.5 px-6 border-b border-line cursor-pointer hover:bg-surface-2/40"
        style={{ height: 44, background: checked ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : undefined }}>
        {bulkMode && (
          <span className="w-5 h-5 shrink-0 rounded-md flex items-center justify-center border-[1.5px]" style={{ borderColor: checked ? 'var(--primary)' : 'var(--line-strong)', background: checked ? 'var(--primary)' : 'transparent' }}>
            {checked && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6"/></svg>}
          </span>
        )}
        <span className="w-[26px] h-[26px] shrink-0 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>{initial}</span>
        {/* vendor cell (inline edit) */}
        <div className="relative flex-[1.4] min-w-0" onClick={(e) => { if (!bulkMode && canEdit) { e.stopPropagation(); setEditCell({ id: t.id, field: 'vendor' }); setCellSearch(''); } }}>
          <div className="flex items-center h-8 px-2 -ml-2 rounded-lg hover:bg-surface-2">
            <span className="font-semibold text-[15px] truncate">{t.description}</span>
          </div>
          {vendorEditing && (
            <div onClick={(e) => e.stopPropagation()} className="absolute top-9 left-0 z-[60] w-64 bg-elevated border border-line-strong rounded-[12px] shadow-md overflow-hidden">
              <div className="p-2 border-b border-line"><input autoFocus value={cellSearch} onChange={(e) => setCellSearch(e.target.value)} placeholder="Search vendors…" className="w-full h-9 px-3 rounded-lg bg-surface-2 border border-line text-content text-sm outline-none" /></div>
              <div className="max-h-60 overflow-y-auto p-1.5">
                {cellSearch.trim() && !vendorMatches.some((v) => v.toLowerCase() === cellSearch.trim().toLowerCase()) && (
                  <button onClick={() => updateTxnField(t, { description: cellSearch.trim() })} className="block w-full text-left px-3 py-2 rounded-lg text-sm text-primary font-medium hover:bg-surface-2">Use “{cellSearch.trim()}”</button>
                )}
                {vendorMatches.map((v) => (
                  <button key={v} onClick={() => updateTxnField(t, { description: v })} className="block w-full text-left px-3 py-2 rounded-lg text-sm text-content hover:bg-surface-2 truncate">{v}</button>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* category cell (inline edit; disabled for splits) */}
        <div className="relative flex-1 min-w-0" onClick={(e) => { if (!bulkMode && !isSplit && canEdit) { e.stopPropagation(); setEditCell({ id: t.id, field: 'category' }); setCellSearch(''); } }}>
          <div className="flex items-center gap-2 h-8 px-2 -ml-2 rounded-lg hover:bg-surface-2 text-[13px] text-content-2">
            <span className="text-[15px] leading-none">{emoji}</span>
            <span className="truncate">{isSplit ? `Split (${t.splits!.length})` : (t.category?.subName ?? 'Uncategorized')}</span>
          </div>
          {categoryEditing && (
            <div onClick={(e) => e.stopPropagation()} className="absolute top-9 left-0 z-[60] w-64 bg-elevated border border-line-strong rounded-[12px] shadow-md overflow-hidden">
              <div className="p-2 border-b border-line"><input autoFocus value={cellSearch} onChange={(e) => setCellSearch(e.target.value)} placeholder="Search categories…" className="w-full h-9 px-3 rounded-lg bg-surface-2 border border-line text-content text-sm outline-none" /></div>
              <div className="max-h-60 overflow-y-auto p-1.5">
                {catMatches.map((c) => (
                  <button key={c.id} onClick={() => updateTxnField(t, { categoryId: c.id })} className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-lg text-sm text-content hover:bg-surface-2">
                    <span className="text-[15px] leading-none">{getCategoryEmoji(c.group_name)}</span>
                    <span className="truncate">{c.sub_name}</span>
                    <span className="ml-auto text-xs text-content-3 truncate">{c.group_name}</span>
                  </button>
                ))}
                {catMatches.length === 0 && <div className="px-3 py-2 text-sm text-content-3">No matches</div>}
              </div>
            </div>
          )}
        </div>
        {/* account */}
        <div className="flex-1 min-w-0 flex items-center gap-2 text-[13px] text-content-3">
          <span className="truncate">{accountLabel(t.account)}</span>
        </div>
        {/* amount */}
        <div className={`w-[128px] shrink-0 text-right font-bold text-[15px] tabular-nums ${amtClass}`}>{amtText}</div>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-content-3 shrink-0"><path d="m9 6 6 6-6 6"/></svg>
      </div>
    );
  };

  return (
    <div>
      {/* Header + consolidated top-right controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-6">
          <h1 className="page-title text-[22px] font-extrabold text-content tracking-tight m-0">Transactions</h1>
          <div className="hidden md:flex items-center gap-5 text-[15px] font-semibold">
            <span className="text-primary border-b-2 border-primary pb-0.5">All</span>
            <span className="text-content-3 cursor-not-allowed" title="Coming soon">Recurring</span>
            <span className="text-content-3 cursor-not-allowed" title="Coming soon">Receipts</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search */}
          {searchOpen ? (
            <div className="flex items-center h-10 rounded-[11px] bg-surface border border-line-strong px-3 gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-content-3"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" autoCapitalize="off"
                onKeyDown={(e) => { if (e.key === 'Escape') { setSearch(''); setSearchOpen(false); } }}
                className="w-44 bg-transparent outline-none text-sm text-content" />
              <button onClick={() => { setSearch(''); setSearchOpen(false); }} className="text-content-3 hover:text-content"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)} title="Search"
              className={`w-10 h-10 flex items-center justify-center rounded-[11px] bg-surface border ${search ? 'border-primary' : 'border-line-strong'} text-content-2 hover:bg-surface-2`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            </button>
          )}
          {/* Date range overlay (design system) */}
          <div className="relative">
            <button onClick={openDatePopover}
              className={`flex items-center gap-2 h-10 px-3.5 rounded-[11px] bg-surface border-2 ${dateOpen || datePreset !== 'all' ? 'border-primary' : 'border-line-strong'} text-content font-semibold text-sm hover:bg-surface-2`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4.5" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>
              {dateLabel}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            {dateOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDateOpen(false)} />
                <div className="absolute top-12 right-0 z-50 w-[660px] max-w-[calc(100vw-64px)] bg-elevated border border-line-strong rounded-[16px] shadow-md overflow-hidden flex flex-col">
                  <div className="flex">
                    <div className="w-[212px] shrink-0 border-r border-line">
                      <div className="px-5 pt-[18px] pb-3 text-base font-extrabold tracking-tight border-b border-line">Date Range</div>
                      <div className="py-2">
                        {DATE_PRESETS.map((p) => {
                          const active = dateDraft.preset === p.value;
                          return (
                            <div key={p.value} onClick={() => setDateDraft((d) => ({ ...d, preset: p.value }))}
                              className="px-5 py-2.5 text-[15px] font-medium cursor-pointer"
                              style={{ color: active ? 'var(--primary)' : 'var(--text)', background: active ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent', borderLeft: `2px solid ${active ? 'var(--primary)' : 'transparent'}` }}>
                              {p.value === 'custom' ? 'Custom range' : p.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex-1 p-6">
                      <div className="flex items-center justify-between mb-2.5"><span className="text-[15px] font-bold">Start date</span><button onClick={() => setDateDraft((d) => ({ ...d, start: '', preset: 'custom' }))} className="text-sm font-semibold text-primary">Clear</button></div>
                      <input type="date" value={dateDraft.start} onChange={(e) => setDateDraft((d) => ({ ...d, start: e.target.value, preset: 'custom' }))} className="w-full h-[50px] px-4 rounded-[12px] bg-surface border border-line text-content text-[15px] outline-none mb-[22px]" />
                      <div className="flex items-center justify-between mb-2.5"><span className="text-[15px] font-bold">End date</span><button onClick={() => setDateDraft((d) => ({ ...d, end: '', preset: 'custom' }))} className="text-sm font-semibold text-primary">Clear</button></div>
                      <input type="date" value={dateDraft.end} onChange={(e) => setDateDraft((d) => ({ ...d, end: e.target.value, preset: 'custom' }))} className="w-full h-[50px] px-4 rounded-[12px] bg-surface border border-line text-content text-[15px] outline-none" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-5 py-3.5 border-t border-line">
                    <button onClick={() => setDateDraft({ preset: 'all', start: '', end: '' })} className="h-10 px-[18px] rounded-[10px] border border-line-strong bg-surface-2 text-content font-semibold text-sm">Clear</button>
                    <div className="flex gap-2.5">
                      <button onClick={() => setDateOpen(false)} className="h-10 px-[18px] rounded-[10px] border border-line-strong bg-surface-2 text-content font-semibold text-sm">Cancel</button>
                      <button onClick={applyDate} className="h-10 px-5 rounded-[10px] bg-primary text-on-primary font-bold text-sm shadow-sm">Apply</button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          {/* Filters overlay (design system) */}
          <div className="relative">
            <button onClick={openFilterPopover}
              className={`flex items-center gap-2 h-10 px-3.5 rounded-[11px] bg-surface border-2 ${filterOpen || filterCount ? 'border-primary' : 'border-line-strong'} text-content font-semibold text-sm hover:bg-surface-2`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
              Filters
              {filterCount > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-on-primary text-[11px] font-bold flex items-center justify-center">{filterCount}</span>}
            </button>
            {filterOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} />
                <div className="absolute top-12 right-0 z-50 w-[720px] max-w-[calc(100vw-64px)] bg-elevated border border-line-strong rounded-[16px] shadow-md overflow-hidden flex flex-col">
                  <div className="flex border-b border-line">
                    <div className="w-[186px] shrink-0 px-5 py-[18px] text-base font-extrabold tracking-tight border-r border-line">Filters</div>
                    <div className="flex-1 flex items-center gap-2.5 px-5">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                      <input value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} placeholder={`Search ${filterTab.toLowerCase()}…`} className="flex-1 h-11 bg-transparent outline-none text-sm text-content" />
                    </div>
                  </div>
                  <div className="flex">
                    <div className="w-[186px] shrink-0 p-3 border-r border-line flex flex-col gap-0.5">
                      {['Categories', 'Merchants', 'Accounts', 'Tags', 'Amount', 'Other'].map((n) => {
                        const active = filterTab === n;
                        return (
                          <button key={n} onClick={() => { setFilterTab(n); setFilterSearch(''); }} className="px-3.5 py-2.5 rounded-[9px] text-sm font-semibold text-left"
                            style={{ color: active ? 'var(--primary)' : 'var(--text)', background: active ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent' }}>{n}</button>
                        );
                      })}
                    </div>
                    <div className="flex-1 p-4 overflow-auto" style={{ minHeight: 340, maxHeight: 440 }}>
                      {filterTab === 'Categories' && categoryGroups.map((g) => {
                        const gChecked = filterDraft.category.includes(`group:${g.group}`);
                        const subs = filterSearch ? g.subs.filter((s) => `${s.sub} ${g.group}`.toLowerCase().includes(filterSearch.toLowerCase())) : g.subs;
                        if (filterSearch && subs.length === 0 && !g.group.toLowerCase().includes(filterSearch.toLowerCase())) return null;
                        return (
                          <div key={g.group} className="mb-1">
                            <div onClick={() => toggleDraftCategory(`group:${g.group}`)} className="flex items-center gap-3 py-2 text-sm font-semibold cursor-pointer">
                              <span className="w-[19px] h-[19px] shrink-0 rounded-md border-[1.5px] flex items-center justify-center" style={{ borderColor: gChecked ? 'var(--primary)' : 'var(--line-strong)', background: gChecked ? 'var(--primary)' : 'transparent' }}>{gChecked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6"/></svg>}</span>
                              {g.group}
                            </div>
                            {subs.map((s) => {
                              const sChecked = filterDraft.category.includes(`sub:${s.id}`);
                              return (
                                <div key={s.id} onClick={() => toggleDraftCategory(`sub:${s.id}`)} className="flex items-center gap-3 py-2 pl-7 text-[13px] cursor-pointer">
                                  <span className="w-[19px] h-[19px] shrink-0 rounded-md border-[1.5px] flex items-center justify-center" style={{ borderColor: sChecked ? 'var(--primary)' : 'var(--line-strong)', background: sChecked ? 'var(--primary)' : 'transparent' }}>{sChecked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6"/></svg>}</span>
                                  {s.sub}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                      {filterTab === 'Accounts' && [{ id: 'All', label: 'All accounts' }, ...accounts.filter((a) => !filterSearch || accountLabel(a).toLowerCase().includes(filterSearch.toLowerCase())).map((a) => ({ id: a.id.toString(), label: accountLabel(a) }))].map((a) => {
                        const checked = filterDraft.account === a.id;
                        return (
                          <div key={a.id} onClick={() => setFilterDraft((d) => ({ ...d, account: a.id }))} className="flex items-center gap-3.5 py-2 text-[15px] cursor-pointer">
                            <span className="w-[22px] h-[22px] shrink-0 rounded-full border-2 flex items-center justify-center" style={{ borderColor: checked ? 'var(--primary)' : 'var(--line-strong)' }}>{checked && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}</span>
                            {a.label}
                          </div>
                        );
                      })}
                      {filterTab === 'Amount' && (
                        <div>
                          <div className="font-mono text-[11px] uppercase tracking-wide text-content-3 mb-1.5">Amount</div>
                          {([['gt', 'Greater than…'], ['lt', 'Less than…'], ['eq', 'Equal to…'], ['bt', 'Between…']] as [string, string][]).map(([op, label]) => (
                            <div key={op}>
                              <div onClick={() => setFilterDraft((d) => ({ ...d, op: d.op === op ? '' : op }))} className="flex items-center gap-3.5 py-2 cursor-pointer text-[15px]">
                                <span className="w-[22px] h-[22px] shrink-0 rounded-full border-2 flex items-center justify-center" style={{ borderColor: filterDraft.op === op ? 'var(--primary)' : 'var(--line-strong)' }}>{filterDraft.op === op && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}</span>
                                {label}
                              </div>
                              {filterDraft.op === op && op !== 'bt' && (
                                <div className="pl-10 pb-2"><input value={filterDraft.val} onChange={(e) => setFilterDraft((d) => ({ ...d, val: e.target.value.replace(/[^0-9.]/g, '') }))} inputMode="decimal" placeholder="$10" className="w-full h-[46px] px-4 rounded-[11px] bg-surface border border-line text-content text-[15px] tabular-nums outline-none" /></div>
                              )}
                              {filterDraft.op === op && op === 'bt' && (
                                <div className="flex items-center gap-2.5 pl-10 pb-2">
                                  <input value={filterDraft.min} onChange={(e) => setFilterDraft((d) => ({ ...d, min: e.target.value.replace(/[^0-9.]/g, '') }))} inputMode="decimal" placeholder="Min" className="flex-1 min-w-0 h-[46px] px-4 rounded-[11px] bg-surface border border-line text-content text-[15px] tabular-nums outline-none" />
                                  <span className="text-content-3 text-sm">to</span>
                                  <input value={filterDraft.max} onChange={(e) => setFilterDraft((d) => ({ ...d, max: e.target.value.replace(/[^0-9.]/g, '') }))} inputMode="decimal" placeholder="Max" className="flex-1 min-w-0 h-[46px] px-4 rounded-[11px] bg-surface border border-line text-content text-[15px] tabular-nums outline-none" />
                                </div>
                              )}
                            </div>
                          ))}
                          <div className="font-mono text-[11px] uppercase tracking-wide text-content-3 mt-3.5 mb-1.5">Type</div>
                          {([['Expense', 'Debits only'], ['Income', 'Credits only']] as [string, string][]).map(([val, label]) => (
                            <div key={val} onClick={() => setFilterDraft((d) => ({ ...d, type: d.type === val ? 'All' : val }))} className="flex items-center gap-3.5 py-2 cursor-pointer text-[15px]">
                              <span className="w-[22px] h-[22px] shrink-0 rounded-full border-2 flex items-center justify-center" style={{ borderColor: filterDraft.type === val ? 'var(--primary)' : 'var(--line-strong)' }}>{filterDraft.type === val && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}</span>
                              {label}
                            </div>
                          ))}
                        </div>
                      )}
                      {(filterTab === 'Merchants' || filterTab === 'Tags' || filterTab === 'Other') && (
                        <div className="flex items-center justify-center h-full min-h-[300px] text-content-3 text-sm">Coming soon</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-5 py-3.5 border-t border-line">
                    <button onClick={() => setFilterDraft({ account: 'All', type: 'All', category: [], op: '', val: '', min: '', max: '' })} className="h-10 px-[18px] rounded-[10px] border border-line-strong bg-surface-2 text-content font-semibold text-sm">Clear</button>
                    <div className="flex gap-2.5">
                      <button onClick={() => setFilterOpen(false)} className="h-10 px-[18px] rounded-[10px] border border-line-strong bg-surface-2 text-content font-semibold text-sm">Cancel</button>
                      <button onClick={applyFilters} className="h-10 px-5 rounded-[10px] bg-primary text-on-primary font-bold text-sm shadow-sm">Apply</button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          {/* Sort */}
          <div className="relative">
            <button onClick={() => { setSortOpen((o) => !o); setDateOpen(false); setFilterOpen(false); }}
              className={`flex items-center gap-2 h-10 px-3.5 rounded-[11px] bg-surface border ${sortTouched ? 'border-primary' : 'border-line-strong'} text-content font-semibold text-sm hover:bg-surface-2`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4v16M7 20l-3-3M7 4l3 3M17 20V4M17 4l-3 3M17 4l3 3"/></svg>
              {sortLabel}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
                <div className="absolute top-12 right-0 z-50 w-60 bg-elevated border border-line-strong rounded-[12px] shadow-md p-1.5">
                  {SORT_OPTIONS.map((o) => {
                    const active = sortTouched && o.by === sortBy && o.order === sortOrder;
                    return (
                      <button key={o.label} onClick={() => applySort(o.by, o.order)} className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-content hover:bg-surface-2">
                        <span className="w-4 flex justify-center">{active && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6"/></svg>}</span>
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          {/* Add */}
          <PermissionGate permission="transactions.create" fallback="disabled">
            <button onClick={() => setEditing('new')}
              className="flex items-center gap-2 h-10 px-4 rounded-[11px] bg-primary text-on-primary font-bold text-sm shadow-sm hover:bg-primary-hover">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Add
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {bulkMode && !isMobile && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] shadow-[var(--bg-card-shadow)] px-4 py-3 mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">{selectedIds.size} selected</span>
            <div className="h-4 w-px bg-[var(--table-border)]" />
            {/* Set Date */}
            <div className="flex items-center gap-1">
              <input type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)}
                className="px-2 py-1.5 border border-[var(--table-border)] rounded-lg text-[12px] outline-none bg-[var(--bg-input)] font-mono text-[var(--text-secondary)]" />
              <button onClick={() => applyBulkAction('date')} disabled={!bulkDate || selectedIds.size === 0}
                className="px-2.5 py-1.5 bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] rounded-lg text-[11px] font-semibold border-none cursor-pointer disabled:opacity-40 btn-secondary">Set Date</button>
            </div>
            {/* Set Account */}
            <div className="flex items-center gap-1">
              <select value={bulkAccountId} onChange={(e) => setBulkAccountId(e.target.value ? parseInt(e.target.value) : '')}
                className="px-2 py-1.5 border border-[var(--table-border)] rounded-lg text-[12px] bg-[var(--bg-input)] outline-none text-[var(--text-secondary)]">
                <option value="">Account...</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
              </select>
              <button onClick={() => applyBulkAction('account')} disabled={!bulkAccountId || selectedIds.size === 0}
                className="px-2.5 py-1.5 bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] rounded-lg text-[11px] font-semibold border-none cursor-pointer disabled:opacity-40 btn-secondary">Set</button>
            </div>
            {/* Set Category */}
            <div className="flex items-center gap-1">
              <select value={bulkCategoryId} onChange={(e) => setBulkCategoryId(e.target.value ? parseInt(e.target.value) : '')}
                className="px-2 py-1.5 border border-[var(--table-border)] rounded-lg text-[12px] bg-[var(--bg-input)] outline-none max-w-[180px] text-[var(--text-secondary)]">
                <option value="">Category...</option>
                {Array.from(catGroupsForBulk.entries()).map(([group, subs]) => (
                  <optgroup key={group} label={group}>
                    {subs.map((c) => <option key={c.id} value={c.id}>{c.sub_name}</option>)}
                  </optgroup>
                ))}
              </select>
              <button onClick={() => applyBulkAction('category')} disabled={!bulkCategoryId || selectedIds.size === 0}
                className="px-2.5 py-1.5 bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] rounded-lg text-[11px] font-semibold border-none cursor-pointer disabled:opacity-40 btn-secondary">Set</button>
            </div>
            {/* Find & Replace */}
            <div className="flex items-center gap-1">
              <input value={bulkFind} onChange={(e) => setBulkFind(e.target.value)} placeholder="Find..."
                className="px-2 py-1.5 border border-[var(--table-border)] rounded-lg text-[12px] outline-none bg-[var(--bg-input)] w-[100px] text-[var(--text-secondary)]" />
              <input value={bulkReplace} onChange={(e) => setBulkReplace(e.target.value)} placeholder="Replace..."
                className="px-2 py-1.5 border border-[var(--table-border)] rounded-lg text-[12px] outline-none bg-[var(--bg-input)] w-[100px] text-[var(--text-secondary)]" />
              <button onClick={() => applyBulkAction('findReplace')} disabled={!bulkFind || selectedIds.size === 0}
                className="px-2.5 py-1.5 bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] rounded-lg text-[11px] font-semibold border-none cursor-pointer disabled:opacity-40 btn-secondary">Replace</button>
            </div>
            <div className="h-4 w-px bg-[var(--table-border)]" />
            {/* Delete */}
            <button onClick={() => applyBulkAction('delete')} disabled={selectedIds.size === 0}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border-none cursor-pointer disabled:opacity-40 ${
                bulkConfirmDelete ? 'bg-[var(--btn-destructive-bg)] text-[var(--btn-destructive-text)] btn-destructive' : 'bg-[var(--btn-destructive-light-bg)] text-[var(--btn-destructive-light-text)] btn-destructive-light'
              }`}>
              {bulkConfirmDelete ? 'Confirm Delete?' : 'Delete Selected'}
            </button>
            {bulkConfirmDelete && (
              <button onClick={() => setBulkConfirmDelete(false)}
                className="text-[11px] text-[var(--text-secondary)] bg-transparent border-none cursor-pointer underline btn-ghost">Cancel</button>
            )}
          </div>
        </div>
      )}
      {isMobile ? (
        /* Mobile: Standalone cards */
        <div className="flex flex-col gap-1.5">
          {transactions.map((t) => {
            const catType = t.category?.type ?? t.splits?.[0]?.type ?? 'expense';
            const { text: amtText, className: amtClass } = fmtTransaction(t.amount, catType);
            const isSplit = t.splits && t.splits.length > 0;
            const hasReimbursement = isSplit && t.splits!.some(s => s.type !== t.splits![0].type);
            return (
              <div key={t.id}
                onClick={() => { if (hasPermission('transactions.edit')) openDetail(t); }}
                className={`bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] shadow-[var(--bg-card-shadow)] px-3.5 py-2.5 flex justify-between items-center ${hasPermission('transactions.edit') ? 'cursor-pointer active:bg-[var(--bg-hover)]' : ''}`}>
                <div className="flex-1 min-w-0 mr-3">
                  <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">{t.description}</div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">{t.date}</span>
                    <span className="text-[var(--text-muted)]">·</span>
                    {isSplit ? (
                      <>
                        <SplitBadge
                          colors={t.splits!.map(s => getCategoryColor(s.groupName, allGroupNames))}
                          count={t.splits!.length}
                          compact
                        />
                        {hasReimbursement && <ReimbursementBadge />}
                      </>
                    ) : t.category ? (
                      <CategoryBadge name={t.category.subName} color={getCategoryColor(t.category.groupName, allGroupNames)} />
                    ) : null}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-[14px] font-mono font-semibold ${amtClass}`}>{amtText}</div>
                  <div className="text-[9px] text-[var(--text-muted)] mt-0.5">{accountLabel(t.account)}</div>
                </div>
              </div>
            );
          })}
          {transactions.length === 0 && (
            <p className="text-center py-8 text-[var(--text-muted)] text-[13px]">No transactions found for this period</p>
          )}
        </div>
      ) : (
      <div className="bg-surface rounded-card border border-line shadow-sm">
        {/* card toolbar */}
        {!bulkMode ? (
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <span className="text-[15px] font-bold tabular-nums">{total.toLocaleString()} transactions</span>
            <div className="flex items-center gap-2.5">
              <PermissionGate permission="transactions.bulk_edit" fallback="hidden">
                <button onClick={() => setBulkMode(true)} className="flex items-center gap-2 h-10 px-4 rounded-[11px] bg-surface-2 border border-line text-content font-semibold text-sm hover:bg-surface">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>
                  Edit multiple
                </button>
              </PermissionGate>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-3">
              <button onClick={toggleSelectAll} className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center border-[1.5px]" style={{ borderColor: selectedIds.size ? 'var(--primary)' : 'var(--line-strong)', background: selectedIds.size ? 'var(--primary)' : 'transparent' }}>
                {selectedIds.size > 0 && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14"/></svg>}
              </button>
              <span className="text-base font-bold">{selectedIds.size} selected</span>
              <span className="text-[13px] text-content-3">(ESC)</span>
            </div>
            <button onClick={exitBulkMode} className="h-10 px-4 rounded-[11px] bg-surface-2 border border-line-strong text-content font-semibold text-sm">Cancel</button>
          </div>
        )}
        {/* date-grouped rows */}
        {dateGroups.map((g) => (
          <div key={g.date}>
            <div className="flex items-center justify-between px-6 py-2.5 bg-surface-2 border-t border-b border-line">
              <span className="text-[13px] font-semibold text-content-2">{formatDateHeader(g.date)}</span>
              <span className="font-mono text-xs tabular-nums" style={{ color: g.net < 0 ? 'var(--positive)' : 'var(--text-3)' }}>{g.net < 0 ? `+${fmt(Math.abs(g.net))}` : fmt(g.net)}</span>
            </div>
            {g.rows.map((t) => renderRow(t))}
          </div>
        ))}
        {transactions.length === 0 && <div className="text-center py-10 text-content-3 text-sm">No transactions found for this period</div>}
      </div>
      )}
      {editCell && <div className="fixed inset-0 z-[55]" onClick={() => { setEditCell(null); setCellSearch(''); }} />}

      {/* ===== Detail side panel ===== */}
      {detail && (
        <>
          <div onClick={() => setDetail(null)} className="fixed inset-0 z-[70]" style={{ background: 'rgba(6,8,12,.5)', backdropFilter: 'blur(2px)' }} />
          <div className="fixed top-0 right-0 bottom-0 z-[71] w-[440px] max-w-full bg-surface border-l border-line-strong shadow-md flex flex-col">
            <div className="flex items-center justify-end gap-1.5 px-4 py-3 border-b border-line">
              {canEdit && <button onClick={() => { const t = detail; setDetail(null); setEditing(t); }} className="h-8 px-3 rounded-lg text-content-2 hover:bg-surface-2 text-sm font-semibold">Edit</button>}
              <button onClick={() => setDetail(null)} className="w-9 h-9 flex items-center justify-center rounded-[9px] text-content-2 hover:bg-surface-2"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {(() => {
                const catType = detail.category?.type ?? detail.splits?.[0]?.type ?? 'expense';
                const { text: amtText, className: amtClass } = fmtTransaction(detail.amount, catType);
                const color = getCategoryColorHex(detail.category?.groupName);
                const initial = (detail.description?.trim()?.[0] ?? '?').toUpperCase();
                const isSplit = !!(detail.splits && detail.splits.length > 0);
                return (
                  <>
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <span className="shrink-0 rounded-full flex items-center justify-center font-bold text-xl" style={{ width: 52, height: 52, background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>{initial}</span>
                      <div className="text-right">
                        <div className={`text-[26px] font-extrabold tracking-tight tabular-nums ${amtClass}`}>{amtText}</div>
                        <div className="text-[13px] text-content-3 mt-1">{accountLabel(detail.account)}</div>
                      </div>
                    </div>
                    <div className="text-2xl font-extrabold tracking-tight mb-6 break-words">{detail.description}</div>

                    <div className="font-mono text-[11px] uppercase tracking-wide text-content-3 mb-2">Original Statement</div>
                    <div className="text-[15px] text-content mb-6 break-words">{detail.description}</div>

                    <div className="text-[13px] font-semibold text-content-2 mb-2">Date</div>
                    <input type="date" value={detail.date} onChange={(e) => e.target.value && updateTxnField(detail, { date: e.target.value })}
                      className="w-full h-12 px-3.5 rounded-[11px] bg-surface-2 border border-line text-content text-[15px] outline-none mb-6" />

                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-semibold text-content-2">Category</span>
                      {!isSplit && <button onClick={openSplit} className="text-[13px] font-semibold text-primary inline-flex items-center gap-1.5"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4v16M7 4l-3 3M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3"/></svg>Split</button>}
                    </div>
                    {isSplit ? (
                      <div className="w-full px-3.5 py-3 rounded-[11px] bg-surface-2 border border-line text-[15px] mb-6">Split across {detail.splits!.length} categories</div>
                    ) : (
                      <div className="relative mb-6">
                        <select value={detail.category?.id ?? ''} onChange={(e) => e.target.value && updateTxnField(detail, { categoryId: parseInt(e.target.value) })}
                          className="w-full h-12 pl-3.5 pr-9 rounded-[11px] bg-surface-2 border border-line text-content text-[15px] outline-none appearance-none cursor-pointer">
                          <option value="">Uncategorized</option>
                          {groupedAll.map(([group, subs]) => (
                            <optgroup key={group} label={group}>
                              {subs.map((c) => <option key={c.id} value={c.id}>{c.sub_name}</option>)}
                            </optgroup>
                          ))}
                        </select>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" className="absolute right-3 top-4 pointer-events-none"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    )}

                    <div className="text-[13px] font-semibold text-content-2 mb-2">Notes</div>
                    <textarea value={detailNote} onChange={(e) => setDetailNote(e.target.value)}
                      onBlur={() => { if ((detail.note ?? '') !== detailNote) updateTxnField(detail, { note: detailNote }); }}
                      placeholder="Add notes to this transaction…"
                      className="w-full min-h-[76px] resize-y p-3 rounded-[11px] bg-surface-2 border border-line text-content text-sm outline-none mb-8" />

                    {canEdit && (
                      <button onClick={deleteFromDetail} className="w-full h-11 rounded-[11px] font-bold text-sm"
                        style={{ border: '1px solid color-mix(in srgb, var(--negative) 40%, var(--line))', color: 'var(--negative)', background: 'transparent' }}>Delete transaction</button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* ===== Split modal ===== */}
      {splitOpen && detail && (
        <div onClick={() => setSplitOpen(false)} className="fixed inset-0 z-[80] flex items-center justify-center p-6" style={{ background: 'rgba(6,8,12,.6)', backdropFilter: 'blur(3px)' }}>
          <div onClick={(e) => e.stopPropagation()} className="w-[560px] max-w-full max-h-[88vh] bg-surface border border-line-strong rounded-card shadow-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 pt-5 pb-1">
              <div>
                <div className="text-[19px] font-extrabold tracking-tight">Split transaction</div>
                <div className="text-[13px] text-content-3 mt-0.5">Divide this transaction across categories</div>
              </div>
              <button onClick={() => setSplitOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-[9px] text-content-2 hover:bg-surface-2"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
            </div>
            <div className="flex items-center justify-between mx-6 mt-3.5 mb-1 px-4 py-3.5 rounded-[12px] bg-surface-2 border border-line">
              <span className="text-sm font-semibold text-content-2">Total to split</span>
              <span className="text-lg font-extrabold tabular-nums">{fmt(Math.abs(detail.amount))}</span>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-3.5">
              {splitDraft.map((r, i) => (
                <div key={i} className="flex items-center gap-2.5 mb-3">
                  <div className="relative flex-1 min-w-0">
                    <select value={r.categoryId} onChange={(e) => setSplitDraft((d) => d.map((x, j) => j === i ? { ...x, categoryId: e.target.value ? parseInt(e.target.value) : '' } : x))}
                      className="w-full h-12 pl-3.5 pr-9 rounded-[11px] bg-surface-2 border border-line text-content text-[15px] font-semibold outline-none appearance-none cursor-pointer">
                      <option value="">Category…</option>
                      {groupedAll.map(([group, subs]) => (<optgroup key={group} label={group}>{subs.map((c) => <option key={c.id} value={c.id}>{c.sub_name}</option>)}</optgroup>))}
                    </select>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" className="absolute right-3 top-4 pointer-events-none"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                  <div className="relative w-[130px] shrink-0">
                    <span className="absolute left-3.5 top-3.5 text-[15px] text-content-3 font-semibold">$</span>
                    <input value={r.amount} onChange={(e) => setSplitDraft((d) => d.map((x, j) => j === i ? { ...x, amount: e.target.value.replace(/[^0-9.]/g, '') } : x))} inputMode="decimal" placeholder="0.00"
                      className="w-full h-12 pl-7 pr-3 rounded-[11px] bg-surface-2 border border-line text-content text-[15px] font-semibold text-right tabular-nums outline-none" />
                  </div>
                  {splitDraft.length > 2 && (
                    <button onClick={() => setSplitDraft((d) => d.filter((_, j) => j !== i))} className="w-9 h-9 shrink-0 flex items-center justify-center rounded-[10px] text-content-3 hover:bg-surface-2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
                  )}
                </div>
              ))}
              <button onClick={() => setSplitDraft((d) => [...d, { categoryId: '', amount: '' }])} className="inline-flex items-center gap-2 h-10 px-3.5 rounded-[11px] border border-dashed border-line-strong text-primary text-sm font-bold mt-0.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>Add split
              </button>
            </div>
            <div className="flex items-center justify-between px-6 py-3 border-t border-line">
              <span className="text-sm font-semibold text-content-2">Remaining</span>
              <span className="text-base font-extrabold tabular-nums" style={{ color: Math.abs(splitRemainingVal) < 0.01 ? 'var(--positive)' : 'var(--negative)' }}>{fmt(splitRemainingVal)}</span>
            </div>
            <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-line">
              <button onClick={() => setSplitOpen(false)} className="h-[42px] px-[18px] rounded-[11px] border border-line-strong bg-surface-2 text-content font-semibold text-sm">Cancel</button>
              <button onClick={saveSplit} disabled={!splitValid} className="h-[42px] px-[22px] rounded-[11px] bg-primary text-on-primary font-bold text-sm shadow-sm disabled:opacity-50">Save split</button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className={`mt-3 text-[13px] text-[var(--text-secondary)] ${isMobile ? 'flex flex-col items-center gap-2 pb-16' : 'flex justify-between items-center'}`}>
        {!isMobile && (
          <span className="font-mono text-[12px]">
            {total > 0 ? `${showFrom}–${showTo} of ${total}` : 'No transactions'}
          </span>
        )}
        <div className={`flex items-center ${isMobile ? 'justify-center' : 'gap-3'}`}>
          {!isMobile && (
            <div className="flex items-center gap-1.5">
              <select value={pageSize} onChange={(e) => { const v = parseInt(e.target.value, 10); setPageSize(v); localStorage.setItem('ledger-page-size', v.toString()); setPage(1); }}
                className="px-2 py-1 border border-[var(--table-border)] rounded text-[12px] bg-[var(--bg-input)] outline-none text-[var(--text-secondary)]">
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
              </select>
              <span className="text-[12px] text-[var(--text-muted)]">per page</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-2.5 py-1 bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] rounded text-[12px] font-medium border-none cursor-pointer disabled:opacity-40 disabled:cursor-default btn-secondary">
              ← Prev
            </button>
            <span className="font-mono text-[12px] text-[var(--text-muted)]">{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-2.5 py-1 bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] rounded text-[12px] font-medium border-none cursor-pointer disabled:opacity-40 disabled:cursor-default btn-secondary">
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {editing !== null && (
        <TransactionForm
          transaction={editing === 'new' ? undefined : editing}
          accounts={accounts}
          categories={categories}
          onSave={handleSave}
          onDelete={editing !== 'new' && hasPermission('transactions.delete') ? handleDelete : undefined}
          onClose={() => { setEditing(null); setPendingSave(null); setDuplicateMatch(null); }}
          duplicateMatch={duplicateMatch}
        />
      )}
    </div>
  );
}
