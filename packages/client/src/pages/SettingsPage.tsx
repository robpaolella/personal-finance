import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';
import { fmt } from '../lib/formatters';

const CATEGORY_COLORS: Record<string, string> = {
  'Income': '#10b981',
  'Auto/Transportation': '#ef4444', 'Clothing': '#ec4899', 'Daily Living': '#10b981',
  'Discretionary': '#a855f7', 'Dues/Subscriptions': '#6366f1', 'Entertainment': '#8b5cf6',
  'Household': '#3b82f6', 'Insurance': '#f59e0b', 'Health': '#14b8a6',
  'Utilities': '#f97316', 'Savings': '#06b6d4',
};

const ACCOUNT_TYPES = ['checking', 'savings', 'credit', 'investment', 'retirement', 'venmo', 'cash'];
const CLASSIFICATIONS = ['liquid', 'investment', 'liability'];

function classificationForType(type: string): string {
  if (['checking', 'savings', 'venmo', 'cash'].includes(type)) return 'liquid';
  if (['investment', 'retirement'].includes(type)) return 'investment';
  if (type === 'credit') return 'liability';
  return 'liquid';
}

interface Account {
  id: number;
  name: string;
  last_four: string | null;
  type: string;
  classification: string;
  owner: string;
  is_active: number;
}

interface Category {
  id: number;
  group_name: string;
  sub_name: string;
  display_name: string;
  type: string;
  is_deductible: number;
  sort_order: number;
}

interface GroupedCategory {
  group: string;
  type: string;
  subs: Category[];
}

