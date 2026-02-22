import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { apiFetch } from '../lib/api';
import { fmt, fmtShort } from '../lib/formatters';
import { useToast } from '../context/ToastContext';
import ConfirmDeleteButton from '../components/ConfirmDeleteButton';
import Spinner from '../components/Spinner';
import Tooltip from '../components/Tooltip';
import { OwnerBadge, SharedBadge } from '../components/badges';

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
}

const emptyAssetForm: AssetForm = { name: '', purchaseDate: '', cost: '', lifespanYears: '', salvageValue: '' };

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
  const [data, setData] = useState<NetWorthData | null>(null);
  const [editingAssetId, setEditingAssetId] = useState<number | 'new' | null>(null);
  const [assetForm, setAssetForm] = useState<AssetForm>(emptyAssetForm);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceTab, setBalanceTab] = useState<'manual' | 'sync'>('manual');
  const [balanceInputs, setBalanceInputs] = useState<Record<number, string>>({});
  const [syncBalances, setSyncBalances] = useState<{ accountId: number; accountName: string; simplefinBalance: number; balanceDate: string }[]>([]);
  const [syncBalanceSelected, setSyncBalanceSelected] = useState<Set<number>>(new Set());
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
    } catch (err: any) {
      setSyncBalanceError(err.message || 'Failed to fetch balances from SimpleFIN');
    } finally {
      setSyncBalanceLoading(false);
    }
  }, []);

  const applySyncBalances = async () => {
    if (!data) return;
    const selected = syncBalances.filter(b => syncBalanceSelected.has(b.accountId));
    const promises = selected.map(b =>
      apiFetch('/networth/balance-snapshots', {
        method: 'POST',
        body: JSON.stringify({ accountId: b.accountId, balance: b.simplefinBalance, date: b.balanceDate }),
      })
    );
    await Promise.all(promises);
    addToast(`Updated ${selected.length} account balance${selected.length !== 1 ? 's' : ''}`, 'success');
    setShowBalanceModal(false);
    loadData();
  };

  const startEditAsset = (asset: Asset) => {
    setEditingAssetId(asset.id);
    setAssetForm({
      name: asset.name,
      purchaseDate: asset.purchaseDate,
      cost: String(asset.cost),
      lifespanYears: String(asset.lifespanYears),
      salvageValue: String(asset.salvageValue),
    });
  };

  const startAddAsset = () => {
    setEditingAssetId('new');
    setAssetForm(emptyAssetForm);
  };

  const saveAsset = async () => {
    const body = {
      name: assetForm.name,
      purchaseDate: assetForm.purchaseDate,
      cost: parseFloat(assetForm.cost),
      lifespanYears: parseFloat(assetForm.lifespanYears),
      salvageValue: parseFloat(assetForm.salvageValue),
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
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[var(--text-primary)] m-0">Net Worth</h1>
        <p className="text-[var(--text-secondary)] text-[13px] mt-1">As of {today}</p>
      </div>

      {/* Hero Card */}
      <div className="rounded-xl border border-[var(--bg-card-border)] text-center p-8 mb-6 shadow-[var(--bg-card-shadow)] bg-gradient-to-br from-[var(--hero-gradient-from)] to-[var(--hero-gradient-to)]">
        <p className="text-[13px] text-[var(--text-muted)] m-0 tracking-[0.05em] uppercase">Total Net Worth</p>
        <p className="text-[40px] font-extrabold font-mono text-white my-2 tracking-[-0.02em]">{fmt(data.netWorth)}</p>
        <div className="flex justify-center gap-6 mt-3 flex-wrap">
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

      {/* Two-Column Layout */}
      <div className="grid grid-cols-2 gap-5">
        {/* Accounts */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] px-5 py-4 shadow-[var(--bg-card-shadow)]">
          <div className="flex justify-between items-center">
            <h3 className="text-[14px] font-bold text-[var(--text-primary)] m-0">Accounts</h3>
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
          </div>
          <div className="mt-3">
            <SectionHeader label="Liquid Assets" total={data.liquidTotal} color="#38bdf8" />
            {liquid.map((a) => <AccountRow key={a.accountId} a={a} holdings={holdingsMap.get(a.accountId)} expanded={expandedAccounts.has(a.accountId)} onToggle={() => toggleAccount(a.accountId)} />)}
            <SectionHeader label="Investments & Retirement" total={data.investmentTotal} color="#a78bfa" />
            {investment.map((a) => <AccountRow key={a.accountId} a={a} holdings={holdingsMap.get(a.accountId)} expanded={expandedAccounts.has(a.accountId)} onToggle={() => toggleAccount(a.accountId)} />)}
            <SectionHeader label="Liabilities" total={-data.liabilityTotal} color="#f87171" neg />
            {liability.map((a) => <AccountRow key={a.accountId} a={a} neg holdings={holdingsMap.get(a.accountId)} expanded={expandedAccounts.has(a.accountId)} onToggle={() => toggleAccount(a.accountId)} />)}
          </div>
        </div>

        {/* Depreciable Assets */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--bg-card-border)] px-5 py-4 shadow-[var(--bg-card-shadow)]">
          <div className="flex justify-between items-center">
            <h3 className="text-[14px] font-bold text-[var(--text-primary)] m-0">Depreciable Assets</h3>
            <button
              onClick={startAddAsset}
              className="flex items-center gap-1 text-[12px] px-3 py-1.5 bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] rounded-lg border-none cursor-pointer font-medium btn-secondary"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add
            </button>
          </div>
          <table className="w-full border-collapse mt-3">
            <thead>
              <tr>
                <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] text-left">Asset</th>
                <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] text-right">Cost</th>
                <th className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] text-right">Life</th>
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
                  <td className="px-2.5 py-2 text-right font-mono text-[12px] text-[var(--text-muted)]">{a.lifespanYears}yr</td>
                  <td className="px-2.5 py-2 text-right font-mono text-[12px] font-semibold text-[var(--text-primary)]">{fmt(a.currentValue)}</td>
                  <td className="px-2.5 py-2 text-center">
                    <button
                      onClick={() => startEditAsset(a)}
                      className="text-[var(--text-muted)] bg-transparent border-none cursor-pointer p-1 rounded hover:bg-[var(--bg-hover)]"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="bg-[var(--bg-hover)]">
                <td className="px-2.5 py-2 text-[13px] font-bold text-[var(--text-primary)]">Total</td>
                <td className="px-2.5 py-2 text-right font-mono font-bold text-[var(--text-primary)]">{fmt(assetTotalCost)}</td>
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
                {[
                  { l: 'Asset Name', k: 'name' as const, t: 'text' },
                  { l: 'Purchase Date', k: 'purchaseDate' as const, t: 'date' },
                  { l: 'Original Cost ($)', k: 'cost' as const, t: 'number' },
                  { l: 'Lifespan (years)', k: 'lifespanYears' as const, t: 'number' },
                  { l: 'Salvage Value ($)', k: 'salvageValue' as const, t: 'number' },
                ].map((f) => (
                  <div key={f.l}>
                    <label className="text-[11px] text-[var(--text-secondary)] font-medium block mb-0.5">{f.l}</label>
                    <input
                      type={f.t}
                      value={assetForm[f.k]}
                      onChange={(e) => setAssetForm({ ...assetForm, [f.k]: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-[var(--table-border)] rounded-md text-[13px] bg-[var(--bg-card)] outline-none text-[var(--text-body)]"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3 justify-end">
                {editingAssetId !== 'new' && (
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
        </div>
      </div>

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
                              <td className="px-2.5 py-2 font-medium text-[var(--text-primary)]">{b.accountName}</td>
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
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setShowBalanceModal(false)}
                        className="px-4 py-2 bg-[var(--btn-secondary-bg)] text-[var(--text-secondary)] rounded-lg border-none cursor-pointer text-[13px] font-medium btn-secondary">Cancel</button>
                      <button onClick={applySyncBalances}
                        disabled={syncBalanceSelected.size === 0}
                        className="px-4 py-2 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] rounded-lg border-none cursor-pointer text-[13px] font-medium disabled:opacity-50 btn-primary">
                        Apply {syncBalanceSelected.size} Update{syncBalanceSelected.size !== 1 ? 's' : ''}
                      </button>
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
