import { useState } from "react";

const LIGHT = {
  bgMain: "#f4f6f9", bgCard: "#ffffff", bgCardBorder: "#e8ecf1",
  bgNav: "#ffffff", bgNavBorder: "#e8ecf1", bgHover: "#f8fafc",
  bgInput: "#f8fafc", bgInputBorder: "#e2e8f0", bgModal: "rgba(0,0,0,0.5)",
  bgInlineInfo: "#eff6ff", bgInlineInfoBorder: "#bfdbfe", textInlineInfo: "#1e40af",
  bgInlineWarning: "#fffbeb", bgInlineWarningBorder: "#fde68a", textInlineWarning: "#92400e",
  textPrimary: "#0f172a", textBody: "#475569", textSecondary: "#64748b", textMuted: "#94a3b8",
  positive: "#10b981", negative: "#ef4444", accent: "#3b82f6", warning: "#f59e0b",
  badgeAccountBg: "#f1f5f9", badgeAccountText: "#475569",
  badgeCategoryBg: "#eff6ff", badgeCategoryText: "#3b82f6",
  badgeOwnerBg: "#dbeafe", badgeOwnerText: "#2563eb",
  badgeLiquidBg: "#d1fae5", badgeLiquidText: "#059669",
  badgeInvestmentBg: "#ede9fe", badgeInvestmentText: "#7c3aed",
  badgeLiabilityBg: "#fef2f2", badgeLiabilityText: "#dc2626",
  badgeConnectedBg: "#d1fae5", badgeConnectedText: "#059669",
  fabBg: "#0f172a", fabText: "#ffffff", fabShadow: "0 4px 12px rgba(0,0,0,0.15)",
  navActive: "#3b82f6", navInactive: "#94a3b8",
  headerBg: "#ffffff", headerBorder: "#e8ecf1",
  chartBar1: "#3b82f6", chartBar2: "#f97316", progressTrack: "#f1f5f9",
  toggleBg: "#f1f5f9", toggleActiveBg: "#ffffff", toggleActiveText: "#0f172a", toggleInactiveText: "#64748b", toggleShadow: "0 1px 3px rgba(0,0,0,0.08)",
  heroBg: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  btnPrimaryBg: "#0f172a", btnPrimaryText: "#ffffff",
  btnSecBg: "#ebeff3", btnSecText: "#334155",
  sheetBg: "#ffffff",
};

const DARK = {
  bgMain: "#0b0f1a", bgCard: "#141926", bgCardBorder: "#1e293b",
  bgNav: "#141926", bgNavBorder: "#1e293b", bgHover: "#1a2234",
  bgInput: "#0f1629", bgInputBorder: "#1e293b", bgModal: "rgba(0,0,0,0.7)",
  bgInlineInfo: "#1e3a5f", bgInlineInfoBorder: "rgb(87,121,232)", textInlineInfo: "#93c5fd",
  bgInlineWarning: "#3b2506", bgInlineWarningBorder: "#78350f", textInlineWarning: "#fcd34d",
  textPrimary: "#f1f5f9", textBody: "#94a3b8", textSecondary: "#64748b", textMuted: "#475569",
  positive: "#10b981", negative: "#ef4444", accent: "#3b82f6", warning: "#f59e0b",
  badgeAccountBg: "#1a2234", badgeAccountText: "#94a3b8",
  badgeCategoryBg: "#1e3a5f", badgeCategoryText: "#60a5fa",
  badgeOwnerBg: "#1e3a5f", badgeOwnerText: "#60a5fa",
  badgeLiquidBg: "#052e16", badgeLiquidText: "#34d399",
  badgeInvestmentBg: "#2e1065", badgeInvestmentText: "#a78bfa",
  badgeLiabilityBg: "#3b1111", badgeLiabilityText: "#fca5a5",
  badgeConnectedBg: "#052e16", badgeConnectedText: "#34d399",
  fabBg: "#e2e8f0", fabText: "#0f172a", fabShadow: "0 4px 12px rgba(0,0,0,0.3)",
  navActive: "#3b82f6", navInactive: "#475569",
  headerBg: "#141926", headerBorder: "#1e293b",
  chartBar1: "#3b82f6", chartBar2: "#f97316", progressTrack: "#1a2234",
  toggleBg: "#1a2234", toggleActiveBg: "#0f172a", toggleActiveText: "#f1f5f9", toggleInactiveText: "#64748b", toggleShadow: "0 1px 3px rgba(0,0,0,0.3)",
  heroBg: "linear-gradient(135deg, #060a13 0%, #0f172a 100%)",
  btnPrimaryBg: "#e2e8f0", btnPrimaryText: "#0f172a",
  btnSecBg: "#1a2234", btnSecText: "#94a3b8",
  sheetBg: "#141926",
};

const sans = { fontFamily: "'DM Sans', sans-serif" };
const mono = { fontFamily: "'DM Mono', monospace" };

