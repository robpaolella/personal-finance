import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { fmtWhole, fmtTransaction } from '../lib/formatters';
import Spinner from '../components/Spinner';
import { OwnerBadge, SharedBadge } from '../components/badges';
import { VendorAvatar } from '../components/primitives';
import { getCategoryColorHex, getCategoryEmoji } from '../lib/categoryMeta';
import { useAuth } from '../context/AuthContext';
import AreaLineChart, { type ChartPoint } from '../components/charts/AreaLineChart';

interface Summary {
  netWorth: number; liquidAssets: number; monthIncome: number; monthExpenses: number;
  totalBudgetedExpenses: number; priorMonthIncome: number; priorMonthExpenses: number;
}
interface SpendingGroup { groupName: string; totalSpent: number; totalBudgeted: number }
interface MonthlyData { month: number; totalIncome: number; totalExpenses: number }
interface Transaction {
  id: number; date: string; description: string; merchant?: { id: number; name: string; logoUrl?: string | null } | null; amount: number;
  account: { id: number; name: string; owners?: { id: number; displayName: string }[]; isShared?: boolean };
  category: { id: number; groupName: string; subName: string; type: string } | null;
  splits?: { type: string }[];
}
interface HistoryPoint { date: string; netWorth: number }
interface AccountHoldings { accountId: number; holdings: { symbol: string; description: string; marketValue: number; costBasis: number }[] }
interface RecurringSummary { id: number; label: string; freq_kind: string; amount: number | null; type: 'income' | 'expense'; status: string }

const txnVendor = (t: Transaction) => t.merchant?.name ?? t.description;
const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const FREQ: Record<string, string> = { weekly: 'Every week', biweekly: 'Every 2 weeks', semi_monthly: 'Twice a month', monthly: 'Every month', every_n_months: 'Every few months', custom_months: 'Custom months' };

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-line rounded-card shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

