import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { apiFetch } from '../lib/api';
import { fmt, fmtShort } from '../lib/formatters';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import ConfirmDeleteButton from '../components/ConfirmDeleteButton';
import PermissionGate from '../components/PermissionGate';
import Spinner from '../components/Spinner';
import Tooltip from '../components/Tooltip';
import ScrollableList from '../components/ScrollableList';
import { OwnerBadge, SharedBadge } from '../components/badges';
import { useIsMobile } from '../hooks/useIsMobile';

interface Account {
  accountId: number;
  name: string;
  lastFour: string | null;
  owner: string;
  owners: { id: number; displayName: string }[];
  isShared: boolean;
  classification: string;
  balance: number;
  date: string;
}

interface Asset {
  id: number;
  name: string;
  purchaseDate: string;
  cost: number;
  lifespanYears: number;
  salvageValue: number;
  depreciationMethod: 'straight_line' | 'declining_balance';
  decliningRate: number | null;
  currentValue: number;
}

interface NetWorthData {
  liquidTotal: number;
  investmentTotal: number;
  liabilityTotal: number;
  physicalAssetTotal: number;
  netWorth: number;
  accounts: Account[];
  assets: Asset[];
}

interface AssetForm {
  name: string;
  purchaseDate: string;
  cost: string;
  lifespanYears: string;
  salvageValue: string;
  depreciationMethod: 'straight_line' | 'declining_balance';
  decliningRate: string;
}

const emptyAssetForm: AssetForm = { name: '', purchaseDate: '', cost: '', lifespanYears: '', salvageValue: '', depreciationMethod: 'straight_line', decliningRate: '' };

interface Holding {
  symbol: string;
  description: string;
  shares: number;
  costBasis: number;
  marketValue: number;
}

interface AccountHoldings {
  accountId: number;
  accountName: string;
  holdings: Holding[];
  updatedAt: string | null;
}

function SectionHeader({ label, total, color, neg }: { label: string; total: number; color: string; neg?: boolean }) {
  return (
    <div className="flex justify-between py-2 pb-1 mt-3.5" style={{ borderBottom: `2px solid ${color}30` }}>
      <span className="font-bold text-[11px] text-[var(--btn-secondary-text)] uppercase tracking-[0.05em] flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-sm" style={{ background: color }} />{label}
      </span>
      <span className={`font-bold text-[13px] font-mono ${neg ? 'text-[#ef4444]' : 'text-[var(--text-primary)]'}`}>
        {total < 0 ? `(${fmt(Math.abs(total))})` : fmt(total)}
      </span>
    </div>
  );
}

