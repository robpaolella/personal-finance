import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';
import { fmt, fmtShort } from '../lib/formatters';

interface Account {
  accountId: number;
  name: string;
  lastFour: string | null;
  owner: string;
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

function SectionHeader({ label, total, color, neg }: { label: string; total: number; color: string; neg?: boolean }) {
  return (
    <div className="flex justify-between py-2 pb-1 mt-3.5" style={{ borderBottom: `2px solid ${color}30` }}>
      <span className="font-bold text-[11px] text-[#334155] uppercase tracking-[0.05em] flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-sm" style={{ background: color }} />{label}
      </span>
      <span className={`font-bold text-[13px] font-mono ${neg ? 'text-[#ef4444]' : 'text-[#0f172a]'}`}>
        {total < 0 ? `(${fmt(Math.abs(total))})` : fmt(total)}
      </span>
    </div>
  );
}

function AccountRow({ a, neg }: { a: Account; neg?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 pl-3.5 border-b border-[#f8fafc]">
      <div>
        <span className="text-[13px] text-[#475569]">
          {a.name} {a.lastFour && <span className="text-[#94a3b8] text-[11px]">({a.lastFour})</span>}
        </span>
        <span className="text-[10px] text-[#94a3b8] ml-2 uppercase">{a.owner}</span>
      </div>
      <span className={`font-mono text-[13px] font-semibold ${neg && a.balance < 0 ? 'text-[#ef4444]' : 'text-[#0f172a]'}`}>
        {a.balance < 0 ? `(${fmt(Math.abs(a.balance))})` : fmt(a.balance)}
      </span>
    </div>
  );
}

export default function NetWorthPage() {
  const [data, setData] = useState<NetWorthData | null>(null);
  const [editingAssetId, setEditingAssetId] = useState<number | 'new' | null>(null);
  const [assetForm, setAssetForm] = useState<AssetForm>(emptyAssetForm);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceInputs, setBalanceInputs] = useState<Record<number, string>>({});

  const loadData = useCallback(async () => {
    const res = await apiFetch<{ data: NetWorthData }>('/networth/summary');
    setData(res.data);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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

    if (editingAssetId === 'new') {
      await apiFetch('/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await apiFetch(`/assets/${editingAssetId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    setEditingAssetId(null);
    await loadData();
  };

  const deleteAsset = async (id: number) => {
    await apiFetch(`/assets/${id}`, { method: 'DELETE' });
    setEditingAssetId(null);
    await loadData();
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
    await Promise.all(promises);
    setShowBalanceModal(false);
    setBalanceInputs({});
    await loadData();
  };

  if (!data) {
    return <div className="text-[#94a3b8] text-[13px] py-8">Loading net worth...</div>;
  }

  const liquid = data.accounts.filter((a) => a.classification === 'liquid');
  const investment = data.accounts.filter((a) => a.classification === 'investment');
  const liability = data.accounts.filter((a) => a.classification === 'liability');
  const assetTotalCost = data.assets.reduce((s, a) => s + a.cost, 0);
  const assetTotalCurrent = data.assets.reduce((s, a) => s + a.currentValue, 0);

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#0f172a] m-0">Net Worth</h1>
        <p className="text-[#64748b] text-[13px] mt-1">As of {today}</p>
      </div>

      {/* Hero Card */}
      <div className="rounded-xl border border-[#e8ecf1] text-center p-8 mb-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
        <p className="text-[13px] text-[#94a3b8] m-0 tracking-[0.05em] uppercase">Total Net Worth</p>
        <p className="text-[40px] font-extrabold font-mono text-white my-2 tracking-[-0.02em]">{fmt(data.netWorth)}</p>
        <div className="flex justify-center gap-6 mt-3 flex-wrap">
          {[
            { l: 'Liquid Assets', v: data.liquidTotal, c: '#38bdf8' },
            { l: 'Investments', v: data.investmentTotal, c: '#a78bfa' },
            { l: 'Physical Assets', v: data.physicalAssetTotal, c: '#fbbf24' },
            { l: 'Liabilities', v: data.liabilityTotal, c: '#f87171', neg: true },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-[#94a3b8] text-[10px] m-0 uppercase tracking-[0.05em]">{s.l}</p>
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
        <div className="bg-white rounded-xl border border-[#e8ecf1] px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-center">
            <h3 className="text-[14px] font-bold text-[#0f172a] m-0">Accounts</h3>
            <button
              onClick={() => {
                const inputs: Record<number, string> = {};
                data.accounts.forEach((a) => { inputs[a.accountId] = String(a.balance); });
                setBalanceInputs(inputs);
                setShowBalanceModal(true);
              }}
              className="text-[12px] px-3 py-1.5 bg-[#f1f5f9] text-[#334155] rounded-lg border-none cursor-pointer font-medium hover:bg-[#e2e8f0]"
            >
              Update Balances
            </button>
          </div>
          <div className="mt-3">
            <SectionHeader label="Liquid Assets" total={data.liquidTotal} color="#38bdf8" />
            {liquid.map((a) => <AccountRow key={a.accountId} a={a} />)}
            <SectionHeader label="Investments & Retirement" total={data.investmentTotal} color="#a78bfa" />
            {investment.map((a) => <AccountRow key={a.accountId} a={a} />)}
            <SectionHeader label="Liabilities" total={-data.liabilityTotal} color="#f87171" neg />
            {liability.map((a) => <AccountRow key={a.accountId} a={a} neg />)}
          </div>
        </div>

        {/* Depreciable Assets */}
        <div className="bg-white rounded-xl border border-[#e8ecf1] px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-center">
            <h3 className="text-[14px] font-bold text-[#0f172a] m-0">Depreciable Assets</h3>
            <button
              onClick={startAddAsset}
              className="flex items-center gap-1 text-[12px] px-3 py-1.5 bg-[#f1f5f9] text-[#334155] rounded-lg border-none cursor-pointer font-medium hover:bg-[#e2e8f0]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add
            </button>
          </div>
          <table className="w-full border-collapse mt-3">
            <thead>
              <tr>
                <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-left">Asset</th>
                <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-right">Cost</th>
                <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-right">Life</th>
                <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] text-right">Current</th>
                <th className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[#e2e8f0] w-9"></th>
              </tr>
            </thead>
            <tbody>
              {data.assets.map((a) => (
                <tr key={a.id} className="border-b border-[#f1f5f9]">
                  <td className="px-2.5 py-2 text-[13px] font-medium text-[#0f172a]">
                    {a.name}
                    <div className="text-[10px] text-[#94a3b8] font-mono">{a.purchaseDate}</div>
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono text-[12px] text-[#94a3b8]">{fmt(a.cost)}</td>
                  <td className="px-2.5 py-2 text-right font-mono text-[12px] text-[#94a3b8]">{a.lifespanYears}yr</td>
                  <td className="px-2.5 py-2 text-right font-mono text-[12px] font-semibold text-[#0f172a]">{fmt(a.currentValue)}</td>
                  <td className="px-2.5 py-2 text-center">
                    <button
                      onClick={() => startEditAsset(a)}
                      className="text-[#94a3b8] bg-transparent border-none cursor-pointer p-1 rounded hover:bg-[#f1f5f9]"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="bg-[#f8fafc]">
                <td className="px-2.5 py-2 text-[13px] font-bold">Total</td>
                <td className="px-2.5 py-2 text-right font-mono font-bold">{fmt(assetTotalCost)}</td>
                <td></td>
                <td className="px-2.5 py-2 text-right font-mono font-bold">{fmt(assetTotalCurrent)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          {/* Asset Edit/Add Form */}
          {editingAssetId != null && (
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-4 mt-3">
              <p className="font-semibold text-[13px] text-[#0f172a] m-0 mb-3">
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
                    <label className="text-[11px] text-[#64748b] font-medium block mb-0.5">{f.l}</label>
                    <input
                      type={f.t}
                      value={assetForm[f.k]}
                      onChange={(e) => setAssetForm({ ...assetForm, [f.k]: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-[#e2e8f0] rounded-md text-[13px] bg-white outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3 justify-end">
                <button onClick={() => setEditingAssetId(null)}
                  className="px-3.5 py-1.5 bg-[#f1f5f9] text-[#64748b] rounded-lg border-none cursor-pointer text-[12px] font-medium">Cancel</button>
                <button onClick={saveAsset}
                  className="px-3.5 py-1.5 bg-[#0f172a] text-white rounded-lg border-none cursor-pointer text-[12px] font-medium">Save</button>
                {editingAssetId !== 'new' && (
                  <button onClick={() => deleteAsset(editingAssetId as number)}
                    className="px-3.5 py-1.5 bg-[#fef2f2] text-[#ef4444] rounded-lg border-none cursor-pointer text-[12px] font-medium">Delete</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Update Balances Modal */}
      {showBalanceModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowBalanceModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-[500px] max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold text-[#0f172a] m-0 mb-4">Update Account Balances</h3>
            <p className="text-[12px] text-[#64748b] m-0 mb-4">Enter current balances for each account. Leave unchanged to skip.</p>
            <div className="flex flex-col gap-3">
              {data.accounts.map((a) => (
                <div key={a.accountId} className="flex items-center gap-3">
                  <span className="flex-1 text-[13px] text-[#475569]">
                    {a.name} {a.lastFour && <span className="text-[#94a3b8] text-[11px]">({a.lastFour})</span>}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={balanceInputs[a.accountId] ?? ''}
                    onChange={(e) => setBalanceInputs({ ...balanceInputs, [a.accountId]: e.target.value })}
                    className="w-[140px] px-2.5 py-1.5 border border-[#e2e8f0] rounded-md text-[13px] font-mono text-right outline-none focus:border-[#3b82f6]"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowBalanceModal(false)}
                className="px-4 py-2 bg-[#f1f5f9] text-[#64748b] rounded-lg border-none cursor-pointer text-[13px] font-medium">Cancel</button>
              <button onClick={saveBalances}
                className="px-4 py-2 bg-[#0f172a] text-white rounded-lg border-none cursor-pointer text-[13px] font-medium">Save All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
