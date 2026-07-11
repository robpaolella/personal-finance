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
import Calendar from '../components/Calendar';
import PermissionGate from '../components/PermissionGate';
import { CategoryBadge } from '../components/badges';
import { SegmentedControl } from '../components/primitives';
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
  // Per-split (full-Monarch model): the leg's OWN merchant (null = inherit
  // parent) and its own note.
  merchant: TransactionMerchant | null;
  note: string | null;
}

interface TransactionMerchant {
  id: number;
  name: string;
}

interface Transaction {
  id: number;
  date: string;
  description: string; // raw statement text
  note: string | null;
  amount: number;
  merchant: TransactionMerchant | null;
  account: TransactionAccount;
  category: TransactionCategory | null;
  splits: TransactionSplit[] | null;
}

interface Merchant {
  id: number;
  name: string;
  txn_count?: number;
}

/** Display label for a transaction's vendor: merchant name, or raw statement as fallback. */
function vendorLabel(t: { merchant?: TransactionMerchant | null; description: string }): string {
  return t.merchant?.name ?? t.description;
}

/** Vendor label for a split leg: its own merchant, else the parent's, else raw statement. */
function splitVendorLabel(t: Transaction, split: TransactionSplit): string {
  return split.merchant?.name ?? t.merchant?.name ?? t.description;
}

/**
 * Merchant name to SEED an editable split field: own merchant, else the parent's,
 * else empty. Unlike splitVendorLabel it never falls back to the raw statement, so
 * re-saving an inheriting leg (parent merchant null) sends '' → stays inherited
 * rather than creating a merchant named after the statement text.
 */