function Badge({ bg, text, label, useMono }) { return <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: bg, color: text, ...(useMono ? mono : sans), fontWeight: 500, whiteSpace: "nowrap" }}>{label}</span>; }
function Card({ t, children, style: s }) { return <div style={{ background: t.bgCard, border: `1px solid ${t.bgCardBorder}`, borderRadius: 10, padding: "14px 16px", ...s }}>{children}</div>; }
function Toggle({ t, options, active, onSelect }) { return (<div style={{ display: "flex", background: t.toggleBg, borderRadius: 8, padding: 2 }}>{options.map(o => (<button key={o} onClick={() => onSelect(o)} style={{ padding: "5px 12px", fontSize: 11, fontWeight: active === o ? 600 : 400, border: "none", borderRadius: 6, cursor: "pointer", ...sans, background: active === o ? t.toggleActiveBg : "transparent", color: active === o ? t.toggleActiveText : t.toggleInactiveText, boxShadow: active === o ? t.toggleShadow : "none", flex: 1 }}>{o}</button>))}</div>); }
function Input({ t, ...props }) { return <input {...props} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${t.bgInputBorder}`, borderRadius: 8, fontSize: 13, background: t.bgInput, color: t.textPrimary, outline: "none", ...sans, boxSizing: "border-box", ...props.style }} />; }
function Select({ t, children, ...props }) { return <select {...props} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${t.bgInputBorder}`, borderRadius: 8, fontSize: 13, background: t.bgInput, color: t.textPrimary, cursor: "pointer", ...sans, boxSizing: "border-box" }}>{children}</select>; }
function PrimaryBtn({ t, children, green, onClick, style: s }) { return <button onClick={onClick} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", ...sans, background: green ? t.positive : t.btnPrimaryBg, color: green ? "#fff" : t.btnPrimaryText, ...s }}>{children}</button>; }
function SecBtn({ t, children, onClick, style: s }) { return <button onClick={onClick} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", ...sans, background: t.btnSecBg, color: t.btnSecText, ...s }}>{children}</button>; }
function FormField({ t, label, children }) { return <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: t.textSecondary, fontWeight: 500, display: "block", marginBottom: 4 }}>{label}</label>{children}</div>; }

