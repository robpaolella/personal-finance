import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';
import { fmt, fmtWhole } from '../lib/formatters';
import KPICard from '../components/KPICard';
import OwnerFilter from '../components/OwnerFilter';

const CATEGORY_COLORS: Record<string, string> = {
  'Auto/Transportation': '#ef4444', 'Clothing': '#ec4899', 'Daily Living': '#10b981',
  'Discretionary': '#a855f7', 'Dues/Subscriptions': '#6366f1', 'Entertainment': '#8b5cf6',
  'Household': '#3b82f6', 'Insurance': '#f59e0b', 'Health': '#14b8a6',
  'Utilities': '#f97316', 'Savings': '#06b6d4',
};

interface IncomeRow {
  categoryId: number;
  subName: string;
  budgeted: number;
  budgetId: number | null;
  actual: number;
}

interface ExpenseSub {
  categoryId: number;
  subName: string;
  budgeted: number;
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
}

interface BudgetSummary {
  income: IncomeRow[];
  expenseGroups: ExpenseGroup[];
  totals: Totals;
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
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [owner, setOwner] = useState('All');
  const [data, setData] = useState<BudgetSummary | null>(null);
  const [editingCell, setEditingCell] = useState<{ categoryId: number; value: string } | null>(null);

  const loadData = useCallback(async () => {
    const res = await apiFetch<{ data: BudgetSummary }>(
      `/budgets/summary?month=${monthStr(month)}&owner=${owner === 'All' ? 'all' : owner}`
    );
    setData(res.data);
  }, [month, owner]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveBudget = async (categoryId: number, amount: number) => {
    await apiFetch('/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId, month: monthStr(month), amount }),
    });
    await loadData();
  };

