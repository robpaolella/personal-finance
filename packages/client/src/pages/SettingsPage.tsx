import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { fmt } from '../lib/formatters';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import ConfirmDeleteButton from '../components/ConfirmDeleteButton';
import BankSyncSection from '../components/BankSyncSection';
import InlineNotification from '../components/InlineNotification';
import { OwnerBadge, SharedBadge, ClassificationBadge, initOwnerSlots, type AccountClassification } from '../components/badges';
import { getCategoryColor } from '../lib/categoryColors';
import ScrollableList from '../components/ScrollableList';
import PermissionGate from '../components/PermissionGate';

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
          className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[var(--btn-secondary-bg)] text-[var(--text-secondary)] border-none cursor-pointer btn-secondary">
          Cancel
        </button>
        <button onClick={() => {
          if (selectedOwnerIds.size === 0) { setError('At least one owner is required'); return; }
          onSave({ name, lastFour: lastFour || null, type, classification, ownerIds: Array.from(selectedOwnerIds) });
        }}
          className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-none cursor-pointer btn-primary">
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
                  catType === t ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] btn-primary' : 'bg-[var(--btn-secondary-bg)] text-[var(--text-secondary)] btn-secondary'
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
          className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[var(--btn-secondary-bg)] text-[var(--text-secondary)] border-none cursor-pointer btn-secondary">
          Cancel
        </button>
        <button onClick={() => onSave({ groupName, subName, type: catType, isDeductible })}
          className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-none cursor-pointer btn-primary">
          Save
        </button>
      </div>
    </Modal>
  );
}

// --- Permission toggle labels mapped to permission keys ---
const PERMISSION_GROUPS = [
  {
    label: 'TRANSACTIONS',
    permissions: [
      { key: 'transactions.create', label: 'Create' },
      { key: 'transactions.edit', label: 'Edit' },
      { key: 'transactions.delete', label: 'Delete' },
      { key: 'transactions.bulk_edit', label: 'Bulk Edit' },
    ],
  },
  {
    label: 'SETTINGS',
    permissions: [
      { key: 'accounts.create', label: 'Manage Accounts' },
      { key: 'categories.create', label: 'Manage Categories' },
      { key: 'simplefin.manage', label: 'Manage Connections' },
    ],
  },
  {
    label: 'FINANCE',
    permissions: [
      { key: 'budgets.edit', label: 'Edit Budgets' },
      { key: 'balances.update', label: 'Update Balances' },
      { key: 'assets.create', label: 'Manage Assets' },
      { key: 'import.csv', label: 'CSV Import' },
      { key: 'import.bank_sync', label: 'Bank Sync Import' },
    ],
  },
];

// Map compound permissions: toggling "Manage Accounts" sets create/edit/delete together
const COMPOUND_PERMISSIONS: Record<string, string[]> = {
  'accounts.create': ['accounts.create', 'accounts.edit', 'accounts.delete'],
  'categories.create': ['categories.create', 'categories.edit', 'categories.delete'],
  'assets.create': ['assets.create', 'assets.edit', 'assets.delete'],
};

interface ManagedUser {
  id: number;
  username: string;
  displayName: string;
  role: 'admin' | 'member';
  isActive: boolean;
  createdAt: string;
  permissions: Record<string, boolean> | null;
}