function BottomSheet({ t, title, onClose, children }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ flex: 1, background: t.bgModal }} />
      <div style={{ background: t.sheetBg, borderRadius: "16px 16px 0 0", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}><div style={{ width: 36, height: 4, borderRadius: 2, background: t.bgCardBorder }} /></div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 20px 12px" }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
          <span onClick={onClose} style={{ fontSize: 20, color: t.textMuted, cursor: "pointer", lineHeight: 1 }}>×</span>
        </div>
        <div style={{ overflowY: "auto", scrollbarWidth: "none", padding: "0 20px 24px", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

const TRANSACTIONS = [
  { date: "2026-02-23", desc: "Sad Sack Salary", account: "Checking (1234)", sub: "Take Home Pay", amount: "+$500.00", color: "positive" },
  { date: "2026-02-23", desc: "Groceries", account: "Checking (1234)", sub: "Groceries", amount: "$100.00", color: "primary" },
  { date: "2026-02-23", desc: "Gas", account: "Checking (1234)", sub: "Fuel", amount: "$50.00", color: "primary" },
  { date: "2026-02-20", desc: "Gglpay Jimbo's", account: "Blue Cash (1009)", sub: "Groceries", amount: "$183.90", color: "primary" },
  { date: "2026-02-20", desc: "Gas Shells", account: "Checking (1234)", sub: "Fuel", amount: "-$70.00", color: "refund" },
  { date: "2026-02-16", desc: "Gglpay Jimbo's", account: "Blue Cash (1009)", sub: "Groceries", amount: "$34.17", color: "primary" },
  { date: "2026-02-15", desc: "Gglpay Jimbo's", account: "Blue Cash (1009)", sub: "Groceries", amount: "$165.86", color: "primary" },
  { date: "2026-02-14", desc: "Gglpay Jimbo's", account: "Blue Cash (1009)", sub: "Groceries", amount: "$32.85", color: "primary" },
];

const ACCOUNTS_NW = [
  { name: "Checking", last4: "1234", balance: 2500, cls: "liquid", owner: "John" },
  { name: "Blue Cash Preferred", last4: "1009", balance: -497, cls: "liability", owner: "John" },
  { name: "Roth IRA", last4: "928", balance: 22449, cls: "investment", owner: "John" },
  { name: "US Bank Checking", last4: "2214", balance: 1800, cls: "liquid", owner: "Jane" },
];

const SYNC_TXS = [
  { date: "2026-02-22", payee: "Costco", amount: "$187.43", category: "Groceries", confidence: 92, checked: true },
  { date: "2026-02-21", payee: "Shell Gas Station", amount: "$54.30", category: "Fuel", confidence: 88, checked: true },
  { date: "2026-02-21", payee: "Amazon", amount: "$34.99", category: null, confidence: 0, checked: true },
  { date: "2026-02-20", payee: "Mobile Payment - Thank You", amount: "+$1,500.00", category: null, confidence: 0, checked: false, transfer: true },
  { date: "2026-02-19", payee: "Chick-fil-A", amount: "$12.43", category: "Dining/Eating Out", confidence: 95, checked: true },
  { date: "2026-02-18", payee: "Netflix", amount: "$15.99", category: "Streaming", confidence: 100, checked: true },
];

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const BUDGET_EXPENSES = [
  { group: "Daily Living", color: "#10b981", items: [{ name: "Groceries", budget: 400, actual: 517 }, { name: "Dining", budget: 100, actual: 0 }, { name: "Supplies", budget: 50, actual: 67 }] },
  { group: "Auto", color: "#ef4444", items: [{ name: "Fuel", budget: 120, actual: -20 }] },
  { group: "Utilities", color: "#f97316", items: [{ name: "Power", budget: 150, actual: 142 }, { name: "Internet", budget: 80, actual: 0 }] },
];

const amtColor = (type, t) => type === "positive" || type === "refund" ? t.positive : t.textPrimary;
const fmtB = (v) => v === 0 ? "—" : `$${Math.abs(v)}`;

// ──── MODALS ───────────────────────────────────

function AddTransactionSheet({ t, onClose }) {
  const [type, setType] = useState("Expense");
  return (
    <BottomSheet t={t} title="Add Transaction" onClose={onClose}>
      <div style={{ marginBottom: 14 }}><Toggle t={t} options={["Expense", "Income"]} active={type} onSelect={setType} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <FormField t={t} label="Date"><Input t={t} type="date" defaultValue="2026-02-23" /></FormField>
        <FormField t={t} label="Account"><Select t={t}><option>Checking (1234)</option><option>Blue Cash (1009)</option></Select></FormField>
      </div>
      <FormField t={t} label="Description"><Input t={t} placeholder="e.g., Grocery Store" /></FormField>
      <FormField t={t} label="Category">
        <Select t={t}><option value="">Select category...</option><optgroup label="Daily Living"><option>Groceries</option><option>Dining/Eating Out</option></optgroup><optgroup label="Auto/Transportation"><option>Fuel</option><option>Service</option></optgroup><optgroup label="Utilities"><option>Power</option><option>Internet</option></optgroup></Select>
      </FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <FormField t={t} label="Amount"><Input t={t} type="number" placeholder="0.00" style={{ ...mono }} /></FormField>
        <FormField t={t} label="Note (optional)"><Input t={t} placeholder="Optional..." /></FormField>
      </div>
      <div style={{ marginTop: 6 }}><PrimaryBtn t={t}>Save Transaction</PrimaryBtn></div>
    </BottomSheet>
  );
}

function UpdateBalancesSheet({ t, onClose }) {
  const [tab, setTab] = useState("Bank Sync");
  return (
    <BottomSheet t={t} title="Update Balances" onClose={onClose}>
      <Toggle t={t} options={["Bank Sync", "Manual"]} active={tab} onSelect={setTab} />
      {tab === "Bank Sync" && (
        <div style={{ marginTop: 14 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: t.bgInlineInfo, border: `1px solid ${t.bgInlineInfoBorder}`, color: t.textInlineInfo, fontSize: 12, marginBottom: 14 }}>Latest balances fetched from SimpleFIN</div>
          {ACCOUNTS_NW.map((acc, i) => {
            const diff = Math.floor(Math.random() * 300) - 100;
            return (
              <div key={i} style={{ padding: "10px 12px", background: t.bgHover, borderRadius: 8, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{acc.name} <span style={{ ...mono, fontSize: 10, color: t.textMuted }}>({acc.last4})</span></span>
                  <input type="checkbox" defaultChecked style={{ accentColor: t.positive }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, fontSize: 11 }}>
                  <div><span style={{ color: t.textMuted, fontSize: 10 }}>Current</span><div style={{ ...mono, fontWeight: 600, fontSize: 12, marginTop: 2 }}>${acc.balance.toLocaleString()}</div></div>
                  <div><span style={{ color: t.textMuted, fontSize: 10 }}>SimpleFIN</span><div style={{ ...mono, fontWeight: 600, fontSize: 12, marginTop: 2 }}>${(acc.balance + diff).toLocaleString()}</div></div>
                  <div style={{ textAlign: "right" }}><span style={{ color: t.textMuted, fontSize: 10 }}>Change</span><div style={{ ...mono, fontWeight: 600, fontSize: 12, marginTop: 2, color: diff >= 0 ? t.positive : t.negative }}>{diff >= 0 ? "+" : ""}${diff.toLocaleString()}</div></div>
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 6 }}><PrimaryBtn t={t} green>Apply Selected Updates</PrimaryBtn></div>
        </div>
      )}
      {tab === "Manual" && (
        <div style={{ marginTop: 14 }}>
          {ACCOUNTS_NW.map((acc, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}><span style={{ fontSize: 12, fontWeight: 500 }}>{acc.name}</span><span style={{ ...mono, fontSize: 10, color: t.textMuted, marginLeft: 4 }}>({acc.last4})</span></div>
              <Input t={t} type="number" defaultValue={acc.balance} style={{ width: 120, textAlign: "right", ...mono, padding: "8px 10px" }} />
            </div>
          ))}
          <div style={{ marginTop: 6 }}><PrimaryBtn t={t}>Save Balances</PrimaryBtn></div>
        </div>
      )}
    </BottomSheet>
  );
}

function BankSyncSheet({ t, onClose }) {
  const [step, setStep] = useState(1);
  const [items, setItems] = useState(SYNC_TXS.map(tx => ({ ...tx })));
  const toggleItem = (i) => { const next = [...items]; next[i].checked = !next[i].checked; setItems(next); };
  const checked = items.filter(i => i.checked).length;
  return (
    <BottomSheet t={t} title={step === 1 ? "Bank Sync" : "Review Transactions"} onClose={onClose}>
      {step === 1 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 8 }}>Select Accounts</div>
          {["Checking (1234)", "Blue Cash (1009)", "Roth IRA (928)"].map((acc, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${t.bgCardBorder}` }}>
              <input type="checkbox" defaultChecked style={{ accentColor: t.accent }} /><span style={{ fontSize: 13 }}>{acc}</span>
            </div>
          ))}
          <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginTop: 16, marginBottom: 8 }}>Date Range</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {["7 Days", "30 Days", "60 Days"].map((r, i) => (
              <button key={r} style={{ padding: "6px 12px", borderRadius: 16, border: "none", fontSize: 11, cursor: "pointer", ...sans, background: i === 1 ? t.accent : t.bgCard, color: i === 1 ? "#fff" : t.textSecondary, boxShadow: i === 1 ? "none" : `inset 0 0 0 1px ${t.bgCardBorder}` }}>Last {r}</button>
            ))}
          </div>
          <PrimaryBtn t={t} onClick={() => setStep(2)}>Fetch Transactions</PrimaryBtn>
          <div style={{ textAlign: "center", marginTop: 8 }}><span style={{ fontSize: 10, color: t.textMuted }}>Last synced: 9h ago</span></div>
        </>
      )}
      {step === 2 && (
        <>
          <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 10 }}>{checked} of {items.length} selected</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map((tx, i) => (
              <div key={i} onClick={() => toggleItem(i)} style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", background: tx.checked ? t.bgCard : t.bgHover, border: `1px solid ${t.bgCardBorder}`, opacity: tx.checked ? 1 : 0.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <input type="checkbox" checked={tx.checked} readOnly style={{ accentColor: t.accent, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.payee}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 22, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, color: t.textMuted, ...mono }}>{tx.date}</span>
                      {tx.category && <><span style={{ fontSize: 10, color: t.textMuted }}>·</span><Badge bg={t.badgeCategoryBg} text={t.badgeCategoryText} label={tx.category} /></>}
                      {!tx.category && !tx.transfer && <Badge bg={t.bgInlineWarning} text={t.textInlineWarning} label="Uncategorized" />}
                      {tx.transfer && <Badge bg="#fff7ed" text="#c2410c" label="Transfer" />}
                      {tx.confidence > 0 && <span style={{ fontSize: 9, color: tx.confidence > 90 ? t.positive : tx.confidence > 70 ? t.warning : t.negative, ...mono }}>{tx.confidence}%</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, ...mono, color: tx.amount.startsWith("+") ? t.positive : t.textPrimary, flexShrink: 0, marginLeft: 8 }}>{tx.amount}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14 }}><PrimaryBtn t={t} green>Import {checked} Transactions</PrimaryBtn></div>
          <div style={{ textAlign: "center", marginTop: 6 }}><span onClick={() => setStep(1)} style={{ fontSize: 12, color: t.accent, cursor: "pointer" }}>← Back to Selection</span></div>
        </>
      )}
    </BottomSheet>
  );
}

// ──── SETTINGS SUB-PAGES ───────────────────────

function AccountsSub({ t, onBack }) {
  return (<>
    <div onClick={onBack} style={{ fontSize: 12, color: t.accent, cursor: "pointer", marginBottom: 12 }}>← Back to Settings</div>
    {[
      { name: "Checking", l4: "1234", type: "Checking", cls: "Liquid", clsBg: t.badgeLiquidBg, clsText: t.badgeLiquidText, owner: "John" },
      { name: "Blue Cash Preferred", l4: "1009", type: "Credit", cls: "Liability", clsBg: t.badgeLiabilityBg, clsText: t.badgeLiabilityText, owner: "John" },
      { name: "Roth IRA", l4: "928", type: "Retirement", cls: "Investment", clsBg: t.badgeInvestmentBg, clsText: t.badgeInvestmentText, owner: "John" },
      { name: "US Bank Checking", l4: "2214", type: "Checking", cls: "Liquid", clsBg: t.badgeLiquidBg, clsText: t.badgeLiquidText, owner: "Jane" },
    ].map((a, i) => (
      <Card key={i} t={t} style={{ padding: "10px 14px", marginBottom: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name} <span style={{ ...mono, fontSize: 10, color: t.textMuted }}>({a.l4})</span></div>
            <div style={{ display: "flex", gap: 5, marginTop: 4, alignItems: "center" }}>
              <Badge bg={t.badgeOwnerBg} text={t.badgeOwnerText} label={a.owner} />
              <span style={{ fontSize: 10, color: t.textMuted }}>{a.type}</span>
              <Badge bg={a.clsBg} text={a.clsText} label={a.cls} />
            </div>
          </div>
          <span style={{ color: t.textMuted, cursor: "pointer", fontSize: 14 }}>›</span>
        </div>
      </Card>
    ))}
    <div style={{ marginTop: 8 }}><SecBtn t={t}>+ Add Account</SecBtn></div>
  </>);
}

function CategoriesSub({ t, onBack }) {
  const [exp, setExp] = useState({});
  const cats = [
    { group: "Income", color: "#f97316", subs: ["Take Home Pay", "401(k)", "Interest Income", "Gifts Received"] },
    { group: "Daily Living", color: "#10b981", subs: ["Groceries", "Dining/Eating Out", "Personal Supplies", "Pets"] },
    { group: "Auto/Transportation", color: "#ef4444", subs: ["Fuel", "Service", "Transportation"] },
    { group: "Household", color: "#3b82f6", subs: ["Rent", "Appliances", "Maintenance", "Improvements"] },
    { group: "Utilities", color: "#f97316", subs: ["Internet", "Cellphone", "Power", "Water"] },
  ];
  return (<>
    <div onClick={onBack} style={{ fontSize: 12, color: t.accent, cursor: "pointer", marginBottom: 12 }}>← Back to Settings</div>
    {cats.map((c, i) => (
      <Card key={i} t={t} style={{ padding: "10px 14px", marginBottom: 6 }}>
        <div onClick={() => setExp(p => ({ ...p, [i]: !p[i] }))} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{c.group}</span>
          </div>
          <span style={{ fontSize: 11, color: t.textMuted }}>{c.subs.length} subs <span style={{ fontSize: 10, display: "inline-block", transform: exp[i] ? "rotate(90deg)" : "rotate(0)", transition: "transform 150ms" }}>▶</span></span>
        </div>
        {exp[i] && <div style={{ marginTop: 8, paddingLeft: 14 }}>{c.subs.map((s, si) => <div key={si} style={{ padding: "4px 0", fontSize: 12, color: t.textBody, borderBottom: si < c.subs.length - 1 ? `1px solid ${t.bgCardBorder}` : "none" }}>{s}</div>)}</div>}
      </Card>
    ))}
    <div style={{ marginTop: 8 }}><SecBtn t={t}>+ Add Category</SecBtn></div>
  </>);
}

function UsersSub({ t, onBack }) {
  const [showPerms, setShowPerms] = useState(false);
  return (<>
    <div onClick={onBack} style={{ fontSize: 12, color: t.accent, cursor: "pointer", marginBottom: 12 }}>← Back to Settings</div>
    {/* Owner */}
    <Card t={t} style={{ marginBottom: 8, padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: t.badgeOwnerBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: t.badgeOwnerText, flexShrink: 0 }}>J</div>
        <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>John</div><div style={{ fontSize: 11, color: t.textMuted }}>@john</div></div>
        <Badge bg={t.badgeLiquidBg} text={t.badgeLiquidText} label="Owner" />
      </div>
      <div style={{ fontSize: 10, color: t.textMuted, fontStyle: "italic", marginTop: 6, marginLeft: 46 }}>Full access. Cannot be restricted.</div>
    </Card>
    {/* Member */}
    <Card t={t} style={{ marginBottom: 8, padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#4a1942", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "#f472b6", flexShrink: 0 }}>J</div>
        <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>Jane</div><div style={{ fontSize: 11, color: t.textMuted }}>@jane</div></div>
        <Badge bg={t.badgeCategoryBg} text={t.badgeCategoryText} label="Member" />
        <span style={{ color: t.textMuted, cursor: "pointer", fontSize: 14 }}>✎</span>
      </div>
      <div onClick={() => setShowPerms(!showPerms)} style={{ fontSize: 11, color: t.accent, cursor: "pointer", marginTop: 8, marginLeft: 46 }}>
        {showPerms ? "Hide" : "Show"} Permissions <span style={{ fontSize: 10, display: "inline-block", transform: showPerms ? "rotate(90deg)" : "rotate(0)", transition: "transform 150ms" }}>▶</span>
      </div>
      {showPerms && (
        <div style={{ marginTop: 8, marginLeft: 46 }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {["Create", "Edit", "CSV Import", "Bank Sync", "Budgets", "Balances"].map(p => <Badge key={p} bg={t.badgeConnectedBg} text={t.badgeConnectedText} label={p} />)}
            {["Delete", "Bulk Edit", "Accounts", "Categories"].map(p => <Badge key={p} bg={t.bgHover} text={t.textMuted} label={p} />)}
          </div>
        </div>
      )}
    </Card>
    <div style={{ marginTop: 8 }}><SecBtn t={t}>+ Add User</SecBtn></div>
  </>);
}

function BankSyncSub({ t, onBack }) {
  return (<>
    <div onClick={onBack} style={{ fontSize: 12, color: t.accent, cursor: "pointer", marginBottom: 12 }}>← Back to Settings</div>
    <Card t={t} style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Bank Sync</span>
        <Badge bg={t.badgeConnectedBg} text={t.badgeConnectedText} label="Connected" />
      </div>
      <div style={{ padding: "10px 12px", background: t.bgHover, borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ fontSize: 13, fontWeight: 600 }}>Household Banks</div><div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>6 accounts linked · Last synced 9h ago</div></div>
          <Badge bg={t.badgeAccountBg} text={t.badgeAccountText} label="Shared" />
        </div>
      </div>
    </Card>
    <div style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Linked Accounts</div>
    {["Checking (1234)", "Blue Cash (1009)", "Roth IRA (928)", "US Bank (2214)"].map((a, i) => (
      <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${t.bgCardBorder}`, fontSize: 12, color: t.textBody, display: "flex", justifyContent: "space-between" }}>
        <span>{a}</span><Badge bg={t.badgeLiquidBg} text={t.badgeLiquidText} label="Linked" />
      </div>
    ))}
  </>);
}

// ──── PAGES ────────────────────────────────────

function DashboardPage({ t }) {
  return (<>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
      {[{ l: "NET WORTH", v: "$0" }, { l: "LIQUID ASSETS", v: "$2,500" }, { l: "FEB INCOME", v: "$500" }, { l: "FEB EXPENSES", v: "$497", s: "36% of budget" }].map((k, i) => (
        <Card key={i} t={t}><div style={{ fontSize: 9, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>{k.l}</div><div style={{ fontSize: 20, fontWeight: 800, ...mono, marginTop: 2, letterSpacing: "-0.02em" }}>{k.v}</div>{k.s && <div style={{ fontSize: 10, color: t.textSecondary, marginTop: 1 }}>{k.s}</div>}</Card>
      ))}
    </div>
    <Card t={t} style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Spending by Category</div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#ef4444" }} /><span style={{ fontSize: 12, fontWeight: 500 }}>Daily Living</span></div><span style={{ fontSize: 11, color: t.textBody, ...mono }}>$517 / $550</span></div>
      <div style={{ height: 6, background: t.progressTrack, borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: "94%", background: "#ef4444", borderRadius: 3 }} /></div>
    </Card>
    <Card t={t} style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Income vs Expenses</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80, marginBottom: 8 }}>{MONTHS_SHORT.map((m, i) => (<div key={m} style={{ flex: 1, display: "flex", gap: 1, alignItems: "flex-end", justifyContent: "center", height: "100%" }}><div style={{ width: 6, height: i === 1 ? 70 : 2, background: i === 1 ? t.chartBar1 : t.progressTrack, borderRadius: 2 }} /><div style={{ width: 6, height: i === 1 ? 52 : 2, background: i === 1 ? t.chartBar2 : t.progressTrack, borderRadius: 2 }} /></div>))}</div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>{MONTHS_SHORT.map(m => <span key={m} style={{ fontSize: 8, color: t.textMuted, flex: 1, textAlign: "center" }}>{m}</span>)}</div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8 }}>{[{ c: t.chartBar1, l: "Income" }, { c: t.chartBar2, l: "Expenses" }].map(x => (<span key={x.l} style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: x.c }} /><span style={{ color: t.textSecondary }}>{x.l}</span></span>))}</div>
    </Card>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><span style={{ fontSize: 13, fontWeight: 700 }}>Recent Transactions</span><span style={{ fontSize: 11, color: t.accent, cursor: "pointer" }}>View All →</span></div>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{TRANSACTIONS.slice(0, 5).map((tx, i) => (
      <Card key={i} t={t} style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>{tx.desc}</div><div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ fontSize: 10, color: t.textMuted, ...mono }}>{tx.date}</span><span style={{ fontSize: 10, color: t.textMuted }}>·</span><Badge bg={t.badgeCategoryBg} text={t.badgeCategoryText} label={tx.sub} /></div></div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}><div style={{ fontSize: 14, fontWeight: 600, ...mono, color: amtColor(tx.color, t) }}>{tx.amount}</div><div style={{ fontSize: 9, color: t.textMuted, marginTop: 1 }}>{tx.account.split(" (")[0]}</div></div>
      </Card>
    ))}</div>
  </>);
}

