import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../lib/api';
import { fmt, fmtWhole } from '../lib/formatters';
import Spinner from '../components/Spinner';
import ResponsiveModal from '../components/ResponsiveModal';
import PermissionGate from '../components/PermissionGate';
import BudgetTemplateModal from '../components/BudgetTemplateModal';
import ActionMenu, { type ActionMenuItem } from '../components/ActionMenu';
import PayCyclesModal from '../components/PayCyclesModal';
import { getCategoryEmoji } from '../lib/categoryMeta';
import { SegmentedControl, BudgetBar } from '../components/primitives';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// Recurring overlay meta on a budget row (null when no recurring items apply).
interface RecMeta { amount: number; itemCount: number; items: { label: string; cadence: string }[]; mode: 'set' | 'add' }

interface IncomeRow {
  categoryId: number;
  subName: string;
  budgeted: number; // effective (recurring folded in)
  manual: number;   // raw stored amount (for editing)
  recurring: RecMeta | null;
  overridden: boolean; // per-month sub-floor override active
  budgetId: number | null;
  actual: number;
}

interface ExpenseSub {
  categoryId: number;
  subName: string;
  budgeted: number; // effective (recurring folded in)
  manual: number;   // raw stored amount (for editing)
  recurring: RecMeta | null;
  overridden: boolean; // per-month sub-floor override active
  budgetId: number | null;
  actual: number;
}

interface ExpenseGroup {
  groupName: string;
  subs: ExpenseSub[];
}

interface Totals {
  budgetedIncome: number;
  actualIncome: number;
  budgetedExpenses: number;
  actualExpenses: number;
  budgetedSavings: number;
  actualSavings: number;
  leftToBudget: number;
}

interface BudgetSummary {
  income: IncomeRow[];
  expenseGroups: ExpenseGroup[];
  savingsGroups: ExpenseGroup[];
  totals: Totals;
}

interface AnnualRow {
  categoryId: number;
  subName: string;
  planned: number[]; // 12 months
}
interface AnnualGroup {
  groupName: string;
  subs: AnnualRow[];
}
interface AnnualSummary {
  income: AnnualRow[];
  expenseGroups: AnnualGroup[];
  savingsGroups: AnnualGroup[];
}

type ConflictAction = 'skip' | 'overwrite' | 'add';

interface TemplateImportRow {
  categoryId: number;
  subName: string;
  groupName: string;
  categoryType: string;
  templateAmount: number;
  existingAmount: number | null;
  hasConflict: boolean;
  action: ConflictAction;
}

interface RecurringImportRow {
  id: number;
  label: string;
  categoryId: number;
  subName: string;
  presetAmount: number | null;
  importAmount: string;
  included: boolean;
}

interface PayCycleBreakdown {
  label: string;
  ownerName: string | null;
  paydayCount: number;
  perPaycheckAmount: number;
  projectedAmount: number;
}

interface PayCycleImportRow {
  categoryId: number;
  subName: string;
  projectedAmount: number;
  importAmount: string;
  existingAmount: number | null;
  hasConflict: boolean;
  action: ConflictAction;
  included: boolean;
  hasExtraPaycheck: boolean;
  breakdown: PayCycleBreakdown[];
}

function monthStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(d: Date): string {
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function shortMonth(d: Date): string {
  return d.toLocaleString('en-US', { month: 'short' });
}

function prevMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}

function nextMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