// --- Modal wrapper ---
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// --- Account Form ---
function AccountForm({
  account,
  owners,
  onSave,
  onDelete,
  onClose,
}: {
  account?: Account;
  owners: string[];
  onSave: (data: Record<string, unknown>) => void;
  onDelete?: () => Promise<string | null>;
  onClose: () => void;
}) {
  const [name, setName] = useState(account?.name ?? '');
  const [lastFour, setLastFour] = useState(account?.last_four ?? '');
  const [type, setType] = useState(account?.type ?? 'checking');
  const [classification, setClassification] = useState(account?.classification ?? 'liquid');
  const [owner, setOwner] = useState(account?.owner ?? owners[0] ?? '');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t); }
  }, [error]);

  useEffect(() => {
    if (confirmDelete) { const t = setTimeout(() => setConfirmDelete(false), 3000); return () => clearTimeout(t); }
  }, [confirmDelete]);

  const handleDeleteClick = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    if (onDelete) {
      const err = await onDelete();
      if (err) { setError(err); setConfirmDelete(false); }
    }
  };

  return (
    <Modal onClose={onClose}>
      <h3 className="text-[15px] font-bold text-[#0f172a] mb-4">
        {account ? 'Edit Account' : 'Add Account'}
      </h3>
      {error && (
        <div className="bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] rounded-lg p-3 text-[13px] mb-3 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 text-[#991b1b] bg-transparent border-none cursor-pointer font-bold text-[14px] leading-none">×</button>
        </div>
      )}
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-[11px] font-medium text-[#64748b] mb-1">Account Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] bg-[#f8fafc] outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[#64748b] mb-1">Last Four (optional)</label>
          <input value={lastFour} onChange={(e) => setLastFour(e.target.value)}
            className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] bg-[#f8fafc] outline-none" maxLength={5} />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[#64748b] mb-1">Type</label>
          <select value={type} onChange={(e) => { setType(e.target.value); setClassification(classificationForType(e.target.value)); }}
            className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] bg-[#f8fafc] outline-none capitalize">
            {ACCOUNT_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[#64748b] mb-1">Classification</label>
          <select value={classification} onChange={(e) => setClassification(e.target.value)}
            className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] bg-[#f8fafc] outline-none capitalize">
            {CLASSIFICATIONS.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[#64748b] mb-1">Owner</label>
          <select value={owner} onChange={(e) => setOwner(e.target.value)}
            className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] bg-[#f8fafc] outline-none">
            {owners.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 mt-5 justify-end">
        {account && onDelete && (
          <div className="mr-auto flex items-center gap-2">
            <button onClick={handleDeleteClick}
              className={`px-4 py-2 text-[12px] font-semibold rounded-lg border-none cursor-pointer ${
                confirmDelete ? 'bg-[#ef4444] text-white' : 'bg-[#fef2f2] text-[#ef4444]'
              }`}>
              {confirmDelete ? 'Confirm Delete?' : 'Delete'}
            </button>
            {confirmDelete && (
              <button onClick={() => setConfirmDelete(false)}
                className="text-[12px] text-[#64748b] bg-transparent border-none cursor-pointer underline">Cancel</button>
            )}
          </div>
        )}
        <button onClick={onClose}
          className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[#f1f5f9] text-[#64748b] border-none cursor-pointer">
          Cancel
        </button>
        <button onClick={() => onSave({ name, lastFour: lastFour || null, type, classification, owner })}
          className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[#0f172a] text-white border-none cursor-pointer">
          Save
        </button>
      </div>
    </Modal>
  );
}

// --- Category Form ---
function CategoryForm({
  category,
  existingGroups,
  onSave,
  onDelete,
  onClose,
}: {
  category?: Category;
  existingGroups: string[];
  onSave: (data: Record<string, unknown>) => void;
  onDelete?: () => Promise<string | null>;
  onClose: () => void;
}) {
  const [catType, setCatType] = useState(category?.type ?? 'expense');
  const [groupName, setGroupName] = useState(category?.group_name ?? '');
  const [subName, setSubName] = useState(category?.sub_name ?? '');
  const [isDeductible, setIsDeductible] = useState(category?.is_deductible === 1);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t); }
  }, [error]);

  useEffect(() => {
    if (confirmDelete) { const t = setTimeout(() => setConfirmDelete(false), 3000); return () => clearTimeout(t); }
  }, [confirmDelete]);

  const handleDeleteClick = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    if (onDelete) {
      const err = await onDelete();
      if (err) { setError(err); setConfirmDelete(false); }
    }
  };

  return (
    <Modal onClose={onClose}>
      <h3 className="text-[15px] font-bold text-[#0f172a] mb-4">
        {category ? 'Edit Category' : 'Add Category'}
      </h3>
      {error && (
        <div className="bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] rounded-lg p-3 text-[13px] mb-3 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 text-[#991b1b] bg-transparent border-none cursor-pointer font-bold text-[14px] leading-none">×</button>
        </div>
      )}
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-[11px] font-medium text-[#64748b] mb-1">Type</label>
          <div className="flex gap-2">
            {['income', 'expense'].map((t) => (
              <button key={t} onClick={() => setCatType(t)}
                className={`flex-1 py-2 text-[12px] font-semibold rounded-lg border-none cursor-pointer capitalize ${
                  catType === t ? 'bg-[#0f172a] text-white' : 'bg-[#f1f5f9] text-[#64748b]'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[#64748b] mb-1">Group Name</label>
          <input value={groupName} onChange={(e) => setGroupName(e.target.value)} list="group-list"
            className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] bg-[#f8fafc] outline-none" />
          <datalist id="group-list">
            {existingGroups.map((g) => <option key={g} value={g} />)}
          </datalist>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[#64748b] mb-1">Sub-Category Name</label>
          <input value={subName} onChange={(e) => setSubName(e.target.value)}
            className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] bg-[#f8fafc] outline-none" />
        </div>
        {catType === 'expense' && (
          <label className="flex items-center gap-2 text-[13px] text-[#475569]">
            <input type="checkbox" checked={isDeductible} onChange={(e) => setIsDeductible(e.target.checked)} />
            Tax deductible
          </label>
        )}
      </div>
      <div className="flex gap-2 mt-5 justify-end">
        {category && onDelete && (
          <div className="mr-auto flex items-center gap-2">
            <button onClick={handleDeleteClick}
              className={`px-4 py-2 text-[12px] font-semibold rounded-lg border-none cursor-pointer ${
                confirmDelete ? 'bg-[#ef4444] text-white' : 'bg-[#fef2f2] text-[#ef4444]'
              }`}>
              {confirmDelete ? 'Confirm Delete?' : 'Delete'}
            </button>
            {confirmDelete && (
              <button onClick={() => setConfirmDelete(false)}
                className="text-[12px] text-[#64748b] bg-transparent border-none cursor-pointer underline">Cancel</button>
            )}
          </div>
        )}
        <button onClick={onClose}
          className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[#f1f5f9] text-[#64748b] border-none cursor-pointer">
          Cancel
        </button>
        <button onClick={() => onSave({ groupName, subName, type: catType, isDeductible })}
          className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[#0f172a] text-white border-none cursor-pointer">
          Save
        </button>
      </div>
    </Modal>
  );
}

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [owners, setOwners] = useState<string[]>([]);
  const [editingAccount, setEditingAccount] = useState<Account | null | 'new'>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null | 'new'>(null);

  const loadData = useCallback(async () => {
    const [acctRes, catRes, userRes] = await Promise.all([
      apiFetch<{ data: Account[] }>('/accounts'),
      apiFetch<{ data: Category[] }>('/categories'),
      apiFetch<{ data: { display_name: string }[] }>('/users'),
    ]);
    setAccounts(acctRes.data);
    setCategories(catRes.data);
    setOwners(userRes.data.map((u) => u.display_name));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Group categories
  const grouped: GroupedCategory[] = [];
  const groupMap = new Map<string, GroupedCategory>();
  for (const cat of categories) {
    const key = `${cat.type}:${cat.group_name}`;
    if (!groupMap.has(key)) {
      const g = { group: cat.group_name, type: cat.type, subs: [] as Category[] };
      groupMap.set(key, g);
      grouped.push(g);
    }
    groupMap.get(key)!.subs.push(cat);
  }

  const expenseGroups = grouped.filter((g) => g.type === 'expense');
  const incomeGroups = grouped.filter((g) => g.type === 'income');
  const allGroups = [...incomeGroups, ...expenseGroups];
  const existingGroupNames = [...new Set(categories.filter((c) => c.type === 'expense').map((c) => c.group_name))];
  existingGroupNames.push('Income');

  const handleSaveAccount = async (data: Record<string, unknown>) => {
    if (editingAccount === 'new') {
      await apiFetch('/accounts', { method: 'POST', body: JSON.stringify(data) });
    } else if (editingAccount) {
      await apiFetch(`/accounts/${editingAccount.id}`, { method: 'PUT', body: JSON.stringify(data) });
    }
    setEditingAccount(null);
    loadData();
  };

  const handleDeleteAccount = async (): Promise<string | null> => {
    if (editingAccount && editingAccount !== 'new') {
      try {
        await apiFetch(`/accounts/${editingAccount.id}`, { method: 'DELETE' });
        setEditingAccount(null);
        loadData();
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : 'Delete failed';
      }
    }
    return null;
  };

  const handleSaveCategory = async (data: Record<string, unknown>) => {
    if (editingCategory === 'new') {
      await apiFetch('/categories', { method: 'POST', body: JSON.stringify(data) });
    } else if (editingCategory) {
      await apiFetch(`/categories/${editingCategory.id}`, { method: 'PUT', body: JSON.stringify(data) });
    }
    setEditingCategory(null);
    loadData();
  };

  const handleDeleteCategory = async (): Promise<string | null> => {
    if (editingCategory && editingCategory !== 'new') {
      try {
        await apiFetch(`/categories/${editingCategory.id}`, { method: 'DELETE' });
        setEditingCategory(null);
        loadData();
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : 'Delete failed';
      }
    }
    return null;
  };

  return (
    <div>
      <h1 className="text-[22px] font-bold text-[#0f172a] mb-6">Settings</h1>

      <div className="grid grid-cols-2 gap-5">
        {/* Accounts */}
        <div className="bg-white rounded-xl border border-[#e8ecf1] px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <h3 className="text-[14px] font-bold text-[#0f172a] mb-1">Accounts</h3>
          <p className="text-[13px] text-[#64748b] mb-3">Each account has an owner and classification for filtering and net worth.</p>
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-left">Account</th>
                <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-left">Owner</th>
                <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-left">Type</th>
                <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-left">Class</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}
                  onClick={() => setEditingAccount(a)}
                  className="border-b border-[#f1f5f9] cursor-pointer hover:bg-[#f8fafc]">
                  <td className="px-2.5 py-2 text-[13px] text-[#475569] font-medium">
                    {a.name} {a.last_four && <span className="text-[#94a3b8] text-[11px]">({a.last_four})</span>}
                  </td>
                  <td className="px-2.5 py-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-md ${
                      a.owner === 'Robert' ? 'bg-[#dbeafe] text-[#2563eb]' : 'bg-[#fce7f3] text-[#db2777]'
                    }`}>{a.owner}</span>
                  </td>
                  <td className="px-2.5 py-2 text-[12px] text-[#64748b] capitalize">{a.type}</td>
                  <td className="px-2.5 py-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-md capitalize ${
                      a.classification === 'liquid' ? 'bg-[#d1fae5] text-[#059669]' :
                      a.classification === 'investment' ? 'bg-[#ede9fe] text-[#7c3aed]' :
                      'bg-[#fef2f2] text-[#dc2626]'
                    }`}>{a.classification}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setEditingAccount('new')}
            className="w-full mt-3 py-2 bg-[#f1f5f9] text-[#334155] rounded-lg text-[13px] font-semibold border-none cursor-pointer flex items-center justify-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Account
          </button>
        </div>

        {/* Categories */}
        <div className="bg-white rounded-xl border border-[#e8ecf1] px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <h3 className="text-[14px] font-bold text-[#0f172a] mb-1">Categories</h3>
          <p className="text-[13px] text-[#64748b] mb-3">Parent categories group sub-categories for budgets and reports.</p>
          <div className="max-h-[400px] overflow-y-auto">
            {allGroups.map((g) => {
              const color = CATEGORY_COLORS[g.group] || '#94a3b8';
              return (
                <div key={`${g.type}:${g.group}`} className="mb-2">
                  <div className="flex justify-between items-center py-1.5" style={{ borderBottom: `2px solid ${color}30` }}>
                    <span className="font-bold text-[12px] text-[#334155] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-sm" style={{ background: color }} />{g.group}
                    </span>
                    <span className="text-[11px] text-[#94a3b8]">{g.subs.length} subs</span>
                  </div>
                  {g.subs.map((s) => (
                    <div key={s.id} onClick={() => setEditingCategory(s)}
                      className="flex justify-between py-1 pl-[18px] text-[12px] text-[#64748b] cursor-pointer hover:text-[#334155]">
                      <span>{s.sub_name}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <button onClick={() => setEditingCategory('new')}
            className="w-full mt-3 py-2 bg-[#f1f5f9] text-[#334155] rounded-lg text-[13px] font-semibold border-none cursor-pointer flex items-center justify-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Category
          </button>
        </div>
      </div>

      {/* Modals */}
      {editingAccount !== null && (
        <AccountForm
          account={editingAccount === 'new' ? undefined : editingAccount}
          owners={owners}
          onSave={handleSaveAccount}
          onDelete={editingAccount !== 'new' ? handleDeleteAccount : undefined}
          onClose={() => setEditingAccount(null)}
        />
      )}
      {editingCategory !== null && (
        <CategoryForm
          category={editingCategory === 'new' ? undefined : editingCategory}
          existingGroups={existingGroupNames}
          onSave={handleSaveCategory}
          onDelete={editingCategory !== 'new' ? handleDeleteCategory : undefined}
          onClose={() => setEditingCategory(null)}
        />
      )}
    </div>
  );
}
