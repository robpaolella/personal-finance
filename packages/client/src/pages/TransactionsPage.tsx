import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiFetch } from '../lib/api';
import { fmt } from '../lib/formatters';

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
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
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
      <label className="block text-[11px] font-medium text-[#64748b] mb-1">{label}</label>
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
  const [amount, setAmount] = useState(transaction ? transaction.amount.toString() : '');
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
      // For income categories where group_name === sub_name, show once
      const existing = groupMap.get(c.group_name)!;
      if (c.type === 'income' && c.group_name === c.sub_name) {
        if (!existing.some((e) => e.id === c.id)) existing.push(c);
      } else {
        existing.push(c);
      }
    }
    return groups;
  }, [filteredCategories]);

  // Grouped accounts by owner
  const accountsByOwner = useMemo(() => {
    const map = new Map<string, Account[]>();
    for (const a of accounts) {
      if (!map.has(a.owner)) map.set(a.owner, []);
      map.get(a.owner)!.push(a);
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

    // Sign logic: explicit negative takes priority, otherwise toggle determines sign
    let finalAmount: number;
    if (parsedAmount < 0) {
      // User explicitly typed a negative number — store as-is
      finalAmount = parsedAmount;
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
    `w-full px-3 py-2 border rounded-lg text-[13px] outline-none ${
      hasError ? 'border-[#ef4444] bg-[#fef2f2]' : 'border-[#e2e8f0] bg-[#f8fafc]'
    }`;

  return (
    <Modal onClose={onClose}>
      <h3 className="text-[15px] font-bold text-[#0f172a] mb-4">
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
                    txType === t ? 'bg-[#0f172a] text-white' : 'bg-[#f1f5f9] text-[#64748b]'
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
          <button onClick={onDelete}
            className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[#fef2f2] text-[#ef4444] border-none cursor-pointer mr-auto">
            Delete
          </button>
        )}
        <button onClick={onClose}
          className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[#f1f5f9] text-[#64748b] border-none cursor-pointer">
          Cancel
        </button>
        <button onClick={handleSaveClick}
          className={`px-4 py-2 text-[12px] font-semibold rounded-lg border-none ${
            isValid
              ? 'bg-[#0f172a] text-white cursor-pointer'
              : 'bg-[#94a3b8] text-white cursor-not-allowed'
          }`}>
          Save
        </button>
      </div>
    </Modal>
  );
}

/**
 * Display logic for transaction amounts:
 * - Positive amount (expense): black text, no prefix
 * - Negative amount + income category: green "+$X"
 * - Negative amount + expense category: green "-$X" (refund)
 */
function formatTransactionAmount(amount: number, categoryType: string): { text: string; className: string } {
  if (amount >= 0) {
    return { text: fmt(amount), className: 'text-[#0f172a]' };
  }
  // Negative amount
  const abs = Math.abs(amount);
  if (categoryType === 'income') {
    return { text: `+${fmt(abs)}`, className: 'text-[#10b981]' };
  }
  // Negative + expense = refund
  return { text: `-${fmt(abs)}`, className: 'text-[#10b981]' };
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [filterAccount, setFilterAccount] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return last.toISOString().slice(0, 10);
  });

  const [offset, setOffset] = useState(0);
  const limit = 50;

  // Modal
  const [editing, setEditing] = useState<Transaction | null | 'new'>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadTransactions = useCallback(async (resetOffset = true) => {
    const params = new URLSearchParams();
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    params.set('limit', limit.toString());
    const currentOffset = resetOffset ? 0 : offset;
    params.set('offset', currentOffset.toString());
    if (search) params.set('search', search);
    if (filterAccount !== 'All') params.set('accountId', filterAccount);
    if (filterType !== 'All') params.set('type', filterType.toLowerCase());

    const res = await apiFetch<{ data: Transaction[]; total: number }>(`/transactions?${params.toString()}`);
    if (resetOffset) {
      setTransactions(res.data);
      setOffset(0);
    } else {
      setTransactions((prev) => [...prev, ...res.data]);
    }
    setTotal(res.total);
  }, [startDate, endDate, search, filterAccount, filterType, offset]);

  const loadMeta = useCallback(async () => {
    const [acctRes, catRes] = await Promise.all([
      apiFetch<{ data: Account[] }>('/accounts'),
      apiFetch<{ data: Category[] }>('/categories'),
    ]);
    setAccounts(acctRes.data);
    setCategories(catRes.data);
  }, []);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { loadTransactions(true); }, [startDate, endDate, search, filterAccount, filterType]);

  const handleSave = async (data: Record<string, unknown>) => {
    if (editing === 'new') {
      await apiFetch('/transactions', { method: 'POST', body: JSON.stringify(data) });
    } else if (editing) {
      await apiFetch(`/transactions/${editing.id}`, { method: 'PUT', body: JSON.stringify(data) });
    }
    setEditing(null);
    loadTransactions(true);
  };

  const handleDelete = async () => {
    if (editing && editing !== 'new') {
      if (!confirmDelete) {
        setConfirmDelete(true);
        return;
      }
      await apiFetch(`/transactions/${editing.id}`, { method: 'DELETE' });
      setEditing(null);
      setConfirmDelete(false);
      loadTransactions(true);
    }
  };

  const loadMore = () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    const params = new URLSearchParams();
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    params.set('limit', limit.toString());
    params.set('offset', newOffset.toString());
    if (search) params.set('search', search);
    if (filterAccount !== 'All') params.set('accountId', filterAccount);
    if (filterType !== 'All') params.set('type', filterType.toLowerCase());

    apiFetch<{ data: Transaction[]; total: number }>(`/transactions?${params.toString()}`).then((res) => {
      setTransactions((prev) => [...prev, ...res.data]);
      setTotal(res.total);
    });
  };

  const accountLabel = (a: { name: string; last_four?: string | null; lastFour?: string | null }) => {
    const lf = a.lastFour ?? a.last_four;
    return lf ? `${a.name} (${lf})` : a.name;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#0f172a] m-0">Transactions</h1>
          <p className="text-[#64748b] text-[13px] mt-1">{total} transactions</p>
        </div>
        <button onClick={() => setEditing('new')}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0f172a] text-white rounded-lg text-[13px] font-semibold border-none cursor-pointer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Transaction
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-[#e8ecf1] shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex gap-3 items-center mb-5 px-4 py-3">
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full py-2 pl-[34px] pr-2 border border-[#e2e8f0] rounded-lg text-[13px] outline-none bg-[#f8fafc]" />
        </div>
        <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}
          className="px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] bg-[#f8fafc] outline-none">
          <option value="All">All Accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id.toString()}>{accountLabel(a)}</option>
          ))}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] bg-[#f8fafc] outline-none">
          <option value="All">All</option>
          <option value="Income">Income</option>
          <option value="Expense">Expense</option>
        </select>
        <div className="flex items-center gap-2">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-2 border border-[#e2e8f0] rounded-lg text-[12px] outline-none bg-[#f8fafc] font-mono" />
          <span className="text-[#94a3b8] text-[11px]">to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-2 border border-[#e2e8f0] rounded-lg text-[12px] outline-none bg-[#f8fafc] font-mono" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e8ecf1] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-left">Date</th>
              <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-left">Description</th>
              <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-left">Account</th>
              <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-left">Category</th>
              <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-left">Sub-Category</th>
              <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => {
              const { text: amtText, className: amtClass } = formatTransactionAmount(t.amount, t.category.type);
              return (
                <tr key={t.id}
                  onClick={() => { setEditing(t); setConfirmDelete(false); }}
                  className="border-b border-[#f1f5f9] cursor-pointer hover:bg-[#f8fafc]">
                  <td className="px-2.5 py-2 font-mono text-[12px] text-[#475569]">{t.date}</td>
                  <td className="px-2.5 py-2 text-[#0f172a] font-medium">{t.description}</td>
                  <td className="px-2.5 py-2">
                    <span className="text-[11px] font-mono bg-[#f1f5f9] text-[#475569] px-2 py-0.5 rounded-md">
                      {accountLabel(t.account)}
                    </span>
                  </td>
                  <td className="px-2.5 py-2">
                    <span className="text-[11px] text-[#64748b]">{t.category.groupName}</span>
                  </td>
                  <td className="px-2.5 py-2">
                    <span className="text-[11px] bg-[#eff6ff] text-[#3b82f6] px-2 py-0.5 rounded-md">{t.category.subName}</span>
                  </td>
                  <td className={`px-2.5 py-2 text-right font-mono font-semibold ${amtClass}`}>
                    {amtText}
                  </td>
                </tr>
              );
            })}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-[#94a3b8] text-[13px]">
                  No transactions found for this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-3 text-[13px] text-[#64748b]">
        <span>Showing {transactions.length} of {total} transactions</span>
        {transactions.length < total && (
          <button onClick={loadMore}
            className="px-4 py-2 bg-[#f1f5f9] text-[#334155] rounded-lg text-[13px] font-semibold border-none cursor-pointer">
            Load More
          </button>
        )}
      </div>

      {/* Modal */}
      {editing !== null && (
        <TransactionForm
          transaction={editing === 'new' ? undefined : editing}
          accounts={accounts}
          categories={categories}
          onSave={handleSave}
          onDelete={editing !== 'new' ? handleDelete : undefined}
          onClose={() => { setEditing(null); setConfirmDelete(false); }}
        />
      )}
    </div>
  );
}