export default function BudgetPage() {
  const { hasPermission } = useAuth();
  const { addToast } = useToast();
  const canEditBudgets = hasPermission('budgets.edit');
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [view, setView] = useState<'month' | 'year'>('month');
  const [data, setData] = useState<BudgetSummary | null>(null);
  const [annualData, setAnnualData] = useState<AnnualSummary | null>(null);
  const [users, setUsers] = useState<{ id: number; displayName: string }[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [showUnbudgeted, setShowUnbudgeted] = useState<Record<string, boolean>>({});
  const [editModal, setEditModal] = useState<{ categoryId: number; groupName: string; subName: string; emoji: string; planned: number; targetMonth: string; recurring: RecMeta | null; manual: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [applyFuture, setApplyFuture] = useState(false);
  const [editOverride, setEditOverride] = useState(false); // per-month sub-floor override

  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState(0);
  const [templateRows, setTemplateRows] = useState<TemplateImportRow[]>([]);
  const [recurringRows, setRecurringRows] = useState<RecurringImportRow[]>([]);
  const [payCycleRows, setPayCycleRows] = useState<PayCycleImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [payCyclesModalOpen, setPayCyclesModalOpen] = useState(false);
  const wizardScrollRef = useRef<HTMLDivElement>(null);
  const [wizardScrollable, setWizardScrollable] = useState(false);

  const checkWizardScroll = useCallback(() => {
    const el = wizardScrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
    const hasOverflow = el.scrollHeight > el.clientHeight + 4;
    setWizardScrollable(hasOverflow && !atBottom);
  }, []);

  useEffect(() => {
    if (!importOpen) return;
    const frame = requestAnimationFrame(() => checkWizardScroll());
    return () => cancelAnimationFrame(frame);
  }, [importOpen, importStep, templateRows, recurringRows, payCycleRows, checkWizardScroll]);

  useEffect(() => {
    apiFetch<{ data: { id: number; display_name: string }[] }>('/users').then((res) =>
      setUsers(res.data.map((u) => ({ id: u.id, displayName: u.display_name })))
    );
  }, []);

  const loadData = useCallback(async () => {
    const res = await apiFetch<{ data: BudgetSummary }>(
      `/budgets/summary?month=${monthStr(month)}`
    );
    setData(res.data);
  }, [month]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadAnnual = useCallback(async () => {
    const res = await apiFetch<{ data: AnnualSummary }>(`/budgets/annual?year=${month.getFullYear()}`);
    setAnnualData(res.data);
  }, [month]);

  useEffect(() => { if (view === 'year') loadAnnual(); }, [view, loadAnnual]);

  const openEdit = (categoryId: number, groupName: string, subName: string, planned: number, targetMonth: string = monthStr(month), recurring: RecMeta | null = null, manual?: number, overridden = false) => {
    // Input edits the TOTAL monthly budget (recurring floor + extra). Seed with the
    // current effective total (planned). On save we back out the stored manual per
    // fold mode so the floor stays applied per-month; an override bypasses the floor.
    setEditModal({ categoryId, groupName, subName, emoji: getCategoryEmoji(groupName), planned, targetMonth, recurring, manual: manual ?? planned });
    setEditValue(planned ? String(planned) : '');
    setApplyFuture(false);
    setEditOverride(overridden);
  };

  const closeEdit = () => setEditModal(null);

  const saveEdit = async () => {
    if (!editModal) return;
    const val = parseFloat(editValue || '0');
    if (isNaN(val) || val < 0) { closeEdit(); return; }
    const rec = editModal.recurring;
    const floor = rec?.amount ?? 0;
    const mode = rec?.mode ?? 'set';
    const below = !!rec && val < floor;
    const overriding = below && editOverride;

    // What to store as the month's manual amount + whether to bypass the floor:
    // - overriding: save the raw sub-floor value; set override=1; THIS MONTH ONLY.
    // - below (not overriding): clamp up to the floor.
    // - at/above: store the manual derived per fold mode (set=total, add=total-floor).
    let stored: number; let override = 0; let applyForward = applyFuture;
    if (overriding) {
      stored = val; override = 1; applyForward = false;
    } else {
      const total = below ? floor : val;
      stored = mode === 'add' ? +(total - floor).toFixed(2) : total;
    }

    const [by, bm] = editModal.targetMonth.split('-').map(Number); // year, month (1-12)
    const months: string[] = [editModal.targetMonth];
    if (applyForward) {
      for (let m = bm; m <= 11; m++) months.push(`${by}-${String(m + 1).padStart(2, '0')}`);
    }
    await Promise.all(months.map((mo) =>
      apiFetch('/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Override is this-month-only; future months (apply-forward) reset to non-override.
        body: JSON.stringify({ categoryId: editModal.categoryId, month: mo, amount: stored, override: mo === editModal.targetMonth ? override : 0 }),
      })
    ));
    closeEdit();
    await loadData();
    if (view === 'year') await loadAnnual();
  };

  const openImportWizard = async () => {
    try {
      const currentMonth = monthStr(month);
      const monthNum = month.getMonth() + 1;

      const [tplRes, recurRes, budgetRes, projRes] = await Promise.all([
        apiFetch<{ data: any[] }>('/budget-templates'),
        apiFetch<{ data: any[] }>(`/budget-recurring?month=${monthNum}`),
        apiFetch<{ data: any[] }>(`/budgets?month=${currentMonth}`),
        apiFetch<{ data: { categoryTotals: any[]; cycles: any[] } }>(`/pay-cycles/projection?month=${currentMonth}`),
      ]);

      const existingMap = new Map<number, number>();
      for (const b of budgetRes.data) {
        existingMap.set(b.category_id, b.amount);
      }

      const tRows: TemplateImportRow[] = tplRes.data.map((t: any) => {
        const existing = existingMap.get(t.category_id) ?? null;
        return {
          categoryId: t.category_id,
          subName: t.sub_name,
          groupName: t.type === 'income' ? 'Income' : t.group_name,
          categoryType: t.type,
          templateAmount: t.amount,
          existingAmount: existing,
          hasConflict: existing !== null,
          action: 'skip' as ConflictAction,
        };
      });

      const rRows: RecurringImportRow[] = recurRes.data.map((r: any) => ({
        id: r.id,
        label: r.label,
        categoryId: r.category_id,
        subName: r.sub_name,
        presetAmount: r.amount,
        importAmount: r.amount != null ? String(r.amount) : '',
        included: true,
      }));

      // Group projected cycles by category for the per-category breakdown
      const cyclesByCat = new Map<number, any[]>();
      for (const cyc of projRes.data.cycles) {
        const arr = cyclesByCat.get(cyc.categoryId) ?? [];
        arr.push(cyc);
        cyclesByCat.set(cyc.categoryId, arr);
      }
      const pcRows: PayCycleImportRow[] = projRes.data.categoryTotals.map((ct: any) => {
        const existing = existingMap.get(ct.categoryId) ?? null;
        return {
          categoryId: ct.categoryId,
          subName: ct.subName,
          projectedAmount: ct.projectedAmount,
          importAmount: String(ct.projectedAmount),
          existingAmount: existing,
          hasConflict: existing !== null,
          action: 'overwrite' as ConflictAction,
          included: true,
          hasExtraPaycheck: !!ct.hasExtraPaycheck,
          breakdown: (cyclesByCat.get(ct.categoryId) ?? []).map((c: any) => ({
            label: c.label,
            ownerName: c.ownerName,
            paydayCount: c.paydayCount,
            perPaycheckAmount: c.perPaycheckAmount,
            projectedAmount: c.projectedAmount,
          })),
        };
      });

      setTemplateRows(tRows);
      setRecurringRows(rRows);
      setPayCycleRows(pcRows);
      setImportStep(0);
      setImportOpen(true);
    } catch {
      addToast('Failed to load import data', 'error');
    }
  };

  const handleApply = async () => {
    setImporting(true);
    try {
      const items: { categoryId: number; amount: number; source: string; action: string }[] = [];

      for (const row of templateRows) {
        if (row.hasConflict && row.action === 'skip') continue;
        items.push({
          categoryId: row.categoryId,
          amount: row.templateAmount,
          source: 'template',
          action: row.hasConflict ? row.action : 'overwrite',
        });
      }

      for (const row of recurringRows) {
        if (!row.included) continue;
        const amt = parseFloat(row.importAmount);
        if (isNaN(amt) || amt <= 0) continue;
        items.push({
          categoryId: row.categoryId,
          amount: amt,
          source: 'recurring',
          action: 'add',
        });
      }

      // Pay-cycle income — pushed last so it wins by order over a template row
      // targeting the same income category (overwrite). Earner summing already
      // happened server-side, so default is 'overwrite' (idempotent), not 'add'.
      for (const row of payCycleRows) {
        if (!row.included) continue;
        if (row.hasConflict && row.action === 'skip') continue;
        const amt = parseFloat(row.importAmount);
        if (isNaN(amt) || amt <= 0) continue;
        items.push({
          categoryId: row.categoryId,
          amount: amt,
          source: 'pay_cycle',
          action: row.hasConflict ? row.action : 'overwrite',
        });
      }

      const res = await apiFetch<{ data: { created: number; updated: number; skipped: number } }>('/budgets/import', {
        method: 'POST',
        body: JSON.stringify({ month: monthStr(month), items }),
      });

      addToast(`Budget imported: ${res.data.created} created, ${res.data.updated} updated`, 'success');
      setImportOpen(false);
      await loadData();
    } catch {
      addToast('Failed to import budget', 'error');
    } finally {
      setImporting(false);
    }
  };

  if (!data) {
    return <Spinner />;
  }

  const { income, expenseGroups, savingsGroups, totals } = data;
  const incomeCategories = income.map((r) => ({ id: r.categoryId, subName: r.subName }));
  const manageItems: ActionMenuItem[] = [
    { key: 'template', label: 'Budget Template', description: 'Monthly template & recurring items', icon: '📋', onClick: () => setTemplateModalOpen(true) },
    { key: 'paycycles', label: 'Pay Cycles', description: 'Biweekly & recurring paychecks', icon: '💸', onClick: () => setPayCyclesModalOpen(true) },
  ];

  const isMonth = view === 'month';
  const now = new Date();
  const isTodayNow = isMonth
    ? (month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth())
    : (month.getFullYear() === now.getFullYear());
  const periodLabel = isMonth ? `${shortMonth(month)} ${month.getFullYear()}` : String(month.getFullYear());
  const subtitle = isMonth ? monthLabel(month) : String(month.getFullYear());
  const goPrev = () => setMonth(isMonth ? prevMonth(month) : new Date(month.getFullYear() - 1, month.getMonth(), 1));
  const goNext = () => setMonth(isMonth ? nextMonth(month) : new Date(month.getFullYear() + 1, month.getMonth(), 1));
  const goToday = () => setMonth(new Date(now.getFullYear(), now.getMonth(), 1));

  // Three sections built from the summary (income is a single 'Income' group).
  const sections = [
    { key: 'income', label: 'Income', groups: [{ groupName: 'Income', subs: income }], planned: totals.budgetedIncome, actual: totals.actualIncome },
    { key: 'expenses', label: 'Expenses', groups: expenseGroups, planned: totals.budgetedExpenses, actual: totals.actualExpenses },
    { key: 'savings', label: 'Savings', groups: savingsGroups, planned: totals.budgetedSavings, actual: totals.actualSavings },
  ];

  // Year view helpers
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const yr = month.getFullYear();
  const isCurYear = yr === now.getFullYear();
  const curMi = now.getMonth();
  const colTint = (m: number) => (isCurYear && m === curMi) ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'transparent';
  const sumCols = (subs: AnnualRow[]) => {
    const t = new Array(12).fill(0);
    for (const s of subs) for (let m = 0; m < 12; m++) t[m] += s.planned[m] || 0;
    return t;
  };
  const annualSections = annualData ? [
    { key: 'income', label: 'Income', groups: [{ groupName: 'Income', subs: annualData.income }] },
    { key: 'expenses', label: 'Expenses', groups: annualData.expenseGroups },
    { key: 'savings', label: 'Savings', groups: annualData.savingsGroups },
  ] : [];

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="page-title text-[22px] font-extrabold text-content tracking-tight m-0">Budget</h1>
          <p className="page-subtitle text-content-3 text-[13px] m-0 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <PermissionGate permission="budgets.edit" fallback="disabled">
            <button onClick={openImportWizard} className="h-10 px-4 rounded-[11px] bg-primary text-on-primary font-bold text-sm shadow-sm hover:bg-primary-hover">
              Import Budget
            </button>
          </PermissionGate>
          <PermissionGate permission="budgets.edit" fallback="disabled">
            <ActionMenu label="Manage" items={manageItems}
              buttonClassName="h-10 px-4 rounded-[11px] bg-surface-2 border border-line-strong text-content font-semibold text-sm hover:bg-surface" />
          </PermissionGate>
          <div className="flex items-center gap-0.5 h-10 px-1 bg-surface border border-line-strong rounded-[11px]">
            <button onClick={goPrev} className="w-8 h-8 flex items-center justify-center rounded-lg text-content-2 hover:bg-surface-2" aria-label="Previous">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <span className="px-2.5 text-sm font-bold tabular-nums text-content text-center" style={{ minWidth: 74 }}>{periodLabel}</span>
            <button onClick={goNext} className="w-8 h-8 flex items-center justify-center rounded-lg text-content-2 hover:bg-surface-2" aria-label="Next">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
          {!isTodayNow && (
            <button onClick={goToday} className="h-10 px-4 rounded-[11px] bg-surface border border-line-strong text-content font-semibold text-sm hover:bg-surface-2">Today</button>
          )}
          <SegmentedControl value={view} onChange={setView}
            options={[{ value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }]} />
        </div>
      </div>

      {/* ===== MONTH VIEW ===== */}
      {isMonth ? (
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_316px] gap-5 items-start">
        {/* Budget table */}
        <div className="bg-surface rounded-card border border-line shadow-sm overflow-hidden">
          <div className="grid gap-3 px-6 py-3.5 border-b border-line font-mono text-[11px] uppercase tracking-wide text-content-3" style={{ gridTemplateColumns: 'minmax(0,1fr) 82px 82px 92px' }}>
            <span>Category</span><span className="text-right">Planned</span><span className="text-right">Actual</span><span className="text-right">Remaining</span>
          </div>
          {sections.map((sec) => {
            const secCollapsed = collapsedSections[sec.key];
            const secRem = sec.planned - sec.actual;
            return (
              <div key={sec.key}>
                <div onClick={() => setCollapsedSections((s) => ({ ...s, [sec.key]: !s[sec.key] }))}
                  className="grid gap-3 px-6 py-2.5 bg-surface-2 border-t border-b border-line text-[13px] font-bold uppercase tracking-wide text-content-2 cursor-pointer items-center"
                  style={{ gridTemplateColumns: 'minmax(0,1fr) 82px 82px 92px' }}>
                  <span className="flex items-center gap-2.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-content-3" style={{ transform: secCollapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform .15s' }}><path d="m9 6 6 6-6 6"/></svg>
                    {sec.label}
                  </span>
                  <span className="text-right tabular-nums">{fmtWhole(sec.planned)}</span>
                  <span className="text-right tabular-nums">{fmtWhole(sec.actual)}</span>
                  <span className="text-right tabular-nums">{fmtWhole(secRem)}</span>
                </div>
                {!secCollapsed && sec.groups.map((g) => {
                  const groupKey = sec.key + '|' + g.groupName;
                  const gCollapsed = collapsedGroups[groupKey];
                  const gPlanned = g.subs.reduce((s, r) => s + r.budgeted, 0);
                  const gActual = g.subs.reduce((s, r) => s + r.actual, 0);
                  const gRem = gPlanned - gActual;
                  const showUn = showUnbudgeted[groupKey];
                  const unbudgeted = g.subs.filter((r) => r.budgeted === 0 && r.actual === 0);
                  const rows = showUn ? g.subs : g.subs.filter((r) => r.budgeted > 0 || r.actual > 0);
                  return (
                    <div key={groupKey}>
                      <div onClick={() => setCollapsedGroups((s) => ({ ...s, [groupKey]: !s[groupKey] }))}
                        className="grid gap-3 px-6 py-3.5 border-b border-line cursor-pointer items-center hover:bg-surface-2/50"
                        style={{ gridTemplateColumns: 'minmax(0,1fr) 82px 82px 92px' }}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-content-3 shrink-0" style={{ transform: gCollapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform .15s' }}><path d="m9 6 6 6-6 6"/></svg>
                          <span className="w-8 h-8 shrink-0 rounded-[9px] bg-surface-2 border border-line flex items-center justify-center text-base leading-none">{getCategoryEmoji(g.groupName)}</span>
                          <span className="font-bold text-[15px] truncate">{g.groupName}</span>
                        </div>
                        <span className="text-right font-bold text-[15px] tabular-nums">{fmtWhole(gPlanned)}</span>
                        <span className="text-right text-[15px] text-content-2 tabular-nums">{fmtWhole(gActual)}</span>
                        <span className="text-right font-bold text-[15px] tabular-nums" style={{ color: gRem < 0 ? 'var(--negative)' : 'var(--positive)' }}>{fmtWhole(gRem)}</span>
                      </div>
                      {!gCollapsed && (
                        <div>
                          {rows.map((r) => {
                            const rem = r.budgeted - r.actual;
                            return (
                              <div key={r.categoryId} className="grid gap-3 pr-6 py-3 border-b border-line items-center" style={{ gridTemplateColumns: 'minmax(0,1fr) 82px 82px 92px', paddingLeft: 52 }}>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                                    <span className="text-sm font-medium truncate">{r.subName}</span>
                                    {r.recurring && (
                                      <span title={`Recurring: ${r.recurring.items.map((i) => i.label).join(', ')} — ${r.recurring.mode === 'add' ? 'added on top' : 'sets the minimum'}`}
                                        className="shrink-0 inline-flex items-center gap-1 px-1.5 h-[18px] rounded-md text-[10px] font-bold tabular-nums"
                                        style={{ background: 'color-mix(in srgb, var(--primary) 14%, transparent)', color: 'var(--primary)' }}>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
                                        {fmt(r.recurring.amount)}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ maxWidth: 320 }}><BudgetBar value={r.actual} max={r.budgeted} /></div>
                                </div>
                                <div className="flex justify-end">
                                  <button onClick={(e) => { e.stopPropagation(); if (canEditBudgets) openEdit(r.categoryId, g.groupName, r.subName, r.budgeted, undefined, r.recurring, r.manual, r.overridden); }}
                                    disabled={!canEditBudgets}
                                    className="min-w-16 text-right text-sm font-semibold text-content tabular-nums px-2.5 py-1.5 rounded-lg border border-line-strong bg-surface-2 enabled:hover:border-primary disabled:cursor-default">
                                    {fmtWhole(r.budgeted)}
                                  </button>
                                </div>
                                <span className="text-right text-sm text-content-2 tabular-nums self-center">{fmtWhole(r.actual)}</span>
                                <span className="text-right text-sm font-semibold tabular-nums self-center" style={{ color: rem < 0 ? 'var(--negative)' : 'var(--positive)' }}>{fmtWhole(rem)}</span>
                              </div>
                            );
                          })}
                          {unbudgeted.length > 0 && (
                            <div onClick={() => setShowUnbudgeted((s) => ({ ...s, [groupKey]: !s[groupKey] }))}
                              className="flex items-center gap-2.5 px-6 py-3 border-b border-line cursor-pointer text-content-3" style={{ paddingLeft: 52 }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                              <span className="text-[13px] font-semibold">{showUn ? 'Hide' : 'Show'} {unbudgeted.length} unbudgeted</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
          <div className="flex items-center justify-between px-6 py-4" style={{ background: 'color-mix(in srgb, var(--positive) 14%, transparent)' }}>
            <span className="text-base font-extrabold">Left to budget</span>
            <span className="text-lg font-extrabold tabular-nums" style={{ color: totals.leftToBudget < 0 ? 'var(--negative)' : 'var(--positive)' }}>{fmtWhole(totals.leftToBudget)}</span>
          </div>
        </div>

        {/* Summary rail */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-2">
          <div className="rounded-card border shadow-sm p-6 text-center" style={{ borderColor: 'color-mix(in srgb, var(--positive) 35%, var(--line))', background: 'color-mix(in srgb, var(--positive) 12%, var(--surface))' }}>
            <div className="text-[34px] font-extrabold tracking-tight tabular-nums" style={{ color: totals.leftToBudget < 0 ? 'var(--negative)' : 'var(--positive)' }}>{fmtWhole(totals.leftToBudget)}</div>
            <div className="text-sm text-content-2 mt-1">Left to budget</div>
          </div>
          <div className="rounded-card border border-line bg-surface shadow-sm p-6">
            {([
              { label: 'Income', planned: totals.budgetedIncome, actual: totals.actualIncome, verb: 'earned' },
              { label: 'Expenses', planned: totals.budgetedExpenses, actual: totals.actualExpenses, verb: 'spent' },
              { label: 'Savings', planned: totals.budgetedSavings, actual: totals.actualSavings, verb: 'saved' },
            ]).map((b, i) => {
              const pct = b.planned > 0 ? Math.min(100, (b.actual / b.planned) * 100) : 0;
              const rem = b.planned - b.actual;
              return (
                <div key={b.label}>
                  {i > 0 && <div className="h-px bg-line my-[18px]" />}
                  <div className="flex items-center justify-between mb-2.5"><span className="text-[15px] font-bold">{b.label}</span><span className="text-[13px] text-content-3 tabular-nums">{fmtWhole(b.planned)} planned</span></div>
                  <div className="h-[7px] rounded-full bg-surface-2 overflow-hidden mb-2"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--positive)' }} /></div>
                  <div className="flex items-center justify-between text-sm"><span className="font-semibold">{fmtWhole(b.actual)} {b.verb}</span><span className="text-content-3"><span className="text-positive font-bold tabular-nums">{fmtWhole(rem)}</span> remaining</span></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      ) : annualData ? (
      /* ===== YEAR VIEW ===== */
      <div className="bg-surface rounded-card border border-line shadow-sm overflow-x-auto">
        <div style={{ minWidth: 'max-content' }}>
          {/* month header */}
          <div className="flex items-center border-b border-line bg-surface-2">
            <div className="w-[250px] shrink-0 px-6 py-3 font-mono text-[11px] uppercase tracking-wide text-content-3 sticky left-0 bg-surface-2 z-[2]">Category</div>
            {MONTHS.map((mn, m) => (
              <div key={m} className="w-[104px] shrink-0 px-3 py-3 text-right font-mono text-[11px] uppercase tracking-wide"
                style={{ color: (isCurYear && m === curMi) ? 'var(--primary)' : 'var(--text-3)', background: colTint(m), fontWeight: (isCurYear && m === curMi) ? 800 : 600 }}>{mn} {yr}</div>
            ))}
          </div>
          {annualSections.map((sec) => {
            const secTotals = sec.groups.reduce<number[]>((acc, g) => { const gt = sumCols(g.subs); return acc.map((v, m) => v + gt[m]); }, new Array(12).fill(0));
            return (
              <div key={sec.key}>
                <div className="flex items-center border-t border-b border-line bg-surface-2">
                  <div className="w-[250px] shrink-0 px-6 py-2.5 text-xs font-bold uppercase tracking-wide text-content-2 sticky left-0 bg-surface-2 z-[2]">{sec.label}</div>
                  {secTotals.map((v, m) => (
                    <div key={m} className="w-[104px] shrink-0 px-3 py-2.5 text-right text-xs font-bold text-content-2 tabular-nums" style={{ background: colTint(m) }}>{fmtWhole(v)}</div>
                  ))}
                </div>
                {sec.groups.map((g) => {
                  const groupKey = 'y|' + sec.key + '|' + g.groupName;
                  const gCollapsed = collapsedGroups[groupKey];
                  const gTotals = sumCols(g.subs);
                  return (
                    <div key={groupKey}>
                      <div onClick={() => setCollapsedGroups((s) => ({ ...s, [groupKey]: !s[groupKey] }))} className="flex items-center border-b border-line cursor-pointer">
                        <div className="w-[250px] shrink-0 px-6 py-3 flex items-center gap-2.5 sticky left-0 bg-surface z-[1]">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-content-3 shrink-0" style={{ transform: gCollapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform .15s' }}><path d="m9 6 6 6-6 6"/></svg>
                          <span className="text-[15px] leading-none">{getCategoryEmoji(g.groupName)}</span>
                          <span className="font-bold text-sm truncate">{g.groupName}</span>
                        </div>
                        {gTotals.map((v, m) => (
                          <div key={m} className="w-[104px] shrink-0 px-3 py-3 text-right text-sm font-semibold tabular-nums" style={{ background: colTint(m) }}>{fmtWhole(v)}</div>
                        ))}
                      </div>
                      {!gCollapsed && g.subs.map((sub) => (
                        <div key={sub.categoryId} className="flex items-center border-b border-line">
                          <div className="w-[250px] shrink-0 px-6 py-2.5 text-sm text-content-2 truncate sticky left-0 bg-surface z-[1]" style={{ paddingLeft: 52 }}>{sub.subName}</div>
                          {sub.planned.map((v, m) => {
                            const past = isCurYear && m < curMi;
                            const targetMonth = `${yr}-${String(m + 1).padStart(2, '0')}`;
                            return (
                              <div key={m} className="w-[104px] shrink-0 px-2.5 py-1.5 flex justify-end" style={{ background: colTint(m) }}>
                                <button onClick={() => { if (canEditBudgets && !past) openEdit(sub.categoryId, g.groupName, `${sub.subName} · ${MONTHS[m]} ${yr}`, v, targetMonth); }}
                                  disabled={!canEditBudgets || past}
                                  className="min-w-16 text-right text-sm tabular-nums px-2.5 py-1.5 rounded-lg enabled:hover:border-primary"
                                  style={{ border: past ? '1px solid transparent' : '1px solid var(--line-strong)', color: past ? 'var(--text-3)' : 'var(--text)' }}>
                                  {fmtWhole(v)}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      ) : (
      <div className="bg-surface rounded-card border border-line shadow-sm p-10 flex justify-center"><Spinner /></div>
      )}

      {/* ===== Edit budget popup ===== */}
      {editModal && (() => {
        const rec = editModal.recurring;
        const floor = rec?.amount ?? 0;
        const val = parseFloat(editValue) || 0;
        const below = !!rec && val < floor;
        const overriding = below && editOverride;
        const extra = Math.max(0, +(val - floor).toFixed(2));
        const inputBorder = overriding ? 'var(--line-strong)' : below ? 'var(--warning)' : 'var(--primary)';
        let helper = ''; let helperColor = 'var(--text-3)';
        if (overriding) { helper = `Overriding for this month only — budgeting ${fmt(floor - val)} below the recurring floor (e.g. a month with no paycheck). The floor returns next month.`; helperColor = 'var(--text-2)'; }
        else if (below) { helper = `Below the ${fmt(floor)} recurring minimum. Set it to the minimum, or override this one month.`; helperColor = 'var(--warning)'; }
        else if (rec && extra === 0) { helper = `Covers the ${fmt(floor)} recurring exactly — no extra room.`; helperColor = 'var(--text-3)'; }
        else if (rec) { helper = `${fmt(floor)} recurring + ${fmt(extra)} extra`; helperColor = 'var(--text-2)'; }
        const clearToFloor = () => { setEditValue(String(floor)); setEditOverride(false); };
        return (
        <div onClick={closeEdit} className="fixed inset-0 z-[80] flex items-center justify-center p-6" style={{ background: 'rgba(6,8,12,.6)', backdropFilter: 'blur(3px)' }}>
          <div onClick={(e) => e.stopPropagation()} className="w-[560px] max-w-full bg-elevated border border-line-strong rounded-[20px] shadow-md overflow-hidden">
            <div className="flex items-center gap-3.5 px-[22px] pt-5 pb-1">
              <span className="w-11 h-11 shrink-0 rounded-[12px] bg-surface-2 border border-line flex items-center justify-center text-[22px] leading-none">{editModal.emoji}</span>
              <span className="text-[22px] font-extrabold tracking-[-0.01em] flex-1 truncate">{editModal.subName}</span>
              <button onClick={closeEdit} className="shrink-0 flex items-center justify-center text-content-3 hover:text-content"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6 18 18"/><path d="M18 6 6 18"/></svg></button>
            </div>
            <div className="px-[22px] pt-[18px] pb-[22px]">
              <div className="text-[12px] font-bold uppercase tracking-[0.05em] text-content-3 mb-[9px]">Monthly budget</div>
              <div className="flex items-center gap-0.5 h-16 px-[18px] rounded-[14px] bg-surface" style={{ border: `2px solid ${inputBorder}`, transition: 'border-color .15s' }}>
                <span className="text-[26px] text-content-3 font-semibold">$</span>
                <input autoFocus value={editValue} onChange={(e) => { setEditValue(e.target.value.replace(/[^0-9.]/g, '')); setEditOverride(false); }} inputMode="decimal"
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') closeEdit(); }}
                  className="flex-1 min-w-0 h-full bg-transparent border-none outline-none text-content text-[30px] font-extrabold tracking-[-0.01em] tabular-nums px-2" />
              </div>
              {rec && (
                <div className="mt-2.5 min-h-[20px]">
                  <div className="text-[13px] leading-[1.45]" style={{ color: helperColor }}>{helper}</div>
                  {below && (
                    <div className="flex items-center gap-[18px] mt-[9px] text-[12.5px] font-bold">
                      {!overriding && <button type="button" onClick={clearToFloor} style={{ color: 'var(--primary)' }}>Set to minimum</button>}
                      {!overriding && <button type="button" onClick={() => setEditOverride(true)} style={{ color: 'var(--text-2)' }}>Override for this month</button>}
                      {overriding && <button type="button" onClick={clearToFloor} style={{ color: 'var(--primary)' }}>Undo override</button>}
                    </div>
                  )}
                </div>
              )}
              {rec && (
                <div className="mt-[18px] rounded-[14px] border p-4" style={{ borderColor: 'color-mix(in srgb, var(--primary) 32%, var(--line))', background: 'color-mix(in srgb, var(--primary) 9%, var(--surface))' }}>
                  <div className="flex items-center gap-2.5" style={{ color: 'var(--primary)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
                    <span className="text-[15px] font-extrabold tabular-nums">{fmt(floor)} recurring this month</span>
                    {overriding && <span className="text-[11px] font-bold uppercase tracking-[0.04em] px-2 py-[3px] rounded-md" style={{ color: 'var(--warning)', background: 'color-mix(in srgb, var(--warning) 16%, transparent)' }}>Overridden</span>}
                  </div>
                  <div className="mt-2 flex flex-col gap-1.5" style={{ marginLeft: 27 }}>
                    {rec.items.map((it, i) => (
                      <div key={i} className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-2)' }}>
                        <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: 'var(--text-3)' }} />
                        <span className="truncate">{it.label} · {it.cadence}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3.5 pt-3 border-t text-[13px] leading-[1.5]" style={{ marginLeft: 27, borderColor: 'color-mix(in srgb, var(--primary) 20%, var(--line))', color: 'var(--text-3)' }}>
                    {overriding
                      ? 'Overridden this month, so recurring is not fully covered by the budget. The minimum returns automatically next month.'
                      : 'This is the minimum budget for the category — recurring is always covered, and anything above it is extra spending room.'}
                  </div>
                </div>
              )}
              <label onClick={() => setApplyFuture((v) => !v)} className="flex items-center gap-3 mt-5 cursor-pointer select-none">
                <span className="w-[22px] h-[22px] shrink-0 rounded-[7px] flex items-center justify-center" style={{ border: `2px solid ${applyFuture ? 'var(--primary)' : 'var(--line-strong)'}`, background: applyFuture ? 'var(--primary)' : 'transparent', transition: '.12s' }}>
                  {applyFuture && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--on-primary)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 6"/></svg>}
                </span>
                <span className="text-[15px] font-semibold">Apply to the rest of {month.getFullYear()}</span>
              </label>
            </div>
            <div className="flex items-center justify-end gap-2.5 px-[22px] py-4 border-t border-line">
              <button onClick={closeEdit} className="h-11 px-5 rounded-[11px] border border-line-strong bg-surface-2 text-content font-bold text-sm">Cancel</button>
              <button onClick={saveEdit} className="h-11 px-[26px] rounded-[11px] bg-primary text-on-primary font-bold text-sm shadow-sm hover:bg-primary-hover">Save</button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Import Wizard Modal */}
      <ResponsiveModal
        title="Import Budget"
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        maxWidth="600px"
      >
        {importStep === 0 && (
          <div>
            <div className="mb-1">
              <p className="text-[14px] font-bold text-[var(--text-primary)] m-0">Step 1 of 4 — Import Monthly Template</p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 mb-3">Importing into: {monthLabel(month)}</p>
            </div>

            {templateRows.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[13px] text-[var(--text-muted)] mb-2">No template entries found.</p>
                <button className="text-[13px] text-[var(--color-accent)] hover:underline bg-transparent border-none cursor-pointer p-0"
                  onClick={() => { setImportOpen(false); setTemplateModalOpen(true); }}>
                  Set up your template first →
                </button>
              </div>
            ) : (
              <div className="relative" style={{ maxHeight: '60vh' }}>
                <div ref={wizardScrollRef} onScroll={checkWizardScroll} className="overflow-y-auto overflow-x-hidden hide-scrollbar" style={{ maxHeight: '60vh' }}>
                {templateRows.some(r => r.hasConflict) && (
                  <div className="bg-[var(--bg-inline-warning)] border border-[var(--bg-inline-warning-border)] rounded-lg px-3 py-2 mb-3 flex items-center justify-between">
                    <span className="text-[12px] text-[var(--text-primary)]">
                      {templateRows.filter(r => r.hasConflict).length} categories already have budget values
                    </span>
                    <select
                      className="text-[12px] font-semibold rounded-md px-2 py-1 border border-[var(--bg-input-border)] bg-[var(--bg-input)] text-[var(--text-primary)] outline-none cursor-pointer"
                      value=""
                      onChange={(e) => {
                        const action = e.target.value as ConflictAction;
                        if (!action) return;
                        setTemplateRows(prev => prev.map(r => r.hasConflict ? { ...r, action } : r));
                      }}
                    >
                      <option value="">Set all conflicts…</option>
                      <option value="skip">Skip</option>
                      <option value="overwrite">Overwrite</option>
                      <option value="add">Add to existing</option>
                    </select>
                  </div>
                )}

                {(() => {
                  const groups = new Map<string, TemplateImportRow[]>();
                  for (const row of templateRows) {
                    const g = groups.get(row.groupName) || [];
                    g.push(row);
                    groups.set(row.groupName, g);
                  }
                  return Array.from(groups.entries()).map(([groupName, rows]) => (
                    <div key={groupName} className="mb-3">
                      <div className="bg-[var(--bg-hover)] px-3 py-1.5 rounded-md mb-1">
                        <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em]">{groupName}</span>
                      </div>
                      <div className="grid grid-cols-[1fr_70px_70px_100px] gap-x-2 px-3 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.04em]">
                        <span>Category</span>
                        <span className="text-right">Template</span>
                        <span className="text-right">Current</span>
                        <span className="text-right">Action</span>
                      </div>
                      {rows.map(row => (
                        <div key={row.categoryId} className="grid grid-cols-[1fr_70px_70px_100px] gap-x-2 px-3 py-1.5 items-center border-b border-[var(--table-row-border)]">
                          <span className="text-[12px] text-[var(--text-body)] truncate">{row.subName}</span>
                          <span className="text-right text-[12px] font-mono text-[var(--text-primary)]">{fmt(row.templateAmount)}</span>
                          <span className="text-right text-[12px] font-mono text-[var(--text-muted)]">
                            {row.existingAmount !== null ? fmt(row.existingAmount) : '—'}
                          </span>
                          <div className="text-right">
                            {row.hasConflict ? (
                              <select
                                className="text-[12px] font-semibold rounded-md px-2 py-1 border border-[var(--bg-input-border)] bg-[var(--bg-input)] text-[var(--text-primary)] outline-none cursor-pointer"
                                value={row.action}
                                onChange={(e) => setTemplateRows(prev => prev.map(r =>
                                  r.categoryId === row.categoryId ? { ...r, action: e.target.value as ConflictAction } : r
                                ))}
                              >
                                <option value="skip">Skip</option>
                                <option value="overwrite">Overwrite</option>
                                <option value="add">Add</option>
                              </select>
                            ) : (
                              <span className="inline-block text-[11px] font-semibold text-[#10b981] bg-[#10b98118] rounded px-2 py-0.5">Add</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
                </div>

                {wizardScrollable && (
                  <>
                    <div className="absolute bottom-0 left-0 right-0 h-[40px] pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, var(--bg-card))' }} />
                    <button onClick={() => wizardScrollRef.current?.scrollBy({ top: 200, behavior: 'smooth' })} className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[28px] h-[28px] rounded-full flex items-center justify-center border border-[var(--bg-card-border)] cursor-pointer scroll-arrow" style={{ background: 'var(--bg-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[var(--bg-card-border)]">
              <button
                onClick={() => setImportOpen(false)}
                className="text-[12px] text-[var(--btn-secondary-text)] bg-[var(--btn-secondary-bg)] border-none rounded-lg px-4 py-2 cursor-pointer font-semibold btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => setImportStep(1)}
                disabled={templateRows.length === 0 && recurringRows.length === 0 && payCycleRows.length === 0}
                className="text-[12px] text-[var(--btn-primary-text)] bg-[var(--btn-primary-bg)] border-none rounded-lg px-4 py-2 cursor-pointer font-semibold btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {importStep === 1 && (
          <div>
            <div className="mb-1">
              <p className="text-[14px] font-bold text-[var(--text-primary)] m-0">Step 2 of 4 — Recurring Items for {month.toLocaleString('en-US', { month: 'long' })}</p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 mb-3">Select recurring items to include in this month's budget.</p>
            </div>

            {recurringRows.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[13px] text-[var(--text-muted)] mb-2">No recurring items for {month.toLocaleString('en-US', { month: 'long' })}.</p>
                <button className="text-[13px] text-[var(--color-accent)] hover:underline bg-transparent border-none cursor-pointer p-0"
                  onClick={() => { setImportOpen(false); setTemplateModalOpen(true); }}>
                  Set up recurring items →
                </button>
              </div>
            ) : (
              <div className="relative" style={{ maxHeight: '60vh' }}>
                <div ref={wizardScrollRef} onScroll={checkWizardScroll} className="overflow-y-auto overflow-x-hidden hide-scrollbar" style={{ maxHeight: '60vh' }}>
                <div className="flex flex-col gap-1">
                  {recurringRows.map((row, idx) => (
                    <div key={row.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg border-b border-[var(--table-row-border)]"
                    >
                      <input
                        type="checkbox"
                        checked={row.included}
                        onChange={() => setRecurringRows(prev => prev.map((r, i) =>
                          i === idx ? { ...r, included: !r.included } : r
                        ))}
                        className="w-4 h-4 cursor-pointer flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] font-medium text-[var(--text-primary)] block truncate">{row.label}</span>
                        <span className="text-[11px] text-[var(--text-muted)]">{row.subName}</span>
                      </div>
                      <div className="w-[90px] flex-shrink-0">
                        <div className="flex items-center rounded border border-[var(--bg-input-border)] bg-[var(--bg-input)]">
                          <span className="pl-2 text-[12px] font-mono text-[var(--text-muted)] flex-shrink-0 select-none">$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Enter amount"
                            value={row.importAmount}
                            disabled={!row.included}
                            onChange={(e) => setRecurringRows(prev => prev.map((r, i) =>
                              i === idx ? { ...r, importAmount: e.target.value.replace(/[^0-9.]/g, '') } : r
                            ))}
                            className="flex-1 min-w-0 text-right text-[12px] font-mono py-1.5 pr-2 bg-transparent outline-none border-none text-[var(--text-body)] disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                </div>

                {wizardScrollable && (
                  <>
                    <div className="absolute bottom-0 left-0 right-0 h-[40px] pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, var(--bg-card))' }} />
                    <button onClick={() => wizardScrollRef.current?.scrollBy({ top: 200, behavior: 'smooth' })} className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[28px] h-[28px] rounded-full flex items-center justify-center border border-[var(--bg-card-border)] cursor-pointer scroll-arrow" style={{ background: 'var(--bg-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[var(--bg-card-border)]">
              <button
                onClick={() => setImportStep(0)}
                className="text-[12px] text-[var(--btn-secondary-text)] bg-[var(--btn-secondary-bg)] border-none rounded-lg px-4 py-2 cursor-pointer font-semibold btn-secondary"
              >
                ← Back
              </button>
              <button
                onClick={() => setImportStep(2)}
                className="text-[12px] text-[var(--btn-primary-text)] bg-[var(--btn-primary-bg)] border-none rounded-lg px-4 py-2 cursor-pointer font-semibold btn-primary"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {importStep === 2 && (
          <div>
            <div className="mb-1">
              <p className="text-[14px] font-bold text-[var(--text-primary)] m-0">Step 3 of 4 — Expected Income</p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 mb-3">Projected take-home for {monthLabel(month)} from your pay cycles. Adjust any amount before it's saved.</p>
            </div>

            {payCycleRows.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[13px] text-[var(--text-muted)] mb-2">No pay cycles project income for {month.toLocaleString('en-US', { month: 'long' })}.</p>
                <button className="text-[13px] text-[var(--color-accent)] hover:underline bg-transparent border-none cursor-pointer p-0"
                  onClick={() => { setImportOpen(false); setPayCyclesModalOpen(true); }}>
                  Set up pay cycles →
                </button>
              </div>
            ) : (
              <div className="relative" style={{ maxHeight: '60vh' }}>
                <div ref={wizardScrollRef} onScroll={checkWizardScroll} className="overflow-y-auto overflow-x-hidden hide-scrollbar" style={{ maxHeight: '60vh' }}>
                <div className="flex flex-col gap-2">
                  {payCycleRows.map((row, idx) => (
                    <div key={row.categoryId} className="rounded-lg border border-[var(--bg-card-border)] px-3 py-2.5" style={{ opacity: row.included ? 1 : 0.5 }}>
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 min-w-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.included}
                            onChange={() => setPayCycleRows(prev => prev.map((r, i) => i === idx ? { ...r, included: !r.included } : r))}
                            className="w-4 h-4 cursor-pointer flex-shrink-0"
                          />
                          <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{row.subName}</span>
                          {row.hasExtraPaycheck && <span className="text-[11px] text-[var(--color-warning)] flex-shrink-0">⚡ extra check</span>}
                        </label>
                        <div className="w-[100px] flex-shrink-0">
                          <div className="flex items-center rounded border border-[var(--bg-input-border)] bg-[var(--bg-input)]">
                            <span className="pl-2 text-[12px] font-mono text-[var(--text-muted)] flex-shrink-0 select-none">$</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={row.importAmount}
                              disabled={!row.included}
                              onChange={(e) => setPayCycleRows(prev => prev.map((r, i) => i === idx ? { ...r, importAmount: e.target.value.replace(/[^0-9.]/g, '') } : r))}
                              className="flex-1 min-w-0 text-right text-[12px] font-mono py-1.5 pr-2 bg-transparent outline-none border-none text-[var(--text-body)] disabled:opacity-50"
                            />
                          </div>
                        </div>
                      </div>
                      {row.breakdown.length > 0 && (
                        <div className="text-[11px] text-[var(--text-muted)] mt-1.5 pl-6 leading-relaxed">
                          {row.breakdown.map((b, i) => (
                            <span key={i}>
                              {i > 0 && <span className="opacity-50"> · </span>}
                              {b.ownerName ?? 'Household'} ({b.label}) {b.paydayCount}×{fmt(b.perPaycheckAmount)} = {fmt(b.projectedAmount)}
                            </span>
                          ))}
                        </div>
                      )}
                      {row.hasConflict && (
                        <div className="flex items-center gap-2 mt-2 pl-6">
                          <span className="text-[11px] text-[var(--color-warning)]">Existing budget {fmt(row.existingAmount ?? 0)} —</span>
                          <select
                            value={row.action}
                            onChange={(e) => setPayCycleRows(prev => prev.map((r, i) => i === idx ? { ...r, action: e.target.value as ConflictAction } : r))}
                            className="text-[11px] font-semibold rounded-md px-2 py-0.5 border border-[var(--bg-input-border)] bg-[var(--bg-input)] text-[var(--text-primary)] outline-none cursor-pointer"
                          >
                            <option value="overwrite">Overwrite</option>
                            <option value="add">Add to it</option>
                            <option value="skip">Skip</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                </div>

                {wizardScrollable && (
                  <>
                    <div className="absolute bottom-0 left-0 right-0 h-[40px] pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, var(--bg-card))' }} />
                    <button onClick={() => wizardScrollRef.current?.scrollBy({ top: 200, behavior: 'smooth' })} className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[28px] h-[28px] rounded-full flex items-center justify-center border border-[var(--bg-card-border)] cursor-pointer scroll-arrow" style={{ background: 'var(--bg-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[var(--bg-card-border)]">
              <button
                onClick={() => setImportStep(1)}
                className="text-[12px] text-[var(--btn-secondary-text)] bg-[var(--btn-secondary-bg)] border-none rounded-lg px-4 py-2 cursor-pointer font-semibold btn-secondary"
              >
                ← Back
              </button>
              <button
                onClick={() => setImportStep(3)}
                className="text-[12px] text-[var(--btn-primary-text)] bg-[var(--btn-primary-bg)] border-none rounded-lg px-4 py-2 cursor-pointer font-semibold btn-primary"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {importStep === 3 && (() => {
          const tplAdds = templateRows.filter(r => !r.hasConflict);
          const tplOverwrites = templateRows.filter(r => r.hasConflict && r.action === 'overwrite');
          const tplAddToExisting = templateRows.filter(r => r.hasConflict && r.action === 'add');
          const tplSkips = templateRows.filter(r => r.hasConflict && r.action === 'skip');
          const includedRecurring = recurringRows.filter(r => r.included && parseFloat(r.importAmount) > 0);
          const excludedRecurring = recurringRows.filter(r => !r.included);
          const includedPayCycles = payCycleRows.filter(r => r.included && !(r.hasConflict && r.action === 'skip') && parseFloat(r.importAmount) > 0);
          const payCycleCatIds = new Set(includedPayCycles.map(r => r.categoryId));
          const incomeCollisions = templateRows.filter(r => r.categoryType === 'income' && !(r.hasConflict && r.action === 'skip') && payCycleCatIds.has(r.categoryId));
          const totalChanges = tplAdds.length + tplOverwrites.length + tplAddToExisting.length + includedRecurring.length + includedPayCycles.length;

          return (
            <div>
              <div className="mb-1">
                <p className="text-[14px] font-bold text-[var(--text-primary)] m-0">Step 4 of 4 — Review Changes</p>
                <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 mb-3">Review the changes that will be applied to {monthLabel(month)}.</p>
              </div>

              <div className="relative" style={{ maxHeight: '60vh' }}>
                <div ref={wizardScrollRef} onScroll={checkWizardScroll} className="overflow-y-auto overflow-x-hidden hide-scrollbar" style={{ maxHeight: '60vh' }}>
              {incomeCollisions.length > 0 && (
                <div className="bg-[var(--bg-inline-warning)] border border-[var(--bg-inline-warning-border)] rounded-lg px-3 py-2 mb-3 text-[12px] text-[var(--text-primary)]">
                  {incomeCollisions.map(r => r.subName).join(', ')} {incomeCollisions.length === 1 ? 'is' : 'are'} set by both the template and pay cycles. The <b>pay cycle amount will be used</b> (applied last).
                </div>
              )}
              {/* Summary */}
              <div className="bg-[var(--bg-hover)] rounded-lg px-4 py-3 mb-4">
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <span className="text-[var(--text-muted)]">Template — new entries:</span>
                  <span className="text-right font-semibold text-[#10b981]">{tplAdds.length}</span>
                  <span className="text-[var(--text-muted)]">Template — overwrites:</span>
                  <span className="text-right font-semibold text-[#f59e0b]">{tplOverwrites.length + tplAddToExisting.length}</span>
                  <span className="text-[var(--text-muted)]">Template — skipped:</span>
                  <span className="text-right font-semibold text-[var(--text-muted)]">{tplSkips.length}</span>
                  <span className="text-[var(--text-muted)]">Recurring — included:</span>
                  <span className="text-right font-semibold text-[var(--text-primary)]">{includedRecurring.length}</span>
                  <span className="text-[var(--text-muted)]">Recurring — excluded:</span>
                  <span className="text-right font-semibold text-[var(--text-muted)]">{excludedRecurring.length}</span>
                  <span className="text-[var(--text-muted)]">Pay cycle income — included:</span>
                  <span className="text-right font-semibold text-[#10b981]">{includedPayCycles.length}</span>
                  <span className="text-[var(--text-primary)] font-semibold border-t border-[var(--bg-card-border)] pt-2 mt-1">Total changes:</span>
                  <span className="text-right font-bold text-[var(--text-primary)] border-t border-[var(--bg-card-border)] pt-2 mt-1">{totalChanges}</span>
                </div>
              </div>

              {/* Detail lists */}
              {tplAdds.length > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] font-semibold text-[#10b981] uppercase tracking-[0.04em] mb-1">New Entries</p>
                  {tplAdds.map(row => (
                    <div key={row.categoryId} className="flex justify-between px-3 py-1 text-[12px]">
                      <span className="text-[var(--text-body)]">{row.subName}</span>
                      <span className="font-mono text-[#10b981]">{fmt(row.templateAmount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {(tplOverwrites.length > 0 || tplAddToExisting.length > 0) && (
                <div className="mb-3">
                  <p className="text-[11px] font-semibold text-[#f59e0b] uppercase tracking-[0.04em] mb-1">Overwrites / Additions</p>
                  {[...tplOverwrites, ...tplAddToExisting].map(row => (
                    <div key={row.categoryId} className="flex justify-between px-3 py-1 text-[12px]">
                      <span className="text-[var(--text-body)]">
                        {row.subName}
                        <span className="text-[10px] text-[var(--text-muted)] ml-1">({row.action})</span>
                      </span>
                      <span className="font-mono text-[#f59e0b]">{fmt(row.templateAmount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {includedRecurring.length > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-[0.04em] mb-1">Recurring Items</p>
                  {includedRecurring.map(row => (
                    <div key={row.id} className="flex justify-between px-3 py-1 text-[12px]">
                      <span className="text-[var(--text-body)]">{row.label}</span>
                      <span className="font-mono text-[var(--color-accent)]">{fmt(parseFloat(row.importAmount))}</span>
                    </div>
                  ))}
                </div>
              )}

              {includedPayCycles.length > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] font-semibold text-[#10b981] uppercase tracking-[0.04em] mb-1">Expected Income (Pay Cycles)</p>
                  {includedPayCycles.map(row => (
                    <div key={row.categoryId} className="flex justify-between px-3 py-1 text-[12px]">
                      <span className="text-[var(--text-body)]">
                        {row.subName}
                        {row.hasConflict && <span className="text-[10px] text-[var(--text-muted)] ml-1">({row.action})</span>}
                      </span>
                      <span className="font-mono text-[#10b981]">{fmt(parseFloat(row.importAmount))}</span>
                    </div>
                  ))}
                </div>
              )}

              {totalChanges === 0 && (
                <div className="text-center py-4">
                  <p className="text-[13px] text-[var(--text-muted)]">No changes to apply. All template items were skipped and no recurring items were included.</p>
                </div>
              )}
                </div>

                {wizardScrollable && (
                  <>
                    <div className="absolute bottom-0 left-0 right-0 h-[40px] pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, var(--bg-card))' }} />
                    <button onClick={() => wizardScrollRef.current?.scrollBy({ top: 200, behavior: 'smooth' })} className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[28px] h-[28px] rounded-full flex items-center justify-center border border-[var(--bg-card-border)] cursor-pointer scroll-arrow" style={{ background: 'var(--bg-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[var(--bg-card-border)]">
                <button
                  onClick={() => setImportStep(2)}
                  className="text-[12px] text-[var(--btn-secondary-text)] bg-[var(--btn-secondary-bg)] border-none rounded-lg px-4 py-2 cursor-pointer font-semibold btn-secondary"
                >
                  ← Back
                </button>
                <button
                  onClick={handleApply}
                  disabled={importing || totalChanges === 0}
                  className="text-[12px] text-white bg-[#10b981] border-none rounded-lg px-4 py-2 cursor-pointer font-semibold hover:bg-[#059669] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? 'Applying…' : 'Apply Changes'}
                </button>
              </div>
            </div>
          );
        })()}
      </ResponsiveModal>
      <BudgetTemplateModal isOpen={templateModalOpen} onClose={() => setTemplateModalOpen(false)} />
      <PayCyclesModal
        isOpen={payCyclesModalOpen}
        onClose={() => setPayCyclesModalOpen(false)}
        users={users}
        incomeCategories={incomeCategories}
      />
    </div>
  );
}
