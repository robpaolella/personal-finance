import { useState } from "react";

const DARK = {
  bgMain: "#0b0f1a", bgCard: "#141926", bgCardBorder: "#1e293b", bgHover: "#1a2234",
  bgInput: "#0f1629", bgInputBorder: "#1e293b",
  textPrimary: "#f1f5f9", textBody: "#94a3b8", textSecondary: "#64748b", textMuted: "#475569",
  positive: "#10b981", negative: "#ef4444", accent: "#3b82f6", warning: "#f59e0b",
  badgeOwnerBg: "#1e3a5f", badgeOwnerText: "#60a5fa",
  badgeLiquidBg: "#052e16", badgeLiquidText: "#34d399",
  badgeInvestmentBg: "#2e1065", badgeInvestmentText: "#a78bfa",
  badgeLiabilityBg: "#3b1111", badgeLiabilityText: "#fca5a5",
  badgeAccountBg: "#1a2234", badgeAccountText: "#94a3b8",
  progressTrack: "#1a2234",
  toggleBg: "#1a2234", toggleActiveBg: "#0f172a", toggleActiveText: "#f1f5f9", toggleInactiveText: "#64748b", toggleShadow: "0 1px 3px rgba(0,0,0,0.3)",
  heroBg: "linear-gradient(135deg, #060a13 0%, #0f172a 100%)",
  btnSecBg: "#1a2234", btnSecText: "#94a3b8",
  navBg: "#141926", navBorder: "#1e293b", navActive: "#3b82f6", navInactive: "#475569",
};

const t = DARK;
const sans = { fontFamily: "'DM Sans', sans-serif" };
const mono = { fontFamily: "'DM Mono', monospace" };

function Badge({ bg, text, label }) { return <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: bg, color: text, ...sans, fontWeight: 500, whiteSpace: "nowrap" }}>{label}</span>; }
function Card({ children, style: s }) { return <div style={{ background: t.bgCard, border: `1px solid ${t.bgCardBorder}`, borderRadius: 10, padding: "14px 16px", ...s }}>{children}</div>; }

// ──── REPORTS PAGE ────────────────────────────