function legMerchantSeed(t: Transaction, split: TransactionSplit): string {
  return split.merchant?.name ?? t.merchant?.name ?? '';
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
  merchants,
  onSave,
  onDelete,
  onClose,
  duplicateMatch,
}: {
  transaction?: Transaction;
  accounts: Account[];
  categories: Category[];
  merchants: Merchant[];
  onSave: (data: Record<string, unknown>) => void;
  onDelete?: () => void;
  onClose: () => void;
  duplicateMatch?: DuplicateMatch | null;
}) {
  const [date, setDate] = useState(transaction?.date ?? new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState<number>(transaction?.account.id ?? (accounts[0]?.id ?? 0));
  const [merchant, setMerchant] = useState(transaction ? vendorLabel(transaction) : '');
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
  const [showErrors, setShowErrors] = useState(false);
  const [dupeExpanded, setDupeExpanded] = useState(false);
  const [splitNotification, setSplitNotification] = useState<string | null>(null);

  // Refs for focusing first invalid field
  const dateRef = useRef<HTMLInputElement>(null);
  const accountRef = useRef<HTMLSelectElement>(null);
  const merchantRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  // Income/expense/savings are all selectable; sign is derived from the chosen
  // category's type (no manual Type toggle). Transfers are auto-labeled by sync,
  // not hand-picked, so they're excluded from the manual picker.
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => c.type !== 'transfer');
  }, [categories]);

  // Base direction for split mode (which has no single category) + the
  // SplitEditor's reimbursement affordance: derive from the selected category,
  // else the first split's category, else expense.
  const derivedType: 'expense' | 'income' = (() => {
    const sel = categories.find((c) => c.id === categoryId);
    if (sel) return sel.type === 'income' ? 'income' : 'expense';
    const firstSplitCat = splits?.[0] ? categories.find((c) => c.id === splits[0].categoryId) : undefined;
    return firstSplitCat?.type === 'income' ? 'income' : 'expense';
  })();

  // Split legs inherit the parent's single sign, so only offer categories in the
  // SAME direction (income → income; expense/savings → expense/savings).
  // Offering a cross-type category would persist a leg whose stored sign
  // contradicts its category (e.g. an income leg stored positive). The opposite
  // direction is reached only through SplitEditor's dedicated reimbursement row.
  const splitLegCategories = useMemo(
    () => filteredCategories.filter((c) => (derivedType === 'income' ? c.type === 'income' : c.type !== 'income')),
    [filteredCategories, derivedType],
  );

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

  const handleCategoryChange = (id: number) => setCategoryId(id);

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
    merchant.trim() &&
    hasCategoryOrSplits &&
    amount !== '' &&
    !isNaN(parsedAmount)
  );

  const getFirstInvalidRef = () => {
    if (!date) return dateRef;
    if (accountId <= 0) return accountRef;
    if (!merchant.trim()) return merchantRef;
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

    // Sign derives from the category type (income stored negative, expense/
    // savings positive), preserving the user's entered sign so refunds/reversals
    // survive. In split mode there's no single category → use derivedType.
    const catType = splitMode ? derivedType : (categories.find((c) => c.id === categoryId)?.type ?? 'expense');
    const finalAmount = catType === 'income' ? -parsedAmount : parsedAmount;

    // Statement (raw description): use the edited value; if left blank, preserve the
    // existing raw statement on edits, and fall back to the merchant name for new entries.
    const finalDescription = description.trim() || transaction?.description || merchant.trim();
    if (splitMode && splits) {
      // Splits are stored with absolute amounts in editor; apply sign from finalAmount
      const sign = finalAmount < 0 ? -1 : 1;
      const finalSplits = splits.map(s => ({
        categoryId: s.categoryId,
        amount: +(s.amount * sign).toFixed(2),
      }));
      onSave({ accountId, date, description: finalDescription, merchant: merchant.trim(), note: note || null, splits: finalSplits, amount: finalAmount });
    } else {
      onSave({ accountId, date, description: finalDescription, merchant: merchant.trim(), note: note || null, categoryId, amount: finalAmount });
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
  const errMerchant = showErrors && !merchant.trim();
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
        <Field label="Merchant" required error={errMerchant}>
          <input ref={merchantRef} value={merchant} onChange={(e) => setMerchant(e.target.value)}
            list="txn-form-merchant-list" placeholder="Who was paid?" className={inputCls(!!errMerchant)} />
          <datalist id="txn-form-merchant-list">{merchants.map((m) => <option key={m.id} value={m.name} />)}</datalist>
        </Field>
        <Field label="Statement (optional)">
          <input ref={descRef} value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Raw bank statement text" className={inputCls(false)} />
        </Field>
        <Field label="Note (optional)">
          <input value={note} onChange={(e) => setNote(e.target.value)}
            className={inputCls(false)} />
        </Field>
        <div>
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
            categories={splitLegCategories}
            allCategories={categories}
            txType={derivedType}
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
  const [merchants, setMerchants] = useState<Merchant[]>([]);
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
  const [filterMerchant, setFilterMerchant] = useState<string[]>([]); // merchant ids as strings
  const [amountOp, setAmountOp] = useState('');   // '' | 'gt' | 'lt' | 'eq' | 'bt'
  const [amountValue, setAmountValue] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  const [datePreset, setDatePreset] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const PAGE = 50; // infinite-scroll increment
  const [limit, setLimit] = useState(PAGE); // rows currently loaded; grows on scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortOpen, setSortOpen] = useState(false);
  const [sortTouched, setSortTouched] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterTab, setFilterTab] = useState('Categories');
  const [filterSearch, setFilterSearch] = useState('');
  const [dateDraft, setDateDraft] = useState<{ preset: string; start: string; end: string }>({ preset: 'all', start: '', end: '' });
  const [filterDraft, setFilterDraft] = useState<{ account: string; type: string; category: string[]; merchant: string[]; op: string; val: string; min: string; max: string }>({ account: 'All', type: 'All', category: [], merchant: [], op: '', val: '', min: '', max: '' });
  const [calOpen, setCalOpen] = useState<'start' | 'end' | null>(null);
  const [editCell, setEditCell] = useState<{ id: number; field: 'vendor' | 'category' } | null>(null);
  const [cellSearch, setCellSearch] = useState('');
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [detailNote, setDetailNote] = useState('');
  const [detailMerchant, setDetailMerchant] = useState('');
  const [detailStatement, setDetailStatement] = useState('');
  const [detailAmount, setDetailAmount] = useState('');
  // True while the detail Amount field has focus — used to avoid re-seeding the
  // amount buffer out from under an in-progress edit when a concurrent field
  // commit (e.g. a category change PUT) resolves.
  const amountFieldFocused = useRef(false);
  // When a split leg is open in the detail panel, this is its split id (the
  // panel still holds the parent `detail`); null = viewing the parent itself.
  const [detailSplitId, setDetailSplitId] = useState<number | null>(null);
  // Mirror of detailSplitId that's always current, so an in-flight refreshDetail
  // re-seeds the leg that's open NOW (not the one open when the PATCH fired).
  const detailSplitIdRef = useRef<number | null>(null);
  // Which split-child text field has focus, so a concurrent PATCH's refresh
  // doesn't clobber an in-progress edit in the sibling field.
  const splitFieldFocused = useRef<'merchant' | 'note' | null>(null);
  const [detailSplitNote, setDetailSplitNote] = useState('');
  const [detailSplitMerchant, setDetailSplitMerchant] = useState('');
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitMode, setSplitMode] = useState<'$' | '%'>('$');
  const [splitOrigExpanded, setSplitOrigExpanded] = useState(false);
  const [splitDraft, setSplitDraft] = useState<{ id?: number; categoryId: number | ''; amount: string; merchant: string; note?: string; pctRaw?: string }[]>([]);

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
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkMerchant, setBulkMerchant] = useState('');
  const [bulkDate, setBulkDate] = useState('');
  const [bulkCalOpen, setBulkCalOpen] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState<number | ''>('');
  const [bulkConfirmDelete, setBulkConfirmDelete] = useState(false);

  const loadTransactions = useCallback(async () => {
    const params = new URLSearchParams();
    const { startDate, endDate } = getDateRange();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    // Infinite scroll: always fetch from the top up to the current `limit`, so
    // growing `limit` extends the list and edits/deletes preserve the window.
    params.set('limit', limit.toString());
    params.set('offset', '0');
    if (search) params.set('search', search);
    if (filterAccount !== 'All') params.set('accountId', filterAccount);
    if (filterType !== 'All') params.set('type', filterType.toLowerCase());
    if (filterCategory.length > 0) {
      const groupNames = filterCategory.filter(v => v.startsWith('group:')).map(v => v.slice(6));
      const catIds = filterCategory.filter(v => v.startsWith('sub:')).map(v => v.slice(4));
      if (groupNames.length) params.set('groupNames', groupNames.join(','));
      if (catIds.length) params.set('categoryIds', catIds.join(','));
    }
    if (filterMerchant.length > 0) params.set('merchantIds', filterMerchant.join(','));
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
  }, [getDateRange, search, filterAccount, filterType, filterCategory, filterMerchant, amountOp, amountValue, amountMin, amountMax, limit, sortBy, sortOrder]);

  const loadMerchants = useCallback(async () => {
    const res = await apiFetch<{ data: Merchant[] }>('/merchants');
    setMerchants(res.data);
  }, []);

  const loadMeta = useCallback(async () => {
    const [acctRes, catRes, merchRes] = await Promise.all([
      apiFetch<{ data: Account[] }>('/accounts'),
      apiFetch<{ data: Category[] }>('/categories'),
      apiFetch<{ data: Merchant[] }>('/merchants'),
    ]);
    setAccounts(acctRes.data);
    setCategories(catRes.data);
    setMerchants(merchRes.data);
  }, []);

  const SORT_OPTIONS: { by: string; order: 'asc' | 'desc'; label: string }[] = [
    { by: 'date', order: 'desc', label: 'Date (new → old)' },
    { by: 'date', order: 'asc', label: 'Date (old → new)' },
    { by: 'merchant', order: 'asc', label: 'Merchant (A → Z)' },
    { by: 'amount', order: 'desc', label: 'Amount (high → low)' },
    { by: 'amount', order: 'asc', label: 'Amount (low → high)' },
  ];
  const applySort = (by: string, order: 'asc' | 'desc') => {
    setSortBy(by); setSortOrder(order); setSortTouched(true); setSortOpen(false); setLimit(PAGE);
  };

  // Date / Filters overlays — edits are staged in a draft, committed on Apply.
  const openDatePopover = () => { setDateDraft({ preset: datePreset, start: customStart, end: customEnd }); setCalOpen(null); setSortOpen(false); setFilterOpen(false); setDateOpen(true); };
  const applyPreset = (value: string) => { setDatePreset(value); setCustomStart(''); setCustomEnd(''); setDateOpen(false); };
  const dateRangeInvalid = (s: string, e: string) => !!(s && e && e < s);
  const applyDate = () => { if (dateRangeInvalid(dateDraft.start, dateDraft.end)) return; setDatePreset(dateDraft.preset); setCustomStart(dateDraft.start); setCustomEnd(dateDraft.end); setDateOpen(false); };
  const openFilterPopover = () => { setFilterDraft({ account: filterAccount, type: filterType, category: [...filterCategory], merchant: [...filterMerchant], op: amountOp, val: amountValue, min: amountMin, max: amountMax }); setFilterTab('Categories'); setFilterSearch(''); setSortOpen(false); setDateOpen(false); setFilterOpen(true); };
  const applyFilters = () => {
    setFilterAccount(filterDraft.account); setFilterType(filterDraft.type); setFilterCategory(filterDraft.category); setFilterMerchant(filterDraft.merchant);
    setAmountOp(filterDraft.op); setAmountValue(filterDraft.val); setAmountMin(filterDraft.min); setAmountMax(filterDraft.max);
    setFilterOpen(false);
  };
  const toggleDraftCategory = (value: string) => setFilterDraft((d) => ({ ...d, category: d.category.includes(value) ? d.category.filter((v) => v !== value) : [...d.category, value] }));
  const toggleDraftMerchant = (id: string) => setFilterDraft((d) => ({ ...d, merchant: d.merchant.includes(id) ? d.merchant.filter((v) => v !== id) : [...d.merchant, id] }));
  // Selecting a category (group) toggles all of its sub-categories at once.
  const toggleDraftGroup = (subs: { id: number }[]) => setFilterDraft((d) => {
    const ids = subs.map((s) => `sub:${s.id}`);
    const allSel = ids.length > 0 && ids.every((id) => d.category.includes(id));
    return { ...d, category: allSel ? d.category.filter((c) => !ids.includes(c)) : Array.from(new Set([...d.category, ...ids])) };
  });
  const clearDate = () => { setDateDraft({ preset: 'all', start: '', end: '' }); setDatePreset('all'); setCustomStart(''); setCustomEnd(''); };
  const clearFilters = () => {
    setFilterDraft({ account: 'All', type: 'All', category: [], merchant: [], op: '', val: '', min: '', max: '' });
    setFilterAccount('All'); setFilterType('All'); setFilterCategory([]); setFilterMerchant([]);
    setAmountOp(''); setAmountValue(''); setAmountMin(''); setAmountMax('');
  };
  // Clear every active filter (search + date + filters) without opening a popover.
  const clearAll = () => { setSearch(''); setSearchOpen(false); clearDate(); clearFilters(); };

  // Inline/panel edit — rebuilds the txn body (preserving splits) and PUTs.
  const updateTxnField = async (t: Transaction, changes: { description?: string; merchant?: string; categoryId?: number; date?: string; note?: string | null; accountId?: number; amount?: number }) => {
    const isSplit = !!(t.splits && t.splits.length > 0);
    let newAmount = t.amount;
    const body: Record<string, unknown> = {
      accountId: changes.accountId ?? t.account.id,
      date: changes.date ?? t.date,
      description: changes.description ?? t.description,
      note: changes.note !== undefined ? changes.note : t.note,
    };
    if (changes.merchant !== undefined) body.merchant = changes.merchant;
    if (isSplit) {
      // Amount + splits are driven by the split modal; other fields still edit.
      // Carry each leg's id + merchant + note so an upsert-by-id save preserves
      // per-leg data (and stable ids) when a parent field is edited.
      body.splits = t.splits!.map((s) => ({ id: s.id, categoryId: s.categoryId, amount: s.amount, merchant: s.merchant?.name, note: s.note }));
      body.amount = t.amount;
    } else {
      const categoryId = changes.categoryId ?? t.category?.id ?? null;
      const catType = categories.find((c) => c.id === categoryId)?.type ?? t.category?.type ?? 'expense';
      if (changes.amount !== undefined) {
        // Entered (display) amount → stored sign from category, preserving the
        // user's entered sign so refunds/reversals survive.
        newAmount = catType === 'income' ? -changes.amount : changes.amount;
      }
      // A category-only change is a relabel, not a re-sign: the stored sign
      // already encodes money direction (positive = out, negative = in)
      // independent of category, so the amount is left untouched. This keeps
      // refunds/reversals/withdrawals intact when recategorized.
      body.categoryId = categoryId;
      body.amount = newAmount;
    }
    try {
      await apiFetch(`/transactions/${t.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setEditCell(null); setCellSearch('');
      if (changes.merchant !== undefined) loadMerchants(); // pick up any newly-created merchant
      // Merge the committed change into the open panel LOCALLY (no refetch) so an
      // in-progress edit the user may have started in another field isn't
      // clobbered by a whole-panel reseed.
      if (detail && detail.id === t.id) {
        const newCat = (!isSplit && changes.categoryId != null)
          ? categories.find((c) => c.id === changes.categoryId)
          : undefined;
        const newAcct = changes.accountId !== undefined
          ? accounts.find((a) => a.id === changes.accountId)
          : undefined;
        setDetail((prev) => {
          if (!prev || prev.id !== t.id) return prev;
          return {
            ...prev,
            amount: isSplit ? prev.amount : newAmount,
            date: changes.date ?? prev.date,
            note: changes.note !== undefined ? changes.note : prev.note,
            description: changes.description ?? prev.description,
            merchant: changes.merchant !== undefined
              ? (changes.merchant.trim() ? { id: prev.merchant?.id ?? -1, name: changes.merchant.trim() } : null)
              : prev.merchant,
            account: newAcct
              ? { id: newAcct.id, name: newAcct.name, lastFour: newAcct.last_four, owner: newAcct.owner, owners: newAcct.owners, isShared: newAcct.isShared }
              : prev.account,
            category: (!isSplit && changes.categoryId != null)
              ? (newCat ? { id: newCat.id, groupName: newCat.group_name, subName: newCat.sub_name, displayName: newCat.display_name, type: newCat.type } : null)
              : prev.category,
          };
        });
        // Keep the amount input in sync only when its DISPLAYED value could have
        // changed (an amount edit, or a category change that flips the
        // income/expense sign convention) — never touch the merchant/statement/
        // note buffers here, so a field being typed in isn't overwritten. Also
        // skip while the amount field itself has focus, so a concurrent
        // category-change PUT resolving mid-edit can't clobber live typing.
        if (!isSplit && (changes.amount !== undefined || changes.categoryId != null) && !amountFieldFocused.current) {
          const dispType = newCat?.type ?? detail.category?.type ?? 'expense';
          setDetailAmount(String(dispType === 'income' ? -newAmount : newAmount));
        }
      }
      await loadTransactions();
    } catch {
      addToast('Failed to update transaction', 'error');
    }
  };

  // Display form of a stored amount for editing (income is stored negative).
  const displayAmount = (t: Transaction) => {
    const catType = t.category?.type ?? t.splits?.[0]?.type ?? 'expense';
    return String(catType === 'income' ? -t.amount : t.amount);
  };
  const seedDetail = (t: Transaction) => { setDetail(t); setDetailNote(t.note ?? ''); setDetailMerchant(vendorLabel(t)); setDetailStatement(t.description ?? ''); setDetailAmount(displayAmount(t)); };
  const refreshDetail = async (id: number) => {
    try {
      const res = await apiFetch<{ data: Transaction }>(`/transactions/${id}`);
      seedDetail(res.data);
      // Re-seed the leg that's open NOW (via the ref), and skip any field the user
      // is currently editing so an in-flight refresh can't clobber live typing.
      const activeId = detailSplitIdRef.current;
      const active = activeId != null ? (res.data.splits ?? []).find((s) => s.id === activeId) : undefined;
      if (active) {
        if (splitFieldFocused.current !== 'merchant') setDetailSplitMerchant(legMerchantSeed(res.data, active));
        if (splitFieldFocused.current !== 'note') setDetailSplitNote(active.note ?? '');
      } else if (activeId != null) {
        setDetailSplitId(null); // leg gone (unsplit/merged) → fall back to parent view
        detailSplitIdRef.current = null;
      }
    } catch { /* leave panel as-is */ }
  };
  const openDetail = (t: Transaction, split?: TransactionSplit) => {
    setDetailSplitId(split?.id ?? null);
    detailSplitIdRef.current = split?.id ?? null;
    seedDetail(t);
    if (split) { setDetailSplitMerchant(legMerchantSeed(t, split)); setDetailSplitNote(split.note ?? ''); }
  };
  const closeDetail = () => { setDetail(null); setDetailSplitId(null); detailSplitIdRef.current = null; };

  const deleteFromDetail = async () => {
    if (!detail) return;
    try {
      await apiFetch(`/transactions/${detail.id}`, { method: 'DELETE' });
      closeDetail();
      addToast('Transaction deleted');
      await loadTransactions();
    } catch { addToast('Failed to delete transaction', 'error'); }
  };

  const openSplit = () => {
    if (!detail) return;
    const parentMerch = detail.merchant?.name ?? '';
    const rows = (detail.splits && detail.splits.length > 0)
      ? detail.splits.map((s) => ({ id: s.id, categoryId: s.categoryId as number | '', amount: Math.abs(s.amount).toFixed(2), merchant: splitVendorLabel(detail, s), note: s.note ?? '' }))
      // New split: start every row at $0 (nothing pre-filled) and default each
      // leg's merchant to the parent's (Monarch-style), which the user can change.
      : [
          { categoryId: (detail.category?.id ?? '') as number | '', amount: '', merchant: parentMerch, note: '' },
          { categoryId: '' as number | '', amount: '', merchant: parentMerch, note: '' },
        ];
    setSplitMode('$');
    setSplitOrigExpanded(false);
    setSplitDraft(rows);
    setSplitOpen(true);
  };

  const saveSplit = async () => {
    if (!detail) return;
    const sign = detail.amount < 0 ? -1 : 1;
    const rows = splitDraft.filter((r) => r.categoryId !== '' && parseFloat(r.amount) > 0);
    // Omit `merchant` so the parent merchant is untouched; the server uses it as
    // the baseline for the NULL-inherit rule on each leg.
    const body = {
      accountId: detail.account.id,
      date: detail.date,
      description: detail.description,
      note: detail.note,
      amount: detail.amount,
      splits: rows.map((r) => ({ id: r.id, categoryId: r.categoryId, amount: +(Math.abs(parseFloat(r.amount)) * sign).toFixed(2), merchant: r.merchant, note: r.note })),
    };
    try {
      await apiFetch(`/transactions/${detail.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setSplitOpen(false);
      addToast('Split saved');
      await refreshDetail(detail.id); // keep the panel open, showing the new split
      await loadTransactions();
    } catch { addToast('Failed to save split', 'error'); }
  };

  // Convert a split transaction back to a single category (the only editor is the
  // detail panel now, so this is the un-split path). The parent amount is kept
  // as-is; the category becomes the first assigned split's category, which the
  // user can then re-pick from the (now single) category select.
  const removeSplitFromDetail = async () => {
    if (!detail || !detail.splits?.length) return;
    const catId = detail.splits.find((s) => s.categoryId)?.categoryId ?? detail.splits[0].categoryId;
    try {
      await apiFetch(`/transactions/${detail.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: detail.account.id, date: detail.date, description: detail.description, note: detail.note, amount: detail.amount, categoryId: catId }),
      });
      setSplitOpen(false);
      setDetailSplitId(null); detailSplitIdRef.current = null; // back to the single-category parent view
      addToast('Split removed');
      await refreshDetail(detail.id);
      await loadTransactions();
    } catch { addToast('Failed to remove split', 'error'); }
  };

  // Edit ONE split leg's category / merchant / note from the split-child detail
  // panel (amount is managed only in the modal). PATCHes just that leg.
  const patchSplitField = async (changes: { categoryId?: number; merchant?: string; note?: string | null }) => {
    if (!detail || detailSplitId == null) return;
    try {
      await apiFetch(`/transactions/${detail.id}/splits/${detailSplitId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes),
      });
      await refreshDetail(detail.id);
      await loadTransactions();
    } catch { addToast('Failed to update split', 'error'); }
  };

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { setLimit(PAGE); }, [datePreset, customStart, customEnd, search, filterAccount, filterType, filterCategory, filterMerchant, amountOp, amountValue, amountMin, amountMax]);
  useEffect(() => { loadTransactions(); }, [loadTransactions]);
  useEffect(() => { detailSplitIdRef.current = detailSplitId; }, [detailSplitId]);

  // Infinite scroll: when the sentinel nears the viewport, load one more batch.
  // Re-arms after each fetch (transactions.length changes); stops when all loaded.
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || transactions.length >= total) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { io.disconnect(); setLimit((l) => l + PAGE); }
    }, { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [transactions.length, total]);

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
      loadMerchants(); // a new merchant may have been created
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
    setBulkEditOpen(false);
    setBulkConfirmDelete(false);
  };
  const openBulkEdit = () => { if (selectedIds.size > 0) setBulkEditOpen(true); };

  // Apply all set fields (merchant / category / date) in a single bulk update.
  const applyBulkEdit = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const updates: Record<string, unknown> = {};
    if (bulkMerchant.trim()) updates.merchant = bulkMerchant.trim();
    if (bulkCategoryId) updates.categoryId = bulkCategoryId;
    if (bulkDate) updates.date = bulkDate;
    if (Object.keys(updates).length === 0) return;
    try {
      await apiFetch('/transactions/bulk-update', { method: 'POST', body: JSON.stringify({ ids, updates }) });
      addToast(`Updated ${ids.length} transactions`);
      setBulkMerchant(''); setBulkCategoryId(''); setBulkDate(''); setBulkCalOpen(false);
      setBulkEditOpen(false);
      if (updates.merchant) loadMerchants(); // a new merchant may have been created
      loadTransactions();
    } catch (_err) {
      addToast('Bulk operation failed', 'error');
    }
  };

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!bulkConfirmDelete) { setBulkConfirmDelete(true); setTimeout(() => setBulkConfirmDelete(false), 3000); return; }
    try {
      await apiFetch('/transactions/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) });
      setBulkConfirmDelete(false);
      addToast(`Deleted ${ids.length} transactions`);
      setSelectedIds(new Set()); setBulkMode(false); setBulkEditOpen(false);
      loadTransactions();
    } catch (_err) {
      addToast('Bulk operation failed', 'error');
    }
  };

  const hasMore = transactions.length < total;

  const canEdit = hasPermission('transactions.edit');
  // Rounded-square checkbox indicator (never a circle — circles read as radios).
  const chkbox = (checked: boolean) => (
    <span className="w-[19px] h-[19px] shrink-0 rounded-[6px] border-[1.5px] flex items-center justify-center" style={{ borderColor: checked ? 'var(--primary)' : 'var(--line-strong)', background: checked ? 'var(--primary)' : 'transparent' }}>
      {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6"/></svg>}
    </span>
  );
  const formatDateHeader = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  // Merchant name suggestions for the inline vendor picker — the real merchant list.
  const vendorOptions = merchants.map((m) => m.name).sort((a, b) => a.localeCompare(b));
  const sortLabel = !sortTouched ? 'Sort' : (SORT_OPTIONS.find((o) => o.by === sortBy && o.order === sortOrder)?.label ?? 'Sort');
  const DATE_PRESETS: { value: string; label: string }[] = [
    { value: 'all', label: 'All time' }, { value: 'this-month', label: 'This month' }, { value: 'last-month', label: 'Last month' },
    { value: 'this-quarter', label: 'This quarter' }, { value: 'last-quarter', label: 'Last quarter' },
    { value: 'this-year', label: 'This year' }, { value: 'last-year', label: 'Last year' }, { value: 'ytd', label: 'Year to date' },
    { value: 'custom', label: 'Custom range…' },
  ];
  const dateError = dateRangeInvalid(dateDraft.start, dateDraft.end) ? 'End date must be on or after the start date.' : '';
  const shortDate = (s: string) => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const dateLabel = datePreset === 'all' ? 'Date'
    : datePreset === 'custom'
      ? (customStart && customEnd ? `${shortDate(customStart)} – ${shortDate(customEnd)}` : customStart ? `From ${shortDate(customStart)}` : customEnd ? `Until ${shortDate(customEnd)}` : 'Custom')
      : (DATE_PRESETS.find((p) => p.value === datePreset)?.label ?? 'Date');
  const filterCount = (filterAccount !== 'All' ? 1 : 0) + (filterType !== 'All' ? 1 : 0) + filterCategory.length + filterMerchant.length + (amountOp ? 1 : 0);
  const draftCount = filterDraft.category.filter((c) => c.startsWith('sub:')).length + filterDraft.merchant.length + (filterDraft.account !== 'All' ? 1 : 0) + (filterDraft.op ? 1 : 0) + (filterDraft.type !== 'All' ? 1 : 0);
  const anyActive = search !== '' || datePreset !== 'all' || filterCount > 0;
  const groupedAll = Array.from(
    categories.reduce((m, c) => { if (!m.has(c.group_name)) m.set(c.group_name, []); m.get(c.group_name)!.push(c); return m; }, new Map<string, Category[]>()).entries()
  );
  // The detail split modal applies one sign to every leg, so its category picker
  // must offer only same-direction categories (income → income;
  // expense/savings → expense/savings) — otherwise a leg is stored with a sign
  // that contradicts its category. Direction comes from the transaction's
  // category type (not its money-sign, so refunds/reversals stay in-family).
  const detailBaseType: 'income' | 'expense' =
    ((detail?.category?.type ?? detail?.splits?.[0]?.type) === 'income') ? 'income' : 'expense';
  // Always keep any category already assigned to a split leg selectable — a
  // reimbursement/expense leg on an income split (created via the Add form's
  // reimbursement row) or legacy mixed data would otherwise render as a blank,
  // un-reselectable dropdown and could be silently converted on save.
  const draftCatIds = new Set(splitDraft.map((r) => r.categoryId).filter((v): v is number => v !== ''));
  const splitModalGroups = groupedAll
    .map(([group, subs]) => [
      group,
      subs.filter((c) => c.type !== 'transfer' && ((detailBaseType === 'income' ? c.type === 'income' : c.type !== 'income') || draftCatIds.has(c.id))),
    ] as [string, Category[]])
    .filter(([, subs]) => subs.length > 0);
  const splitAlloc = splitDraft.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const splitRemainingVal = detail ? Math.abs(detail.amount) - splitAlloc : 0;
  const splitValid = splitDraft.filter((r) => r.categoryId !== '' && parseFloat(r.amount) > 0).length >= 2 && Math.abs(splitRemainingVal) < 0.01;
  // A split transaction renders as one row PER split (each with its own category
  // + amount + a split marker); non-split txns render as a single row.
  type DisplayRow = { t: Transaction; split?: TransactionSplit };
  const dateGroups: { date: string; rows: DisplayRow[]; net: number }[] = [];
  for (const t of transactions) {
    const rows: DisplayRow[] = (t.splits && t.splits.length > 0) ? t.splits.map((s) => ({ t, split: s })) : [{ t }];
    const last = dateGroups[dateGroups.length - 1];
    if (last && last.date === t.date) { last.rows.push(...rows); last.net += t.amount; }
    else dateGroups.push({ date: t.date, rows, net: t.amount });
  }
  const displayRows = dateGroups.flatMap((g) => g.rows); // flat, split-expanded (mobile)

  const splitIcon = (size = 12) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4v16M7 4l-3 3M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3"/></svg>
  );

  const renderRow = (t: Transaction, split?: TransactionSplit) => {
    const checked = selectedIds.has(t.id);
    // Split sub-row: parent merchant + this split's own category + amount + marker.
    if (split) {
      const scolor = getCategoryColorHex(split.groupName);
      const sinitial = (splitVendorLabel(t, split)?.trim()?.[0] ?? '?').toUpperCase();
      const { text: sAmt, className: sClass } = fmtTransaction(split.amount, split.type);
      return (
        <div key={`${t.id}-split-${split.id}`}
          onClick={() => { if (bulkMode) toggleSelect(t.id); else if (canEdit) openDetail(t, split); }}
          className="flex items-center gap-3.5 px-6 border-b border-line cursor-pointer hover:bg-surface-2/40"
          style={{ height: 44, background: checked ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : undefined, boxShadow: 'inset 3px 0 0 color-mix(in srgb, var(--primary) 30%, transparent)' }}>
          {bulkMode && (
            <span className="w-5 h-5 shrink-0 rounded-[6px] flex items-center justify-center border-[1.5px]" style={{ borderColor: checked ? 'var(--primary)' : 'var(--line-strong)', background: checked ? 'var(--primary)' : 'transparent' }}>
              {checked && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6"/></svg>}
            </span>
          )}
          <div className="flex-[1.4] min-w-0 flex items-center gap-2.5 pl-1">
            <span className="w-[26px] h-[26px] shrink-0 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: `color-mix(in srgb, ${scolor} 16%, transparent)`, color: scolor }}>{sinitial}</span>
            <span className="font-semibold text-[15px] truncate">{splitVendorLabel(t, split)}</span>
            <span className="shrink-0 inline-flex items-center justify-center w-[18px] h-[18px] rounded-md" style={{ background: 'color-mix(in srgb, var(--primary) 14%, transparent)', color: 'var(--primary)' }} title="Part of a split transaction">{splitIcon(11)}</span>
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-2 text-[13px] text-content-2 px-2">
            <span className="text-[15px] leading-none">{getCategoryEmoji(split.groupName)}</span>
            <span className="truncate">{split.subName}</span>
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-2 text-[13px] text-content-3"><span className="truncate">{accountLabel(t.account)}</span></div>
          <div className={`w-[128px] shrink-0 text-right font-bold text-[15px] tabular-nums ${sClass}`}>{sAmt}</div>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-content-3 shrink-0"><path d="m9 6 6 6-6 6"/></svg>
        </div>
      );
    }
    const catType = t.category?.type ?? t.splits?.[0]?.type ?? 'expense';
    const { text: amtText, className: amtClass } = fmtTransaction(t.amount, catType);
    const isSplit = !!(t.splits && t.splits.length > 0);
    const emoji = isSplit ? '🔀' : getCategoryEmoji(t.category?.groupName);
    const color = getCategoryColorHex(t.category?.groupName);
    const initial = (vendorLabel(t)?.trim()?.[0] ?? '?').toUpperCase();
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
          <span className="w-5 h-5 shrink-0 rounded-[6px] flex items-center justify-center border-[1.5px]" style={{ borderColor: checked ? 'var(--primary)' : 'var(--line-strong)', background: checked ? 'var(--primary)' : 'transparent' }}>
            {checked && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6"/></svg>}
          </span>
        )}
        {/* vendor cell (avatar + name), inline edit — outline encompasses the logo */}
        <div className="relative flex-[1.4] min-w-0" onClick={(e) => { if (!bulkMode && canEdit) { e.stopPropagation(); setEditCell({ id: t.id, field: 'vendor' }); setCellSearch(''); } }}>
          <div className={`group flex items-center gap-2.5 h-9 pl-1 pr-2 rounded-[8px] border transition-colors ${vendorEditing ? 'border-primary' : 'border-transparent hover:border-line-strong'}`}>
            <span className="w-[26px] h-[26px] shrink-0 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>{initial}</span>
            <span className="font-semibold text-[15px] truncate flex-1">{vendorLabel(t)}</span>
            {canEdit && !bulkMode && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" className={`shrink-0 transition-opacity ${vendorEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}><path d="m6 9 6 6 6-6"/></svg>}
          </div>
          {vendorEditing && (
            <div onClick={(e) => e.stopPropagation()} className="absolute top-9 left-0 z-[60] w-64 bg-elevated border border-line-strong rounded-[12px] shadow-md overflow-hidden">
              <div className="p-2 border-b border-line"><input autoFocus value={cellSearch} onChange={(e) => setCellSearch(e.target.value)} placeholder="Search merchants…" className="w-full h-9 px-3 rounded-lg bg-surface-2 border border-line text-content text-sm outline-none" /></div>
              <div className="max-h-60 overflow-y-auto p-1.5">
                {cellSearch.trim() && !vendorMatches.some((v) => v.toLowerCase() === cellSearch.trim().toLowerCase()) && (
                  <button onClick={() => updateTxnField(t, { merchant: cellSearch.trim() })} className="block w-full text-left px-3 py-2 rounded-lg text-sm text-primary font-medium hover:bg-surface-2">Create “{cellSearch.trim()}”</button>
                )}
                {vendorMatches.map((v) => (
                  <button key={v} onClick={() => updateTxnField(t, { merchant: v })} className="block w-full text-left px-3 py-2 rounded-lg text-sm text-content hover:bg-surface-2 truncate">{v}</button>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* category cell (inline edit; disabled for splits) */}
        <div className="relative flex-1 min-w-0" onClick={(e) => { if (!bulkMode && !isSplit && canEdit) { e.stopPropagation(); setEditCell({ id: t.id, field: 'category' }); setCellSearch(''); } }}>
          <div className={`group flex items-center gap-2 h-9 px-2 rounded-[8px] border transition-colors text-[13px] text-content-2 ${categoryEditing ? 'border-primary' : isSplit ? 'border-transparent' : 'border-transparent hover:border-line-strong'}`}>
            <span className="text-[15px] leading-none">{emoji}</span>
            <span className="truncate flex-1">{isSplit ? `Split (${t.splits!.length})` : (t.category?.subName ?? 'Uncategorized')}</span>
            {canEdit && !bulkMode && !isSplit && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" className={`shrink-0 transition-opacity ${categoryEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}><path d="m6 9 6 6 6-6"/></svg>}
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
          {/* Clear all — shows whenever any filter/search/date is active */}
          {anyActive && (
            <button onClick={clearAll} className="h-10 px-2.5 text-primary hover:text-primary-hover font-semibold text-sm">
              Clear
            </button>
          )}
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
                <div className="absolute top-12 right-0 z-50 w-[660px] max-w-[calc(100vw-64px)] bg-elevated border border-line-strong rounded-[16px] shadow-md flex flex-col">
                  <div className="flex">
                    <div className="w-[212px] shrink-0 border-r border-line">
                      <div className="px-5 pt-[18px] pb-3 text-base font-extrabold tracking-tight border-b border-line">Date Range</div>
                      <div className="py-2">
                        {DATE_PRESETS.filter((p) => p.value !== 'custom').map((p) => {
                          const active = datePreset === p.value;
                          return (
                            <div key={p.value} onClick={() => applyPreset(p.value)}
                              className="px-5 py-2.5 text-[15px] font-medium cursor-pointer"
                              style={{ color: active ? 'var(--primary)' : 'var(--text)', background: active ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent', borderLeft: `2px solid ${active ? 'var(--primary)' : 'transparent'}` }}>
                              {p.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex-1 p-6">
                      {(['start', 'end'] as const).map((f) => {
                        const val = f === 'start' ? dateDraft.start : dateDraft.end;
                        return (
                          <div key={f} className={f === 'start' ? 'mb-[22px]' : ''}>
                            <div className="flex items-center justify-between mb-2.5">
                              <span className="text-[15px] font-bold">{f === 'start' ? 'Start date' : 'End date'}</span>
                              {val && <button type="button" onClick={() => setDateDraft((d) => ({ ...d, [f]: '', preset: 'custom' }))} className="text-sm font-semibold text-primary">Clear</button>}
                            </div>
                            <div className="relative">
                              <button type="button" onClick={() => setCalOpen((c) => (c === f ? null : f))}
                                className="w-full flex items-center justify-between h-[50px] px-4 rounded-[12px] bg-surface text-[15px]"
                                style={{ border: `1px solid ${calOpen === f ? 'var(--primary)' : (dateError && f === 'end' ? 'var(--negative)' : 'var(--line)')}` }}>
                                <span className={val ? 'text-content tabular-nums' : 'text-content-3'}>{val ? new Date(val + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'MM/DD/YYYY'}</span>
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4.5" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>
                              </button>
                              {calOpen === f && (
                                <div className="absolute top-[54px] right-0 z-[60] w-[320px] bg-elevated border border-line-strong rounded-[14px] shadow-md p-3">
                                  <Calendar value={val} onChange={(d) => { setDateDraft((prev) => ({ ...prev, preset: 'custom', [f]: d })); setCalOpen(null); }} />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {dateError && <div className="text-negative text-[13px] font-semibold mt-1">{dateError}</div>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-5 py-3.5 border-t border-line">
                    <button onClick={clearDate} className="h-10 px-[18px] rounded-[10px] border border-line-strong bg-surface-2 text-content font-semibold text-sm">Clear</button>
                    <div className="flex gap-2.5">
                      <button onClick={() => setDateOpen(false)} className="h-10 px-[18px] rounded-[10px] border border-line-strong bg-surface-2 text-content font-semibold text-sm">Cancel</button>
                      <button onClick={applyDate} disabled={!!dateError} className="h-10 px-5 rounded-[10px] bg-primary text-on-primary font-bold text-sm shadow-sm disabled:opacity-50">Apply</button>
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
                <div className="absolute top-12 right-0 z-50 w-[820px] max-w-[calc(100vw-64px)] bg-elevated border border-line-strong rounded-[16px] shadow-md overflow-hidden flex flex-col">
                  {/* header */}
                  <div className="flex border-b border-line">
                    <div className="w-[170px] shrink-0 px-5 py-[18px] text-base font-extrabold tracking-tight border-r border-line">Filters</div>
                    <div className="flex-1 flex items-center gap-2.5 px-5 border-r border-line">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                      <input value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} placeholder={`Search ${filterTab.toLowerCase()}…`} className="flex-1 h-12 bg-transparent outline-none text-sm text-content" />
                    </div>
                    <div className="w-[240px] shrink-0 px-5 flex items-center text-sm font-semibold text-content-2">{draftCount} filter{draftCount === 1 ? '' : 's'} selected</div>
                  </div>
                  {/* body: nav · checklist · selected summary */}
                  <div className="flex" style={{ minHeight: 380 }}>
                    <div className="w-[170px] shrink-0 p-3 border-r border-line flex flex-col gap-0.5">
                      {['Categories', 'Merchants', 'Accounts', 'Tags', 'Amount', 'Other'].map((n) => {
                        const active = filterTab === n;
                        return (
                          <button key={n} onClick={() => { setFilterTab(n); setFilterSearch(''); }} className="px-3.5 py-2.5 rounded-[9px] text-sm font-semibold text-left"
                            style={{ color: active ? 'var(--primary)' : 'var(--text)', background: active ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent' }}>{n}</button>
                        );
                      })}
                    </div>
                    <div className="flex-1 p-3 border-r border-line overflow-auto" style={{ maxHeight: 440 }}>
                      {filterTab === 'Categories' && categoryGroups.map((g) => {
                        const gChecked = g.subs.length > 0 && g.subs.every((s) => filterDraft.category.includes(`sub:${s.id}`));
                        const subs = filterSearch ? g.subs.filter((s) => `${s.sub} ${g.group}`.toLowerCase().includes(filterSearch.toLowerCase())) : g.subs;
                        if (filterSearch && subs.length === 0 && !g.group.toLowerCase().includes(filterSearch.toLowerCase())) return null;
                        return (
                          <div key={g.group} className="mb-1">
                            <div onClick={() => toggleDraftGroup(g.subs)} className="flex items-center gap-3 px-1 py-2 rounded-lg hover:bg-surface-2 text-sm font-semibold cursor-pointer">
                              {chkbox(gChecked)}{g.group}
                            </div>
                            {subs.map((s) => (
                              <div key={s.id} onClick={() => toggleDraftCategory(`sub:${s.id}`)} className="flex items-center gap-3 pl-8 pr-1 py-2 rounded-lg hover:bg-surface-2 text-[13px] cursor-pointer">
                                {chkbox(filterDraft.category.includes(`sub:${s.id}`))}{s.sub}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      {filterTab === 'Accounts' && [{ id: 'All', label: 'All accounts' }, ...accounts.filter((a) => !filterSearch || accountLabel(a).toLowerCase().includes(filterSearch.toLowerCase())).map((a) => ({ id: a.id.toString(), label: accountLabel(a) }))].map((a) => (
                        <div key={a.id} onClick={() => setFilterDraft((d) => ({ ...d, account: a.id }))} className="flex items-center gap-3 px-1 py-2 rounded-lg hover:bg-surface-2 text-[15px] cursor-pointer">
                          {chkbox(filterDraft.account === a.id)}{a.label}
                        </div>
                      ))}
                      {filterTab === 'Amount' && (
                        <div className="px-1">
                          <div className="font-mono text-[11px] uppercase tracking-wide text-content-3 mb-1.5">Amount</div>
                          {([['gt', 'Greater than…'], ['lt', 'Less than…'], ['eq', 'Equal to…'], ['bt', 'Between…']] as [string, string][]).map(([op, label]) => (
                            <div key={op}>
                              <div onClick={() => setFilterDraft((d) => ({ ...d, op: d.op === op ? '' : op }))} className="flex items-center gap-3 py-2 cursor-pointer text-[15px]">
                                {chkbox(filterDraft.op === op)}{label}
                              </div>
                              {filterDraft.op === op && op !== 'bt' && (
                                <div className="pl-8 pb-2"><input value={filterDraft.val} onChange={(e) => setFilterDraft((d) => ({ ...d, val: e.target.value.replace(/[^0-9.]/g, '') }))} inputMode="decimal" placeholder="$10" className="w-full h-[46px] px-4 rounded-[11px] bg-surface border border-line text-content text-[15px] tabular-nums outline-none" /></div>
                              )}
                              {filterDraft.op === op && op === 'bt' && (
                                <div className="flex items-center gap-2.5 pl-8 pb-2">
                                  <input value={filterDraft.min} onChange={(e) => setFilterDraft((d) => ({ ...d, min: e.target.value.replace(/[^0-9.]/g, '') }))} inputMode="decimal" placeholder="Min" className="flex-1 min-w-0 h-[46px] px-4 rounded-[11px] bg-surface border border-line text-content text-[15px] tabular-nums outline-none" />
                                  <span className="text-content-3 text-sm">to</span>
                                  <input value={filterDraft.max} onChange={(e) => setFilterDraft((d) => ({ ...d, max: e.target.value.replace(/[^0-9.]/g, '') }))} inputMode="decimal" placeholder="Max" className="flex-1 min-w-0 h-[46px] px-4 rounded-[11px] bg-surface border border-line text-content text-[15px] tabular-nums outline-none" />
                                </div>
                              )}
                            </div>
                          ))}
                          <div className="font-mono text-[11px] uppercase tracking-wide text-content-3 mt-3.5 mb-1.5">Type</div>
                          {([['Expense', 'Debits only'], ['Income', 'Credits only']] as [string, string][]).map(([val, label]) => (
                            <div key={val} onClick={() => setFilterDraft((d) => ({ ...d, type: d.type === val ? 'All' : val }))} className="flex items-center gap-3 py-2 cursor-pointer text-[15px]">
                              {chkbox(filterDraft.type === val)}{label}
                            </div>
                          ))}
                        </div>
                      )}
                      {filterTab === 'Merchants' && (
                        merchants.length === 0 ? (
                          <div className="flex items-center justify-center h-full min-h-[320px] text-content-3 text-sm">No merchants yet</div>
                        ) : (
                          merchants
                            .filter((m) => !filterSearch || m.name.toLowerCase().includes(filterSearch.toLowerCase()))
                            .map((m) => (
                              <div key={m.id} onClick={() => toggleDraftMerchant(m.id.toString())} className="flex items-center gap-3 px-1 py-2 rounded-lg hover:bg-surface-2 text-[15px] cursor-pointer">
                                {chkbox(filterDraft.merchant.includes(m.id.toString()))}<span className="flex-1 truncate">{m.name}</span>
                                {m.txn_count !== undefined && <span className="text-content-3 text-[13px] tabular-nums shrink-0">{m.txn_count}</span>}
                              </div>
                            ))
                        )
                      )}
                      {(filterTab === 'Tags' || filterTab === 'Other') && (
                        <div className="flex items-center justify-center h-full min-h-[320px] text-content-3 text-sm">Coming soon</div>
                      )}
                    </div>
                    {/* selected filters — ALL dimensions */}
                    <div className="w-[240px] shrink-0 p-4 overflow-auto" style={{ maxHeight: 440 }}>
                      {draftCount === 0 ? (
                        <div className="text-content-3 text-sm">No filters selected yet.</div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {filterDraft.category.filter((c) => c.startsWith('sub:')).length > 0 && (
                            <div>
                              <div className="flex items-center justify-between mb-1.5"><span className="text-[13px] font-semibold text-content-3">Categories</span><button onClick={() => setFilterDraft((d) => ({ ...d, category: [] }))} className="text-[13px] font-semibold text-primary">Clear</button></div>
                              {filterDraft.category.filter((c) => c.startsWith('sub:')).map((c) => {
                                const cat = categories.find((x) => x.id === Number(c.slice(4)));
                                return (
                                  <div key={c} className="flex items-center gap-2 py-1.5 text-sm">
                                    <span className="text-[15px] leading-none">{getCategoryEmoji(cat?.group_name)}</span>
                                    <span className="flex-1 truncate">{cat?.sub_name ?? c}</span>
                                    <button onClick={() => toggleDraftCategory(c)} className="text-content-3 hover:text-content shrink-0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg></button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {filterDraft.merchant.length > 0 && (
                            <div>
                              <div className="flex items-center justify-between mb-1.5"><span className="text-[13px] font-semibold text-content-3">Merchants</span><button onClick={() => setFilterDraft((d) => ({ ...d, merchant: [] }))} className="text-[13px] font-semibold text-primary">Clear</button></div>
                              {filterDraft.merchant.map((mid) => {
                                const m = merchants.find((x) => x.id.toString() === mid);
                                return (
                                  <div key={mid} className="flex items-center gap-2 py-1.5 text-sm">
                                    <span className="flex-1 truncate">{m?.name ?? mid}</span>
                                    <button onClick={() => toggleDraftMerchant(mid)} className="text-content-3 hover:text-content shrink-0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg></button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {filterDraft.account !== 'All' && (
                            <div>
                              <div className="flex items-center justify-between mb-1.5"><span className="text-[13px] font-semibold text-content-3">Accounts</span><button onClick={() => setFilterDraft((d) => ({ ...d, account: 'All' }))} className="text-[13px] font-semibold text-primary">Clear</button></div>
                              <div className="flex items-center gap-2 py-1.5 text-sm"><span className="flex-1 truncate">{(() => { const a = accounts.find((x) => x.id.toString() === filterDraft.account); return a ? accountLabel(a) : filterDraft.account; })()}</span><button onClick={() => setFilterDraft((d) => ({ ...d, account: 'All' }))} className="text-content-3 hover:text-content shrink-0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg></button></div>
                            </div>
                          )}
                          {filterDraft.op && (
                            <div>
                              <div className="flex items-center justify-between mb-1.5"><span className="text-[13px] font-semibold text-content-3">Amount</span><button onClick={() => setFilterDraft((d) => ({ ...d, op: '', val: '', min: '', max: '' }))} className="text-[13px] font-semibold text-primary">Clear</button></div>
                              <div className="flex items-center gap-2 py-1.5 text-sm"><span className="flex-1 truncate">{filterDraft.op === 'gt' ? `Greater than $${filterDraft.val || '0'}` : filterDraft.op === 'lt' ? `Less than $${filterDraft.val || '0'}` : filterDraft.op === 'eq' ? `Equal to $${filterDraft.val || '0'}` : `$${filterDraft.min || '0'} – $${filterDraft.max || '0'}`}</span><button onClick={() => setFilterDraft((d) => ({ ...d, op: '', val: '', min: '', max: '' }))} className="text-content-3 hover:text-content shrink-0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg></button></div>
                            </div>
                          )}
                          {filterDraft.type !== 'All' && (
                            <div>
                              <div className="flex items-center justify-between mb-1.5"><span className="text-[13px] font-semibold text-content-3">Type</span><button onClick={() => setFilterDraft((d) => ({ ...d, type: 'All' }))} className="text-[13px] font-semibold text-primary">Clear</button></div>
                              <div className="flex items-center gap-2 py-1.5 text-sm"><span className="flex-1 truncate">{filterDraft.type === 'Expense' ? 'Debits only' : 'Credits only'}</span><button onClick={() => setFilterDraft((d) => ({ ...d, type: 'All' }))} className="text-content-3 hover:text-content shrink-0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg></button></div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* footer */}
                  <div className="flex items-center justify-between px-5 py-3.5 border-t border-line">
                    <button onClick={clearFilters} className="h-10 px-[18px] rounded-[10px] border border-line-strong bg-surface-2 text-content font-semibold text-sm">Clear</button>
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

      {isMobile ? (
        /* Mobile: Standalone cards */
        <div className="flex flex-col gap-1.5">
          {displayRows.map(({ t, split }) => {
            const catType = split ? split.type : (t.category?.type ?? t.splits?.[0]?.type ?? 'expense');
            const { text: amtText, className: amtClass } = fmtTransaction(split ? split.amount : t.amount, catType);
            return (
              <div key={split ? `${t.id}-split-${split.id}` : t.id}
                onClick={() => { if (hasPermission('transactions.edit')) openDetail(t, split); }}
                className={`bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] shadow-[var(--bg-card-shadow)] px-3.5 py-2.5 flex justify-between items-center ${hasPermission('transactions.edit') ? 'cursor-pointer active:bg-[var(--bg-hover)]' : ''}`}>
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-[var(--text-primary)] truncate">{split ? splitVendorLabel(t, split) : vendorLabel(t)}</span>
                    {split && <span className="shrink-0 inline-flex items-center justify-center w-[16px] h-[16px] rounded-md" style={{ background: 'color-mix(in srgb, var(--primary) 14%, transparent)', color: 'var(--primary)' }} title="Part of a split transaction">{splitIcon(10)}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">{t.date}</span>
                    <span className="text-[var(--text-muted)]">·</span>
                    {split ? (
                      <CategoryBadge name={split.subName} color={getCategoryColor(split.groupName, allGroupNames)} />
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
            <div className="flex items-center gap-2.5">
              <button onClick={exitBulkMode} className="h-10 px-4 rounded-[11px] bg-surface-2 border border-line-strong text-content font-semibold text-sm">Cancel</button>
              <button onClick={openBulkEdit} disabled={selectedIds.size === 0}
                className="flex items-center gap-2 h-10 px-4 rounded-[11px] bg-primary text-on-primary font-bold text-sm shadow-sm disabled:opacity-50">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                Edit {selectedIds.size}
              </button>
              <button onClick={deleteSelected} disabled={selectedIds.size === 0}
                className="h-10 px-4 rounded-[11px] font-bold text-sm disabled:opacity-50"
                style={bulkConfirmDelete
                  ? { background: 'var(--negative)', color: '#fff' }
                  : { color: 'var(--negative)', background: 'color-mix(in srgb, var(--negative) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--negative) 40%, transparent)' }}>
                {bulkConfirmDelete ? 'Confirm delete?' : 'Delete selected'}
              </button>
            </div>
          </div>
        )}
        {/* date-grouped rows */}
        {dateGroups.map((g) => (
          <div key={g.date}>
            <div className="flex items-center justify-between px-6 py-2.5 bg-surface-2 border-t border-b border-line">
              <span className="text-[13px] font-semibold text-content-2">{formatDateHeader(g.date)}</span>
              <span className="font-mono text-xs tabular-nums" style={{ color: g.net < 0 ? 'var(--positive)' : 'var(--text-3)' }}>{g.net < 0 ? `+${fmt(Math.abs(g.net))}` : fmt(g.net)}</span>
            </div>
            {g.rows.map((r) => renderRow(r.t, r.split))}
          </div>
        ))}
        {transactions.length === 0 && <div className="text-center py-10 text-content-3 text-sm">No transactions found for this period</div>}
      </div>
      )}
      {editCell && <div className="fixed inset-0 z-[55]" onClick={() => { setEditCell(null); setCellSearch(''); }} />}

      {/* ===== Bulk-edit sidebar (multi-select) ===== */}
      {bulkEditOpen && (
        <>
          <div onClick={() => setBulkEditOpen(false)} className="fixed inset-0 z-[70]" style={{ background: 'rgba(6,8,12,.5)' }} />
          <div className="fixed top-0 right-0 bottom-0 z-[71] w-[440px] max-w-full bg-surface border-l border-line-strong shadow-md flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <div>
                <div className="text-lg font-extrabold tracking-tight">Edit transactions</div>
                <div className="text-[13px] text-content-3">{selectedIds.size} selected</div>
              </div>
              <button onClick={() => setBulkEditOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-[9px] text-content-2 hover:bg-surface-2"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
              <p className="text-[13px] text-content-3 -mt-2">Set any of the fields below. Changes apply to all {selectedIds.size} selected transactions.</p>
              {/* Merchant */}
              <div>
                <div className="text-[13px] font-semibold text-content-2 mb-2">Merchant</div>
                <input value={bulkMerchant} onChange={(e) => setBulkMerchant(e.target.value)} list="bulk-merchant-list" placeholder="Choose or type a merchant…" className="w-full h-11 px-3.5 rounded-[11px] bg-surface-2 border border-line text-content text-sm outline-none" />
                <datalist id="bulk-merchant-list">{merchants.map((m) => <option key={m.id} value={m.name} />)}</datalist>
              </div>
              {/* Category */}
              <div>
                <div className="text-[13px] font-semibold text-content-2 mb-2">Category</div>
                <div className="relative">
                  <select value={bulkCategoryId} onChange={(e) => setBulkCategoryId(e.target.value ? parseInt(e.target.value) : '')} className="w-full h-11 pl-3.5 pr-9 rounded-[11px] bg-surface-2 border border-line text-content text-sm outline-none appearance-none cursor-pointer">
                    <option value="">Choose category…</option>
                    {groupedAll.map(([group, subs]) => <optgroup key={group} label={group}>{subs.map((c) => <option key={c.id} value={c.id}>{c.sub_name}</option>)}</optgroup>)}
                  </select>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" className="absolute right-3 top-3.5 pointer-events-none"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
              {/* Date */}
              <div>
                <div className="text-[13px] font-semibold text-content-2 mb-2">Date</div>
                <div className="relative">
                  <button type="button" onClick={() => setBulkCalOpen((o) => !o)} className="w-full flex items-center justify-between h-11 px-3.5 rounded-[11px] bg-surface-2 border border-line text-sm"
                    style={{ borderColor: bulkCalOpen ? 'var(--primary)' : 'var(--line)' }}>
                    <span className={bulkDate ? 'text-content tabular-nums' : 'text-content-3'}>{bulkDate ? new Date(bulkDate + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'Choose date…'}</span>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4.5" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>
                  </button>
                  {bulkCalOpen && (
                    <div className="absolute top-12 left-0 z-[60] w-[320px] bg-elevated border border-line-strong rounded-[14px] shadow-md p-3">
                      <Calendar value={bulkDate} onChange={(d) => { setBulkDate(d); setBulkCalOpen(false); }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-6 py-4 border-t border-line">
              <button onClick={() => setBulkEditOpen(false)} className="flex-1 h-11 rounded-[11px] bg-surface-2 border border-line-strong text-content font-semibold text-sm">Cancel</button>
              <button onClick={applyBulkEdit} disabled={!(bulkMerchant.trim() || bulkCategoryId || bulkDate)} className="flex-1 h-11 rounded-[11px] bg-primary text-on-primary font-bold text-sm shadow-sm disabled:opacity-50">Apply changes</button>
            </div>
          </div>
        </>
      )}

      {/* ===== Detail side panel ===== */}
      {detail && (
        <>
          <div onClick={closeDetail} className="fixed inset-0 z-[70]" style={{ background: 'rgba(6,8,12,.5)' }} />
          <div className="fixed top-0 right-0 bottom-0 z-[71] w-[440px] max-w-full bg-surface border-l border-line-strong shadow-md flex flex-col">
            <div className="flex items-center justify-between gap-1.5 px-5 py-3 border-b border-line">
              <span className="text-[15px] font-extrabold tracking-tight">Transaction</span>
              <button onClick={closeDetail} className="w-9 h-9 flex items-center justify-center rounded-[9px] text-content-2 hover:bg-surface-2"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {(() => {
                const catType = detail.category?.type ?? detail.splits?.[0]?.type ?? 'expense';
                const { text: amtText, className: amtClass } = fmtTransaction(detail.amount, catType);
                const color = getCategoryColorHex(detail.category?.groupName);
                const initial = (vendorLabel(detail)?.trim()?.[0] ?? '?').toUpperCase();
                const isSplit = !!(detail.splits && detail.splits.length > 0);
                const fieldCls = 'w-full h-12 px-3.5 rounded-[11px] bg-surface-2 border border-line text-content text-[15px] outline-none';
                const labelCls = 'text-[13px] font-semibold text-content-2 mb-2';
                const commitMerchant = () => { const v = detailMerchant.trim(); if (v && v !== vendorLabel(detail)) updateTxnField(detail, { merchant: v }); };
                const commitStatement = () => {
                  const v = detailStatement.trim();
                  // Never wipe the raw bank text to empty — a merchant-less row
                  // would lose its only vendor label. Clearing reverts.
                  if (!v) { setDetailStatement(detail.description ?? ''); return; }
                  if (v !== (detail.description ?? '')) updateTxnField(detail, { description: v });
                };
                const commitAmount = () => {
                  if (isSplit) return;
                  const entered = parseFloat(detailAmount);
                  if (isNaN(entered) || entered === parseFloat(displayAmount(detail))) return;
                  updateTxnField(detail, { amount: entered });
                };
                // Accounts grouped by owner for the select.
                const acctGroups = new Map<string, Account[]>();
                for (const a of accounts) { const k = a.isShared ? 'Shared' : (a.owners?.[0]?.displayName || a.owner); if (!acctGroups.has(k)) acctGroups.set(k, []); acctGroups.get(k)!.push(a); }

                // ===== Split-CHILD view: one leg opened as its own transaction =====
                const activeSplit = detailSplitId != null ? (detail.splits?.find((s) => s.id === detailSplitId) ?? null) : null;
                if (activeSplit) {
                  const scolor = getCategoryColorHex(activeSplit.groupName);
                  const { text: sAmt, className: sClass } = fmtTransaction(activeSplit.amount, activeSplit.type);
                  const sLabel = splitVendorLabel(detail, activeSplit);
                  const sInitial = (sLabel?.trim()?.[0] ?? '?').toUpperCase();
                  const childDir: 'income' | 'expense' = activeSplit.type === 'income' ? 'income' : 'expense';
                  // Same-direction categories only (+ always keep the current one), so a
                  // PATCH can't leave the leg's sign contradicting its category.
                  const childGroups = groupedAll
                    .map(([g, subs]) => [g, subs.filter((c) => c.type !== 'transfer' && ((childDir === 'income' ? c.type === 'income' : c.type !== 'income') || c.id === activeSplit.categoryId))] as [string, Category[]])
                    .filter(([, subs]) => subs.length > 0);
                  const mSeed = legMerchantSeed(detail, activeSplit);
                  // Compare to the seed (own-or-parent, no statement fallback) and allow
                  // clearing → '' → inherit the parent merchant again.
                  const commitSplitMerchant = () => { splitFieldFocused.current = null; const v = detailSplitMerchant.trim(); if (v !== mSeed) patchSplitField({ merchant: v }); };
                  const commitSplitNote = () => { splitFieldFocused.current = null; if ((activeSplit.note ?? '') !== detailSplitNote) patchSplitField({ note: detailSplitNote }); };
                  const roCls = `${fieldCls} mb-6 flex items-center text-content-2`;
                  const dateLabel = new Date(detail.date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                  return (
                    <>
                      <div className="flex items-center gap-4 mb-5">
                        <span className="shrink-0 rounded-full flex items-center justify-center font-bold text-xl" style={{ width: 52, height: 52, background: `color-mix(in srgb, ${scolor} 16%, transparent)`, color: scolor }}>{sInitial}</span>
                        <div className="min-w-0">
                          <div className={`text-[28px] font-extrabold tracking-tight tabular-nums leading-none ${sClass}`}>{sAmt}</div>
                          <div className="text-[12px] text-content-3 mt-1 truncate">{accountLabel(detail.account)}</div>
                        </div>
                      </div>

                      {/* This-is-a-split callout */}
                      <div className="mb-6 rounded-[12px] border p-4 flex items-start gap-3" style={{ borderColor: 'color-mix(in srgb, var(--primary) 30%, var(--line))', background: 'color-mix(in srgb, var(--primary) 8%, transparent)' }}>
                        <span className="shrink-0 mt-0.5" style={{ color: 'var(--primary)' }}>{splitIcon(16)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-content-2 leading-snug">
                            This is a split of <span className="font-bold text-content">{fmt(Math.abs(detail.amount))}</span> from <span className="font-bold text-content">{vendorLabel(detail)}</span> on {dateLabel}.
                          </div>
                          <button onClick={openSplit} className="mt-2.5 h-9 px-3.5 rounded-[9px] bg-primary text-on-primary font-bold text-[13px] shadow-sm">Open splits</button>
                        </div>
                      </div>

                      <div className={labelCls}>Merchant</div>
                      <input value={detailSplitMerchant} onChange={(e) => setDetailSplitMerchant(e.target.value)} onFocus={() => { splitFieldFocused.current = 'merchant'; }} onBlur={commitSplitMerchant}
                        list="txn-merchant-list" placeholder="Set merchant…" className={`${fieldCls} font-semibold mb-6`} />
                      <datalist id="txn-merchant-list">{merchants.map((m) => <option key={m.id} value={m.name} />)}</datalist>

                      <div className={labelCls}>Amount</div>
                      <div className={`${fieldCls} mb-6 flex items-center justify-between`}>
                        <span className={`tabular-nums font-semibold ${sClass}`}>{sAmt}</span>
                        <button onClick={openSplit} className="text-[12px] font-semibold text-primary">Edit in splits</button>
                      </div>

                      <div className={labelCls}>Category</div>
                      <div className="relative mb-6">
                        <select value={activeSplit.categoryId} onChange={(e) => e.target.value && patchSplitField({ categoryId: parseInt(e.target.value) })}
                          className="w-full h-12 pl-3.5 pr-9 rounded-[11px] bg-surface-2 border border-line text-content text-[15px] outline-none appearance-none cursor-pointer">
                          {childGroups.map(([group, subs]) => (
                            <optgroup key={group} label={group}>{subs.map((c) => <option key={c.id} value={c.id}>{c.sub_name}</option>)}</optgroup>
                          ))}
                        </select>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" className="absolute right-3 top-4 pointer-events-none"><path d="m6 9 6 6 6-6"/></svg>
                      </div>

                      <div className={labelCls}>Account <span className="font-normal text-content-3">(from original)</span></div>
                      <div className={roCls}>{accountLabel(detail.account)}</div>

                      <div className={labelCls}>Date <span className="font-normal text-content-3">(from original)</span></div>
                      <div className={`${roCls} tabular-nums`}>{dateLabel}</div>

                      <div className={labelCls}>Statement <span className="font-normal text-content-3">(from original)</span></div>
                      <div className={`${roCls} truncate`}><span className="truncate">{detail.description}</span></div>

                      <div className={labelCls}>Notes</div>
                      <textarea value={detailSplitNote} onChange={(e) => setDetailSplitNote(e.target.value)} onFocus={() => { splitFieldFocused.current = 'note'; }} onBlur={commitSplitNote}
                        placeholder="Add notes to this split…"
                        className="w-full min-h-[76px] resize-y p-3 rounded-[11px] bg-surface-2 border border-line text-content text-sm outline-none mb-2" />
                    </>
                  );
                }

                return (
                  <>
                    <div className="flex items-center gap-4 mb-6">
                      <span className="shrink-0 rounded-full flex items-center justify-center font-bold text-xl" style={{ width: 52, height: 52, background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>{initial}</span>
                      <div className={`text-[28px] font-extrabold tracking-tight tabular-nums ${amtClass}`}>{amtText}</div>
                    </div>

                    <div className={labelCls}>Merchant</div>
                    <input value={detailMerchant} onChange={(e) => setDetailMerchant(e.target.value)} onBlur={commitMerchant}
                      list="txn-merchant-list" placeholder="Set merchant…" className={`${fieldCls} font-semibold mb-6`} />
                    <datalist id="txn-merchant-list">{merchants.map((m) => <option key={m.id} value={m.name} />)}</datalist>

                    <div className={labelCls}>Amount</div>
                    {isSplit ? (
                      <div className={`${fieldCls} mb-6 flex items-center justify-between text-content-3`}>
                        <span className="tabular-nums text-content">{amtText}</span>
                        <span className="text-[12px]">set by splits</span>
                      </div>
                    ) : (
                      <div className="mb-6" onFocus={() => { amountFieldFocused.current = true; }} onBlur={() => { amountFieldFocused.current = false; }}>
                        <CurrencyInput allowNegative value={detailAmount} onChange={setDetailAmount} onBlur={commitAmount} className={fieldCls} />
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-semibold text-content-2">Category</span>
                      {!isSplit && <button onClick={openSplit} className="text-[13px] font-semibold text-primary inline-flex items-center gap-1.5">{splitIcon(13)}Split</button>}
                    </div>
                    {isSplit ? (
                      <div className="mb-6 rounded-[12px] border p-4" style={{ borderColor: 'color-mix(in srgb, var(--primary) 30%, var(--line))', background: 'color-mix(in srgb, var(--primary) 8%, transparent)' }}>
                        <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--primary)' }}>
                          {splitIcon(15)}
                          <span className="text-[13px] font-bold">Split across {detail.splits!.length} categories</span>
                        </div>
                        <div className="flex flex-col gap-1 mb-3.5">
                          {detail.splits!.map((s) => {
                            const { text, className } = fmtTransaction(s.amount, s.type);
                            return (
                              <button key={s.id} onClick={() => openDetail(detail, s)}
                                className="flex items-center gap-2 text-sm text-left rounded-lg px-2 py-1.5 -mx-2 hover:bg-surface-2">
                                <span className="text-[15px] leading-none">{getCategoryEmoji(s.groupName)}</span>
                                <span className="flex-1 truncate text-content">{splitVendorLabel(detail, s)} · {s.subName}</span>
                                <span className={`tabular-nums font-semibold ${className}`}>{text}</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-content-3 shrink-0"><path d="m9 6 6 6-6 6"/></svg>
                              </button>
                            );
                          })}
                        </div>
                        <button onClick={openSplit} className="w-full h-10 rounded-[10px] bg-primary text-on-primary font-bold text-sm shadow-sm">Open splits</button>
                      </div>
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

                    <div className={labelCls}>Account</div>
                    <div className="relative mb-6">
                      <select value={detail.account.id} onChange={(e) => e.target.value && updateTxnField(detail, { accountId: parseInt(e.target.value) })}
                        className="w-full h-12 pl-3.5 pr-9 rounded-[11px] bg-surface-2 border border-line text-content text-[15px] outline-none appearance-none cursor-pointer">
                        {Array.from(acctGroups.entries()).map(([owner, accts]) => (
                          <optgroup key={owner} label={owner}>{accts.map((a) => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}</optgroup>
                        ))}
                      </select>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" className="absolute right-3 top-4 pointer-events-none"><path d="m6 9 6 6 6-6"/></svg>
                    </div>

                    <div className={labelCls}>Date</div>
                    <input type="date" value={detail.date} onChange={(e) => e.target.value && updateTxnField(detail, { date: e.target.value })} className={`${fieldCls} mb-6`} />

                    <div className={labelCls}>Statement <span className="font-normal text-content-3">(raw bank text)</span></div>
                    <input value={detailStatement} onChange={(e) => setDetailStatement(e.target.value)} onBlur={commitStatement}
                      placeholder="Raw bank statement text" className={`${fieldCls} mb-6`} />

                    <div className={labelCls}>Notes</div>
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
      {splitOpen && detail && (() => {
        const absTotal = Math.abs(detail.amount);
        const balanced = Math.abs(splitRemainingVal) < 0.01;
        const isExistingSplit = !!(detail.splits && detail.splits.length > 0);
        const oColor = getCategoryColorHex(detail.category?.groupName);
        const oInitial = (vendorLabel(detail)?.trim()?.[0] ?? '?').toUpperCase();
        const pctOf = (amt: string) => {
          const a = parseFloat(amt);
          if (!a || !absTotal) return '';
          const p = (a / absTotal) * 100;
          return Number.isInteger(Math.round(p * 10) / 10) ? String(Math.round(p)) : p.toFixed(1);
        };
        const setRow = (i: number, patch: Partial<{ categoryId: number | ''; amount: string; merchant: string; pctRaw: string }>) =>
          setSplitDraft((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));
        return (
        <div onClick={() => setSplitOpen(false)} className="fixed inset-0 z-[80] flex items-center justify-center p-6" style={{ background: 'rgba(6,8,12,.6)', backdropFilter: 'blur(3px)' }}>
          <div onClick={(e) => e.stopPropagation()} className="w-[620px] max-w-full max-h-[90vh] bg-surface border border-line-strong rounded-card shadow-md overflow-hidden flex flex-col">
            <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-line">
              <div>
                <div className="text-[19px] font-extrabold tracking-tight">Split transaction</div>
                <div className="text-[13px] text-content-3 mt-0.5">Splitting creates individual transactions you can categorize and manage separately.</div>
              </div>
              <button onClick={() => setSplitOpen(false)} className="w-9 h-9 shrink-0 flex items-center justify-center rounded-[9px] text-content-2 hover:bg-surface-2"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* ORIGINAL — expandable card */}
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-content-3 mb-2">Original</div>
              <div className="rounded-[12px] border border-line bg-surface-2 mb-5">
                <button onClick={() => setSplitOrigExpanded((v) => !v)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.2" strokeLinecap="round" className="shrink-0 transition-transform" style={{ transform: splitOrigExpanded ? 'rotate(90deg)' : 'none' }}><path d="m9 6 6 6-6 6"/></svg>
                  <span className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-bold text-[13px]" style={{ background: `color-mix(in srgb, ${oColor} 16%, transparent)`, color: oColor }}>{oInitial}</span>
                  <span className="font-semibold text-[15px] truncate flex-1">{vendorLabel(detail)}</span>
                  <span className="flex items-center gap-1.5 text-[13px] text-content-2 shrink-0">
                    {detail.category && <><span className="text-[15px] leading-none">{getCategoryEmoji(detail.category.groupName)}</span><span className="truncate max-w-[120px]">{detail.category.subName}</span></>}
                  </span>
                  <span className="font-bold tabular-nums text-[15px] shrink-0 ml-2">{fmt(absTotal)}</span>
                </button>
                {splitOrigExpanded && (
                  <div className="px-3.5 pb-3.5 pt-1 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line">
                    <div><div className="text-[11px] font-semibold text-content-3 mb-0.5">Original statement</div><div className="text-[13px] text-content-2 break-words">{detail.description || '—'}</div></div>
                    <div><div className="text-[11px] font-semibold text-content-3 mb-0.5">Notes</div><div className="text-[13px] text-content-2 break-words">{detail.note || 'No notes'}</div></div>
                  </div>
                )}
              </div>

              {/* SPLITS header + $/% toggle */}
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-content-3">Splits</span>
                <SegmentedControl
                  options={[{ label: 'By Amount', value: '$' }, { label: 'By Percent', value: '%' }]}
                  value={splitMode}
                  onChange={(v) => { setSplitMode(v as '$' | '%'); setSplitDraft((d) => d.map((x) => ({ ...x, pctRaw: undefined }))); }}
                />
              </div>

              <datalist id="split-merchant-list">{merchants.map((m) => <option key={m.id} value={m.name} />)}</datalist>
              {splitDraft.map((r, i) => (
                <div key={r.id ?? `new-${i}`} className="flex items-center gap-2 mb-2.5">
                  {/* Merchant */}
                  <input value={r.merchant} onChange={(e) => setRow(i, { merchant: e.target.value })}
                    list="split-merchant-list" placeholder="Merchant"
                    className="w-[150px] shrink-0 h-11 px-3 rounded-[10px] bg-surface-2 border border-line text-content text-[14px] font-medium outline-none" />
                  {/* Category */}
                  <div className="relative flex-1 min-w-0">
                    <select value={r.categoryId} onChange={(e) => setRow(i, { categoryId: e.target.value ? parseInt(e.target.value) : '' })}
                      className="w-full h-11 pl-3 pr-8 rounded-[10px] bg-surface-2 border border-line text-content text-[14px] font-medium outline-none appearance-none cursor-pointer">
                      <option value="">Category…</option>
                      {splitModalGroups.map(([group, subs]) => (<optgroup key={group} label={group}>{subs.map((c) => <option key={c.id} value={c.id}>{c.sub_name}</option>)}</optgroup>))}
                    </select>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" className="absolute right-2.5 top-3 pointer-events-none"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                  {/* Amount ($ or %) */}
                  <div className="relative w-[104px] shrink-0">
                    {splitMode === '$' ? (
                      <>
                        <span className="absolute left-3 top-3 text-[14px] text-content-3 font-semibold">$</span>
                        <input value={r.amount} onChange={(e) => setRow(i, { amount: e.target.value.replace(/[^0-9.]/g, ''), pctRaw: undefined })} inputMode="decimal" placeholder="0.00"
                          className="w-full h-11 pl-6 pr-2.5 rounded-[10px] bg-surface-2 border border-line text-content text-[14px] font-semibold text-right tabular-nums outline-none" />
                      </>
                    ) : (
                      <>
                        {/* Keep the raw keystrokes (pctRaw) so a decimal point / leading zero
                            isn't swallowed by re-deriving the value from the rounded amount. */}
                        <input value={r.pctRaw ?? pctOf(r.amount)} onChange={(e) => { const raw = e.target.value.replace(/[^0-9.]/g, ''); const p = parseFloat(raw) || 0; setRow(i, { pctRaw: raw, amount: (absTotal * p / 100).toFixed(2) }); }} inputMode="decimal" placeholder="0"
                          className="w-full h-11 pl-3 pr-6 rounded-[10px] bg-surface-2 border border-line text-content text-[14px] font-semibold text-right tabular-nums outline-none" />
                        <span className="absolute right-2.5 top-3 text-[14px] text-content-3 font-semibold pointer-events-none">%</span>
                      </>
                    )}
                  </div>
                  {splitDraft.length > 2 ? (
                    <button onClick={() => setSplitDraft((d) => d.filter((_, j) => j !== i))} className="w-9 h-9 shrink-0 flex items-center justify-center rounded-[10px] text-content-3 hover:bg-surface-2 hover:text-negative"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button>
                  ) : <span className="w-9 shrink-0" />}
                </div>
              ))}
              {/* Add-a-split pill + LEFT TO SPLIT indicator */}
              <div className="flex items-center justify-between mt-2">
                <button onClick={() => setSplitDraft((d) => [...d, { categoryId: '', amount: '', merchant: detail.merchant?.name ?? '' }])} className="inline-flex items-center gap-2 h-10 px-3.5 rounded-[11px] border border-dashed border-line-strong text-primary text-sm font-bold">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>Add a split
                </button>
                <div className="flex items-center gap-2">
                  {balanced && <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--positive)' }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6"/></svg></span>}
                  <div className="text-right leading-tight">
                    <div className="text-[17px] font-extrabold tabular-nums" style={{ color: balanced ? 'var(--positive)' : 'var(--negative)' }}>{fmt(Math.abs(splitRemainingVal))}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-content-3">{splitRemainingVal < -0.005 ? 'Over by' : 'Left to split'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-line">
              {isExistingSplit && canEdit ? (
                <button onClick={removeSplitFromDetail} className="h-[42px] px-[16px] rounded-[11px] font-bold text-sm" style={{ color: 'var(--negative)', background: 'transparent' }}>Unsplit</button>
              ) : <span />}
              <div className="flex items-center gap-2.5">
                <button onClick={() => setSplitOpen(false)} className="h-[42px] px-[18px] rounded-[11px] border border-line-strong bg-surface-2 text-content font-semibold text-sm">Cancel</button>
                <button onClick={saveSplit} disabled={!splitValid} className="h-[42px] px-[22px] rounded-[11px] bg-primary text-on-primary font-bold text-sm shadow-sm disabled:opacity-50">Save</button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Infinite scroll: sentinel loads the next batch as it nears the viewport */}
      <div ref={loadMoreRef} />
      <div className={`mt-3 mb-16 text-center font-mono text-[12px] text-content-3`}>
        {total > 0 ? (hasMore ? `Showing ${transactions.length} of ${total} — scroll for more` : `All ${total} transactions`) : 'No transactions'}
      </div>

      {/* Modal */}
      {editing !== null && (
        <TransactionForm
          transaction={editing === 'new' ? undefined : editing}
          accounts={accounts}
          categories={categories}
          merchants={merchants}
          onSave={handleSave}
          onDelete={editing !== 'new' && hasPermission('transactions.delete') ? handleDelete : undefined}
          onClose={() => { setEditing(null); setPendingSave(null); setDuplicateMatch(null); }}
          duplicateMatch={duplicateMatch}
        />
      )}
    </div>
  );
}