function AccountRow({ a, neg, holdings, expanded, onToggle }: { a: Account; neg?: boolean; holdings?: AccountHoldings; expanded?: boolean; onToggle?: () => void }) {
  const hasHoldings = holdings && holdings.holdings.length > 0;
  return (
    <React.Fragment>
      <div className="flex justify-between items-center py-1.5 pl-3.5 border-b border-[var(--table-row-border)]">
        <div className="flex items-center gap-1.5">
          {hasHoldings ? (
            <button onClick={onToggle} className="bg-transparent border-none cursor-pointer p-0 flex items-center text-[var(--text-muted)] -ml-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ) : null}
          <span className="text-[13px] text-[var(--text-body)]">
            {a.name} {a.lastFour && <span className="text-[var(--text-muted)] text-[11px]">({a.lastFour})</span>}
          </span>
          {(a.owners || []).map((o) => (
            <OwnerBadge key={o.id} user={o} />
          ))}
          {a.isShared && (
            <SharedBadge />
          )}
        </div>
        <span className={`font-mono text-[13px] font-semibold ${neg && a.balance < 0 ? 'text-[#ef4444]' : 'text-[var(--text-primary)]'}`}>
          {a.balance < 0 ? `(${fmt(Math.abs(a.balance))})` : fmt(a.balance)}
        </span>
      </div>
      {expanded && hasHoldings && (
        <div className="bg-[var(--bg-hover)] border-b border-[var(--table-row-border)] pl-7 pr-3 py-2">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2 py-1 text-left">Symbol</th>
                <th className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2 py-1 text-left">Fund Name</th>
                <th className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2 py-1 text-right">Shares</th>
                <th className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2 py-1 text-right">Cost Basis</th>
                <th className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2 py-1 text-right">Mkt Value</th>
                <th className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2 py-1 text-right">
                  <Tooltip content="Total return since purchase, based on cost basis vs current market value">
                    <span className="cursor-help" style={{ textDecoration: 'underline dotted' }}>Total Return</span>
                  </Tooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              {holdings!.holdings.map((h) => {
                const gain = h.marketValue - h.costBasis;
                const pct = h.costBasis !== 0 ? (gain / h.costBasis) * 100 : 0;
                const isPos = gain >= 0;
                return (
                  <tr key={h.symbol}>
                    <td className="px-2 py-1 font-mono font-bold text-[11px] text-[var(--text-primary)]">{h.symbol}</td>
                    <td className="px-2 py-1 text-[11px] text-[var(--text-body)]">{h.description}</td>
                    <td className="px-2 py-1 font-mono text-[11px] text-right text-[var(--text-body)]">{h.shares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-2 py-1 font-mono text-[11px] text-right text-[var(--text-muted)]">{fmt(h.costBasis)}</td>
                    <td className="px-2 py-1 font-mono text-[11px] text-right font-bold text-[var(--text-primary)]">{fmt(h.marketValue)}</td>
                    <td className={`px-2 py-1 font-mono text-[11px] text-right font-semibold ${isPos ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                      {isPos ? '+' : '-'}{fmt(Math.abs(gain))} ({isPos ? '+' : '-'}{Math.abs(pct).toFixed(1)}%)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {holdings!.updatedAt && (
            <p className="text-[10px] text-[var(--text-muted)] m-0 mt-1.5 text-right">
              Last updated: {new Date(holdings!.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
      )}
    </React.Fragment>
  );
}

export default function NetWorthPage() {
  const { addToast } = useToast();
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const [data, setData] = useState<NetWorthData | null>(null);
  const [editingAssetId, setEditingAssetId] = useState<number | 'new' | null>(null);
  const [assetForm, setAssetForm] = useState<AssetForm>(emptyAssetForm);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceTab, setBalanceTab] = useState<'manual' | 'sync'>('manual');
  const [balanceInputs, setBalanceInputs] = useState<Record<number, string>>({});
  const [syncBalances, setSyncBalances] = useState<{ accountId: number; accountName: string; simplefinBalance: number; balanceDate: string; classification: string; holdings: { symbol: string; description: string; shares: number; costBasis: number; marketValue: number }[] }[]>([]);
  const [syncBalanceSelected, setSyncBalanceSelected] = useState<Set<number>>(new Set());
  const [syncHoldingsSelected, setSyncHoldingsSelected] = useState<Set<number>>(new Set());
  const [syncBalanceLoading, setSyncBalanceLoading] = useState(false);
  const [syncBalanceError, setSyncBalanceError] = useState<string | null>(null);
  const [hasSimplefinConnections, setHasSimplefinConnections] = useState(false);
  const [holdingsMap, setHoldingsMap] = useState<Map<number, AccountHoldings>>(new Map());
  const [expandedAccounts, setExpandedAccounts] = useState<Set<number>>(new Set());

  const loadData = useCallback(async () => {
    const res = await apiFetch<{ data: NetWorthData }>('/networth/summary');
    setData(res.data);
  }, []);

  const loadHoldings = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: { accountHoldings: AccountHoldings[] } }>('/simplefin/holdings');
      const map = new Map<number, AccountHoldings>();
      for (const ah of res.data.accountHoldings) {
        map.set(ah.accountId, ah);
      }
      setHoldingsMap(map);
    } catch {
      // Holdings not available — no SimpleFIN connections or no holdings data
    }
  }, []);

  useEffect(() => { loadData(); loadHoldings(); }, [loadData, loadHoldings]);

  useEffect(() => {
    apiFetch<{ data: { id: number }[] }>('/simplefin/connections')
      .then(r => setHasSimplefinConnections(r.data.length > 0))
      .catch(() => setHasSimplefinConnections(false));
  }, []);

  const fetchSyncBalances = useCallback(async () => {
    setSyncBalanceLoading(true);
    setSyncBalanceError(null);
    try {
      const res = await apiFetch<{ data: typeof syncBalances }>('/simplefin/balances');
      setSyncBalances(res.data);
      setSyncBalanceSelected(new Set(res.data.map(b => b.accountId)));
      setSyncHoldingsSelected(new Set(res.data.filter(b => (b.holdings || []).length > 0).map(b => b.accountId)));
    } catch (err: any) {
      setSyncBalanceError(err.message || 'Failed to fetch balances from SimpleFIN');
    } finally {
      setSyncBalanceLoading(false);
    }
  }, []);

  const applySyncBalances = async () => {
    if (!data) return;
    const selected = syncBalances.filter(b => syncBalanceSelected.has(b.accountId));
    const holdingsToUpdate = syncBalances.filter(b => syncHoldingsSelected.has(b.accountId) && (b.holdings || []).length > 0);

    // Use the commit endpoint to handle both balances and holdings in one request
    await apiFetch('/simplefin/commit', {
      method: 'POST',
      body: JSON.stringify({
        transactions: [],
        balanceUpdates: selected.map(b => ({ accountId: b.accountId, balance: b.simplefinBalance, date: b.balanceDate })),
        holdingsUpdates: holdingsToUpdate.map(b => ({ accountId: b.accountId, holdings: b.holdings })),
      }),
    });

    const parts: string[] = [];
    if (selected.length > 0) parts.push(`${selected.length} balance${selected.length !== 1 ? 's' : ''}`);
    if (holdingsToUpdate.length > 0) parts.push(`${holdingsToUpdate.length} holdings`);
    addToast(`Updated ${parts.join(' and ')}`, 'success');
    setShowBalanceModal(false);
    loadData();
    loadHoldings();
  };

  const startEditAsset = (asset: Asset) => {
    setEditingAssetId(asset.id);
    setAssetForm({
      name: asset.name,
      purchaseDate: asset.purchaseDate,
      cost: String(asset.cost),
      lifespanYears: String(asset.lifespanYears),
      salvageValue: String(asset.salvageValue),
      depreciationMethod: asset.depreciationMethod || 'straight_line',
      decliningRate: asset.decliningRate != null ? String(asset.decliningRate) : '',
    });
  };

  const startAddAsset = () => {
    setEditingAssetId('new');
    setAssetForm(emptyAssetForm);
  };

  const saveAsset = async () => {
    const body: Record<string, unknown> = {
      name: assetForm.name,
      purchaseDate: assetForm.purchaseDate,
      cost: parseFloat(assetForm.cost),
      lifespanYears: assetForm.lifespanYears ? parseFloat(assetForm.lifespanYears) : 0,
      salvageValue: parseFloat(assetForm.salvageValue),
      depreciationMethod: assetForm.depreciationMethod,
      decliningRate: assetForm.depreciationMethod === 'declining_balance' ? parseFloat(assetForm.decliningRate) : null,
    };

    try {
      if (editingAssetId === 'new') {
        await apiFetch('/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } else {
        await apiFetch(`/assets/${editingAssetId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      setEditingAssetId(null);
      addToast('Asset saved');
      await loadData();
    } catch {
      addToast('Failed to save asset', 'error');
    }
  };

  const deleteAsset = async (id: number) => {
    try {
      await apiFetch(`/assets/${id}`, { method: 'DELETE' });
      setEditingAssetId(null);
      addToast('Asset deleted');
      await loadData();
    } catch {
      addToast('Failed to delete asset', 'error');
    }
  };

  const saveBalances = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const promises = Object.entries(balanceInputs).map(([accountId, value]) => {
      const balance = parseFloat(value);
      if (!isNaN(balance)) {
        return apiFetch('/balances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: parseInt(accountId), date: today, balance }),
        });
      }
      return Promise.resolve();
    });
    try {
      await Promise.all(promises);
      setShowBalanceModal(false);
      setBalanceInputs({});
      addToast('Balances updated');
      await loadData();
    } catch {
      addToast('Failed to update balances', 'error');
    }
  };

  if (!data) {
    return <Spinner />;
  }

  const liquid = data.accounts.filter((a) => a.classification === 'liquid');
  const investment = data.accounts.filter((a) => a.classification === 'investment');
  const liability = data.accounts.filter((a) => a.classification === 'liability');
  const assetTotalCost = data.assets.reduce((s, a) => s + a.cost, 0);
  const assetTotalCurrent = data.assets.reduce((s, a) => s + a.currentValue, 0);

  const getDepreciationTooltip = (a: Asset): string => {
    const purchased = new Date(a.purchaseDate);
    const yearsOwned = (Date.now() - purchased.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const yrsStr = yearsOwned.toFixed(1);
    if (a.depreciationMethod === 'declining_balance' && a.decliningRate != null) {
      const raw = a.cost * Math.pow(1 - a.decliningRate / 100, yearsOwned);
      const floored = raw < a.salvageValue;
      return `Declining Balance (${a.decliningRate}%/yr)\n${fmt(a.cost)} × (1 − ${(a.decliningRate / 100).toFixed(2)})^${yrsStr} = ${fmt(raw)}${floored ? `\nFloor: ${fmt(a.salvageValue)} (salvage)` : ''}\nCurrent: ${fmt(a.currentValue)}`;
    }
    const depreciable = a.cost - a.salvageValue;
    const annual = depreciable / a.lifespanYears;
    const totalDep = annual * Math.min(yearsOwned, a.lifespanYears);
    return `Straight Line Depreciation\nCost: ${fmt(a.cost)} − Salvage: ${fmt(a.salvageValue)} = ${fmt(depreciable)} depreciable\n${fmt(depreciable)} ÷ ${a.lifespanYears} years = ${fmt(annual)}/year\n${yrsStr} years owned → ${fmt(a.cost)} − ${fmt(totalDep)} = ${fmt(a.currentValue)}`;
  };

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const toggleAccount = (accountId: number) => {
    setExpandedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return next;
    });
  };

  return (
    <div className={isMobile ? '' : 'flex flex-col'} style={isMobile ? undefined : { height: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <h1 className="page-title text-[22px] font-bold text-[var(--text-primary)] m-0">Net Worth</h1>
        <p className="page-subtitle text-[var(--text-secondary)] text-[13px] mt-1">As of {today}</p>
      </div>

      {/* Hero Card */}
      <div className={`rounded-xl border border-[var(--bg-card-border)] text-center mb-6 shadow-[var(--bg-card-shadow)] bg-gradient-to-br from-[var(--hero-gradient-from)] to-[var(--hero-gradient-to)] flex-shrink-0 ${isMobile ? 'p-5' : 'p-8'}`}>
        <p className="text-[13px] text-[var(--text-muted)] m-0 tracking-[0.05em] uppercase">Total Net Worth</p>
        <p className={`font-extrabold font-mono text-white my-2 tracking-[-0.02em] ${isMobile ? 'text-[28px]' : 'text-[40px]'}`}>{fmt(data.netWorth)}</p>
        <div className={`flex justify-center mt-3 flex-wrap ${isMobile ? 'gap-4' : 'gap-6'}`}>
          {[
            { l: 'Liquid Assets', v: data.liquidTotal, c: '#38bdf8' },
            { l: 'Investments', v: data.investmentTotal, c: '#a78bfa' },
            { l: 'Physical Assets', v: data.physicalAssetTotal, c: '#fbbf24' },
            { l: 'Liabilities', v: data.liabilityTotal, c: '#f87171', neg: true },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-[var(--text-muted)] text-[10px] m-0 uppercase tracking-[0.05em]">{s.l}</p>
              <p className="font-bold text-[18px] font-mono mt-1 m-0" style={{ color: s.c }}>
                {s.neg ? `(${fmtShort(s.v)})` : fmtShort(s.v)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {isMobile ? (
        /* Mobile: Stacked card layout */
        <div>
          {/* Update Balances button */}
          <PermissionGate permission="balances.update" fallback="disabled">
            <button
              onClick={() => {
                const inputs: Record<number, string> = {};
                data.accounts.forEach((a) => { inputs[a.accountId] = String(a.balance); });
                setBalanceInputs(inputs);
                const defaultTab = hasSimplefinConnections ? 'sync' : 'manual';
                setBalanceTab(defaultTab);
                setShowBalanceModal(true);
                if (defaultTab === 'sync') fetchSyncBalances();
              }}
              className="w-full py-3 rounded-lg border-none cursor-pointer text-[13px] font-semibold bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] mb-4 btn-secondary"
            >
              Update Balances
            </button>
          </PermissionGate>

          {/* Liquid Assets */}
          {liquid.length > 0 && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em]">Liquid Assets</span>
                <span className="text-[13px] font-bold font-mono" style={{ color: '#38bdf8' }}>{fmt(data.liquidTotal)}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {liquid.map((a) => (
                  <div key={a.accountId} className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] shadow-[var(--bg-card-shadow)] px-3.5 py-2.5">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-[13px] font-medium text-[var(--text-primary)]">
                          {a.name} {a.lastFour && <span className="font-mono text-[10px] text-[var(--text-muted)]">({a.lastFour})</span>}
                        </div>
                        <div className="flex gap-1 mt-1">
                          {(a.owners || []).map((o) => <OwnerBadge key={o.id} user={o} />)}
                          {a.isShared && <SharedBadge />}
                        </div>
                      </div>
                      <span className="text-[15px] font-bold font-mono text-[var(--text-primary)]">{fmt(a.balance)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Investments */}
          {investment.length > 0 && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em]">Investments & Retirement</span>
                <span className="text-[13px] font-bold font-mono" style={{ color: '#a78bfa' }}>{fmt(data.investmentTotal)}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {investment.map((a) => {
                  const holdings = holdingsMap.get(a.accountId);
                  const hasHoldings = holdings && holdings.holdings.length > 0;
                  const isExpanded = expandedAccounts.has(a.accountId);
                  return (
                    <div key={a.accountId} className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] shadow-[var(--bg-card-shadow)] px-3.5 py-2.5">
                      <div className="flex justify-between items-center" onClick={hasHoldings ? () => toggleAccount(a.accountId) : undefined}
                        style={hasHoldings ? { cursor: 'pointer' } : undefined}>
                        <div>
                          <div className="text-[13px] font-medium text-[var(--text-primary)]">
                            {a.name} {a.lastFour && <span className="font-mono text-[10px] text-[var(--text-muted)]">({a.lastFour})</span>}
                          </div>
                          <div className="flex gap-1 mt-1">
                            {(a.owners || []).map((o) => <OwnerBadge key={o.id} user={o} />)}
                            {a.isShared && <SharedBadge />}
                          </div>
                        </div>
                        <span className="text-[15px] font-bold font-mono text-[var(--text-primary)]">{fmt(a.balance)}</span>
                      </div>
                      {isExpanded && hasHoldings && (
                        <div className="mt-2 pt-2 border-t border-[var(--bg-card-border)]">
                          <div className="text-[10px] text-[var(--text-muted)] mb-1.5">Holdings</div>
                          {holdings!.holdings.map((h, i) => (
                            <div key={h.symbol} className="flex justify-between py-1"
                              style={{ borderBottom: i < holdings!.holdings.length - 1 ? '1px solid var(--bg-card-border)' : 'none' }}>
                              <div>
                                <span className="text-[11px] font-semibold font-mono text-[var(--text-primary)]">{h.symbol}</span>
                                <div className="text-[10px] text-[var(--text-muted)]">
                                  {h.shares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} shares
                                </div>
                              </div>
                              <span className="text-[12px] font-semibold font-mono text-[var(--text-primary)]">{fmt(h.marketValue)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Liabilities */}
          {liability.length > 0 && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em]">Liabilities</span>
                <span className="text-[13px] font-bold font-mono text-[#ef4444]">({fmt(Math.abs(data.liabilityTotal))})</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {liability.map((a) => (
                  <div key={a.accountId} className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] shadow-[var(--bg-card-shadow)] px-3.5 py-2.5">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-[13px] font-medium text-[var(--text-primary)]">
                          {a.name} {a.lastFour && <span className="font-mono text-[10px] text-[var(--text-muted)]">({a.lastFour})</span>}
                        </div>
                        <div className="flex gap-1 mt-1">
                          {(a.owners || []).map((o) => <OwnerBadge key={o.id} user={o} />)}
                          {a.isShared && <SharedBadge />}
                        </div>
                      </div>
                      <span className={`text-[15px] font-bold font-mono ${a.balance < 0 ? 'text-[#ef4444]' : 'text-[var(--text-primary)]'}`}>
                        {a.balance < 0 ? `(${fmt(Math.abs(a.balance))})` : fmt(a.balance)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Depreciable Assets */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em]">Depreciable Assets</span>
              <span className="text-[13px] font-bold font-mono" style={{ color: '#fbbf24' }}>{fmt(data.physicalAssetTotal)}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {data.assets.map((a) => (
                <div key={a.id} className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] shadow-[var(--bg-card-shadow)] px-3.5 py-2.5">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1 mr-3">
                      <div className="text-[13px] font-medium text-[var(--text-primary)]">{a.name}</div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">{a.purchaseDate}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">·</span>
                        <span className="text-[10px] text-[var(--text-muted)]">Cost: <span className="font-mono">{fmt(a.cost)}</span></span>
                        <span className="text-[10px] text-[var(--text-muted)]">·</span>
                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-md bg-[var(--badge-account-bg)] text-[var(--badge-account-text)]">
                          {a.depreciationMethod === 'declining_balance' ? `DB ${a.decliningRate}%` : 'SL'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[15px] font-bold font-mono text-[var(--text-primary)] flex-shrink-0">{fmt(a.currentValue)}</span>
                  </div>
                </div>
              ))}
            </div>
            <PermissionGate permission="assets.create" fallback="disabled">
              <button onClick={startAddAsset}
                className="w-full py-2.5 mt-2 rounded-lg text-[12px] font-semibold cursor-pointer bg-transparent text-[var(--text-secondary)]"
                style={{ border: '1px dashed var(--bg-card-border)' }}>
                + Add Asset
              </button>
            </PermissionGate>

            {/* Asset Edit/Add Modal (mobile) */}
            {editingAssetId != null && (
              <div className="fixed inset-0 bg-black/30 z-50 flex items-end justify-center" onClick={() => setEditingAssetId(null)}>
                <div className="bg-[var(--bg-card)] w-full rounded-t-2xl max-h-[90vh] overflow-y-auto px-5 pt-4 pb-6" onClick={(e) => e.stopPropagation()}>
                  <div className="w-10 h-1 rounded-full bg-[var(--text-muted)] mx-auto mb-4 opacity-40" />
                  <p className="font-bold text-[16px] text-[var(--text-primary)] m-0 mb-4">
                    {editingAssetId === 'new' ? 'Add Asset' : `Edit: ${assetForm.name}`}
                  </p>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-[11px] text-[var(--text-secondary)] font-medium block mb-0.5">Asset Name</label>
                      <input type="text" value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                        className="w-full px-2.5 py-2 border border-[var(--table-border)] rounded-md text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-body)]" />
                    </div>
                    <div>
                      <label className="text-[11px] text-[var(--text-secondary)] font-medium block mb-0.5">Purchase Date</label>
                      <input type="date" value={assetForm.purchaseDate} onChange={(e) => setAssetForm({ ...assetForm, purchaseDate: e.target.value })}
                        className="w-full px-2.5 py-2 border border-[var(--table-border)] rounded-md text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-body)]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-[var(--text-secondary)] font-medium block mb-0.5">Original Cost ($)</label>
                        <input type="number" value={assetForm.cost} onChange={(e) => setAssetForm({ ...assetForm, cost: e.target.value })}
                          className="w-full px-2.5 py-2 border border-[var(--table-border)] rounded-md text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-body)]" />
                      </div>
                      <div>
                        <label className="text-[11px] text-[var(--text-secondary)] font-medium block mb-0.5">Lifespan (years)</label>
                        <input type="number" value={assetForm.lifespanYears} onChange={(e) => setAssetForm({ ...assetForm, lifespanYears: e.target.value })}
                          className="w-full px-2.5 py-2 border border-[var(--table-border)] rounded-md text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-body)]" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] text-[var(--text-secondary)] font-medium block mb-0.5">Depreciation Method</label>
                      <select value={assetForm.depreciationMethod}
                        onChange={(e) => setAssetForm({ ...assetForm, depreciationMethod: e.target.value as 'straight_line' | 'declining_balance' })}
                        className="w-full px-2.5 py-2 border border-[var(--table-border)] rounded-md text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-body)]">
                        <option value="straight_line">Straight Line</option>
                        <option value="declining_balance">Declining Balance</option>
                      </select>
                    </div>
                    {assetForm.depreciationMethod === 'declining_balance' && (
                      <div>
                        <label className="text-[11px] text-[var(--text-secondary)] font-medium block mb-0.5">Annual Rate %</label>
                        <input type="number" min="1" max="99" placeholder="e.g., 30" value={assetForm.decliningRate}
                          onChange={(e) => setAssetForm({ ...assetForm, decliningRate: e.target.value })}
                          className="w-full px-2.5 py-2 border border-[var(--table-border)] rounded-md text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-body)]" />
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] text-[var(--text-muted)]">Common:</span>
                          {[20, 25, 30, 40].map((r) => (
                            <button key={r} onClick={() => setAssetForm({ ...assetForm, decliningRate: String(r) })}
                              className={`text-[10px] px-2 py-0.5 rounded-full border cursor-pointer font-medium ${
                                assetForm.decliningRate === String(r)
                                  ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-transparent'
                                  : 'bg-[var(--btn-secondary-bg)] text-[var(--text-secondary)] border-[var(--table-border)] hover:bg-[var(--bg-hover)]'
                              }`}>{r}%</button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-[11px] text-[var(--text-secondary)] font-medium block mb-0.5">Salvage Value ($)</label>
                      <input type="number" value={assetForm.salvageValue} onChange={(e) => setAssetForm({ ...assetForm, salvageValue: e.target.value })}
                        className="w-full px-2.5 py-2 border border-[var(--table-border)] rounded-md text-[13px] bg-[var(--bg-input)] outline-none text-[var(--text-body)]" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 justify-end">
                    {editingAssetId !== 'new' && hasPermission('assets.delete') && (
                      <div className="mr-auto">
                        <ConfirmDeleteButton onConfirm={() => deleteAsset(editingAssetId as number)} />
                      </div>
                    )}
                    <button onClick={() => setEditingAssetId(null)}
                      className="px-3.5 py-2 bg-[var(--btn-secondary-bg)] text-[var(--text-secondary)] rounded-lg border-none cursor-pointer text-[13px] font-medium btn-secondary">Cancel</button>
                    <button onClick={saveAsset}
                      className="px-3.5 py-2 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] rounded-lg border-none cursor-pointer text-[13px] font-medium btn-primary">Save</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
      /* Desktop: Two-Column Layout */
      <div className="grid gap-5 grid-cols-2 flex-1 min-h-[300px]">
        {/* Accounts */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] px-5 py-4 shadow-[var(--bg-card-shadow)] flex flex-col min-h-0">
          <div className="flex justify-between items-center flex-shrink-0">
            <h3 className="text-[14px] font-bold text-[var(--text-primary)] m-0">Accounts</h3>
            <PermissionGate permission="balances.update" fallback="disabled">
              <button
                onClick={() => {
                  const inputs: Record<number, string> = {};
                  data.accounts.forEach((a) => { inputs[a.accountId] = String(a.balance); });
                  setBalanceInputs(inputs);
                  const defaultTab = hasSimplefinConnections ? 'sync' : 'manual';
                  setBalanceTab(defaultTab);
                  setShowBalanceModal(true);
                  if (defaultTab === 'sync') fetchSyncBalances();
                }}
                className="text-[12px] px-3 py-1.5 bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] rounded-lg border-none cursor-pointer font-medium btn-secondary"
              >
                Update Balances
              </button>
            </PermissionGate>
          </div>
          <div className="flex-1 min-h-0 mt-3">
            <ScrollableList maxHeight="100%">
              <SectionHeader label="Liquid Assets" total={data.liquidTotal} color="#38bdf8" />
              {liquid.map((a) => <AccountRow key={a.accountId} a={a} holdings={holdingsMap.get(a.accountId)} expanded={expandedAccounts.has(a.accountId)} onToggle={() => toggleAccount(a.accountId)} />)}
              <SectionHeader label="Investments & Retirement" total={data.investmentTotal} color="#a78bfa" />
              {investment.map((a) => <AccountRow key={a.accountId} a={a} holdings={holdingsMap.get(a.accountId)} expanded={expandedAccounts.has(a.accountId)} onToggle={() => toggleAccount(a.accountId)} />)}
              <SectionHeader label="Liabilities" total={-data.liabilityTotal} color="#f87171" neg />
              {liability.map((a) => <AccountRow key={a.accountId} a={a} neg holdings={holdingsMap.get(a.accountId)} expanded={expandedAccounts.has(a.accountId)} onToggle={() => toggleAccount(a.accountId)} />)}
            </ScrollableList>
          </div>
        </div>

        {/* Depreciable Assets */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] px-5 py-4 shadow-[var(--bg-card-shadow)] flex flex-col min-h-0">
          <div className="flex justify-between items-center flex-shrink-0">
            <h3 className="text-[14px] font-bold text-[var(--text-primary)] m-0">Depreciable Assets</h3>
            <PermissionGate permission="assets.create" fallback="disabled">
              <button
                onClick={startAddAsset}
                className="flex items-center gap-1 text-[12px] px-3 py-1.5 bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] rounded-lg border-none cursor-pointer font-medium btn-secondary"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add
              </button>
            </PermissionGate>
          </div>
          <div className="flex-1 min-h-0 mt-3">
            <ScrollableList maxHeight="100%">
              <table className="w-full border-collapse">
                <thead>
              <tr>
                <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] text-left">Asset</th>
                <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] text-right">Cost</th>
                <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] text-right">Life</th>
                <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] text-center">Method</th>
                <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] text-right">Current</th>
                <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] w-9"></th>
              </tr>
            </thead>
            <tbody>
              {data.assets.map((a) => (
                <tr key={a.id} className="border-b border-[var(--table-row-border)]">
                  <td className="px-2.5 py-2 text-[13px] font-medium text-[var(--text-primary)]">
                    {a.name}
                    <div className="text-[10px] text-[var(--text-muted)] font-mono">{a.purchaseDate}</div>
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono text-[12px] text-[var(--text-muted)]">{fmt(a.cost)}</td>
                  <td className="px-2.5 py-2 text-right font-mono text-[12px] text-[var(--text-muted)]">{a.lifespanYears > 0 ? `${a.lifespanYears}yr` : '—'}</td>
                  <td className="px-2.5 py-2 text-center">
                    <span className="inline-block text-[11px] font-mono px-1.5 py-0.5 rounded-md bg-[var(--badge-account-bg)] text-[var(--badge-account-text)]">
                      {a.depreciationMethod === 'declining_balance' ? `DB ${a.decliningRate}%` : 'SL'}
                    </span>
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono text-[12px] font-semibold text-[var(--text-primary)]">
                    <Tooltip content={getDepreciationTooltip(a)}>
                      <span className="cursor-help border-b border-dotted border-[var(--text-muted)]">{fmt(a.currentValue)}</span>
                    </Tooltip>
                  </td>
                  <td className="px-2.5 py-2 text-center">
                    {hasPermission('assets.edit') && (
                      <button
                        onClick={() => startEditAsset(a)}
                        className="text-[var(--text-muted)] bg-transparent border-none cursor-pointer p-1 rounded hover:bg-[var(--bg-hover)]"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="bg-[var(--bg-hover)]">
                <td className="px-2.5 py-2 text-[13px] font-bold text-[var(--text-primary)]">Total</td>
                <td className="px-2.5 py-2 text-right font-mono font-bold text-[var(--text-primary)]">{fmt(assetTotalCost)}</td>
                <td></td>
                <td></td>
                <td className="px-2.5 py-2 text-right font-mono font-bold text-[var(--text-primary)]">{fmt(assetTotalCurrent)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          {/* Asset Edit/Add Form */}
          {editingAssetId != null && (
            <div className="bg-[var(--bg-input)] border border-[var(--table-border)] rounded-lg p-4 mt-3">
              <p className="font-semibold text-[13px] text-[var(--text-primary)] m-0 mb-3">
                {editingAssetId === 'new' ? 'Add Asset' : `Edit: ${assetForm.name}`}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Name */}
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block mb-0.5">Asset Name</label>
                  <input type="text" value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-[var(--table-border)] rounded-md text-[13px] bg-[var(--bg-card)] outline-none text-[var(--text-body)]" />
                </div>
                {/* Purchase Date */}
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block mb-0.5">Purchase Date</label>
                  <input type="date" value={assetForm.purchaseDate} onChange={(e) => setAssetForm({ ...assetForm, purchaseDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-[var(--table-border)] rounded-md text-[13px] bg-[var(--bg-card)] outline-none text-[var(--text-body)]" />
                </div>
                {/* Original Cost */}
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block mb-0.5">Original Cost ($)</label>
                  <input type="number" value={assetForm.cost} onChange={(e) => setAssetForm({ ...assetForm, cost: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-[var(--table-border)] rounded-md text-[13px] bg-[var(--bg-card)] outline-none text-[var(--text-body)]" />
                </div>
                {/* Lifespan */}
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block mb-0.5">Lifespan (years)</label>
                  <input type="number" value={assetForm.lifespanYears} onChange={(e) => setAssetForm({ ...assetForm, lifespanYears: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-[var(--table-border)] rounded-md text-[13px] bg-[var(--bg-card)] outline-none text-[var(--text-body)]" />
                </div>
                {/* Depreciation Method */}
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium flex items-center gap-1 mb-0.5">
                    Depreciation Method
                    <Tooltip content={"Straight Line: Equal amount each year. Best for furniture, home improvements, and items that wear evenly over time.\n\nDeclining Balance: Loses more value early, less later. Best for electronics, vehicles, and appliances that depreciate fastest when new."}>
                      <span className="cursor-help text-[var(--text-muted)]">ⓘ</span>
                    </Tooltip>
                  </label>
                  <select
                    value={assetForm.depreciationMethod}
                    onChange={(e) => setAssetForm({ ...assetForm, depreciationMethod: e.target.value as 'straight_line' | 'declining_balance' })}
                    className="w-full px-2.5 py-1.5 border border-[var(--table-border)] rounded-md text-[13px] bg-[var(--bg-card)] outline-none text-[var(--text-body)]"
                  >
                    <option value="straight_line">Straight Line</option>
                    <option value="declining_balance">Declining Balance</option>
                  </select>
                </div>
                {/* Annual Rate % (declining balance only) */}
                {assetForm.depreciationMethod === 'declining_balance' && (
                  <div>
                    <label className="text-[11px] text-[var(--text-secondary)] font-medium flex items-center gap-1 mb-0.5">
                      Annual Rate %
                      <Tooltip content={"Common annual rates by asset type:\n• Furniture, home goods: 20%\n• Kitchen appliances, tools: 25%\n• Electronics, computers: 30%\n• Vehicles, phones: 40%\n\nHigher rates = faster early depreciation.\nUse for assets that lose the most value when new."}>
                        <span className="cursor-help text-[var(--text-muted)]">ⓘ</span>
                      </Tooltip>
                    </label>
                    <input
                      type="number" min="1" max="99" placeholder="e.g., 30"
                      value={assetForm.decliningRate}
                      onChange={(e) => setAssetForm({ ...assetForm, decliningRate: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-[var(--table-border)] rounded-md text-[13px] bg-[var(--bg-card)] outline-none text-[var(--text-body)]"
                    />
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] text-[var(--text-muted)]">Common:</span>
                      {[20, 25, 30, 40].map((r) => (
                        <button key={r} onClick={() => setAssetForm({ ...assetForm, decliningRate: String(r) })}
                          className={`text-[10px] px-2 py-0.5 rounded-full border cursor-pointer font-medium ${
                            assetForm.decliningRate === String(r)
                              ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-transparent'
                              : 'bg-[var(--btn-secondary-bg)] text-[var(--text-secondary)] border-[var(--table-border)] hover:bg-[var(--bg-hover)]'
                          }`}
                        >{r}%</button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Salvage Value */}
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block mb-0.5">Salvage Value ($)</label>
                  <input type="number" value={assetForm.salvageValue} onChange={(e) => setAssetForm({ ...assetForm, salvageValue: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-[var(--table-border)] rounded-md text-[13px] bg-[var(--bg-card)] outline-none text-[var(--text-body)]" />
                </div>
              </div>
              <div className="flex gap-2 mt-3 justify-end">
                {editingAssetId !== 'new' && hasPermission('assets.delete') && (
                  <div className="mr-auto">
                    <ConfirmDeleteButton onConfirm={() => deleteAsset(editingAssetId as number)} />
                  </div>
                )}
                <button onClick={() => setEditingAssetId(null)}
                  className="px-3.5 py-1.5 bg-[var(--btn-secondary-bg)] text-[var(--text-secondary)] rounded-lg border-none cursor-pointer text-[12px] font-medium btn-secondary">Cancel</button>
                <button onClick={saveAsset}
                  className="px-3.5 py-1.5 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] rounded-lg border-none cursor-pointer text-[12px] font-medium btn-primary">Save</button>
              </div>
            </div>
          )}
            </ScrollableList>
          </div>
        </div>
      </div>
      )}

      {/* Update Balances Modal */}
      {showBalanceModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowBalanceModal(false)}>
          <div className="bg-[var(--bg-card)] rounded-xl shadow-lg w-[560px] max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold text-[var(--text-primary)] m-0 mb-4">Update Account Balances</h3>

            {/* Tab Switcher — only if SimpleFIN connections exist */}
            {hasSimplefinConnections && (
              <div className="flex bg-[var(--btn-secondary-bg)] rounded-lg p-0.5 mb-4">
                {(['manual', 'sync'] as const).map(tab => (
                  <button key={tab}
                    onClick={() => { setBalanceTab(tab); if (tab === 'sync' && syncBalances.length === 0) fetchSyncBalances(); }}
                    className={`flex-1 text-[12px] font-semibold py-1.5 rounded-md border-none cursor-pointer transition-colors ${
                      balanceTab === tab
                        ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                        : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {tab === 'manual' ? 'Manual' : 'Bank Sync'}
                  </button>
                ))}
              </div>
            )}

            {/* Manual Tab */}
            {balanceTab === 'manual' && (
              <>
                <p className="text-[12px] text-[var(--text-secondary)] m-0 mb-4">Enter current balances for each account. Leave unchanged to skip.</p>
                <div className="flex flex-col gap-3">
                  {data.accounts.map((a) => (
                    <div key={a.accountId} className="flex items-center gap-3">
                      <span className="flex-1 text-[13px] text-[var(--text-body)]">
                        {a.name} {a.lastFour && <span className="text-[var(--text-muted)] text-[11px]">({a.lastFour})</span>}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={balanceInputs[a.accountId] ?? ''}
                        onChange={(e) => setBalanceInputs({ ...balanceInputs, [a.accountId]: e.target.value })}
                        className="w-[140px] px-2.5 py-1.5 border border-[var(--table-border)] rounded-md text-[13px] font-mono text-right outline-none text-[var(--text-body)] bg-[var(--bg-input)]"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                  <button onClick={() => setShowBalanceModal(false)}
                    className="px-4 py-2 bg-[var(--btn-secondary-bg)] text-[var(--text-secondary)] rounded-lg border-none cursor-pointer text-[13px] font-medium btn-secondary">Cancel</button>
                  <button onClick={saveBalances}
                    className="px-4 py-2 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] rounded-lg border-none cursor-pointer text-[13px] font-medium btn-primary">Save All</button>
                </div>
              </>
            )}

            {/* Bank Sync Tab */}
            {balanceTab === 'sync' && (
              <>
                {syncBalanceLoading && (
                  <div className="flex items-center justify-center py-8 gap-2 text-[var(--text-secondary)] text-[13px]">
                    <Spinner /> Fetching balances from SimpleFIN…
                  </div>
                )}
                {syncBalanceError && (
                  <div className="rounded-lg border border-[var(--bg-inline-error-border)] bg-[var(--bg-inline-error)] p-3 text-[12px] text-[var(--text-inline-error)] mb-3">
                    <p className="m-0 font-semibold mb-1">Failed to fetch balances</p>
                    <p className="m-0 mb-2">{syncBalanceError}</p>
                    <button onClick={fetchSyncBalances}
                      className="text-[11px] font-semibold text-[var(--text-inline-error)] underline cursor-pointer bg-transparent border-none p-0">Retry</button>
                    <p className="m-0 mt-2 text-[11px] text-[var(--text-muted)]">You can still update balances manually using the other tab.</p>
                  </div>
                )}
                {!syncBalanceLoading && !syncBalanceError && syncBalances.length === 0 && (
                  <p className="text-[13px] text-[var(--text-muted)] text-center py-6">No linked accounts found. Link accounts in Settings → Bank Sync.</p>
                )}
                {!syncBalanceLoading && !syncBalanceError && syncBalances.length > 0 && (
                  <>
                    <table className="w-full border-collapse text-[13px] mb-3">
                      <thead>
                        <tr>
                          <th className="w-8 px-2 py-2 border-b-2 border-[var(--table-border)]">
                            <input type="checkbox"
                              checked={syncBalanceSelected.size === syncBalances.length}
                              onChange={() => {
                                if (syncBalanceSelected.size === syncBalances.length) setSyncBalanceSelected(new Set());
                                else setSyncBalanceSelected(new Set(syncBalances.map(b => b.accountId)));
                              }}
                              className="cursor-pointer" />
                          </th>
                          <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] text-left">Account</th>
                          <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] text-right">Current</th>
                          <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] text-right">SimpleFIN</th>
                          <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] text-right">Difference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {syncBalances.map((b) => {
                          const current = data.accounts.find(a => a.accountId === b.accountId)?.balance ?? null;
                          const diff = current !== null ? b.simplefinBalance - current : null;
                          const noChange = diff !== null && Math.abs(diff) < 0.01;
                          return (
                            <tr key={b.accountId} className={`border-b border-[var(--table-row-border)] ${noChange ? 'opacity-50' : ''}`}>
                              <td className="px-2 py-2 text-center">
                                <input type="checkbox"
                                  checked={syncBalanceSelected.has(b.accountId)}
                                  onChange={() => setSyncBalanceSelected(prev => {
                                    const next = new Set(prev);
                                    if (next.has(b.accountId)) next.delete(b.accountId); else next.add(b.accountId);
                                    return next;
                                  })}
                                  className="cursor-pointer" />
                              </td>
                              <td className="px-2.5 py-2 font-medium text-[var(--text-primary)]">
                                {b.accountName}
                                {(b.holdings || []).length > 0 && (
                                  <span className="ml-1.5 text-[10px] font-medium bg-[var(--badge-investment-bg)] text-[var(--badge-investment-text)] px-1.5 py-0.5 rounded">
                                    {b.holdings.length} holding{b.holdings.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </td>
                              <td className="px-2.5 py-2 text-right font-mono text-[var(--text-body)]">
                                {current !== null ? fmt(current) : '—'}
                              </td>
                              <td className="px-2.5 py-2 text-right font-mono font-semibold text-[var(--text-primary)]">
                                {fmt(b.simplefinBalance)}
                              </td>
                              <td className="px-2.5 py-2 text-right font-mono text-[12px]">
                                {noChange ? (
                                  <span className="text-[var(--text-muted)]">No change</span>
                                ) : diff !== null ? (
                                  <span className={diff >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                                    {diff >= 0 ? '+' : ''}{fmt(diff)}
                                  </span>
                                ) : (
                                  <span className="text-[var(--text-muted)]">New</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="flex items-center justify-between">
                      {syncBalances.some(b => (b.holdings || []).length > 0) && (
                        <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)] cursor-pointer select-none">
                          <input type="checkbox"
                            checked={syncHoldingsSelected.size > 0}
                            onChange={() => {
                              if (syncHoldingsSelected.size > 0) {
                                setSyncHoldingsSelected(new Set());
                              } else {
                                setSyncHoldingsSelected(new Set(syncBalances.filter(b => (b.holdings || []).length > 0).map(b => b.accountId)));
                              }
                            }}
                            className="cursor-pointer" />
                          Also update holdings for investment accounts
                        </label>
                      )}
                      <div className="flex gap-2 ml-auto">
                        <button onClick={() => setShowBalanceModal(false)}
                          className="px-4 py-2 bg-[var(--btn-secondary-bg)] text-[var(--text-secondary)] rounded-lg border-none cursor-pointer text-[13px] font-medium btn-secondary">Cancel</button>
                        <button onClick={applySyncBalances}
                          disabled={syncBalanceSelected.size === 0}
                          className="px-4 py-2 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] rounded-lg border-none cursor-pointer text-[13px] font-medium disabled:opacity-50 btn-primary">
                          Apply {syncBalanceSelected.size} Update{syncBalanceSelected.size !== 1 ? 's' : ''}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
