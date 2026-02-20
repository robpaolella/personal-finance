import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiFetch } from '../lib/api';
import { fmtTransaction } from '../lib/formatters';
import { useToast } from '../context/ToastContext';
import ConfirmDeleteButton from '../components/ConfirmDeleteButton';

interface TransactionAccount {
  id: number;
  name: string;
  lastFour: string | null;
  owner: string;
}

interface TransactionCategory {
  id: number;
  groupName: string;
  subName: string;
  displayName: string;
  type: string;
}

interface Transaction {
  id: number;
  date: string;
  description: string;
  note: string | null;
  amount: number;
  account: TransactionAccount;
  category: TransactionCategory;
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

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// Field wrapper with validation error display
function Field({
  label,
  required,
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
}: {
  transaction?: Transaction;
  accounts: Account[];
  categories: Category[];
  onSave: (data: Record<string, unknown>) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(transaction?.date ?? new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState<number>(transaction?.account.id ?? (accounts[0]?.id ?? 0));
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [note, setNote] = useState(transaction?.note ?? '');
  const [categoryId, setCategoryId] = useState<number>(transaction?.category.id ?? 0);
  // Show user-facing amount: for income, negate stored value (stored -5000 → show 5000)
  // For reversals (positive+income or negative+expense), show as negative to indicate reversal
  const [amount, setAmount] = useState(() => {
    if (!transaction) return '';
    const catType = transaction.category.type;
    const stored = transaction.amount;
    if (catType === 'income') {
      // Regular income is stored negative → show positive; reversal is stored positive → show negative
      return (-stored).toString();
    }
    // Regular expense is stored positive → show positive; refund is stored negative → show negative
    return stored.toString();
  });
  const [txType, setTxType] = useState<'expense' | 'income'>(
    transaction?.category.type === 'income' ? 'income' : 'expense'
  );
  const [showErrors, setShowErrors] = useState(false);

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
      const ownerNames = (a.owners && a.owners.length > 0)
        ? a.owners.map((o) => o.displayName)
        : [a.owner];
      for (const name of ownerNames) {
        if (!map.has(name)) map.set(name, []);
        if (!map.get(name)!.some((x) => x.id === a.id)) {
          map.get(name)!.push(a);
        }
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
  const isValid = !!(
    date &&
    accountId > 0 &&
    description.trim() &&
    categoryId > 0 &&
    amount !== '' &&
    !isNaN(parsedAmount)
  );

  const getFirstInvalidRef = () => {
    if (!date) return dateRef;
    if (accountId <= 0) return accountRef;
    if (!description.trim()) return descRef;
    if (categoryId <= 0) return categoryRef;
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
      // User explicitly typed a negative number — reverse the default sign
      // For income: default is negative, so reversed = positive (income reversal)
      // For expense: default is positive, so reversed = negative (refund)
      finalAmount = txType === 'income' ? Math.abs(parsedAmount) : parsedAmount;
    } else {
      // Toggle determines sign
      finalAmount = txType === 'income' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
    }

    onSave({ accountId, date, description, note: note || null, categoryId, amount: finalAmount });
  };

  const errDate = showErrors && !date;
  const errAccount = showErrors && accountId <= 0;
  const errDesc = showErrors && !description.trim();
  const errCategory = showErrors && categoryId <= 0;
  const errAmount = showErrors && (amount === '' || isNaN(parsedAmount));

  const inputCls = (hasError: boolean) =>
    `w-full px-3 py-2 border rounded-lg text-[13px] outline-none text-[var(--text-body)] ${
      hasError ? 'border-[#ef4444] bg-[var(--error-bg)]' : 'border-[var(--table-border)] bg-[var(--bg-input)]'
    }`;

  return (
    <Modal onClose={onClose}>
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
                  className={`flex-1 py-2 text-[12px] font-semibold rounded-lg border-none cursor-pointer capitalize ${
                    txType === t ? 'bg-[var(--bg-primary-btn)] text-white' : 'bg-[var(--bg-secondary-btn)] text-[var(--text-secondary)]'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </Field>
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
        </div>
        <Field label="Amount" required error={errAmount}>
          <input ref={amountRef} type="number" step="0.01" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${inputCls(!!errAmount)} font-mono`} />
        </Field>
      </div>
      <div className="flex gap-2 mt-5 justify-end">
        {transaction && onDelete && (
          <div className="mr-auto">
            <ConfirmDeleteButton onConfirm={onDelete} />
          </div>
        )}
        <button onClick={onClose}
          className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[var(--bg-secondary-btn)] text-[var(--text-secondary)] border-none cursor-pointer">
          Cancel
        </button>
        <button onClick={handleSaveClick}
          className={`px-4 py-2 text-[12px] font-semibold rounded-lg border-none ${
            isValid
              ? 'bg-[var(--bg-primary-btn)] text-white cursor-pointer'
              : 'bg-[var(--text-muted)] text-white cursor-not-allowed'
          }`}>
          Save
        </button>
      </div>
    </Modal>
  );
}

export default function TransactionsPage() {
  const { addToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [filterAccount, setFilterAccount] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [datePreset, setDatePreset] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    const stored = localStorage.getItem('ledger-page-size');
    return stored ? parseInt(stored, 10) : 50;
  });

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

  // Bulk edit mode
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
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

    const res = await apiFetch<{ data: Transaction[]; total: number }>(`/transactions?${params.toString()}`);
    setTransactions(res.data);
    setTotal(res.total);
  }, [getDateRange, search, filterAccount, filterType, page, pageSize]);