function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(1); // 0=Jan, 1=Feb
  const [expandedGroups, setExpandedGroups] = useState({});
  const [view, setView] = useState("monthly"); // "monthly" or "annual"

  const toggleGroup = (key) => setExpandedGroups(p => ({ ...p, [key]: !p[key] }));

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const incomeData = [
    { name: "Take Home Pay", values: [0, 500, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: "401(k)", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: "Interest Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  ];

  const expenseData = [
    { group: "Daily Living", color: "#10b981", total: [0, 517, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], items: [
      { name: "Groceries", values: [0, 517, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { name: "Dining/Eating Out", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    ]},
    { group: "Auto/Transportation", color: "#ef4444", total: [0, -20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], items: [
      { name: "Fuel", values: [0, -20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    ]},
    { group: "Utilities", color: "#f97316", total: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], items: [
      { name: "Power", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    ]},
  ];

  const totalIncome = incomeData.reduce((s, i) => s + i.values[selectedMonth], 0);
  const totalExpenses = expenseData.reduce((s, g) => s + g.total[selectedMonth], 0);
  const net = totalIncome - totalExpenses;

  const fmt = (v) => v === 0 ? "—" : v < 0 ? `-$${Math.abs(v)}` : `$${v}`;
  const fmtColor = (v) => v === 0 ? t.textMuted : v < 0 ? t.positive : t.textPrimary;

  return (
    <div style={{ padding: "16px 16px 80px" }}>
      {/* Year selector */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginBottom: 12 }}>
        <span style={{ fontSize: 20, color: t.textMuted, cursor: "pointer", padding: "4px 8px" }}>←</span>
        <span style={{ fontSize: 16, fontWeight: 700 }}>2026</span>
        <span style={{ fontSize: 20, color: t.textMuted, cursor: "pointer", padding: "4px 8px" }}>→</span>
      </div>

      {/* Owner filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", scrollbarWidth: "none" }}>
        {["All", "Robert", "Kathleen"].map((o, i) => (
          <button key={o} style={{
            padding: "6px 14px", borderRadius: 16, border: "none", fontSize: 11, fontWeight: i === 0 ? 600 : 400, cursor: "pointer", ...sans,
            background: i === 0 ? t.accent : t.bgCard, color: i === 0 ? "#fff" : t.textSecondary,
            whiteSpace: "nowrap", flexShrink: 0,
            boxShadow: i === 0 ? "none" : `inset 0 0 0 1px ${t.bgCardBorder}`,
          }}>{o}</button>
        ))}
      </div>

      {/* YTD KPIs — 2x2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "YTD INCOME", value: "$500" },
          { label: "YTD EXPENSES", value: "$497" },
          { label: "YTD NET", value: "$3", color: t.positive },
          { label: "AVG MONTHLY", value: "$2", sub: "Savings rate: 1%" },
        ].map((k, i) => (
          <Card key={i}>
            <div style={{ fontSize: 9, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, ...mono, marginTop: 2, color: k.color || t.textPrimary }}>{k.value}</div>
            {k.sub && <div style={{ fontSize: 10, color: t.positive, marginTop: 1 }}>{k.sub}</div>}
          </Card>
        ))}
      </div>

      {/* View Toggle */}
      <div style={{ display: "flex", background: t.toggleBg, borderRadius: 8, padding: 2, marginBottom: 14 }}>
        {["monthly", "annual"].map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: "6px 12px", fontSize: 11, fontWeight: view === v ? 600 : 400, border: "none", borderRadius: 6, cursor: "pointer", ...sans,
            background: view === v ? t.toggleActiveBg : "transparent",
            color: view === v ? t.toggleActiveText : t.toggleInactiveText,
            boxShadow: view === v ? t.toggleShadow : "none", flex: 1, textTransform: "capitalize",
          }}>{v === "monthly" ? "Monthly Detail" : "Annual Totals"}</button>
        ))}
      </div>

      {view === "monthly" && (
        <>
          {/* Month Selector — scrollable pills */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
            {months.map((m, i) => (
              <button key={m} onClick={() => setSelectedMonth(i)} style={{
                padding: "8px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: selectedMonth === i ? 700 : 400, cursor: "pointer", ...sans,
                background: selectedMonth === i ? t.accent : t.bgCard,
                color: selectedMonth === i ? "#fff" : t.textSecondary,
                whiteSpace: "nowrap", flexShrink: 0, minWidth: 44,
                boxShadow: selectedMonth === i ? "none" : `inset 0 0 0 1px ${t.bgCardBorder}`,
              }}>{m}</button>
            ))}
          </div>

          {/* Month Summary */}
          <Card style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{months[selectedMonth]} 2026</div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${t.bgCardBorder}` }}>
              <span style={{ fontSize: 13, color: t.positive, fontWeight: 600 }}>Income</span>
              <span style={{ fontSize: 14, fontWeight: 700, ...mono, color: totalIncome > 0 ? t.positive : t.textMuted }}>{fmt(totalIncome)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${t.bgCardBorder}` }}>
              <span style={{ fontSize: 13, color: t.warning, fontWeight: 600 }}>Expenses</span>
              <span style={{ fontSize: 14, fontWeight: 700, ...mono }}>{fmt(totalExpenses)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Net</span>
              <span style={{ fontSize: 14, fontWeight: 700, ...mono, color: net > 0 ? t.positive : net < 0 ? t.negative : t.textMuted }}>{net > 0 ? `+$${net}` : net < 0 ? `-$${Math.abs(net)}` : "—"}</span>
            </div>
          </Card>

          {/* Income Breakdown */}
          <Card style={{ marginBottom: 10 }}>
            <div onClick={() => toggleGroup("income")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: t.positive }}>Income</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, ...mono, color: totalIncome > 0 ? t.positive : t.textMuted }}>{fmt(totalIncome)}</span>
                <span style={{ fontSize: 10, color: t.textMuted, transform: expandedGroups.income ? "rotate(90deg)" : "rotate(0)", transition: "transform 150ms", display: "inline-block" }}>▶</span>
              </div>
            </div>
            {expandedGroups.income && (
              <div style={{ marginTop: 8 }}>
                {incomeData.map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0 5px 12px", borderBottom: i < incomeData.length - 1 ? `1px solid ${t.bgCardBorder}` : "none" }}>
                    <span style={{ fontSize: 12, color: t.textBody }}>{item.name}</span>
                    <span style={{ fontSize: 12, ...mono, color: fmtColor(item.values[selectedMonth]) }}>{fmt(item.values[selectedMonth])}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Expense Groups */}
          {expenseData.map((group, gi) => (
            <Card key={gi} style={{ marginBottom: 10 }}>
              <div onClick={() => toggleGroup(`exp-${gi}`)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: group.color }} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{group.group}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, ...mono, color: fmtColor(group.total[selectedMonth]) }}>{fmt(group.total[selectedMonth])}</span>
                  <span style={{ fontSize: 10, color: t.textMuted, transform: expandedGroups[`exp-${gi}`] ? "rotate(90deg)" : "rotate(0)", transition: "transform 150ms", display: "inline-block" }}>▶</span>
                </div>
              </div>
              {expandedGroups[`exp-${gi}`] && (
                <div style={{ marginTop: 8 }}>
                  {group.items.map((item, ii) => (
                    <div key={ii} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0 5px 12px", borderBottom: ii < group.items.length - 1 ? `1px solid ${t.bgCardBorder}` : "none" }}>
                      <span style={{ fontSize: 12, color: t.textBody }}>{item.name}</span>
                      <span style={{ fontSize: 12, ...mono, color: fmtColor(item.values[selectedMonth]) }}>{fmt(item.values[selectedMonth])}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </>
      )}

      {view === "annual" && (
        <>
          {/* Annual totals — simple list */}
          <Card style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.positive, marginBottom: 8 }}>Annual Income</div>
            {incomeData.map((item, i) => {
              const total = item.values.reduce((s, v) => s + v, 0);
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < incomeData.length - 1 ? `1px solid ${t.bgCardBorder}` : "none" }}>
                  <span style={{ fontSize: 12, color: t.textBody }}>{item.name}</span>
                  <span style={{ fontSize: 12, ...mono, color: total > 0 ? t.textPrimary : t.textMuted }}>{fmt(total)}</span>
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", marginTop: 4, borderTop: `2px solid ${t.bgCardBorder}` }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>Total</span>
              <span style={{ fontSize: 13, fontWeight: 700, ...mono, color: t.positive }}>$500</span>
            </div>
          </Card>

          {expenseData.map((group, gi) => {
            const groupTotal = group.total.reduce((s, v) => s + v, 0);
            return (
              <Card key={gi} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: group.color }} />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{group.group}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, ...mono }}>{fmt(groupTotal)}</span>
                </div>
                {group.items.map((item, ii) => {
                  const itemTotal = item.values.reduce((s, v) => s + v, 0);
                  return (
                    <div key={ii} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0 5px 12px", borderBottom: ii < group.items.length - 1 ? `1px solid ${t.bgCardBorder}` : "none" }}>
                      <span style={{ fontSize: 12, color: t.textBody }}>{item.name}</span>
                      <span style={{ fontSize: 12, ...mono, color: fmtColor(itemTotal) }}>{fmt(itemTotal)}</span>
                    </div>
                  );
                })}
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}

// ──── NET WORTH PAGE ──────────────────────────

function NetWorthPage() {
  const [assetsExpanded, setAssetsExpanded] = useState(false);

  return (
    <div style={{ padding: "16px 16px 80px" }}>
      {/* Hero Card */}
      <div style={{ background: t.heroBg, borderRadius: 12, padding: "20px 20px 16px", textAlign: "center", color: "#fff", marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Net Worth</div>
        <div style={{ fontSize: 28, fontWeight: 800, ...mono, margin: "4px 0", letterSpacing: "-0.02em" }}>$11,597.70</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
          {[
            { l: "Liquid", c: "#38bdf8", v: "$2.5k" },
            { l: "Invested", c: "#a78bfa", v: "$1.5k" },
            { l: "Physical", c: "#fbbf24", v: "$8.9k" },
          ].map(x => (
            <span key={x.l} style={{ fontSize: 10 }}>
              <span style={{ color: x.c }}>{x.l}</span>{" "}
              <span style={{ ...mono, fontWeight: 700, fontSize: 12 }}>{x.v}</span>
            </span>
          ))}
        </div>
        <div style={{ marginTop: 4 }}>
          <span style={{ fontSize: 10 }}>
            <span style={{ color: "#f87171" }}>Liabilities</span>{" "}
            <span style={{ ...mono, fontWeight: 700, fontSize: 12, color: "#f87171" }}>($1.4k)</span>
          </span>
        </div>
      </div>

      {/* Update Balances Button */}
      <button style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", ...sans, background: t.btnSecBg, color: t.btnSecText, marginBottom: 16 }}>Update Balances</button>

      {/* Liquid Assets */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
          <span>Liquid Assets</span>
          <span style={{ ...mono, color: t.badgeLiquidText }}>$2,500.00</span>
        </div>
        <Card style={{ padding: "10px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Fake Checking <span style={{ ...mono, fontSize: 10, color: t.textMuted }}>(1234)</span></div>
              <div style={{ display: "flex", gap: 4, marginTop: 3 }}><Badge bg={t.badgeOwnerBg} text={t.badgeOwnerText} label="Robert" /></div>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, ...mono }}>$2,500.00</span>
          </div>
        </Card>
      </div>

      {/* Investments */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
          <span>Investments & Retirement</span>
          <span style={{ ...mono, color: t.badgeInvestmentText }}>$1,500.00</span>
        </div>
        <Card style={{ padding: "10px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Roth IRA <span style={{ ...mono, fontSize: 10, color: t.textMuted }}>(928)</span></div>
              <div style={{ display: "flex", gap: 4, marginTop: 3 }}><Badge bg={t.badgeOwnerBg} text={t.badgeOwnerText} label="Robert" /></div>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, ...mono }}>$1,500.00</span>
          </div>
          {/* Holdings expandable */}
          <div style={{ marginTop: 8, borderTop: `1px solid ${t.bgCardBorder}`, paddingTop: 8 }}>
            <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 6 }}>Holdings</div>
            {[
              { symbol: "SWTSX", name: "Schwab Total Stock", shares: "1,056.60", value: "$1,200.00" },
              { symbol: "SWISX", name: "Schwab Intl Index", shares: "155.20", value: "$300.00" },
            ].map((h, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: i === 0 ? `1px solid ${t.bgCardBorder}` : "none" }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, ...mono }}>{h.symbol}</span>
                  <div style={{ fontSize: 10, color: t.textMuted }}>{h.shares} shares</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, ...mono }}>{h.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Liabilities */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
          <span>Liabilities</span>
          <span style={{ ...mono, color: t.badgeLiabilityText }}>($1,350.00)</span>
        </div>
        {[
          { name: "Blue Cash Preferred", last4: "1009", balance: -750 },
          { name: "Chase Visa", last4: "6969", balance: -600 },
        ].map((acc, i) => (
          <Card key={i} style={{ padding: "10px 14px", marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{acc.name} <span style={{ ...mono, fontSize: 10, color: t.textMuted }}>({acc.last4})</span></div>
                <div style={{ display: "flex", gap: 4, marginTop: 3 }}><Badge bg={t.badgeOwnerBg} text={t.badgeOwnerText} label="Robert" /></div>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, ...mono, color: t.negative }}>({`$${Math.abs(acc.balance)}`})</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Depreciable Assets */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
          <span>Depreciable Assets</span>
          <span style={{ ...mono, color: "#fbbf24" }}>$8,900.00</span>
        </div>

        {[
          { name: "Car", date: "2024-02-20", cost: "$25,000", method: "DB 40%", current: "$8,100.00" },
          { name: "MacBook Pro", date: "2025-06-15", cost: "$2,499", method: "DB 30%", current: "$800.00" },
        ].map((asset, i) => (
          <Card key={i} style={{ padding: "10px 14px", marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{asset.name}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 3, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: t.textMuted, ...mono }}>{asset.date}</span>
                  <span style={{ fontSize: 10, color: t.textMuted }}>·</span>
                  <span style={{ fontSize: 10, color: t.textMuted }}>Cost: <span style={{ ...mono }}>{asset.cost}</span></span>
                  <span style={{ fontSize: 10, color: t.textMuted }}>·</span>
                  <Badge bg={t.badgeAccountBg} text={t.badgeAccountText} label={asset.method} />
                </div>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, ...mono }}>{asset.current}</span>
            </div>
          </Card>
        ))}

        <button style={{ width: "100%", padding: "10px", borderRadius: 8, border: `1px dashed ${t.bgCardBorder}`, fontSize: 12, fontWeight: 600, cursor: "pointer", ...sans, background: "transparent", color: t.textSecondary, marginTop: 4 }}>+ Add Asset</button>
      </div>
    </div>
  );
}

// ──── SHELL ───────────────────────────────────

export default function MobileRedesigns() {
  const [page, setPage] = useState("reports");

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={{ width: 390, margin: "0 auto", height: "100vh", background: t.bgMain, ...sans, color: t.textPrimary, position: "relative", overflow: "hidden", borderRadius: 20, boxShadow: "0 0 40px rgba(0,0,0,0.2)" }}>

        {/* Header */}
        <div style={{ background: t.bgCard, borderBottom: `1px solid ${t.navBorder}`, padding: "10px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 5, background: "linear-gradient(135deg, #3b82f6, #10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 11, fontWeight: 800, ...mono }}>$</span>
            </div>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{page === "reports" ? "Reports" : "Net Worth"}</span>
          </div>
          {/* Page toggle for demo */}
          <div style={{ display: "flex", background: t.toggleBg, borderRadius: 6, padding: 2 }}>
            {["reports", "networth"].map(p => (
              <button key={p} onClick={() => setPage(p)} style={{
                padding: "4px 10px", fontSize: 10, fontWeight: page === p ? 600 : 400, border: "none", borderRadius: 4, cursor: "pointer", ...sans,
                background: page === p ? t.toggleActiveBg : "transparent", color: page === p ? t.toggleActiveText : t.toggleInactiveText,
              }}>{p === "reports" ? "Reports" : "Net Worth"}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ height: "calc(100vh - 50px - 56px)", overflowY: "auto", scrollbarWidth: "none" }}>
          {page === "reports" && <ReportsPage />}
          {page === "networth" && <NetWorthPage />}
        </div>

        {/* Tab bar */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: t.navBg, borderTop: `1px solid ${t.navBorder}`, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "10px 0 22px" }}>
          {[{ l: "Home", i: "⊞" }, { l: "Transactions", i: "☰" }, { l: "Budget", i: "▭" }, { l: "More", i: "⋮", active: true }].map(tab => (
            <div key={tab.l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: tab.active ? t.navActive : t.navInactive, minWidth: 64, cursor: "pointer" }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{tab.i}</span>
              <span style={{ fontSize: 10, fontWeight: tab.active ? 600 : 400 }}>{tab.l}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