function TransactionsPage({ t }) {
  const [df, setDf] = useState("This Month");
  return (<>
    <div style={{ position: "relative", marginBottom: 10 }}><span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: t.textMuted, fontSize: 14 }}>⌕</span><Input t={t} placeholder="Search transactions..." style={{ paddingLeft: 34 }} /></div>
    <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>{["All Time", "This Month", "Last Month", "This Year"].map(f => (<button key={f} onClick={() => setDf(f)} style={{ padding: "6px 12px", borderRadius: 16, border: "none", fontSize: 11, fontWeight: df === f ? 600 : 400, cursor: "pointer", ...sans, background: df === f ? t.accent : t.bgCard, color: df === f ? "#fff" : t.textSecondary, whiteSpace: "nowrap", flexShrink: 0, boxShadow: df === f ? "none" : `inset 0 0 0 1px ${t.bgCardBorder}` }}>{f}</button>))}</div>
    <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 10 }}>Showing {TRANSACTIONS.length} transactions</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{TRANSACTIONS.map((tx, i) => (
      <Card key={i} t={t} style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>{tx.desc}</div><div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}><span style={{ fontSize: 10, color: t.textMuted, ...mono }}>{tx.date}</span><span style={{ fontSize: 10, color: t.textMuted }}>·</span><Badge bg={t.badgeCategoryBg} text={t.badgeCategoryText} label={tx.sub} /><span style={{ fontSize: 10, color: t.textMuted }}>·</span><Badge bg={t.badgeAccountBg} text={t.badgeAccountText} label={tx.account} useMono /></div></div>
        <div style={{ fontSize: 14, fontWeight: 600, ...mono, color: amtColor(tx.color, t), flexShrink: 0, marginLeft: 10 }}>{tx.amount}</div>
      </Card>
    ))}</div>
  </>);
}