const RANGES = ['1m', '3m', '6m', '1y'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentYear = String(now.getFullYear());
  const currentMonthIdx = now.getMonth();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [spending, setSpending] = useState<SpendingGroup[]>([]);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [nwRange, setNwRange] = useState('1m');
  const [nwPoints, setNwPoints] = useState<HistoryPoint[]>([]);
  const [holdings, setHoldings] = useState<AccountHoldings[]>([]);
  const [cycles, setCycles] = useState<RecurringSummary[]>([]);
  const [reviewCounts, setReviewCounts] = useState<{ open: number; assignedToMe: number } | null>(null);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sum, spend, chart, txn] = await Promise.all([
        apiFetch<{ data: Summary }>(`/dashboard/summary?month=${currentMonth}`),
        apiFetch<{ data: SpendingGroup[] }>(`/dashboard/spending-by-category?month=${currentMonth}`),
        apiFetch<{ data: MonthlyData[] }>(`/dashboard/income-vs-expenses?year=${currentYear}`),
        apiFetch<{ data: Transaction[] }>('/dashboard/recent-transactions?limit=6'),
      ]);
      setSummary(sum.data); setSpending(spend.data); setMonthly(chart.data); setRecent(txn.data); setError(false);
    } catch {
      setError(true);
    }
    apiFetch<{ data: { accountHoldings: AccountHoldings[] } }>('/simplefin/holdings').then((r) => setHoldings(r.data.accountHoldings)).catch(() => {});
    apiFetch<{ data: RecurringSummary[] }>('/recurring').then((r) => setCycles(r.data.filter((x) => x.status === 'active'))).catch(() => {});
    apiFetch<{ data: { open: number; assignedToMe: number; unassigned: number } }>('/reviews/count').then((r) => setReviewCounts({ open: r.data.open, assignedToMe: r.data.assignedToMe })).catch(() => {});
  }, [currentMonth, currentYear]);
  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    apiFetch<{ data: { points: HistoryPoint[] } }>(`/networth/history?range=${nwRange}`).then((r) => setNwPoints(r.data.points)).catch(() => {});
  }, [nwRange]);

  const invest = useMemo(() => {
    const flat = holdings.flatMap((h) => h.holdings);
    const value = flat.reduce((s, h) => s + h.marketValue, 0);
    const cost = flat.reduce((s, h) => s + h.costBasis, 0);
    // Aggregate by symbol (same ticker can span accounts) before ranking.
    const bySym = new Map<string, { symbol: string; description: string; marketValue: number }>();
    for (const h of flat) { const e = bySym.get(h.symbol) ?? { symbol: h.symbol, description: h.description, marketValue: 0 }; e.marketValue += h.marketValue; bySym.set(h.symbol, e); }
    const top = Array.from(bySym.values()).sort((a, b) => b.marketValue - a.marketValue).slice(0, 3);
    return { value, gain: value - cost, gainPct: cost > 0 ? ((value - cost) / cost) * 100 : 0, top, count: flat.length };
  }, [holdings]);

  if (error && !summary) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-surface border border-line rounded-card shadow-sm p-8 text-center">
        <div className="text-[15px] font-semibold mb-1">Couldn’t load your dashboard</div>
        <p className="text-content-3 text-sm mb-4">Something went wrong fetching your data.</p>
        <button onClick={() => loadData()} className="h-10 px-5 rounded-[11px] bg-primary text-on-primary font-bold text-sm">Retry</button>
      </div>
    );
  }
  if (!summary) return <Spinner />;

  const greeting = user?.displayName ? `Hello, ${user.displayName.split(' ')[0]}!` : 'Dashboard';
  const expenseRemaining = summary.totalBudgetedExpenses - summary.monthExpenses;
  const expensePct = summary.totalBudgetedExpenses > 0 ? Math.min(100, (summary.monthExpenses / summary.totalBudgetedExpenses) * 100) : 0;
  const incomeDelta = summary.monthIncome - summary.priorMonthIncome;
  const spendDelta = summary.monthExpenses - summary.priorMonthExpenses;
  const nwChart: ChartPoint[] = nwPoints.map((p) => ({ date: p.date, value: p.netWorth }));
  const expenseSeries: ChartPoint[] = monthly.slice(0, currentMonthIdx + 1).map((m) => ({ date: `${currentYear}-${String(m.month).padStart(2, '0')}-01`, value: m.totalExpenses }));
  const topSpending = [...spending].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 4);
  const green = 'var(--positive)';

  return (
    <div className="pb-16">
      <div className="sticky top-0 z-20 -mt-4 md:-mt-7 -mx-4 md:-mx-8 px-4 md:px-8 py-4 mb-6 bg-bg border-b border-line">
        <h1 className="page-title text-[22px] font-extrabold text-content tracking-tight leading-tight m-0">{greeting}</h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-5">
          {/* Budget */}
          <Card title="Budget" action={<button onClick={() => navigate('/budget')} className="text-[13px] font-semibold text-primary">View →</button>}>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <div className="text-[13px] font-semibold text-content-2 mb-1">Income</div>
                <div className="text-[22px] font-extrabold tabular-nums">{fmtWhole(summary.monthIncome)}</div>
                <div className="text-[12px]" style={{ color: incomeDelta >= 0 ? green : 'var(--negative)' }}>{incomeDelta >= 0 ? '▲' : '▼'} {fmtWhole(Math.abs(incomeDelta))} vs last mo</div>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-content-2 mb-1">Expenses</div>
                <div className="text-[22px] font-extrabold tabular-nums">{fmtWhole(summary.monthExpenses)}</div>
                <div className="h-2 rounded-full bg-surface-2 overflow-hidden my-1.5"><div className="h-full rounded-full" style={{ width: `${expensePct}%`, background: expensePct >= 100 ? 'var(--negative)' : expensePct >= 80 ? 'var(--warning)' : green }} /></div>
                <div className="text-[12px] text-content-3">{summary.totalBudgetedExpenses <= 0 ? 'No budget set' : expenseRemaining >= 0 ? `${fmtWhole(expenseRemaining)} left of ${fmtWhole(summary.totalBudgetedExpenses)}` : `${fmtWhole(-expenseRemaining)} over budget`}</div>
              </div>
            </div>
          </Card>

          {/* Net worth */}
          <Card title="Net worth" action={
            <div className="flex gap-1">
              {RANGES.map((r) => <button key={r} onClick={() => setNwRange(r)} className={`px-2 py-1 rounded-md text-[12px] font-semibold ${nwRange === r ? 'bg-surface-2 text-content' : 'text-content-3'}`}>{r.toUpperCase()}</button>)}
            </div>
          }>
            <div className="text-[26px] font-extrabold tabular-nums mb-1">{fmtWhole(summary.netWorth)}</div>
            <AreaLineChart points={nwChart} height={160} formatValue={(n) => (Math.abs(n) >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${Math.round(n)}`)} />
          </Card>

          {/* Investments */}
          <Card title="Investments" action={<button onClick={() => navigate('/investments')} className="text-[13px] font-semibold text-primary">View →</button>}>
            {invest.count === 0 ? (
              <div className="text-content-3 text-sm py-2">No holdings yet. Link an investment account to track them here.</div>
            ) : (
              <>
                <div className="flex items-baseline gap-3 mb-3">
                  <div className="text-[26px] font-extrabold tabular-nums">{fmtWhole(invest.value)}</div>
                  <span className="text-[13px] font-semibold" style={{ color: invest.gain >= 0 ? green : 'var(--negative)' }}>{invest.gain >= 0 ? '▲' : '▼'} {invest.gainPct.toFixed(1)}% · since cost</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {invest.top.map((h) => (
                    <div key={h.symbol} className="flex items-center gap-2 text-sm">
                      <span className="font-bold w-16 shrink-0">{h.symbol}</span>
                      <span className="flex-1 truncate text-content-3 text-[13px]">{h.description}</span>
                      <span className="tabular-nums font-semibold">{fmtWhole(h.marketValue)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-5">
          {/* Spending */}
          <Card title="Spending" action={<span className="text-[13px] text-content-3">{now.toLocaleString('en-US', { month: 'long' })}</span>}>
            <div className="flex items-baseline gap-3 mb-1">
              <div className="text-[26px] font-extrabold tabular-nums">{fmtWhole(summary.monthExpenses)}</div>
              <span className="text-[13px] font-semibold" style={{ color: spendDelta <= 0 ? green : 'var(--negative)' }}>{spendDelta <= 0 ? '▼' : '▲'} {fmtWhole(Math.abs(spendDelta))} vs last mo</span>
            </div>
            <AreaLineChart points={expenseSeries} height={120} color="var(--c-orange)" formatValue={(n) => (Math.abs(n) >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${Math.round(n)}`)} />
            <div className="flex flex-col gap-1 mt-3">
              {topSpending.map((s) => (
                <div key={s.groupName} className="flex items-center gap-2 text-sm">
                  <span className="text-[14px] leading-none">{getCategoryEmoji(s.groupName)}</span>
                  <span className="flex-1 truncate">{s.groupName}</span>
                  <span className="tabular-nums font-semibold">{fmtWhole(s.totalSpent)}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Transactions */}
          <Card title="Transactions" action={<button onClick={() => navigate('/transactions')} className="text-[13px] font-semibold text-primary">All →</button>}>
            <div className="flex flex-col">
              {recent.map((t) => {
                const type = t.category?.type ?? t.splits?.[0]?.type ?? 'expense';
                const { text, className } = fmtTransaction(t.amount, type);
                return (
                  <div key={t.id} onClick={() => navigate('/transactions')} className="flex items-center gap-3 py-2 border-b border-line last:border-0 cursor-pointer hover:bg-surface-2/40 -mx-2 px-2 rounded-lg">
                    <VendorAvatar name={txnVendor(t)} src={t.merchant?.logoUrl || undefined} color={getCategoryColorHex(t.category?.groupName)} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">{txnVendor(t)}</div>
                      <div className="text-[12px] text-content-3 truncate">{t.category?.subName ?? 'Uncategorized'}</div>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${className}`}>{text}</span>
                  </div>
                );
              })}
              {recent.length === 0 && <div className="text-content-3 text-sm py-2">No recent transactions.</div>}
            </div>
          </Card>

          {/* Reviews */}
          <Card title="Reviews" action={<button onClick={() => navigate('/reviews')} className="text-[13px] font-semibold text-primary">View →</button>}>
            {reviewCounts && reviewCounts.open > 0 ? (
              <div>
                <div className="text-[30px] font-extrabold tabular-nums leading-none">{reviewCounts.open}</div>
                <div className="text-[13px] text-content-2 mt-1">transaction{reviewCounts.open === 1 ? '' : 's'} need review</div>
                {reviewCounts.assignedToMe > 0 && (
                  <button onClick={() => navigate('/reviews?assignee=me')} className="mt-2 text-[13px] font-semibold text-primary">{reviewCounts.assignedToMe} assigned to you →</button>
                )}
              </div>
            ) : (
              <div className="text-content-3 text-sm py-2">All caught up.</div>
            )}
          </Card>

          {/* Recurring */}
          <Card title="Recurring" action={<button onClick={() => navigate('/recurring')} className="text-[13px] font-semibold text-primary">View →</button>}>
            {cycles.length === 0 ? (
              <div className="text-content-3 text-sm py-2">No recurring income or bills set up yet.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {cycles.slice(0, 4).map((c) => {
                  const isIncome = c.type === 'income';
                  const col = isIncome ? green : 'var(--negative)';
                  return (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${isIncome ? 'var(--positive)' : 'var(--negative)'} 16%, transparent)`, color: col }}>🔁</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">{c.label}</div>
                      <div className="text-[12px] text-content-3">{FREQ[c.freq_kind] ?? c.freq_kind}</div>
                    </div>
                    <span className="text-sm font-bold tabular-nums" style={{ color: col }}>{isIncome ? '+' : '−'}{fmtWhole(c.amount ?? 0)}</span>
                  </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
