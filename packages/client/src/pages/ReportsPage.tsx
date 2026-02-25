import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { apiFetch } from '../lib/api';
import { fmtShort, fmtWhole } from '../lib/formatters';
import KPICard from '../components/KPICard';
import OwnerFilter from '../components/OwnerFilter';
import Spinner from '../components/Spinner';
import InlineNotification from '../components/InlineNotification';
import { getCategoryColor } from '../lib/categoryColors';
import { useIsMobile } from '../hooks/useIsMobile';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
  const isMobile = useIsMobile();
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const [year, setYear] = useState(currentYear);
  const [owner, setOwner] = useState('All');
  const [years, setYears] = useState<number[]>([]);
  const [data, setData] = useState<AnnualData | null>(null);
  const [expandIncome, setExpandIncome] = useState(() => sessionStorage.getItem('reports-expand-income') === '1');
  const [expandExpenses, setExpandExpenses] = useState(() => sessionStorage.getItem('reports-expand-expenses') === '1');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(sessionStorage.getItem('reports-expanded-groups') || '{}'); } catch { return {}; }
  });
  const [users, setUsers] = useState<{ id: number; displayName: string }[]>([]);
  const [mobileView, setMobileView] = useState<'monthly' | 'annual'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  useEffect(() => {
    apiFetch<{ data: { id: number; display_name: string }[] }>('/users').then((res) =>
      setUsers(res.data.map((u) => ({ id: u.id, displayName: u.display_name })))
    );
  }, []);

  useEffect(() => { sessionStorage.setItem('reports-expand-income', expandIncome ? '1' : '0'); }, [expandIncome]);
  useEffect(() => { sessionStorage.setItem('reports-expand-expenses', expandExpenses ? '1' : '0'); }, [expandExpenses]);
  useEffect(() => { sessionStorage.setItem('reports-expanded-groups', JSON.stringify(expandedGroups)); }, [expandedGroups]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const tdCls = `px-1.5 py-2 font-mono ${isMobile ? 'text-[10px]' : 'text-[11px]'}`;
  const stickyCol = isMobile ? 'sticky left-0 bg-[var(--bg-card)] z-[1]' : '';

  return (
    <div>
      {/* Header */}
      {isMobile ? (
        <div className="mb-4">
          {/* Centered year nav */}
          <div className="flex justify-center items-center gap-4 mb-3">
            <button onClick={() => setYear(year - 1)}
              className="text-[20px] text-[var(--text-muted)] bg-transparent border-none cursor-pointer p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
              ←
            </button>
            <span className="text-[15px] font-bold text-[var(--text-primary)]">{year}</span>
            <button onClick={() => setYear(year + 1)}
              className="text-[20px] text-[var(--text-muted)] bg-transparent border-none cursor-pointer p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
              →
            </button>
          </div>
          {/* Scrollable owner chip row */}
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {[{ name: 'All', id: 0 }, ...users.map(u => ({ name: u.displayName, id: u.id }))].map((o) => (
              <button key={o.id} onClick={() => setOwner(o.name === 'All' ? 'All' : o.name)}
                className="flex-shrink-0 border-none cursor-pointer rounded-2xl text-[11px] px-3.5 py-1.5"
                style={{
                  background: (o.name === 'All' ? owner === 'All' : owner === o.name) ? 'var(--color-accent)' : 'var(--bg-card)',
                  color: (o.name === 'All' ? owner === 'All' : owner === o.name) ? '#fff' : 'var(--text-secondary)',
                  fontWeight: (o.name === 'All' ? owner === 'All' : owner === o.name) ? 600 : 400,
                  boxShadow: (o.name === 'All' ? owner === 'All' : owner === o.name) ? 'none' : 'inset 0 0 0 1px var(--bg-card-border)',
                }}>
                {o.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title text-[22px] font-bold text-[var(--text-primary)] m-0">Annual Report</h1>
          <p className="page-subtitle text-[var(--text-secondary)] text-[13px] mt-1">{year} {isYTD ? 'Year-to-Date' : 'Full Year'}</p>
        </div>
        <div className="flex gap-3 items-center">
          <OwnerFilter value={owner} onChange={setOwner} users={users} />
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-[var(--table-border)] rounded-lg bg-[var(--bg-hover)] px-3 py-2 text-[13px] font-semibold text-[var(--text-primary)] outline-none cursor-pointer"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      )}

      {/* Owner info bar */}
      {owner !== 'All' && (
        <InlineNotification type="info" message={`Showing data from ${owner}'s accounts (including shared accounts)`} className="mb-4" />
      )}

      {/* KPI Cards */}
      <div className="kpi-grid grid grid-cols-4 gap-4 mb-6">
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

      {/* Mobile Reports Layout */}
      {isMobile ? (
        <div>
          {/* View Toggle */}
          <div className="flex rounded-lg p-0.5 mb-3.5" style={{ background: 'var(--toggle-bg)' }}>
            {(['monthly', 'annual'] as const).map(v => (
              <button key={v} onClick={() => setMobileView(v)}
                className="flex-1 py-1.5 px-3 text-[11px] border-none cursor-pointer rounded-md capitalize"
                style={{
                  background: mobileView === v ? 'var(--toggle-active-bg)' : 'transparent',
                  color: mobileView === v ? 'var(--toggle-active-text)' : 'var(--toggle-inactive-text)',
                  fontWeight: mobileView === v ? 600 : 400,
                  boxShadow: mobileView === v ? 'var(--toggle-shadow)' : 'none',
                }}>
                {v === 'monthly' ? 'Monthly Detail' : 'Annual Totals'}
              </button>
            ))}
          </div>

          {mobileView === 'monthly' && (
            <>
              {/* Month pill selector */}
              <div className="flex gap-1.5 mb-4 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
                {MONTHS.map((m, i) => (
                  <button key={m} onClick={() => setSelectedMonth(i)}
                    className="flex-shrink-0 border-none cursor-pointer rounded-lg text-[12px] px-3.5 py-2"
                    style={{
                      minWidth: 44,
                      background: selectedMonth === i ? 'var(--color-accent)' : 'var(--bg-card)',
                      color: selectedMonth === i ? '#fff' : 'var(--text-secondary)',
                      fontWeight: selectedMonth === i ? 700 : 400,
                      boxShadow: selectedMonth === i ? 'none' : 'inset 0 0 0 1px var(--bg-card-border)',
                    }}>
                    {m}
                  </button>
                ))}
              </div>

              {/* Month Summary Card */}
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] shadow-[var(--bg-card-shadow)] px-4 py-3 mb-3">
                <div className="text-[14px] font-bold text-[var(--text-primary)] mb-2.5">
                  {MONTHS[selectedMonth]} {year}
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--bg-card-border)]">
                  <span className="text-[13px] text-[#10b981] font-semibold">Income</span>
                  <span className={`text-[14px] font-bold font-mono ${data.monthlyIncomeTotals[selectedMonth] > 0 ? 'text-[#10b981]' : 'text-[var(--text-muted)]'}`}>
                    {data.monthlyIncomeTotals[selectedMonth] !== 0 ? fmtShort(data.monthlyIncomeTotals[selectedMonth]) : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--bg-card-border)]">
                  <span className="text-[13px] text-[#f59e0b] font-semibold">Expenses</span>
                  <span className="text-[14px] font-bold font-mono text-[var(--text-primary)]">
                    {data.monthlyExpenseTotals[selectedMonth] !== 0 ? fmtShort(data.monthlyExpenseTotals[selectedMonth]) : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[13px] font-bold text-[var(--text-primary)]">Net</span>
                  <span className={`text-[14px] font-bold font-mono ${
                    data.monthlyNetTotals[selectedMonth] > 0 ? 'text-[#10b981]' : data.monthlyNetTotals[selectedMonth] < 0 ? 'text-[#ef4444]' : 'text-[var(--text-muted)]'
                  }`}>
                    {data.monthlyNetTotals[selectedMonth] !== 0
                      ? `${data.monthlyNetTotals[selectedMonth] > 0 ? '+' : ''}${fmtShort(data.monthlyNetTotals[selectedMonth])}`
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Income Breakdown Card */}
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] shadow-[var(--bg-card-shadow)] px-4 py-3 mb-2.5">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandIncome(!expandIncome)}>
                  <span className="text-[13px] font-bold text-[#10b981]">Income</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[13px] font-bold font-mono ${data.monthlyIncomeTotals[selectedMonth] > 0 ? 'text-[#10b981]' : 'text-[var(--text-muted)]'}`}>
                      {data.monthlyIncomeTotals[selectedMonth] !== 0 ? fmtShort(data.monthlyIncomeTotals[selectedMonth]) : '—'}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] inline-block transition-transform duration-150"
                      style={{ transform: expandIncome ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                  </div>
                </div>
                {expandIncome && (
                  <div className="mt-2">
                    {Object.entries(data.incomeByCategory).map(([cat, vals], i, arr) => (
                      <div key={cat} className="flex justify-between py-1.5 pl-3"
                        style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--bg-card-border)' : 'none' }}>
                        <span className="text-[12px] text-[var(--text-body)]">{cat}</span>
                        <span className={`text-[12px] font-mono ${vals[selectedMonth] !== 0 ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
                          {vals[selectedMonth] !== 0 ? fmtShort(vals[selectedMonth]) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Expense Group Cards */}
              {Object.entries(data.expensesByGroup).sort(([a], [b]) => a.localeCompare(b)).map(([group, subs]) => {
                const allGroups = Object.keys(data.expensesByGroup);
                const color = getCategoryColor(group, allGroups);
                const groupMonthTotal = Object.values(subs).reduce((s, a) => s + a[selectedMonth], 0);
                const isOpen = expandedGroups[group];
                return (
                  <div key={group} className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] shadow-[var(--bg-card-shadow)] px-4 py-3 mb-2.5">
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleGroup(group)}>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm inline-block" style={{ background: color }} />
                        <span className="text-[13px] font-bold text-[var(--text-primary)]">{group}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[13px] font-bold font-mono ${groupMonthTotal !== 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                          {groupMonthTotal !== 0 ? fmtShort(groupMonthTotal) : '—'}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] inline-block transition-transform duration-150"
                          style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="mt-2">
                        {Object.entries(subs).map(([sub, vals], i, arr) => (
                          <div key={sub} className="flex justify-between py-1.5 pl-3"
                            style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--bg-card-border)' : 'none' }}>
                            <span className="text-[12px] text-[var(--text-body)]">{sub}</span>
                            <span className={`text-[12px] font-mono ${
                              vals[selectedMonth] > 0 ? 'text-[var(--text-secondary)]' : vals[selectedMonth] < 0 ? 'text-[#10b981]' : 'text-[var(--text-muted)]'
                            }`}>
                              {vals[selectedMonth] !== 0 ? fmtShort(vals[selectedMonth]) : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {mobileView === 'annual' && (
            <>
              {/* Annual Income Card */}
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] shadow-[var(--bg-card-shadow)] px-4 py-3 mb-2.5">
                <div className="text-[13px] font-bold text-[#10b981] mb-2">Annual Income</div>
                {Object.entries(data.incomeByCategory).map(([cat, vals], i, arr) => {
                  const catTotal = sum(vals);
                  return (
                    <div key={cat} className="flex justify-between py-1.5"
                      style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--bg-card-border)' : 'none' }}>
                      <span className="text-[12px] text-[var(--text-body)]">{cat}</span>
                      <span className={`text-[12px] font-mono ${catTotal !== 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                        {catTotal !== 0 ? fmtShort(catTotal) : '—'}
                      </span>
                    </div>
                  );
                })}
                <div className="flex justify-between pt-2 mt-1 border-t-2 border-[var(--bg-card-border)]">
                  <span className="text-[12px] font-bold text-[var(--text-primary)]">Total</span>
                  <span className="text-[13px] font-bold font-mono text-[#10b981]">{fmtShort(totalIncome)}</span>
                </div>
              </div>

              {/* Annual Expense Group Cards */}
              {Object.entries(data.expensesByGroup).sort(([a], [b]) => a.localeCompare(b)).map(([group, subs]) => {
                const allGroups = Object.keys(data.expensesByGroup);
                const color = getCategoryColor(group, allGroups);
                const groupTotal = Object.values(subs).reduce((s, a) => s + sum(a), 0);
                return (
                  <div key={group} className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] shadow-[var(--bg-card-shadow)] px-4 py-3 mb-2.5">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm inline-block" style={{ background: color }} />
                        <span className="text-[13px] font-bold text-[var(--text-primary)]">{group}</span>
                      </div>
                      <span className="text-[13px] font-bold font-mono text-[var(--text-primary)]">{fmtShort(groupTotal)}</span>
                    </div>
                    {Object.entries(subs).map(([sub, vals], i, arr) => {
                      const subTotal = sum(vals);
                      return (
                        <div key={sub} className="flex justify-between py-1.5 pl-3"
                          style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--bg-card-border)' : 'none' }}>
                          <span className="text-[12px] text-[var(--text-body)]">{sub}</span>
                          <span className={`text-[12px] font-mono ${
                            subTotal > 0 ? 'text-[var(--text-secondary)]' : subTotal < 0 ? 'text-[#10b981]' : 'text-[var(--text-muted)]'
                          }`}>
                            {subTotal !== 0 ? fmtShort(subTotal) : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>
      ) : (
      /* Desktop Monthly Breakdown Table */
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] px-5 py-4 shadow-[var(--bg-card-shadow)] overflow-x-auto">
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
              <th className={`${thCls} text-left ${stickyCol}`} style={{ width: 200, minWidth: isMobile ? 120 : 180 }}>Category</th>
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
              <td className={`px-2.5 py-2 font-bold text-[var(--color-positive)] text-[13px] ${stickyCol}`}>
                <span className="flex items-center gap-1.5">
                  <ChevronIcon open={expandIncome} />Total Income
                </span>
              </td>
              {data.monthlyIncomeTotals.map((v, i) => (
                <td key={i} className={`${tdCls} text-right ${v !== 0 ? 'text-[var(--color-positive)]' : 'text-[var(--text-very-muted)]'}`}>
                  {v !== 0 ? fmtShort(v) : '—'}
                </td>
              ))}
              <td className={`${tdCls} text-right font-bold text-[var(--color-positive)]`}>{fmtShort(totalIncome)}</td>
            </tr>

            {/* Expanded income categories */}
            {expandIncome && Object.entries(data.incomeByCategory).map(([cat, vals]) => (
              <tr key={cat} className="border-b border-[var(--table-row-border)]">
                <td className={`px-2.5 py-2 text-[12px] text-[var(--text-secondary)] ${stickyCol}`} style={{ paddingLeft: 36 }}>{cat}</td>
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
              <td className={`px-2.5 py-2 font-bold text-[var(--color-orange)] text-[13px] ${stickyCol}`}>
                <span className="flex items-center gap-1.5">
                  <ChevronIcon open={expandExpenses} />Total Expenses
                </span>
              </td>
              {data.monthlyExpenseTotals.map((v, i) => (
                <td key={i} className={`${tdCls} text-right ${v > 0 ? 'text-[var(--color-orange)]' : v < 0 ? 'text-[#10b981]' : 'text-[var(--text-very-muted)]'}`}>
                  {v !== 0 ? fmtShort(v) : '—'}
                </td>
              ))}
              <td className={`${tdCls} text-right font-bold text-[var(--color-orange)]`}>{fmtShort(totalExpenses)}</td>
            </tr>

            {/* Expanded expense groups → sub-categories */}
            {expandExpenses && Object.entries(data.expensesByGroup).sort(([a], [b]) => a.localeCompare(b)).map(([group, subs]) => {
              const gMonthly = MONTHS.map((_, i) => Object.values(subs).reduce((s, a) => s + a[i], 0));
              const isOpen = expandedGroups[group];
              const allGroups = Object.keys(data.expensesByGroup);
              const color = getCategoryColor(group, allGroups);
              return (
                <Fragment key={group}>
                  <tr
                    className="cursor-pointer"
                    style={{ borderBottom: '1px solid var(--table-row-border)' }}
                    onClick={() => toggleGroup(group)}
                  >
                    <td className={`px-2.5 py-2 font-semibold text-[12px] text-[var(--text-body)] ${stickyCol}`} style={{ paddingLeft: 28 }}>
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
                      <td className={`px-2.5 py-2 text-[11px] text-[var(--text-muted)] ${stickyCol}`} style={{ paddingLeft: 52 }}>{sub}</td>
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
              <td className={`px-2.5 py-2 font-bold text-[13px] text-[var(--text-primary)] ${stickyCol}`} style={{ paddingLeft: 30 }}>NET</td>
              {data.monthlyNetTotals.map((v, i) => (
                <td key={i} className={`${tdCls} text-right font-semibold ${
                  data.monthlyIncomeTotals[i] === 0 && data.monthlyExpenseTotals[i] === 0
                    ? 'text-[var(--text-very-muted)]'
                    : v > 0 ? 'text-[#10b981]' : v < 0 ? 'text-[#ef4444]' : 'text-[var(--text-very-muted)]'
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
      )}
    </div>
  );
}