function BudgetPage({ t }) {
  const [owner, setOwner] = useState("All");
  return (<>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><span style={{ fontSize: 18, color: t.textMuted, cursor: "pointer" }}>←</span><span style={{ fontSize: 15, fontWeight: 700 }}>February 2026</span><span style={{ fontSize: 18, color: t.textMuted, cursor: "pointer" }}>→</span></div>
    <div style={{ marginBottom: 14 }}><Toggle t={t} options={["All", "John", "Jane"]} active={owner} onSelect={setOwner} /></div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>{[{ l: "BUDGETED INCOME", v: "$500" }, { l: "ACTUAL INCOME", v: "$500" }, { l: "BUDGETED EXPENSES", v: "$1,000" }, { l: "ACTUAL EXPENSES", v: "$497" }].map((k, i) => (<Card key={i} t={t}><div style={{ fontSize: 9, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>{k.l}</div><div style={{ fontSize: 18, fontWeight: 800, ...mono, marginTop: 2 }}>{k.v}</div></Card>))}</div>
    <Card t={t} style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Income</div>
      {[{ name: "Take Home Pay", budget: 500, actual: 500 }, { name: "Interest", budget: 0, actual: 0 }].map((item, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i === 0 ? `1px solid ${t.bgCardBorder}` : "none" }}><span style={{ fontSize: 12, color: t.textBody }}>{item.name}</span><div style={{ display: "flex", gap: 16 }}><span style={{ fontSize: 12, ...mono, color: t.textMuted, width: 50, textAlign: "right" }}>{fmtB(item.budget)}</span><span style={{ fontSize: 12, ...mono, color: t.textPrimary, width: 50, textAlign: "right", fontWeight: 600 }}>{fmtB(item.actual)}</span></div></div>))}
    </Card>
    {BUDGET_EXPENSES.map((g, gi) => (
      <Card key={gi} t={t} style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: g.color }} /><span style={{ fontSize: 13, fontWeight: 700 }}>{g.group}</span></div>
        {g.items.map((item, ii) => { const pct = item.budget > 0 ? Math.min((Math.abs(item.actual) / item.budget) * 100, 100) : 0; const over = item.budget > 0 && item.actual > item.budget; return (
          <div key={ii} style={{ marginBottom: ii < g.items.length - 1 ? 10 : 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 12, color: t.textBody }}>{item.name}</span><span style={{ fontSize: 11, ...mono, color: over ? t.negative : t.textBody }}>${Math.abs(item.actual)} / {fmtB(item.budget)}</span></div>
            {item.budget > 0 && <div style={{ height: 5, background: t.progressTrack, borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: over ? t.negative : g.color, borderRadius: 3 }} /></div>}
          </div>); })}
      </Card>
    ))}
  </>);
}