  const handleBudgetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, categoryId: number) => {
    if (e.key === 'Enter') {
      const val = parseFloat(editingCell?.value || '0');
      if (!isNaN(val) && val >= 0) {
        saveBudget(categoryId, val);
      }
      setEditingCell(null);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleBudgetBlur = (categoryId: number) => {
    const val = parseFloat(editingCell?.value || '0');
    if (!isNaN(val) && val >= 0) {
      saveBudget(categoryId, val);
    }
    setEditingCell(null);
  };

  if (!data) {
    return <div className="text-[#94a3b8] text-[13px] py-8">Loading budget...</div>;
  }

  const { income, expenseGroups, totals } = data;
  const incDiff = totals.actualIncome - totals.budgetedIncome;
  const expRemaining = totals.budgetedExpenses - totals.actualExpenses;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#0f172a] m-0">Monthly Budget</h1>
          <p className="text-[#64748b] text-[13px] mt-1">{monthLabel(month)}</p>
        </div>
        <div className="flex gap-3 items-center">
          <OwnerFilter value={owner} onChange={setOwner} />
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setMonth(prevMonth(month))}
              className="text-[12px] text-[#334155] bg-[#f1f5f9] border-none rounded-md px-2.5 py-1.5 cursor-pointer font-medium hover:bg-[#e2e8f0]"
            >
              ← {shortMonth(prevMonth(month))}
            </button>
            <span className="text-[13px] font-semibold text-[#0f172a] px-2">
              {shortMonth(month)} {month.getFullYear()}
            </span>
            <button
              onClick={() => setMonth(nextMonth(month))}
              className="text-[12px] text-[#334155] bg-[#f1f5f9] border-none rounded-md px-2.5 py-1.5 cursor-pointer font-medium hover:bg-[#e2e8f0]"
            >
              {shortMonth(nextMonth(month))} →
            </button>
          </div>
        </div>
      </div>

      {/* Owner Info Bar */}
      {owner !== 'All' && (
        <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          <span className="text-[13px] text-[#1e40af]">Showing data from <strong>{owner}'s</strong> accounts only</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label="Budgeted Income" value={fmtWhole(totals.budgetedIncome)} />
        <KPICard
          label="Actual Income"
          value={fmtWhole(totals.actualIncome)}
          subtitle={totals.budgetedIncome > 0
            ? (totals.actualIncome >= totals.budgetedIncome ? 'On track' : `${fmtWhole(totals.budgetedIncome - totals.actualIncome)} remaining`)
            : undefined}
          trend={totals.actualIncome >= totals.budgetedIncome ? 'up' : 'down'}
        />
        <KPICard label="Budgeted Expenses" value={fmtWhole(totals.budgetedExpenses)} />
        <KPICard
          label="Actual Expenses"
          value={fmtWhole(totals.actualExpenses)}
          subtitle={totals.budgetedExpenses > 0 ? `${fmtWhole(expRemaining)} remaining` : undefined}
          trend="up"
        />
      </div>

      {/* Two Column: Income + Expenses */}
      <div className="grid grid-cols-2 gap-5">
        {/* Income */}
        <div className="bg-white rounded-xl border border-[#e8ecf1] px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <h3 className="text-[14px] font-bold text-[#10b981] m-0">Income</h3>
          <table className="w-full border-collapse mt-2">
            <thead>
              <tr>
                <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-left">Category</th>
                <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-right">Budget</th>
                <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-right">Actual</th>
                <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-right">Diff</th>
              </tr>
            </thead>
            <tbody>
              {income.map((r) => {
                const diff = r.actual - r.budgeted;
                const isEditing = editingCell?.categoryId === r.categoryId;
                return (
                  <tr key={r.categoryId} className="border-b border-[#f1f5f9]">
                    <td className="px-2.5 py-2 text-[13px] font-medium text-[#0f172a]">{r.subName}</td>
                    <td className="px-2.5 py-2 text-right font-mono text-[12px]">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          step="1"
                          autoFocus
                          className="w-20 text-right font-mono text-[12px] border border-[#3b82f6] rounded px-1.5 py-0.5 outline-none"
                          value={editingCell.value}
                          onChange={(e) => setEditingCell({ categoryId: r.categoryId, value: e.target.value })}
                          onKeyDown={(e) => handleBudgetKeyDown(e, r.categoryId)}
                          onBlur={() => handleBudgetBlur(r.categoryId)}
                        />
                      ) : (
                        <span
                          onClick={() => setEditingCell({ categoryId: r.categoryId, value: String(r.budgeted || '') })}
                          className="cursor-pointer hover:bg-[#f1f5f9] rounded px-1.5 py-0.5 -mx-1.5 text-[#475569]"
                        >
                          {r.budgeted > 0 ? fmt(r.budgeted) : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-2.5 py-2 text-right font-mono text-[12px] font-semibold text-[#0f172a]">
                      {r.actual > 0 ? fmt(r.actual) : '—'}
                    </td>
                    <td className={`px-2.5 py-2 text-right font-mono text-[12px] ${
                      (r.budgeted > 0 || r.actual > 0) ? (diff >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]') : 'text-[#94a3b8]'
                    }`}>
                      {(r.budgeted > 0 || r.actual > 0) ? `${diff >= 0 ? '+' : ''}${fmt(diff)}` : '—'}
                    </td>
                  </tr>
                );
              })}
              {/* Total Row */}
              <tr className="bg-[#f8fafc]">
                <td className="px-2.5 py-2 text-[13px] font-bold text-[#0f172a]">Total</td>
                <td className="px-2.5 py-2 text-right font-mono font-bold text-[#0f172a]">{fmt(totals.budgetedIncome)}</td>
                <td className="px-2.5 py-2 text-right font-mono font-bold text-[#0f172a]">{fmt(totals.actualIncome)}</td>
                <td className={`px-2.5 py-2 text-right font-mono font-bold ${incDiff >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  {incDiff >= 0 ? '+' : ''}{fmt(incDiff)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-xl border border-[#e8ecf1] px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <h3 className="text-[14px] font-bold text-[#f97316] m-0">Expenses</h3>
          <div className="max-h-[460px] overflow-y-auto mt-2">
            {expenseGroups.map((g) => {
              const gBudgeted = g.subs.reduce((s, sub) => s + sub.budgeted, 0);
              const gActual = g.subs.reduce((s, sub) => s + sub.actual, 0);
              const color = CATEGORY_COLORS[g.groupName] || '#94a3b8';
              return (
                <div key={g.groupName} className="mb-3.5">
                  {/* Group Header */}
                  <div className="flex justify-between py-1.5" style={{ borderBottom: `2px solid ${color}30` }}>
                    <span className="font-bold text-[12px] text-[#334155] uppercase tracking-[0.05em] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-sm inline-block" style={{ background: color }} />
                      {g.groupName}
                    </span>
                    <span className={`font-semibold text-[12px] font-mono ${gBudgeted > 0 && gActual > gBudgeted ? 'text-[#ef4444]' : 'text-[#64748b]'}`}>
                      {gActual > 0 ? fmt(gActual) : '—'} / {gBudgeted > 0 ? fmt(gBudgeted) : '—'}
                    </span>
                  </div>
                  {/* Sub-category rows */}
                  {g.subs.map((sub) => {
                    const pct = sub.budgeted > 0 ? Math.min(100, (sub.actual / sub.budgeted) * 100) : (sub.actual > 0 ? 100 : 0);
                    const diff = sub.budgeted - sub.actual;
                    const isEditing = editingCell?.categoryId === sub.categoryId;
                    return (
                      <div key={sub.categoryId} className="flex items-center py-1 pl-3.5 gap-2">
                        <span className="flex-1 text-[12px] text-[#475569]">{sub.subName}</span>
                        <div className="w-[50px] h-1 bg-[#f1f5f9] rounded-sm overflow-hidden">
                          <div className="h-full rounded-sm" style={{
                            width: `${pct}%`,
                            background: sub.budgeted > 0 && sub.actual > sub.budgeted ? '#ef4444' : color,
                          }} />
                        </div>
                        <span className="w-[60px] text-right text-[11px] font-mono text-[#64748b]">
                          {sub.actual > 0 ? fmt(sub.actual) : '—'}
                        </span>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="1"
                            autoFocus
                            className="w-[60px] text-right font-mono text-[11px] border border-[#3b82f6] rounded px-1 py-0.5 outline-none"
                            value={editingCell.value}
                            onChange={(e) => setEditingCell({ categoryId: sub.categoryId, value: e.target.value })}
                            onKeyDown={(e) => handleBudgetKeyDown(e, sub.categoryId)}
                            onBlur={() => handleBudgetBlur(sub.categoryId)}
                          />
                        ) : (
                          <span
                            onClick={() => setEditingCell({ categoryId: sub.categoryId, value: String(sub.budgeted || '') })}
                            className={`w-[60px] text-right text-[11px] font-mono cursor-pointer hover:bg-[#f1f5f9] rounded px-1 py-0.5 -mx-1 ${diff < 0 ? 'text-[#ef4444]' : 'text-[#94a3b8]'}`}
                          >
                            {sub.budgeted > 0 ? fmt(diff) : ''}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
