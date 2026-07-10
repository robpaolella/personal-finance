import { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '../lib/api';
import Spinner from '../components/Spinner';
import { VendorAvatar } from '../components/primitives';
import { OwnerBadge, SharedBadge } from '../components/badges';
import DonutChart, { type DonutSegment } from '../components/charts/DonutChart';

interface Holding { symbol: string; description: string; shares: number; costBasis: number; marketValue: number }
interface AccountHoldings { accountId: number; accountName: string; holdings: Holding[]; updatedAt: string | null }
interface AcctMeta {
  id: number; name: string; institution: string | null; classification: string;
  owners: { id: number; displayName: string }[]; isShared: boolean;
}

const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const moneyShort = (n: number) => { const a = Math.abs(n); return a >= 1000 ? `$${(n / 1000).toFixed(1)}k` : money(n); };
const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

const PALETTE = ['var(--c-teal)', 'var(--c-blue)', 'var(--c-indigo)', 'var(--c-violet)', 'var(--c-fuchsia)', 'var(--c-green)', 'var(--c-orange)', 'var(--c-amber)', 'var(--c-rose)'];

const gainColor = (n: number) => (n >= 0 ? 'var(--positive)' : 'var(--negative)');

function GainChip({ amount, percent }: { amount: number; percent: number }) {
  return (
    <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[12px] font-semibold tabular-nums"
      style={{ background: `color-mix(in srgb, ${gainColor(amount)} 15%, transparent)`, color: gainColor(amount) }}>
      {amount >= 0 ? '▲' : '▼'} {pct(percent)}
    </span>
  );
}

export default function InvestmentsPage() {
  const [accountHoldings, setAccountHoldings] = useState<AccountHoldings[] | null>(null);
  const [meta, setMeta] = useState<Map<number, AcctMeta>>(new Map());

  useEffect(() => {
    apiFetch<{ data: { accountHoldings: AccountHoldings[] } }>('/simplefin/holdings')
      .then((r) => setAccountHoldings(r.data.accountHoldings))
      .catch(() => setAccountHoldings([]));
    apiFetch<{ data: AcctMeta[] }>('/accounts')
      .then((r) => setMeta(new Map(r.data.map((a) => [a.id, a]))))
      .catch(() => {});
  }, []);

  const flat = useMemo(
    () => (accountHoldings ?? []).flatMap((ah) => ah.holdings.map((h) => ({ ...h, accountId: ah.accountId, accountName: ah.accountName }))),
    [accountHoldings]
  );
  const totals = useMemo(() => {
    const value = flat.reduce((s, h) => s + h.marketValue, 0);
    const cost = flat.reduce((s, h) => s + h.costBasis, 0);
    const gain = value - cost;
    return { value, cost, gain, gainPct: cost > 0 ? (gain / cost) * 100 : 0 };
  }, [flat]);

  // Aggregate by symbol — the same ticker can appear in multiple accounts.
  const bySymbol = useMemo(() => {
    const m = new Map<string, { symbol: string; description: string; marketValue: number; costBasis: number }>();
    for (const h of flat) {
      const e = m.get(h.symbol) ?? { symbol: h.symbol, description: h.description, marketValue: 0, costBasis: 0 };
      e.marketValue += h.marketValue; e.costBasis += h.costBasis;
      m.set(h.symbol, e);
    }
    return Array.from(m.values());
  }, [flat]);

  // Allocation donut: top holdings by value + an "Other" bucket.
  const allocation = useMemo<DonutSegment[]>(() => {
    const sorted = [...bySymbol].sort((a, b) => b.marketValue - a.marketValue);
    const top = sorted.slice(0, 8);
    const rest = sorted.slice(8);
    const segs: DonutSegment[] = top.map((h, i) => ({ label: h.symbol, value: h.marketValue, color: PALETTE[i % PALETTE.length] }));
    const otherVal = rest.reduce((s, h) => s + h.marketValue, 0);
    if (otherVal > 0) segs.push({ label: 'Other', value: otherVal, color: 'var(--content-3)' });
    return segs;
  }, [bySymbol]);

  // Best / worst performers by since-cost return %.
  const movers = useMemo(() => {
    const withRet = bySymbol.filter((h) => h.costBasis > 0).map((h) => ({ ...h, ret: ((h.marketValue - h.costBasis) / h.costBasis) * 100 }));
    return [...withRet].sort((a, b) => b.ret - a.ret);
  }, [bySymbol]);

  if (accountHoldings === null) return <Spinner />;

  const empty = flat.length === 0;

  return (
    <div className="max-w-[1100px] mx-auto px-4 md:px-8 pb-16">
      {/* top bar */}
      <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-4 mb-4 flex items-center justify-between gap-3 bg-bg/80 backdrop-blur border-b border-line">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-extrabold tracking-tight">Investments</h1>
          <span className="text-sm font-semibold text-primary border-b-2 border-primary pb-0.5">Holdings</span>
        </div>
      </div>

      {empty ? (
        <div className="bg-surface border border-line rounded-card shadow-sm p-12 text-center">
          <div className="text-[15px] font-semibold mb-1">No holdings yet</div>
          <p className="text-content-3 text-sm max-w-md mx-auto">Link an investment or retirement account in <span className="font-semibold text-content-2">Settings → Bank Sync</span>. Holdings sync automatically and appear here.</p>
        </div>
      ) : (
        <>
          {/* headline + allocation */}
          <div className="grid md:grid-cols-[1fr_auto] gap-5 items-center bg-surface border border-line rounded-card shadow-sm p-6 mb-5">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wide text-content-3 mb-1">Portfolio value</div>
              <div className="text-[34px] font-extrabold tracking-tight tabular-nums leading-none">{money(totals.value)}</div>
              <div className="mt-2 flex items-center gap-2">
                <GainChip amount={totals.gain} percent={totals.gainPct} />
                <span className="text-[13px] text-content-3">{money(totals.gain)} total return · since cost</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 max-w-sm">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wide text-content-3">Cost basis</div>
                  <div className="text-[17px] font-bold tabular-nums">{money(totals.cost)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wide text-content-3">Holdings</div>
                  <div className="text-[17px] font-bold tabular-nums">{flat.length}</div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <DonutChart segments={allocation} size={190} centerLabel="Allocation" centerValue={money(totals.value)} />
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.7fr_1fr] gap-5 items-start">
            {/* holdings grouped by account */}
            <div className="flex flex-col gap-5">
              {(accountHoldings ?? []).map((ah) => {
                const m = meta.get(ah.accountId);
                const acctValue = ah.holdings.reduce((s, h) => s + h.marketValue, 0);
                const acctCost = ah.holdings.reduce((s, h) => s + h.costBasis, 0);
                return (
                  <div key={ah.accountId} className="bg-surface border border-line rounded-card shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-line">
                      <VendorAvatar name={m?.institution || ah.accountName} color="var(--c-teal)" size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[15px] truncate">{ah.accountName}</span>
                          {m && (m.isShared ? <SharedBadge /> : m.owners[0] && <OwnerBadge user={m.owners[0]} />)}
                        </div>
                        {m?.institution && <div className="text-[12px] text-content-3">{m.institution}</div>}
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-[15px] tabular-nums">{money(acctValue)}</div>
                        <div className="text-[12px]" style={{ color: gainColor(acctValue - acctCost) }}>{money(acctValue - acctCost)}</div>
                      </div>
                    </div>
                    {ah.holdings.map((h) => {
                      const gain = h.marketValue - h.costBasis;
                      const gp = h.costBasis > 0 ? (gain / h.costBasis) * 100 : 0;
                      return (
                        <div key={h.symbol} className="flex items-center gap-3 px-5 py-3 border-t border-line first:border-t-0">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-[14px]">{h.symbol}</div>
                            <div className="text-[12px] text-content-3 truncate">{h.description}</div>
                          </div>
                          <div className="text-right text-[12px] text-content-3 tabular-nums w-24 hidden sm:block">
                            {h.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })} sh
                          </div>
                          <div className="text-right w-28">
                            <div className="font-bold text-[14px] tabular-nums">{money(h.marketValue)}</div>
                            <div className="text-[11px] text-content-3 tabular-nums">cost {moneyShort(h.costBasis)}</div>
                          </div>
                          <div className="w-20 flex justify-end"><GainChip amount={gain} percent={gp} /></div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* performers + allocation legend */}
            <div className="flex flex-col gap-5">
              <div className="bg-surface border border-line rounded-card shadow-sm p-5">
                <div className="text-[15px] font-extrabold mb-3">Performance · since cost</div>
                {movers.length === 0 ? (
                  <div className="text-content-3 text-sm">No cost basis available.</div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {movers.slice(0, 6).map((h) => (
                      <div key={h.symbol} className="flex items-center gap-2 text-sm">
                        <span className="font-bold w-14 shrink-0">{h.symbol}</span>
                        <span className="flex-1 truncate text-content-3 text-[13px]">{h.description}</span>
                        <span className="tabular-nums font-semibold" style={{ color: gainColor(h.ret) }}>{pct(h.ret)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-content-3 mt-3 pt-3 border-t border-line">Daily movers &amp; benchmarks need market-price data (not provided by SimpleFIN) — coming later.</p>
              </div>

              <div className="bg-surface border border-line rounded-card shadow-sm p-5">
                <div className="text-[15px] font-extrabold mb-3">Allocation</div>
                <div className="flex flex-col gap-1.5">
                  {allocation.map((s) => (
                    <div key={s.label} className="flex items-center gap-2 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="flex-1 truncate">{s.label}</span>
                      <span className="tabular-nums text-content-3 text-[13px]">{totals.value > 0 ? Math.round((s.value / totals.value) * 100) : 0}%</span>
                      <span className="tabular-nums font-semibold w-20 text-right">{moneyShort(s.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
