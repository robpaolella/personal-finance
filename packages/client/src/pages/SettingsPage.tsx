import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../lib/api';
import { fmt } from '../lib/formatters';
import { useToast } from '../context/ToastContext';
import ConfirmDeleteButton from '../components/ConfirmDeleteButton';
import BankSyncSection from '../components/BankSyncSection';
import InlineNotification from '../components/InlineNotification';
import { OwnerBadge, SharedBadge, ClassificationBadge, initOwnerSlots, type AccountClassification } from '../components/badges';
import { getCategoryColor } from '../lib/categoryColors';
import ScrollableList from '../components/ScrollableList';

const ACCOUNT_TYPES = ['checking', 'savings', 'credit', 'investment', 'retirement', 'venmo', 'cash'];
const CLASSIFICATIONS = ['liquid', 'investment', 'liability'];

function classificationForType(type: string): string {
  if (['checking', 'savings', 'venmo', 'cash'].includes(type)) return 'liquid';
  if (['investment', 'retirement'].includes(type)) return 'investment';
  if (type === 'credit') return 'liability';
  return 'liquid';
}

interface AccountOwner {
  id: number;
  displayName: string;
}

interface Account {
  id: number;
  name: string;
  last_four: string | null;
  type: string;
  classification: string;
  owner: string;
  owners: AccountOwner[];
  isShared: boolean;
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
      <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// --- Account Form ---
function AccountForm({
  account,
  users,
  onSave,
  onDelete,
  onClose,
}: {
  account?: Account;
  users: { id: number; displayName: string }[];
  onSave: (data: Record<string, unknown>) => void;
  onDelete?: () => Promise<string | null>;
  onClose: () => void;
}) {
  const [name, setName] = useState(account?.name ?? '');
  const [lastFour, setLastFour] = useState(account?.last_four ?? '');
  const [type, setType] = useState(account?.type ?? 'checking');
  const [classification, setClassification] = useState(account?.classification ?? 'liquid');
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<Set<number>>(() => {
    if (account?.owners?.length) return new Set(account.owners.map((o) => o.id));
    return new Set();
  });
  const [error, setError] = useState<string | null>(null);
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false);
  const ownerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t); }
  }, [error]);

  useEffect(() => {
    if (!ownerDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ownerDropdownRef.current && !ownerDropdownRef.current.contains(e.target as Node)) {
        setOwnerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ownerDropdownOpen]);

  const toggleOwner = (id: number) => {
    setSelectedOwnerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteConfirm = async () => {
    if (onDelete) {
      const err = await onDelete();
      if (err) { setError(err); }
    }
  };

  return (
    <Modal onClose={onClose}>
      <h3 className="text-[15px] font-bold text-[var(--text-primary)] mb-4">
        {account ? 'Edit Account' : 'Add Account'}
      </h3>
      {error && (
        <InlineNotification type="error" message={error} dismissible onDismiss={() => setError(null)} className="mb-3" />
      )}
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Account Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-body)]" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Last Four (optional)</label>
          <input value={lastFour} onChange={(e) => setLastFour(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-body)]" maxLength={5} />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Type</label>
          <select value={type} onChange={(e) => { setType(e.target.value); setClassification(classificationForType(e.target.value)); }}
            className="w-full px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none capitalize text-[var(--text-body)]">
            {ACCOUNT_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Classification</label>
          <select value={classification} onChange={(e) => setClassification(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none capitalize text-[var(--text-body)]">
            {CLASSIFICATIONS.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
            Owner{selectedOwnerIds.size > 1 ? 's' : ''}
          </label>
          <div className="relative" ref={ownerDropdownRef}>
            <button type="button" onClick={() => setOwnerDropdownOpen((v) => !v)}
              className="w-full px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none text-left flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-1.5">
                {selectedOwnerIds.size === 0 ? (
                  <span className="text-[var(--text-muted)]">Select owners...</span>
                ) : (
                  users.filter((u) => selectedOwnerIds.has(u.id)).map((u) => (
                    <OwnerBadge key={u.id} user={u} />
                  ))
                )}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`text-[var(--text-muted)] transition-transform duration-150 ${ownerDropdownOpen ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {ownerDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--bg-card-border)] rounded-lg overflow-hidden" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto' }}>
                {users.map((u, i) => {
                  const checked = selectedOwnerIds.has(u.id);
                  return (
                    <button key={u.id} type="button" onClick={() => toggleOwner(u.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-[13px] text-left cursor-pointer border-none transition-colors duration-150 ${
                        checked ? 'bg-[var(--badge-category-bg)]' : 'bg-transparent hover:bg-[var(--bg-hover)]'
                      } ${i < users.length - 1 ? 'border-b border-[var(--bg-card-border)]' : ''}`}
                      style={i < users.length - 1 ? { borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'var(--bg-card-border)' } : undefined}>
                      <OwnerBadge user={u} />
                      <span className={`flex items-center justify-center rounded-full transition-all duration-150 ${
                        checked ? 'bg-[#3b82f6] border-2 border-[#3b82f6]' : 'bg-transparent border-2 border-[var(--text-very-muted)]'
                      }`} style={{ width: 18, height: 18 }}>
                        {checked && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-5 justify-end">
        {account && onDelete && (
          <div className="mr-auto">
            <ConfirmDeleteButton onConfirm={handleDeleteConfirm} />
          </div>
        )}
        <button onClick={onClose}
          className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[var(--btn-secondary-bg)] text-[var(--text-secondary)] border-none cursor-pointer">
          Cancel
        </button>
        <button onClick={() => {
          if (selectedOwnerIds.size === 0) { setError('At least one owner is required'); return; }
          onSave({ name, lastFour: lastFour || null, type, classification, ownerIds: Array.from(selectedOwnerIds) });
        }}
          className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-none cursor-pointer">
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

  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t); }
  }, [error]);

  const handleDeleteConfirm = async () => {
    if (onDelete) {
      const err = await onDelete();
      if (err) { setError(err); }
    }
  };

  return (
    <Modal onClose={onClose}>
      <h3 className="text-[15px] font-bold text-[var(--text-primary)] mb-4">
        {category ? 'Edit Category' : 'Add Category'}
      </h3>
      {error && (
        <InlineNotification type="error" message={error} dismissible onDismiss={() => setError(null)} className="mb-3" />
      )}
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Type</label>
          <div className="flex gap-2">
            {['income', 'expense'].map((t) => (
              <button key={t} onClick={() => setCatType(t)}
                className={`flex-1 py-2 text-[12px] font-semibold rounded-lg border-none cursor-pointer capitalize ${
                  catType === t ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]' : 'bg-[var(--btn-secondary-bg)] text-[var(--text-secondary)]'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Group Name</label>
          <input value={groupName} onChange={(e) => setGroupName(e.target.value)} list="group-list"
            className="w-full px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-body)]" />
          <datalist id="group-list">
            {existingGroups.map((g) => <option key={g} value={g} />)}
          </datalist>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Sub-Category Name</label>
          <input value={subName} onChange={(e) => setSubName(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-body)]" />
        </div>
        {catType === 'expense' && (
          <label className="flex items-center gap-2 text-[13px] text-[var(--text-body)]">
            <input type="checkbox" checked={isDeductible} onChange={(e) => setIsDeductible(e.target.checked)} />
            Tax deductible
          </label>
        )}
      </div>
      <div className="flex gap-2 mt-5 justify-end">
        {category && onDelete && (
          <div className="mr-auto">
            <ConfirmDeleteButton onConfirm={handleDeleteConfirm} />
          </div>
        )}
        <button onClick={onClose}
          className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[var(--btn-secondary-bg)] text-[var(--text-secondary)] border-none cursor-pointer">
          Cancel
        </button>
        <button onClick={() => onSave({ groupName, subName, type: catType, isDeductible })}
          className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-none cursor-pointer">
          Save
        </button>
      </div>
    </Modal>
  );
}

export default function SettingsPage() {
  const { addToast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userList, setUserList] = useState<{ id: number; displayName: string }[]>([]);
  const [editingAccount, setEditingAccount] = useState<Account | null | 'new'>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null | 'new'>(null);

  const loadData = useCallback(async () => {
    const [acctRes, catRes, userRes] = await Promise.all([
      apiFetch<{ data: Account[] }>('/accounts'),
      apiFetch<{ data: Category[] }>('/categories'),
      apiFetch<{ data: { id: number; display_name: string }[] }>('/users'),
    ]);
    setAccounts(acctRes.data);
    setCategories(catRes.data);
    setUserList(userRes.data.map((u) => ({ id: u.id, displayName: u.display_name })));
    initOwnerSlots(userRes.data.map((u) => u.id));
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
    try {
      if (editingAccount === 'new') {
        await apiFetch('/accounts', { method: 'POST', body: JSON.stringify(data) });
      } else if (editingAccount) {
        await apiFetch(`/accounts/${editingAccount.id}`, { method: 'PUT', body: JSON.stringify(data) });
      }
      setEditingAccount(null);
      addToast('Account saved');
      loadData();
    } catch {
      addToast('Failed to save account', 'error');
    }
  };

  const handleDeleteAccount = async (): Promise<string | null> => {
    if (editingAccount && editingAccount !== 'new') {
      try {
        await apiFetch(`/accounts/${editingAccount.id}`, { method: 'DELETE' });
        setEditingAccount(null);
        addToast('Account deleted');
        loadData();
        return null;
      } catch (err) {
        addToast('Failed to delete account', 'error');
        return err instanceof Error ? err.message : 'Delete failed';
      }
    }
    return null;
  };

  const handleSaveCategory = async (data: Record<string, unknown>) => {
    try {
      if (editingCategory === 'new') {
        await apiFetch('/categories', { method: 'POST', body: JSON.stringify(data) });
      } else if (editingCategory) {
        await apiFetch(`/categories/${editingCategory.id}`, { method: 'PUT', body: JSON.stringify(data) });
      }
      setEditingCategory(null);
      addToast('Category saved');
      loadData();
    } catch {
      addToast('Failed to save category', 'error');
    }
  };

  const handleDeleteCategory = async (): Promise<string | null> => {
    if (editingCategory && editingCategory !== 'new') {
      try {
        await apiFetch(`/categories/${editingCategory.id}`, { method: 'DELETE' });
        setEditingCategory(null);
        addToast('Category deleted');
        loadData();
        return null;
      } catch (err) {
        addToast('Failed to delete category', 'error');
        return err instanceof Error ? err.message : 'Delete failed';
      }
    }
    return null;
  };

  return (
    <div>
      <h1 className="text-[22px] font-bold text-[var(--text-primary)] mb-6">Settings</h1>

      {/* Bank Sync Section */}
      <BankSyncSection accounts={accounts} users={userList} onAccountCreated={loadData} />

      <div className="grid grid-cols-2 gap-5 items-start">
        {/* Accounts */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] px-5 py-4 shadow-[var(--bg-card-shadow)] h-[598px] flex flex-col">
          <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-1">Accounts</h3>
          <p className="text-[13px] text-[var(--text-secondary)] mb-3">Each account has an owner and classification for filtering and net worth.</p>
          <div className="flex-1 min-h-0">
            <ScrollableList maxHeight="100%">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] text-left">Account</th>
                    <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] text-left">Owner</th>
                    <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] text-left">Type</th>
                    <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] text-left">Class</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.id}
                      onClick={() => setEditingAccount(a)}
                      className="border-b border-[var(--table-row-border)] cursor-pointer hover:bg-[var(--bg-hover)]">
                      <td className="px-2.5 py-2 text-[13px] text-[var(--text-body)] font-medium">
                        {a.name} {a.last_four && <span className="text-[var(--text-muted)] text-[11px]">({a.last_four})</span>}
                      </td>
                      <td className="px-2.5 py-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          {(a.owners || []).map((o) => (
                            <OwnerBadge key={o.id} user={o} />
                          ))}
                          {a.isShared && (
                            <SharedBadge />
                          )}
                        </div>
                      </td>
                      <td className="px-2.5 py-2 text-[12px] text-[var(--text-secondary)] capitalize">{a.type}</td>
                      <td className="px-2.5 py-2">
                        <ClassificationBadge classification={a.classification as AccountClassification} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableList>
          </div>
          <button onClick={() => setEditingAccount('new')}
            className="w-full mt-3 py-2 bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] rounded-lg text-[13px] font-semibold border-none cursor-pointer flex items-center justify-center gap-1.5 flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Account
          </button>
        </div>

        {/* Categories */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] px-5 py-4 shadow-[var(--bg-card-shadow)] h-[598px] flex flex-col">
          <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-1">Categories</h3>
          <p className="text-[13px] text-[var(--text-secondary)] mb-3">Parent categories group sub-categories for budgets and reports.</p>
          <div className="flex-1 min-h-0">
            <ScrollableList maxHeight="100%">
              {allGroups.map((g) => {
              const allGroupNames = allGroups.map((x) => x.group);
              const color = getCategoryColor(g.group, allGroupNames);
              return (
                <div key={`${g.type}:${g.group}`} className="mb-2">
                  <div className="flex justify-between items-center py-1.5" style={{ borderBottom: `2px solid ${color}30` }}>
                    <span className="font-bold text-[12px] text-[var(--btn-secondary-text)] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-sm" style={{ background: color }} />{g.group}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">{g.subs.length} subs</span>
                  </div>
                  {g.subs.map((s) => (
                    <div key={s.id} onClick={() => setEditingCategory(s)}
                      className="flex justify-between py-1 pl-[18px] text-[12px] text-[var(--text-secondary)] cursor-pointer hover:text-[var(--btn-secondary-text)]">
                      <span>{s.sub_name}</span>
                    </div>
                  ))}
                </div>
              );
            })}
            </ScrollableList>
          </div>
          <button onClick={() => setEditingCategory('new')}
            className="w-full mt-3 py-2 bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] rounded-lg text-[13px] font-semibold border-none cursor-pointer flex items-center justify-center gap-1.5 flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Category
          </button>
        </div>
      </div>

      {/* Modals */}
      {editingAccount !== null && (
        <AccountForm
          account={editingAccount === 'new' ? undefined : editingAccount}
          users={userList}
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
