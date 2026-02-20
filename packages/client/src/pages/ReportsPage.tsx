import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { apiFetch } from '../lib/api';
import { fmtShort, fmtWhole } from '../lib/formatters';
import KPICard from '../components/KPICard';
import OwnerFilter from '../components/OwnerFilter';
import Spinner from '../components/Spinner';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CATEGORY_COLORS: Record<string, string> = {
  'Auto/Transportation': '#ef4444', 'Clothing': '#ec4899', 'Daily Living': '#10b981',
  'Discretionary': '#a855f7', 'Dues/Subscriptions': '#6366f1', 'Entertainment': '#8b5cf6',
  'Household': '#3b82f6', 'Insurance': '#f59e0b', 'Health': '#14b8a6',
  'Utilities': '#f97316', 'Savings': '#06b6d4',
};

interface AnnualData {
  incomeByCategory: Record<string, number[]>;
  expensesByGroup: Record<string, Record<string, number[]>>;
  monthlyIncomeTotals: number[];
  monthlyExpenseTotals: number[];
  monthlyNetTotals: number[];
}

const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <span className="flex transition-transform duration-200" style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
  </span>
);

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const [year, setYear] = useState(currentYear);
  const [owner, setOwner] = useState('All');
  const [years, setYears] = useState<number[]>([]);
  const [data, setData] = useState<AnnualData | null>(null);
  const [expandIncome, setExpandIncome] = useState(false);
  const [expandExpenses, setExpandExpenses] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (g: string) => setExpandedGroups((p) => ({ ...p, [g]: !p[g] }));

  const isAnyExpanded = expandIncome || expandExpenses || Object.values(expandedGroups).some(Boolean);

  const expandAll = () => {
    setExpandIncome(true);
    setExpandExpenses(true);
    if (data) {
      const allGroups: Record<string, boolean> = {};
      for (const g of Object.keys(data.expensesByGroup)) { allGroups[g] = true; }
      setExpandedGroups(allGroups);
    }
  };

  const collapseAll = () => {
    setExpandIncome(false);
    setExpandExpenses(false);
    setExpandedGroups({});
  };

  useEffect(() => {
    apiFetch<{ data: number[] }>('/reports/available-years').then((res) => {
      setYears(res.data);
      if (res.data.length > 0 && !res.data.includes(year)) {
        setYear(res.data[0]);
      }
    });
  }, []);

  const loadData = useCallback(async () => {
    const res = await apiFetch<{ data: AnnualData }>(
      `/reports/annual?year=${year}&owner=${owner === 'All' ? 'all' : owner}`
    );
    setData(res.data);
  }, [year, owner]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalIncome = useMemo(() => data ? sum(data.monthlyIncomeTotals) : 0, [data]);
  const totalExpenses = useMemo(() => data ? sum(data.monthlyExpenseTotals) : 0, [data]);
  const totalNet = totalIncome - totalExpenses;
  const monthsElapsed = year === currentYear ? currentMonthIdx + 1 : 12;
  const avgSavings = monthsElapsed > 0 ? totalNet / monthsElapsed : 0;
  const savingsRate = totalIncome > 0 ? Math.round((totalNet / totalIncome) * 100) : 0;

  const isYTD = year === currentYear;

  if (!data) {
    return <Spinner />;
  }

  const thCls = "text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-1.5 py-2 border-b-2 border-[var(--table-border)]";
  const tdCls = "px-1.5 py-2 font-mono text-[11px]";

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--text-primary)] m-0">Annual Report</h1>
          <p className="text-[var(--text-secondary)] text-[13px] mt-1">{year} {isYTD ? 'Year-to-Date' : 'Full Year'}</p>
        </div>
        <div className="flex gap-3 items-center">
          <OwnerFilter value={owner} onChange={setOwner} />
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-[var(--table-border)] rounded-lg bg-[var(--bg-hover)] px-3 py-2 text-[13px] font-semibold text-[var(--text-primary)] outline-none cursor-pointer"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Owner info bar */}
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
        <KPICard label={`${isYTD ? 'YTD' : ''} Income`} value={fmtWhole(totalIncome)} />
        <KPICard label={`${isYTD ? 'YTD' : ''} Expenses`} value={fmtWhole(totalExpenses)} />
        <KPICard label={`${isYTD ? 'YTD' : ''} Net`} value={fmtWhole(totalNet)} />
        <KPICard
          label="Avg Monthly Savings"
          value={fmtWhole(avgSavings)}
          subtitle={totalIncome > 0 ? `Savings rate: ${savingsRate}%` : undefined}
          trend="up"
        />
      </div>

      {/* Monthly Breakdown Table */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] px-5 py-4 shadow-[var(--card-shadow)] overflow-x-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-bold text-[var(--text-primary)] m-0">Monthly Breakdown</h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 mb-3">Click rows to expand into categories → sub-categories</p>
          </div>
          <button onClick={isAnyExpanded ? collapseAll : expandAll}
            className="text-[12px] text-[var(--text-secondary)] bg-transparent border-none cursor-pointer hover:text-[var(--text-body)]">
            {isAnyExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${thCls} text-left`} style={{ width: 200, minWidth: 180 }}>Category</th>
              {MONTHS.map((m) => <th key={m} className={`${thCls} text-right`}>{m}</th>)}
              <th className={`${thCls} text-right font-bold`}>Total</th>
            </tr>
          </thead>
          <tbody>
            {/* TOTAL INCOME */}
            <tr
              className="cursor-pointer"
              style={{ borderBottom: '2px solid rgba(187, 247, 208, 0.25)' }}
              onClick={() => setExpandIncome(!expandIncome)}
            >
              <td className="px-2.5 py-2 font-bold text-[#15803d] text-[13px]">
                <span className="flex items-center gap-1.5">
                  <ChevronIcon open={expandIncome} />Total Income
                </span>
              </td>
              {data.monthlyIncomeTotals.map((v, i) => (
                <td key={i} className={`${tdCls} text-right ${v !== 0 ? 'text-[#15803d]' : 'text-[#d1d5db]'}`}>
                  {v !== 0 ? fmtShort(v) : '—'}
                </td>
              ))}
              <td className={`${tdCls} text-right font-bold text-[#15803d]`}>{fmtShort(totalIncome)}</td>
            </tr>

            {/* Expanded income categories */}
            {expandIncome && Object.entries(data.incomeByCategory).map(([cat, vals]) => (
              <tr key={cat} className="border-b border-[var(--table-row-border)]">
                <td className="px-2.5 py-2 text-[12px] text-[var(--text-secondary)]" style={{ paddingLeft: 36 }}>{cat}</td>
                {vals.map((v, i) => (
                  <td key={i} className={`${tdCls} text-right ${v !== 0 ? 'text-[var(--text-secondary)]' : 'text-[var(--table-border)]'}`}>
                    {v !== 0 ? fmtShort(v) : '—'}
                  </td>
                ))}
                <td className={`${tdCls} text-right text-[12px] font-semibold text-[var(--text-body)]`}>{fmtShort(sum(vals))}</td>
              </tr>
            ))}

            {/* TOTAL EXPENSES */}
            <tr
              className="cursor-pointer"
              style={{ borderBottom: '2px solid rgba(254, 215, 170, 0.25)' }}
              onClick={() => setExpandExpenses(!expandExpenses)}
            >
              <td className="px-2.5 py-2 font-bold text-[#c2410c] text-[13px]">
                <span className="flex items-center gap-1.5">
                  <ChevronIcon open={expandExpenses} />Total Expenses
                </span>
              </td>
              {data.monthlyExpenseTotals.map((v, i) => (
                <td key={i} className={`${tdCls} text-right ${v > 0 ? 'text-[#c2410c]' : v < 0 ? 'text-[#10b981]' : 'text-[#d1d5db]'}`}>
                  {v !== 0 ? fmtShort(v) : '—'}
                </td>
              ))}
              <td className={`${tdCls} text-right font-bold text-[#c2410c]`}>{fmtShort(totalExpenses)}</td>
            </tr>

            {/* Expanded expense groups → sub-categories */}
            {expandExpenses && Object.entries(data.expensesByGroup).sort(([a], [b]) => a.localeCompare(b)).map(([group, subs]) => {
              const gMonthly = MONTHS.map((_, i) => Object.values(subs).reduce((s, a) => s + a[i], 0));
              const isOpen = expandedGroups[group];
              const color = CATEGORY_COLORS[group] || '#94a3b8';
              return (
                <Fragment key={group}>
                  <tr
                    className="cursor-pointer"
                    style={{ borderBottom: '1px solid var(--table-row-border)' }}
                    onClick={() => toggleGroup(group)}
                  >
                    <td className="px-2.5 py-2 font-semibold text-[12px] text-[var(--text-body)]" style={{ paddingLeft: 28 }}>
                      <span className="flex items-center gap-[5px]">
                        <ChevronIcon open={!!isOpen} />
                        <span className="w-1.5 h-1.5 rounded-sm inline-block" style={{ background: color }} />
                        {group}
                      </span>
                    </td>
                    {gMonthly.map((v, i) => (
                      <td key={i} className={`${tdCls} text-right ${v > 0 ? 'text-[var(--text-body)]' : v < 0 ? 'text-[#10b981]' : 'text-[var(--table-border)]'}`}>
                        {v !== 0 ? fmtShort(v) : '—'}
                      </td>
                    ))}
                    <td className={`${tdCls} text-right text-[12px] font-semibold text-[var(--text-body)]`}>{fmtShort(sum(gMonthly))}</td>
                  </tr>
                  {isOpen && Object.entries(subs).map(([sub, vals]) => (
                    <tr key={sub} className="border-b border-[var(--bg-hover)]">
                      <td className="px-2.5 py-2 text-[11px] text-[var(--text-muted)]" style={{ paddingLeft: 52 }}>{sub}</td>
                      {vals.map((v, i) => (
                        <td key={i} className={`${tdCls} text-right ${v > 0 ? 'text-[var(--text-muted)]' : v < 0 ? 'text-[#10b981]' : 'text-[var(--table-border)]'}`}>
                          {v !== 0 ? fmtShort(v) : '—'}
                        </td>
                      ))}
                      <td className={`${tdCls} text-right text-[11px] text-[var(--text-secondary)]`}>{fmtShort(sum(vals))}</td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}

            {/* NET Row */}
            <tr style={{ background: 'var(--bg-hover)', borderTop: '2px solid var(--table-border)' }}>
              <td className="px-2.5 py-2 font-bold text-[13px] text-[var(--text-primary)]" style={{ paddingLeft: 30 }}>NET</td>
              {data.monthlyNetTotals.map((v, i) => (
                <td key={i} className={`${tdCls} text-right font-semibold ${
                  data.monthlyIncomeTotals[i] === 0 && data.monthlyExpenseTotals[i] === 0
                    ? 'text-[#d1d5db]'
                    : v > 0 ? 'text-[#10b981]' : v < 0 ? 'text-[#ef4444]' : 'text-[#d1d5db]'
                }`}>
                  {data.monthlyIncomeTotals[i] !== 0 || data.monthlyExpenseTotals[i] !== 0 ? fmtShort(v) : '—'}
                </td>
              ))}
              <td className={`${tdCls} text-right font-bold ${totalNet >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {fmtShort(totalNet)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