function NetWorthPage({ t, onUpdateBalances }) {
  return (<>
    <div style={{ background: t.heroBg, borderRadius: 12, padding: "20px 20px 16px", textAlign: "center", color: "#fff", marginBottom: 16 }}>
      <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Net Worth</div>
      <div style={{ fontSize: 28, fontWeight: 800, ...mono, margin: "4px 0", letterSpacing: "-0.02em" }}>$26,252</div>
      <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: 6 }}>{[{ l: "Liquid", c: "#38bdf8", v: "$4.3k" }, { l: "Invested", c: "#a78bfa", v: "$22.4k" }, { l: "Liabilities", c: "#f87171", v: "($497)" }].map(x => (<span key={x.l} style={{ fontSize: 10 }}><span style={{ color: x.c }}>{x.l}</span> <span style={{ ...mono, fontWeight: 700, fontSize: 12 }}>{x.v}</span></span>))}</div>
    </div>
    {[{ title: "Liquid Assets", items: ACCOUNTS_NW.filter(a => a.cls === "liquid") }, { title: "Investments", items: ACCOUNTS_NW.filter(a => a.cls === "investment") }, { title: "Liabilities", items: ACCOUNTS_NW.filter(a => a.cls === "liability") }].filter(g => g.items.length > 0).map((group, gi) => (
      <div key={gi} style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{group.title}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{group.items.map((acc, ai) => (
          <Card key={ai} t={t} style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontSize: 13, fontWeight: 500 }}>{acc.name} <span style={{ ...mono, fontSize: 10, color: t.textMuted }}>({acc.last4})</span></div><div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>{acc.owner}</div></div>
            <div style={{ fontSize: 15, fontWeight: 700, ...mono, color: acc.balance < 0 ? t.negative : t.textPrimary }}>{acc.balance < 0 ? `($${Math.abs(acc.balance).toLocaleString()})` : `$${acc.balance.toLocaleString()}`}</div>
          </Card>))}</div>
      </div>))}
    <SecBtn t={t} onClick={onUpdateBalances}>Update Balances</SecBtn>
  </>);
}

