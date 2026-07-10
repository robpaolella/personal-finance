import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '../lib/api';
import { fmtWhole } from '../lib/formatters';
import KPICard from '../components/KPICard';
import { SegmentedControl } from '../components/primitives';
import { getCategoryEmoji, getCategoryColorHex } from '../lib/categoryMeta';
import MultiLineChart, { type Series } from '../components/charts/MultiLineChart';

interface AnnualData {
  incomeByCategory: Record<string, number[]>;
  expensesByGroup: Record<string, Record<string, number[]>>;
  savingsByGroup: Record<string, Record<string, number[]>>;
  monthlyIncomeTotals: number[];
  monthlyExpenseTotals: number[];
  monthlySavingsTotals: number[];
  monthlyNetTotals: number[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
const groupMonthly = (g: Record<string, number[]>) => { const out = new Array(12).fill(0); for (const v of Object.values(g)) for (let i = 0; i < 12; i++) out[i] += v[i] ?? 0; return out; };
const cumulative = (a: number[]) => { const out: number[] = []; let run = 0; for (const v of a) { run += v; out.push(run); } return out; };

// Lightweight pill dropdown.
function Pill({ label, options, onSelect }: { label: string; options: { key: string; label: string }[]; onSelect: (k: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 h-10 px-4 rounded-[11px] bg-surface-2 border border-line-strong text-sm font-semibold text-content">
        {label}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-11 right-0 z-50 min-w-[160px] py-1 rounded-[11px] bg-elevated border border-line-strong shadow-md max-h-72 overflow-auto">
            {options.map((o) => (
              <button key={o.key} onClick={() => { onSelect(o.key); setOpen(false); }} className="block w-full text-left px-3.5 py-2 text-sm hover:bg-surface-2 whitespace-nowrap">{o.label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const [year, setYear] = useState(currentYear);
  const [owner, setOwner] = useState('All');
  const [years, setYears] = useState<number[]>([]);
  const [users, setUsers] = useState<{ id: number; displayName: string }[]>([]);
  const [data, setData] = useState<AnnualData | null>(null);
  const [view, setView] = useState<'breakdown' | 'trends'>('breakdown');
  const [trendMetric, setTrendMetric] = useState<'expenses' | 'income'>('expenses');
  const [chartMode, setChartMode] = useState<'cumulative' | 'monthly'>('cumulative');
  const [catView, setCatView] = useState<'summary' | 'timeline'>('summary');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ data: number[] }>('/reports/available-years').then((r) => { setYears(r.data.length ? r.data : [currentYear]); }).catch(() => setYears([currentYear]));
    apiFetch<{ data: { id: number; display_name: string }[] }>('/users').then((r) => setUsers(r.data.map((u) => ({ id: u.id, displayName: u.display_name })))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = useCallback(async () => {
    const r = await apiFetch<{ data: AnnualData }>(`/reports/annual?year=${year}&owner=${owner === 'All' ? 'all' : owner}`);
    setData(r.data);
  }, [year, owner]);
  useEffect(() => { loadData(); }, [loadData]);

  const months = year === currentYear ? currentMonthIdx + 1 : 12;
  const slice = (a: number[]) => (a ?? []).slice(0, months);

  const totals = useMemo(() => {
    if (!data) return { income: 0, expenses: 0, savings: 0, net: 0, rate: 0 };
    const income = sum(slice(data.monthlyIncomeTotals));
    const expenses = sum(slice(data.monthlyExpenseTotals));
    const savings = sum(slice(data.monthlySavingsTotals));
    const net = income - expenses;
    return { income, expenses, savings, net, rate: income > 0 ? (net / income) * 100 : 0 };
  }, [data, months]);

  // Flow proportion bar: allocate income into leftover + savings groups + expense groups.
  const flow = useMemo(() => {
    if (!data) return [] as { label: string; value: number; color: string; emoji: string }[];
    const segs: { label: string; value: number; color: string; emoji: string }[] = [];
    const leftover = Math.max(0, totals.income - totals.expenses - totals.savings);
    if (leftover > 0) segs.push({ label: 'Left over', value: leftover, color: 'var(--positive)', emoji: '💚' });
    for (const [g, subs] of Object.entries(data.savingsByGroup)) segs.push({ label: g, value: sum(slice(groupMonthly(subs))), color: getCategoryColorHex(g), emoji: getCategoryEmoji(g) });
    for (const [g, subs] of Object.entries(data.expensesByGroup)) segs.push({ label: g, value: sum(slice(groupMonthly(subs))), color: getCategoryColorHex(g), emoji: getCategoryEmoji(g) });
    return segs.filter((s) => s.value > 0).sort((a, b) => (a.label === 'Left over' ? -1 : b.label === 'Left over' ? 1 : b.value - a.value));
  }, [data, totals, months]);
  const flowTotal = flow.reduce((s, x) => s + x.value, 0) || 1;

  // Trends series.
  const trend = useMemo(() => {
    if (!data) return { series: [] as Series[], labels: [] as string[] };
    const labels = MONTHS.slice(0, months);
    const mk = (arr: number[]) => (chartMode === 'cumulative' ? cumulative(slice(arr)) : slice(arr));
    if (trendMetric === 'income') {
      const cats = Object.entries(data.incomeByCategory).map(([name, vals]) => ({ name, total: sum(slice(vals)), vals })).sort((a, b) => b.total - a.total).slice(0, 4);
      return {
        labels,
        series: [
          { label: 'Total income', color: 'var(--content)', values: mk(data.monthlyIncomeTotals), bold: true },
          ...cats.map((c) => ({ label: c.name, color: getCategoryColorHex(c.name), values: mk(c.vals) })),
        ],
      };
    }
    const groups = Object.entries(data.expensesByGroup).map(([g, subs]) => ({ g, total: sum(slice(groupMonthly(subs))), vals: groupMonthly(subs) })).sort((a, b) => b.total - a.total).slice(0, 4);
    return {
      labels,
      series: [
        { label: 'Total expenses', color: 'var(--content)', values: mk(data.monthlyExpenseTotals), bold: true },
        ...groups.map((c) => ({ label: c.g, color: getCategoryColorHex(c.g), values: mk(c.vals) })),
      ],
    };
  }, [data, trendMetric, chartMode, months]);

  const periodLabel = year === currentYear ? `${year} · Year to date` : `${year}`;

  if (!data) return <div className="p-8 text-content-3">Loading…</div>;

  // section builders for the category breakdown
  const sections: { key: string; name: string; total: number; rows: { name: string; total: number; monthly: number[]; subs?: { name: string; total: number; monthly: number[] }[] }[] }[] = [
    {
      key: 'income', name: 'Income', total: totals.income,
      rows: Object.entries(data.incomeByCategory).map(([name, vals]) => ({ name, total: sum(slice(vals)), monthly: slice(vals) })).sort((a, b) => b.total - a.total),
    },
    {
      key: 'expenses', name: 'Expenses', total: totals.expenses,
      rows: Object.entries(data.expensesByGroup).map(([g, subs]) => ({ name: g, total: sum(slice(groupMonthly(subs))), monthly: slice(groupMonthly(subs)), subs: Object.entries(subs).map(([s, v]) => ({ name: s, total: sum(slice(v)), monthly: slice(v) })).sort((a, b) => b.total - a.total) })).sort((a, b) => b.total - a.total),
    },
    {
      key: 'savings', name: 'Savings', total: totals.savings,
      rows: Object.entries(data.savingsByGroup).map(([g, subs]) => ({ name: g, total: sum(slice(groupMonthly(subs))), monthly: slice(groupMonthly(subs)), subs: Object.entries(subs).map(([s, v]) => ({ name: s, total: sum(slice(v)), monthly: slice(v) })).sort((a, b) => b.total - a.total) })).sort((a, b) => b.total - a.total),
    },
  ];
  const monthLabels = MONTHS.slice(0, months);

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 pb-16">
      {/* top bar */}
      <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-4 mb-4 flex items-center justify-between gap-3 bg-bg/80 backdrop-blur border-b border-line">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Reports</h1>
          <div className="text-[13px] text-content-3">{periodLabel}{owner !== 'All' ? ` · ${owner}` : ''}</div>
        </div>
        <div className="flex items-center gap-2.5">
          <Pill label={String(year)} options={years.map((y) => ({ key: String(y), label: String(y) }))} onSelect={(k) => setYear(Number(k))} />
          <Pill label={owner === 'All' ? 'All owners' : owner} options={[{ key: 'All', label: 'All owners' }, ...users.map((u) => ({ key: u.displayName, label: u.displayName }))]} onSelect={setOwner} />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KPICard label="Income" value={fmtWhole(totals.income)} subtitle={`${Object.keys(data.incomeByCategory).length} income sources`} />
        <KPICard label="Expenses" value={fmtWhole(totals.expenses)} subtitle={`${fmtWhole(months > 0 ? totals.expenses / months : 0)} avg / mo`} />
        <KPICard label="Net" value={fmtWhole(totals.net)} valueColor={totals.net >= 0 ? 'var(--positive)' : 'var(--negative)'} subtitle={totals.net >= 0 ? 'money kept' : 'overspent'} trend={totals.net >= 0 ? 'up' : 'down'} />
        <KPICard label="Savings rate" value={`${Math.round(totals.rate)}%`} valueColor="var(--positive)" subtitle={`${fmtWhole(totals.savings)} to savings`} />
      </div>

      {/* report area */}
      <div className="bg-surface border border-line rounded-card shadow-sm p-5 mb-5">
        <div className="flex flex-wrap items-center gap-4 mb-5">
          <div className="flex items-center gap-4">
            {(['breakdown', 'trends'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`text-[15px] font-bold capitalize pb-1 border-b-2 ${view === v ? 'text-content border-primary' : 'text-content-3 border-transparent'}`}>{v}</button>
            ))}
          </div>
          {view === 'trends' && (
            <div className="flex items-center gap-2.5 ml-auto">
              <SegmentedControl value={trendMetric} onChange={setTrendMetric} options={[{ value: 'expenses', label: 'Expenses' }, { value: 'income', label: 'Income' }]} />
              <SegmentedControl value={chartMode} onChange={setChartMode} options={[{ value: 'cumulative', label: 'Cumulative' }, { value: 'monthly', label: 'Monthly' }]} />
            </div>
          )}
          {view === 'breakdown' && <span className="ml-auto text-[13px] text-content-3">Income {fmtWhole(totals.income)} · {periodLabel}</span>}
        </div>

        {view === 'breakdown' ? (
          <>
            <div className="flex h-8 rounded-lg overflow-hidden mb-4">
              {flow.map((s) => (
                <div key={s.label} title={`${s.label} · ${fmtWhole(s.value)} · ${Math.round((s.value / flowTotal) * 100)}%`} style={{ width: `${(s.value / flowTotal) * 100}%`, background: s.color }} className="transition-all hover:brightness-110" />
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
              {flow.map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-sm">
                  <span className="text-[15px] leading-none">{s.emoji}</span>
                  <span className="font-semibold truncate">{s.label}</span>
                  <span className="text-content-3 tabular-nums ml-auto">{fmtWhole(s.value)} · {((s.value / flowTotal) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <MultiLineChart series={trend.series} labels={trend.labels} formatValue={(n) => (Math.abs(n) >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${Math.round(n)}`)} />
        )}
      </div>

      {/* category breakdown */}
      <div className="bg-surface border border-line rounded-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div>
            <div className="text-[17px] font-extrabold">Category breakdown</div>
            <div className="text-[13px] text-content-3">{catView === 'summary' ? 'Click a category to expand sub-categories' : 'Per-month totals'}</div>
          </div>
          <SegmentedControl value={catView} onChange={setCatView} options={[{ value: 'summary', label: 'Summary' }, { value: 'timeline', label: 'Timeline' }]} />
        </div>

        {sections.map((sec) => {
          const isCol = collapsed.has(sec.key);
          return (
            <div key={sec.key}>
              <button onClick={() => setCollapsed((c) => { const n = new Set(c); if (n.has(sec.key)) n.delete(sec.key); else n.add(sec.key); return n; })}
                className="w-full flex items-center gap-2.5 px-5 py-3 bg-surface-2/50 hover:bg-surface-2 text-left border-b border-line">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.2" style={{ transform: isCol ? 'rotate(-90deg)' : 'none' }}><path d="m6 9 6 6 6-6" /></svg>
                <span className="font-bold">{sec.name}</span>
                <span className="ml-auto font-extrabold tabular-nums">{fmtWhole(sec.total)}</span>
              </button>
              {!isCol && catView === 'summary' && sec.rows.map((r) => (
                <div key={r.name}>
                  <div onClick={() => r.subs && setExpandedGroup(expandedGroup === `${sec.key}:${r.name}` ? null : `${sec.key}:${r.name}`)}
                    className={`flex items-center gap-3 px-5 py-2.5 border-b border-line ${r.subs ? 'cursor-pointer hover:bg-surface-2/40' : ''}`}>
                    <span className="text-[15px] leading-none">{getCategoryEmoji(r.name)}</span>
                    <span className="font-semibold text-sm w-40 truncate">{r.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${sec.total > 0 ? (r.total / sec.total) * 100 : 0}%`, background: getCategoryColorHex(r.name) }} />
                    </div>
                    <span className="text-content-3 text-[13px] tabular-nums w-12 text-right">{sec.total > 0 ? Math.round((r.total / sec.total) * 100) : 0}%</span>
                    <span className="font-bold text-sm tabular-nums w-24 text-right">{fmtWhole(r.total)}</span>
                    {r.subs && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" style={{ transform: expandedGroup === `${sec.key}:${r.name}` ? 'rotate(90deg)' : 'none' }}><path d="m9 18 6-6-6-6" /></svg>}
                    {!r.subs && <span className="w-[15px]" />}
                  </div>
                  {r.subs && expandedGroup === `${sec.key}:${r.name}` && r.subs.map((s) => (
                    <div key={s.name} className="flex items-center gap-3 pl-14 pr-5 py-2 border-b border-line bg-surface-2/30 text-sm">
                      <span className="flex-1 truncate text-content-2">{s.name}</span>
                      <span className="text-content-3 text-[13px] tabular-nums w-12 text-right">{r.total > 0 ? Math.round((s.total / r.total) * 100) : 0}%</span>
                      <span className="font-semibold tabular-nums w-24 text-right">{fmtWhole(s.total)}</span>
                    </div>
                  ))}
                </div>
              ))}
              {!isCol && catView === 'timeline' && (
                <div className="overflow-x-auto border-b border-line">
                  <table className="w-full text-[12px] tabular-nums">
                    <thead>
                      <tr className="text-content-3">
                        <th className="text-left font-semibold px-5 py-2 sticky left-0 bg-surface">Category</th>
                        {monthLabels.map((m) => <th key={m} className="text-right font-semibold px-2 py-2">{m}</th>)}
                        <th className="text-right font-semibold px-4 py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sec.rows.map((r) => {
                        const peak = Math.max(...r.monthly);
                        return (
                          <tr key={r.name} className="border-t border-line">
                            <td className="text-left px-5 py-1.5 font-medium sticky left-0 bg-surface truncate max-w-[160px]">{getCategoryEmoji(r.name)} {r.name}</td>
                            {r.monthly.map((v, i) => <td key={i} className="text-right px-2 py-1.5" style={v === peak && peak > 0 ? { background: 'color-mix(in srgb, var(--primary) 12%, transparent)', fontWeight: 700 } : undefined}>{v > 0 ? fmtWhole(v) : '·'}</td>)}
                            <td className="text-right px-4 py-1.5 font-bold">{fmtWhole(r.total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