  const loadMeta = useCallback(async () => {
    const [acctRes, catRes] = await Promise.all([
      apiFetch<{ data: Account[] }>('/accounts'),
      apiFetch<{ data: Category[] }>('/categories'),
    ]);
    setAccounts(acctRes.data);
    setCategories(catRes.data);
  }, []);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { setPage(1); }, [datePreset, customStart, customEnd, search, filterAccount, filterType]);
  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const handleSave = async (data: Record<string, unknown>) => {
    try {
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
    } catch (err) {
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

  const hasActiveFilters = search !== '' || filterAccount !== 'All' || filterType !== 'All' || datePreset !== 'all';

  const resetFilters = () => {
    setSearch('');
    setFilterAccount('All');
    setFilterType('All');
    setDatePreset('all');
    setCustomStart('');
    setCustomEnd('');
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showTo = Math.min(page * pageSize, total);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--text-primary)] m-0">Transactions</h1>
          <p className="text-[var(--text-secondary)] text-[13px] mt-1">{total} transactions</p>
        </div>
        <div className="flex gap-2">
          {bulkMode ? (
            <button onClick={exitBulkMode}
              className="flex items-center gap-1.5 px-4 py-2 bg-[var(--bg-secondary-btn)] text-[var(--bg-secondary-btn-text)] rounded-lg text-[13px] font-semibold border-none cursor-pointer">
              Exit Bulk Edit
            </button>
          ) : (
            <button onClick={() => setBulkMode(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[var(--bg-secondary-btn)] text-[var(--bg-secondary-btn-text)] rounded-lg text-[13px] font-semibold border-none cursor-pointer">
              Bulk Edit
            </button>
          )}
          <button onClick={() => setEditing('new')}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--bg-secondary-btn)] text-[var(--bg-secondary-btn-text)] rounded-lg text-[13px] font-semibold border-none cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Transaction
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] shadow-[var(--card-shadow)] flex gap-3 items-center mb-5 px-4 py-3">
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full py-2 pl-[34px] pr-2 border border-[var(--table-border)] rounded-lg text-[13px] outline-none bg-[var(--bg-input)] text-[var(--text-secondary)]" />
        </div>
        <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}
          className="px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-secondary)]">
          <option value="All">All Accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id.toString()}>{accountLabel(a)}</option>
          ))}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-secondary)]">
          <option value="All">All</option>
          <option value="Income">Income</option>
          <option value="Expense">Expense</option>
        </select>
        <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)}
          className="px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-secondary)]">
          <option value="all">All Time</option>
          <option value="this-month">This Month</option>
          <option value="last-month">Last Month</option>
          <option value="this-quarter">This Quarter</option>
          <option value="last-quarter">Last Quarter</option>
          <option value="this-year">This Year</option>
          <option value="last-year">Last Year</option>
          <option value="ytd">Year to Date</option>
          <option value="custom">Custom Range...</option>
        </select>
        {datePreset === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
              className="px-2 py-2 border border-[var(--table-border)] rounded-lg text-[12px] outline-none bg-[var(--bg-input)] font-mono text-[var(--text-secondary)]" />
            <span className="text-[var(--text-muted)] text-[11px]">to</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2 py-2 border border-[var(--table-border)] rounded-lg text-[12px] outline-none bg-[var(--bg-input)] font-mono text-[var(--text-secondary)]" />
          </div>
        )}
        {hasActiveFilters && (
          <button onClick={resetFilters}
            className="text-[12px] text-[var(--text-secondary)] bg-transparent border-none cursor-pointer hover:text-[var(--bg-secondary-btn-text)] whitespace-nowrap flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Reset Filters
          </button>
        )}
      </div>

      {/* Bulk Actions Toolbar */}
      {bulkMode && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] shadow-[var(--card-shadow)] px-4 py-3 mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">{selectedIds.size} selected</span>
            <div className="h-4 w-px bg-[var(--table-border)]" />
            {/* Set Date */}
            <div className="flex items-center gap-1">
              <input type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)}
                className="px-2 py-1.5 border border-[var(--table-border)] rounded-lg text-[12px] outline-none bg-[var(--bg-input)] font-mono text-[var(--text-secondary)]" />
              <button onClick={() => applyBulkAction('date')} disabled={!bulkDate || selectedIds.size === 0}
                className="px-2.5 py-1.5 bg-[var(--bg-secondary-btn)] text-[var(--bg-secondary-btn-text)] rounded-lg text-[11px] font-semibold border-none cursor-pointer disabled:opacity-40">Set Date</button>
            </div>
            {/* Set Account */}
            <div className="flex items-center gap-1">
              <select value={bulkAccountId} onChange={(e) => setBulkAccountId(e.target.value ? parseInt(e.target.value) : '')}
                className="px-2 py-1.5 border border-[var(--table-border)] rounded-lg text-[12px] bg-[var(--bg-input)] outline-none text-[var(--text-secondary)]">
                <option value="">Account...</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
              </select>
              <button onClick={() => applyBulkAction('account')} disabled={!bulkAccountId || selectedIds.size === 0}
                className="px-2.5 py-1.5 bg-[var(--bg-secondary-btn)] text-[var(--bg-secondary-btn-text)] rounded-lg text-[11px] font-semibold border-none cursor-pointer disabled:opacity-40">Set</button>
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
                className="px-2.5 py-1.5 bg-[var(--bg-secondary-btn)] text-[var(--bg-secondary-btn-text)] rounded-lg text-[11px] font-semibold border-none cursor-pointer disabled:opacity-40">Set</button>
            </div>
            {/* Find & Replace */}
            <div className="flex items-center gap-1">
              <input value={bulkFind} onChange={(e) => setBulkFind(e.target.value)} placeholder="Find..."
                className="px-2 py-1.5 border border-[var(--table-border)] rounded-lg text-[12px] outline-none bg-[var(--bg-input)] w-[100px] text-[var(--text-secondary)]" />
              <input value={bulkReplace} onChange={(e) => setBulkReplace(e.target.value)} placeholder="Replace..."
                className="px-2 py-1.5 border border-[var(--table-border)] rounded-lg text-[12px] outline-none bg-[var(--bg-input)] w-[100px] text-[var(--text-secondary)]" />
              <button onClick={() => applyBulkAction('findReplace')} disabled={!bulkFind || selectedIds.size === 0}
                className="px-2.5 py-1.5 bg-[var(--bg-secondary-btn)] text-[var(--bg-secondary-btn-text)] rounded-lg text-[11px] font-semibold border-none cursor-pointer disabled:opacity-40">Replace</button>
            </div>
            <div className="h-4 w-px bg-[var(--table-border)]" />
            {/* Delete */}
            <button onClick={() => applyBulkAction('delete')} disabled={selectedIds.size === 0}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border-none cursor-pointer disabled:opacity-40 ${
                bulkConfirmDelete ? 'bg-[#ef4444] text-white' : 'bg-[var(--error-bg)] text-[#ef4444]'
              }`}>
              {bulkConfirmDelete ? 'Confirm Delete?' : 'Delete Selected'}
            </button>
            {bulkConfirmDelete && (
              <button onClick={() => setBulkConfirmDelete(false)}
                className="text-[11px] text-[var(--text-secondary)] bg-transparent border-none cursor-pointer underline">Cancel</button>
            )}
          </div>
        </div>
      )}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] shadow-[var(--card-shadow)]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {bulkMode && (
                <th className="w-8 px-2 py-2 border-b-2 border-[var(--table-border)]">
                  <input type="checkbox" checked={selectedIds.size === transactions.length && transactions.length > 0}
                    onChange={toggleSelectAll} className="cursor-pointer" />
                </th>
              )}
              <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] text-left">Date</th>
              <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] text-left">Description</th>
              <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] text-left">Account</th>
              <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] text-left">Category</th>
              <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] text-left">Sub-Category</th>
              <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => {
              const { text: amtText, className: amtClass } = fmtTransaction(t.amount, t.category.type);
              return (
                <tr key={t.id}
                  onClick={() => { if (!bulkMode) { setEditing(t); } }}
                  className="border-b border-[var(--table-row-border)] cursor-pointer hover:bg-[var(--bg-hover)]">
                  {bulkMode && (
                    <td className="w-8 px-2 py-2">
                      <input type="checkbox" checked={selectedIds.has(t.id)}
                        onChange={() => toggleSelect(t.id)} className="cursor-pointer" />
                    </td>
                  )}
                  <td className="px-2.5 py-2 font-mono text-[12px] text-[var(--text-body)]">{t.date}</td>
                  <td className="px-2.5 py-2 text-[var(--text-primary)] font-medium">{t.description}</td>
                  <td className="px-2.5 py-2">
                    <span className="text-[11px] font-mono bg-[var(--bg-secondary-btn)] text-[var(--text-body)] px-2 py-0.5 rounded-md">
                      {accountLabel(t.account)}
                    </span>
                  </td>
                  <td className="px-2.5 py-2">
                    <span className="text-[11px] text-[var(--text-secondary)]">{t.category.groupName}</span>
                  </td>
                  <td className="px-2.5 py-2">
                    <span className="text-[11px] bg-[var(--badge-blue-bg)] text-[#3b82f6] px-2 py-0.5 rounded-md">{t.category.subName}</span>
                  </td>
                  <td className={`px-2.5 py-2 text-right font-mono font-semibold ${amtClass}`}>
                    {amtText}
                  </td>
                </tr>
              );
            })}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={bulkMode ? 7 : 6} className="text-center py-8 text-[var(--text-muted)] text-[13px]">
                  No transactions found for this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-3 text-[13px] text-[var(--text-secondary)]">
        <span className="font-mono text-[12px]">
          {total > 0 ? `Showing ${showFrom}–${showTo} of ${total} transactions` : 'No transactions'}
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <select value={pageSize} onChange={(e) => { const v = parseInt(e.target.value, 10); setPageSize(v); localStorage.setItem('ledger-page-size', v.toString()); setPage(1); }}
              className="px-2 py-1 border border-[var(--table-border)] rounded text-[12px] bg-[var(--bg-input)] outline-none text-[var(--text-secondary)]">
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
            <span className="text-[12px] text-[var(--text-muted)]">per page</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-2.5 py-1 bg-[var(--bg-secondary-btn)] text-[var(--bg-secondary-btn-text)] rounded text-[12px] font-medium border-none cursor-pointer disabled:opacity-40 disabled:cursor-default">
              ← Prev
            </button>
            <span className="font-mono text-[12px] text-[var(--text-muted)]">{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-2.5 py-1 bg-[var(--bg-secondary-btn)] text-[var(--bg-secondary-btn-text)] rounded text-[12px] font-medium border-none cursor-pointer disabled:opacity-40 disabled:cursor-default">
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
          onDelete={editing !== 'new' ? handleDelete : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