function ImportPage({ t, onBankSync }) {
  return (<>
    <Card t={t} style={{ marginBottom: 16, textAlign: "center", padding: "32px 20px" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🏦</div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Bank Sync</div>
      <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 16 }}>Pull transactions from your connected bank accounts</div>
      <button onClick={onBankSync} style={{ padding: "10px 24px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: t.accent, color: "#fff", ...sans }}>Sync Now</button>
      <div style={{ fontSize: 10, color: t.textMuted, marginTop: 8 }}>Last synced: 9h ago · 6 accounts linked</div>
    </Card>
    <Card t={t} style={{ textAlign: "center", padding: "24px 20px" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>CSV Import</div>
      <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 16 }}>Upload a CSV file from your bank or credit card</div>
      <SecBtn t={t} style={{ width: "auto", display: "inline-block", padding: "10px 24px" }}>Upload File</SecBtn>
    </Card>
  </>);
}

function SettingsPage({ t, onNavigate }) {
  return (<>
    <Card t={t} style={{ marginBottom: 12, padding: 0, overflow: "hidden" }}>
      {[{ id: "accounts", label: "Accounts", desc: "Manage bank and credit card accounts", icon: "🏦" }, { id: "categories", label: "Categories", desc: "Expense and income categories", icon: "🏷️" }, { id: "users", label: "Users & Permissions", desc: "Manage household members", icon: "👥" }, { id: "banksync", label: "Bank Sync", desc: "SimpleFIN connections", icon: "🔗" }].map((item, i) => (
        <div key={item.id} onClick={() => onNavigate(item.id)} style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderBottom: i < 3 ? `1px solid ${t.bgCardBorder}` : "none" }}>
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</div><div style={{ fontSize: 11, color: t.textSecondary }}>{item.desc}</div></div>
          <span style={{ color: t.textMuted, fontSize: 14 }}>›</span>
        </div>))}
    </Card>
    <Card t={t} style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>My Profile</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: t.badgeOwnerBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: t.badgeOwnerText }}>J</div>
        <div><div style={{ fontSize: 14, fontWeight: 600 }}>John</div><div style={{ fontSize: 11, color: t.textMuted }}>@john · <Badge bg={t.badgeLiquidBg} text={t.badgeLiquidText} label="Owner" /></div></div>
      </div>
      <SecBtn t={t}>Edit Profile & Password</SecBtn>
    </Card>
    <Card t={t}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span style={{ fontSize: 12, color: t.textBody }}>Version</span><span style={{ fontSize: 12, ...mono, color: t.textMuted }}>v1.0</span></div>
      <div style={{ marginTop: 12, textAlign: "center" }}><span style={{ fontSize: 12, color: t.negative, cursor: "pointer" }}>Sign Out</span></div>
    </Card>
  </>);
}

// ──── SHELL ────────────────────────────────────