// --- Preferences Tab ---
function PreferencesTab() {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');

  const handleSaveProfile = async () => {
    setProfileLoading(true);
    try {
      await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ displayName }),
      });
      await refreshUser();
      addToast('Profile updated');
    } catch {
      addToast('Failed to update profile', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError('');
    if (newPassword.length < 8) { setPwError('New password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return; }

    setPwLoading(true);
    try {
      await apiFetch('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      addToast('Password changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] px-5 py-4 shadow-[var(--bg-card-shadow)]">
      <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-1">My Preferences</h3>
      <p className="text-[13px] text-[var(--text-secondary)] mb-4">Manage your profile and display settings.</p>

      {/* Profile section */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">Display Name</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-body)]" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">Username</label>
          <input value={user?.username ?? ''} disabled
            className="w-full px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-muted)]" />
        </div>
      </div>

      {/* Password section */}
      <div className="mb-5">
        <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">Change Password</label>
        {pwError && <InlineNotification type="error" message={pwError} dismissible onDismiss={() => setPwError('')} className="mb-2" />}
        <div className="grid grid-cols-3 gap-3">
          <input type="password" placeholder="Current password" value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-body)]" />
          <input type="password" placeholder="New password" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-body)]" />
          <input type="password" placeholder="Confirm new" value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-body)]" />
        </div>
      </div>

      {/* Role + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[var(--text-secondary)]">Role:</span>
          {user?.role === 'admin' ? (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--badge-positive-bg)] text-[var(--badge-positive-text)] font-medium">Admin</span>
          ) : (
            <>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--badge-category-bg)] text-[var(--badge-category-text)] font-medium">Member</span>
              <span className="text-[11px] text-[var(--text-muted)]">Permissions managed by admin</span>
            </>
          )}
        </div>
        <div className="flex gap-2">
          {currentPassword && (
            <button onClick={handleChangePassword} disabled={pwLoading}
              className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] border-none cursor-pointer btn-secondary disabled:opacity-60">
              Change Password
            </button>
          )}
          <button onClick={handleSaveProfile} disabled={profileLoading}
            className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-none cursor-pointer btn-primary disabled:opacity-60">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Add User Modal ---
function AddUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { addToast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!displayName.trim()) { setError('Display name is required'); return; }
    if (!/^[a-z0-9]{3,20}$/.test(username)) { setError('Username must be 3-20 lowercase alphanumeric characters'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({ username, password, displayName, role }),
      });
      addToast('User created');
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h3 className="text-[15px] font-bold text-[var(--text-primary)] mb-4">Add User</h3>
      {error && <InlineNotification type="error" message={error} dismissible onDismiss={() => setError('')} className="mb-3" />}
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Display Name</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-body)]" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className="w-full px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-body)]" />
          <p className="text-[10px] text-[var(--text-muted)] mt-1">Lowercase letters and numbers only</p>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-body)]" />
          <p className="text-[10px] text-[var(--text-muted)] mt-1">Minimum 8 characters</p>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Confirm Password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-body)]" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Role</label>
          <div className="flex gap-2">
            {(['member', 'admin'] as const).map((r) => (
              <button key={r} onClick={() => setRole(r)}
                className={`flex-1 py-2 text-[12px] font-semibold rounded-lg border-none cursor-pointer capitalize ${
                  role === r ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] btn-primary' : 'bg-[var(--btn-secondary-bg)] text-[var(--text-secondary)] btn-secondary'
                }`}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-5 justify-end">
        <button onClick={onClose}
          className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[var(--btn-secondary-bg)] text-[var(--text-secondary)] border-none cursor-pointer btn-secondary">
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={loading}
          className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-none cursor-pointer btn-primary disabled:opacity-60">
          Create User
        </button>
      </div>
    </Modal>
  );
}

// --- Edit User Modal ---
function EditUserModal({ managedUser, currentUserId, adminCount, onClose, onUpdated }: {
  managedUser: ManagedUser;
  currentUserId: number;
  adminCount: number;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { addToast } = useToast();
  const [displayName, setDisplayName] = useState(managedUser.displayName);
  const [role, setRole] = useState<'admin' | 'member'>(managedUser.role);
  const [isActive, setIsActive] = useState(managedUser.isActive);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isLastAdmin = managedUser.role === 'admin' && adminCount <= 1;
  const isSelf = managedUser.id === currentUserId;

  const handleSave = async () => {
    setError('');
    setLoading(true);
    try {
      // Update profile
      await apiFetch(`/users/${managedUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ displayName, role, isActive }),
      });

      // Reset password if provided
      if (newPassword) {
        if (newPassword.length < 8) { setError('Password must be at least 8 characters'); setLoading(false); return; }
        if (newPassword !== confirmPassword) { setError('Passwords do not match'); setLoading(false); return; }
        await apiFetch(`/users/${managedUser.id}/password`, {
          method: 'PUT',
          body: JSON.stringify({ password: newPassword }),
        });
      }

      addToast('User updated');
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      await apiFetch(`/users/${managedUser.id}`, { method: 'DELETE' });
      addToast('User deactivated');
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate user');
    }
  };

  return (
    <Modal onClose={onClose}>
      <h3 className="text-[15px] font-bold text-[var(--text-primary)] mb-4">Edit User</h3>
      {error && <InlineNotification type="error" message={error} dismissible onDismiss={() => setError('')} className="mb-3" />}
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Display Name</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-body)]" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Role</label>
          <div className="flex gap-2">
            {(['member', 'admin'] as const).map((r) => (
              <button key={r} onClick={() => !isLastAdmin || r === 'admin' ? setRole(r) : null}
                disabled={isLastAdmin && r === 'member'}
                className={`flex-1 py-2 text-[12px] font-semibold rounded-lg border-none cursor-pointer capitalize ${
                  role === r ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] btn-primary' : 'bg-[var(--btn-secondary-bg)] text-[var(--text-secondary)] btn-secondary'
                } disabled:opacity-40 disabled:cursor-not-allowed`}>
                {r}
              </button>
            ))}
          </div>
          {isLastAdmin && <p className="text-[10px] text-[var(--text-muted)] mt-1">Cannot remove the last admin</p>}
          {role === 'admin' && managedUser.role === 'member' && (
            <p className="text-[10px] text-[var(--color-negative)] mt-1">This will grant full access to all features.</p>
          )}
          {role === 'member' && managedUser.role === 'admin' && (
            <p className="text-[10px] text-[var(--color-negative)] mt-1">This will restrict the user to member permissions.</p>
          )}
        </div>
        {!isSelf && (
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-medium text-[var(--text-secondary)]">Active</label>
            <button onClick={() => !(isLastAdmin && isActive) ? setIsActive(!isActive) : null}
              disabled={isLastAdmin && isActive}
              className="relative w-9 h-5 rounded-full border-none cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: isActive ? 'var(--color-positive)' : 'var(--bg-hover)' }}>
              <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: isActive ? 17 : 2 }} />
            </button>
            {!isActive && <span className="text-[10px] text-[var(--color-negative)]">This user will not be able to log in.</span>}
          </div>
        )}
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Reset Password (optional)</label>
          <div className="grid grid-cols-2 gap-2">
            <input type="password" placeholder="New password" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-body)]" />
            <input type="password" placeholder="Confirm" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-body)]" />
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-5 justify-end">
        {!isSelf && managedUser.isActive && (
          <div className="mr-auto">
            <ConfirmDeleteButton onConfirm={handleDeactivate} label="Deactivate" confirmLabel="Confirm Deactivate?" />
          </div>
        )}
        <button onClick={onClose}
          className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[var(--btn-secondary-bg)] text-[var(--text-secondary)] border-none cursor-pointer btn-secondary">
          Cancel
        </button>
        <button onClick={handleSave} disabled={loading}
          className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-none cursor-pointer btn-primary disabled:opacity-60">
          Save Changes
        </button>
      </div>
    </Modal>
  );
}

// --- Users & Permissions Section ---
function UsersPermissionsSection() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      const res = await apiFetch<{ users: ManagedUser[] }>('/users');
      setManagedUsers(res.users);
    } catch {
      addToast('Failed to load users', 'error');
    }
  }, [addToast]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const adminCount = managedUsers.filter(u => u.role === 'admin' && u.isActive).length;

  const handleTogglePermission = async (userId: number, permKey: string, currentValue: boolean) => {
    const compound = COMPOUND_PERMISSIONS[permKey];
    const keysToUpdate = compound || [permKey];
    const newValue = !currentValue;

    // Optimistic update
    setManagedUsers(prev => prev.map(u => {
      if (u.id !== userId || !u.permissions) return u;
      const perms = { ...u.permissions };
      for (const k of keysToUpdate) perms[k] = newValue;
      return { ...u, permissions: perms };
    }));

    try {
      const permissions: Record<string, boolean> = {};
      for (const k of keysToUpdate) permissions[k] = newValue;
      await apiFetch(`/users/${userId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissions }),
      });
    } catch {
      addToast('Failed to update permission', 'error');
      loadUsers(); // Revert on error
    }
  };

  const OWNER_COLORS = [
    { bg: 'var(--badge-owner-1-bg)', text: 'var(--badge-owner-1-text)' },
    { bg: 'var(--badge-owner-2-bg)', text: 'var(--badge-owner-2-text)' },
    { bg: '#ddd6fe', text: '#7c3aed' },
    { bg: '#d1fae5', text: '#059669' },
  ];

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] px-5 py-4 shadow-[var(--bg-card-shadow)]">
      <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-1">Users & Permissions</h3>
      <p className="text-[13px] text-[var(--text-secondary)] mb-4">Manage household members and their access levels.</p>

      <div className="flex flex-col gap-3">
        {managedUsers.map((mu, idx) => (
          <div key={mu.id} className="p-3 bg-[var(--bg-hover)] rounded-lg">
            {/* User header */}
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px]"
                  style={{ background: OWNER_COLORS[idx % OWNER_COLORS.length].bg, color: OWNER_COLORS[idx % OWNER_COLORS.length].text }}>
                  {mu.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-[13px] text-[var(--text-primary)] flex items-center gap-1.5">
                    {mu.displayName}
                    {!mu.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--badge-negative-bg)] text-[var(--badge-negative-text)]">Inactive</span>}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">{mu.username}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {mu.role === 'admin' ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--badge-positive-bg)] text-[var(--badge-positive-text)] font-medium">Admin</span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--badge-category-bg)] text-[var(--badge-category-text)] font-medium">Member</span>
                )}
                {mu.role === 'member' && (
                  <button onClick={() => setEditingUser(mu)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer text-[13px]">
                    ✎
                  </button>
                )}
              </div>
            </div>

            {/* Admin info or member permissions */}
            {mu.role === 'admin' ? (
              <div className="text-[11px] text-[var(--text-muted)] italic py-1">Admins have all permissions. Cannot be restricted.</div>
            ) : mu.permissions && (
              <div className="grid grid-cols-3 gap-4 mt-2">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.label}>
                    <div className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] mb-1.5">{group.label}</div>
                    {group.permissions.map((p) => {
                      const granted = mu.permissions![p.key] ?? false;
                      return (
                        <div key={p.key} className="flex justify-between items-center py-1.5 border-b border-[var(--bg-card-border)]" style={{ borderBottomWidth: '1px' }}>
                          <span className="text-[12px] text-[var(--text-secondary)]">{p.label}</span>
                          <button onClick={() => handleTogglePermission(mu.id, p.key, granted)}
                            className="relative w-9 h-5 rounded-full border-none cursor-pointer transition-colors"
                            style={{ background: granted ? 'var(--color-positive)' : 'var(--bg-card-border)' }}>
                            <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: granted ? 17 : 2 }} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <button onClick={() => setShowAddModal(true)}
          className="w-full py-2.5 bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] rounded-lg text-[13px] font-semibold border-none cursor-pointer flex items-center justify-center gap-1.5 btn-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add User
        </button>
      </div>

      {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} onCreated={loadUsers} />}
      {editingUser && (
        <EditUserModal
          managedUser={editingUser}
          currentUserId={user!.id}
          adminCount={adminCount}
          onClose={() => setEditingUser(null)}
          onUpdated={loadUsers}
        />
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { addToast } = useToast();
  const { isAdmin, hasPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'settings';
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userList, setUserList] = useState<{ id: number; displayName: string }[]>([]);
  const [editingAccount, setEditingAccount] = useState<Account | null | 'new'>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null | 'new'>(null);

  const switchTab = (tab: string) => {
    setSearchParams({ tab });
  };

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
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <h1 className="text-[22px] font-bold text-[var(--text-primary)]">Settings</h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-[var(--bg-hover)] rounded-lg p-0.5 mb-5 w-fit flex-shrink-0">
        {[{ id: 'settings', label: 'Settings' }, { id: 'preferences', label: 'Preferences' }].map((tab) => (
          <button key={tab.id} onClick={() => switchTab(tab.id)}
            className={`px-5 py-[7px] text-[13px] border-none cursor-pointer rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold shadow-sm'
                : 'bg-transparent text-[var(--text-secondary)] font-normal'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'preferences' ? (
        <PreferencesTab />
      ) : (
        <>
          {/* Bank Sync Section */}
          <div className="flex-shrink-0">
            <BankSyncSection accounts={accounts} users={userList} onAccountCreated={loadData} />
          </div>

          <div className="grid grid-cols-2 gap-5 flex-1 min-h-[300px]">
            {/* Accounts */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] px-5 py-4 shadow-[var(--bg-card-shadow)] flex flex-col min-h-[420px]">
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
                          onClick={() => hasPermission('accounts.edit') ? setEditingAccount(a) : null}
                          className={`border-b border-[var(--table-row-border)] transition-colors ${hasPermission('accounts.edit') ? 'cursor-pointer hover:bg-[var(--bg-hover)]' : ''}`}>
                          <td className="px-2.5 py-2 text-[13px] text-[var(--text-body)] font-medium">
                            {a.name} {a.last_four && <span className="text-[var(--text-muted)] text-[11px]">({a.last_four})</span>}
                          </td>
                          <td className="px-2.5 py-2">
                            <div className="flex items-center gap-1 flex-wrap">
                              {(a.owners || []).map((o) => (
                                <OwnerBadge key={o.id} user={o} />
                              ))}
                              {a.isShared && <SharedBadge />}
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
              <PermissionGate permission="accounts.create" fallback="disabled">
                <button onClick={() => setEditingAccount('new')}
                  className="w-full mt-3 py-2 bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] rounded-lg text-[13px] font-semibold border-none cursor-pointer flex items-center justify-center gap-1.5 flex-shrink-0 btn-secondary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add Account
                </button>
              </PermissionGate>
            </div>

            {/* Categories */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] px-5 py-4 shadow-[var(--bg-card-shadow)] flex flex-col min-h-[420px]">
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
                        <div key={s.id} onClick={() => hasPermission('categories.edit') ? setEditingCategory(s) : null}
                          className={`flex justify-between py-1 pl-[18px] text-[12px] text-[var(--text-secondary)] ${hasPermission('categories.edit') ? 'cursor-pointer hover:text-[var(--btn-secondary-text)]' : ''}`}>
                          <span>{s.sub_name}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
                </ScrollableList>
              </div>
              <PermissionGate permission="categories.create" fallback="disabled">
                <button onClick={() => setEditingCategory('new')}
                  className="w-full mt-3 py-2 bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] rounded-lg text-[13px] font-semibold border-none cursor-pointer flex items-center justify-center gap-1.5 flex-shrink-0 btn-secondary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add Category
                </button>
              </PermissionGate>
            </div>
          </div>

          {/* Users & Permissions — Admin only */}
          {isAdmin() && (
            <div className="mt-5">
              <UsersPermissionsSection />
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {editingAccount !== null && (
        <AccountForm
          account={editingAccount === 'new' ? undefined : editingAccount}
          users={userList}
          onSave={handleSaveAccount}
          onDelete={editingAccount !== 'new' && hasPermission('accounts.delete') ? handleDeleteAccount : undefined}
          onClose={() => setEditingAccount(null)}
        />
      )}
      {editingCategory !== null && (
        <CategoryForm
          category={editingCategory === 'new' ? undefined : editingCategory}
          existingGroups={existingGroupNames}
          onSave={handleSaveCategory}
          onDelete={editingCategory !== 'new' && hasPermission('categories.delete') ? handleDeleteCategory : undefined}
          onClose={() => setEditingCategory(null)}
        />
      )}
    </div>
  );
}
