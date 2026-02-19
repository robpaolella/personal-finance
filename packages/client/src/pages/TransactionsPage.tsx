import { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [selectedGroup, setSelectedGroup] = useState(transaction?.category.groupName ?? '');
  const [categoryId, setCategoryId] = useState<number>(transaction?.category.id ?? 0);
  const [amount, setAmount] = useState(transaction ? Math.abs(transaction.amount).toString() : '');
  const [txType, setTxType] = useState<'expense' | 'income'>(
    transaction ? (transaction.amount < 0 ? 'income' : 'expense') : 'expense'
  );

  const groups = useMemo(() => {
    const unique = [...new Set(categories.map((c) => c.group_name))];
    return unique;
  }, [categories]);

  const filteredSubs = useMemo(() => {
    if (!selectedGroup) return categories;
    return categories.filter((c) => c.group_name === selectedGroup);
  }, [categories, selectedGroup]);

  // Grouped accounts by owner
  const accountsByOwner = useMemo(() => {
    const map = new Map<string, Account[]>();
    for (const a of accounts) {
      if (!map.has(a.owner)) map.set(a.owner, []);
      map.get(a.owner)!.push(a);
    }
    return map;
  }, [accounts]);

  return (
    <Modal onClose={onClose}>
      <h3 className="text-[15px] font-bold text-[#0f172a] mb-4">
        {transaction ? 'Edit Transaction' : 'Add Transaction'}
      </h3>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-[#64748b] mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] bg-[#f8fafc] outline-none font-mono" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#64748b] mb-1">Account</label>
            <select value={accountId} onChange={(e) => setAccountId(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] bg-[#f8fafc] outline-none">
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
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[#64748b] mb-1">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] bg-[#f8fafc] outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[#64748b] mb-1">Note (optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] bg-[#f8fafc] outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-[#64748b] mb-1">Category Group</label>
            <select value={selectedGroup} onChange={(e) => { setSelectedGroup(e.target.value); setCategoryId(0); }}
              className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] bg-[#f8fafc] outline-none">
              <option value="">All Groups</option>
              {groups.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#64748b] mb-1">Sub-Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] bg-[#f8fafc] outline-none">
              <option value={0} disabled>Select category</option>
              {filteredSubs.map((c) => (
                <option key={c.id} value={c.id}>{c.display_name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-[#64748b] mb-1">Amount</label>
            <input type="number" step="0.01" min="0" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] bg-[#f8fafc] outline-none font-mono" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#64748b] mb-1">Type</label>
            <div className="flex gap-2">
              {(['expense', 'income'] as const).map((t) => (
                <button key={t} onClick={() => setTxType(t)}
                  className={`flex-1 py-2 text-[12px] font-semibold rounded-lg border-none cursor-pointer capitalize ${
                    txType === t ? 'bg-[#0f172a] text-white' : 'bg-[#f1f5f9] text-[#64748b]'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
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
        <button onClick={() => {
          const parsedAmount = parseFloat(amount);
          const finalAmount = txType === 'income' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
          onSave({ accountId, date, description, note: note || null, categoryId, amount: finalAmount });
        }}
          className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[#0f172a] text-white border-none cursor-pointer">
          Save
        </button>
      </div>
    </Modal>
  );
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
            {transactions.map((t) => (
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
                <td className={`px-2.5 py-2 text-right font-mono font-semibold ${
                  t.amount < 0 ? 'text-[#10b981]' : 'text-[#0f172a]'
                }`}>
                  {t.amount < 0 ? '+' : ''}{fmt(Math.abs(t.amount))}
                </td>
              </tr>
            ))}
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