export default function MobileApp() {
  const [dark, setDark] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showMore, setShowMore] = useState(false);
  const [modal, setModal] = useState(null);
  const [settingsSub, setSettingsSub] = useState(null);
  const t = dark ? DARK : LIGHT;
  const titles = { dashboard: "Dashboard", transactions: "Transactions", budget: "Budget", reports: "Reports", networth: "Net Worth", import: "Import", settings: "Settings" };
  const subTitles = { accounts: "Accounts", categories: "Categories", users: "Users & Permissions", banksync: "Bank Sync" };
  const showFab = (activeTab === "dashboard" || activeTab === "transactions") && !modal && !settingsSub;

  return (<>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <div style={{ width: 390, margin: "0 auto", height: "100vh", background: t.bgMain, ...sans, color: t.textPrimary, position: "relative", overflow: "hidden", borderRadius: 20, boxShadow: "0 0 40px rgba(0,0,0,0.2)" }}>
      <div style={{ height: 44, background: t.headerBg, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", fontSize: 12, fontWeight: 600, flexShrink: 0 }}><span>9:41</span><div style={{ fontSize: 10 }}>📶 🔋</div></div>
      <div style={{ background: t.headerBg, borderBottom: `1px solid ${t.headerBorder}`, padding: "10px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 22, height: 22, borderRadius: 5, background: "linear-gradient(135deg, #3b82f6, #10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontSize: 11, fontWeight: 800, ...mono }}>$</span></div><span style={{ fontSize: 17, fontWeight: 700 }}>{settingsSub ? subTitles[settingsSub] : titles[activeTab]}</span></div>
        <button onClick={() => setDark(!dark)} style={{ width: 30, height: 30, borderRadius: "50%", border: "none", cursor: "pointer", background: dark ? "#1e293b" : "#f1f5f9", color: dark ? "#fbbf24" : "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{dark ? "☀" : "☾"}</button>
      </div>
      <div style={{ height: "calc(100vh - 44px - 50px - 56px)", overflowY: "auto", scrollbarWidth: "none", padding: "16px 16px 80px" }}>
        {activeTab === "dashboard" && !settingsSub && <DashboardPage t={t} />}
        {activeTab === "transactions" && !settingsSub && <TransactionsPage t={t} />}
        {activeTab === "budget" && !settingsSub && <BudgetPage t={t} />}
        {activeTab === "reports" && !settingsSub && <Card t={t} style={{ textAlign: "center", padding: "40px 20px" }}><div style={{ fontSize: 13, color: t.textSecondary }}>Reports — horizontally scrollable monthly breakdown table</div></Card>}
        {activeTab === "networth" && !settingsSub && <NetWorthPage t={t} onUpdateBalances={() => setModal("updateBal")} />}
        {activeTab === "import" && !settingsSub && <ImportPage t={t} onBankSync={() => setModal("bankSync")} />}
        {activeTab === "settings" && !settingsSub && <SettingsPage t={t} onNavigate={setSettingsSub} />}
        {settingsSub === "accounts" && <AccountsSub t={t} onBack={() => setSettingsSub(null)} />}
        {settingsSub === "categories" && <CategoriesSub t={t} onBack={() => setSettingsSub(null)} />}
        {settingsSub === "users" && <UsersSub t={t} onBack={() => setSettingsSub(null)} />}
        {settingsSub === "banksync" && <BankSyncSub t={t} onBack={() => setSettingsSub(null)} />}
      </div>
      {showFab && <div onClick={() => setModal("addTx")} style={{ position: "absolute", bottom: 72, left: "50%", transform: "translateX(-50%)", background: t.fabBg, color: t.fabText, boxShadow: t.fabShadow, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "10px 24px", borderRadius: 20, cursor: "pointer", zIndex: 10, fontSize: 13, fontWeight: 600, ...sans, whiteSpace: "nowrap" }}><span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Transaction</div>}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: t.bgNav, borderTop: `1px solid ${t.bgNavBorder}`, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "6px 0 18px", zIndex: 5 }}>
        {[{ id: "dashboard", label: "Home", icon: "⊞" }, { id: "transactions", label: "Transactions", icon: "☰" }, { id: "budget", label: "Budget", icon: "▭" }, { id: "more", label: "More", icon: "···" }].map(tab => (
          <div key={tab.id} onClick={() => { if (tab.id === "more") setShowMore(!showMore); else { setActiveTab(tab.id); setShowMore(false); setSettingsSub(null); } }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer", color: (activeTab === tab.id || (tab.id === "more" && ["reports","networth","import","settings"].includes(activeTab))) ? t.navActive : t.navInactive, minWidth: 64 }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{tab.icon}</span><span style={{ fontSize: 9, fontWeight: activeTab === tab.id ? 600 : 400 }}>{tab.label}</span>
          </div>))}
      </div>
      {showMore && (<><div onClick={() => setShowMore(false)} style={{ position: "absolute", inset: 0, zIndex: 6 }} /><div style={{ position: "absolute", bottom: 66, right: 16, background: t.bgCard, border: `1px solid ${t.bgCardBorder}`, borderRadius: 12, padding: "6px 0", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 7, minWidth: 160 }}>
        {[{ id: "reports", label: "Reports", icon: "📊" }, { id: "networth", label: "Net Worth", icon: "📈" }, { id: "import", label: "Import", icon: "📥" }, { id: "settings", label: "Settings", icon: "⚙️" }].map(item => (
          <div key={item.id} onClick={() => { setActiveTab(item.id); setShowMore(false); setSettingsSub(null); }} style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: activeTab === item.id ? t.accent : t.textPrimary, fontWeight: activeTab === item.id ? 600 : 400 }}><span style={{ fontSize: 16 }}>{item.icon}</span>{item.label}</div>))}
      </div></>)}
      {modal === "addTx" && <AddTransactionSheet t={t} onClose={() => setModal(null)} />}
      {modal === "updateBal" && <UpdateBalancesSheet t={t} onClose={() => setModal(null)} />}
      {modal === "bankSync" && <BankSyncSheet t={t} onClose={() => setModal(null)} />}
    </div>
  </>);
}
