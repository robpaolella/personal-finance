import { useState } from "react";

const LIGHT = {
  bgMain: "#f4f6f9",
  bgCard: "#ffffff",
  bgCardBorder: "#e8ecf1",
  bgCardShadow: "0 1px 2px rgba(0,0,0,0.04)",
  bgSidebar: "#0f172a",
  bgHover: "#f8fafc",
  bgInput: "#f8fafc",
  bgInputBorder: "#e2e8f0",
  bgModal: "rgba(0,0,0,0.5)",
  bgNeedsAttention: "rgb(255,251,235)",
  bgInlineSuccess: "#f0fdf4",
  bgInlineSuccessBorder: "#bbf7d0",
  bgInlineError: "#fef2f2",
  bgInlineErrorBorder: "#fecaca",
  bgInlineWarning: "#fffbeb",
  bgInlineWarningBorder: "#fde68a",
  bgInlineInfo: "#eff6ff",
  bgInlineInfoBorder: "#bfdbfe",
  textPrimary: "#0f172a",
  textBody: "#475569",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
  textVeryMuted: "#cbd5e1",
  textInlineSuccess: "#166534",
  textInlineError: "#991b1b",
  textInlineWarning: "#92400e",
  textInlineInfo: "#1e40af",
  positive: "#10b981",
  negative: "#ef4444",
  accent: "#3b82f6",
  warning: "#f59e0b",
  orange: "#f97316",
  btnPrimaryBg: "#0f172a",
  btnPrimaryText: "#ffffff",
  btnSecondaryBg: "#ebeff3",
  btnSecondaryText: "#334155",
  btnDestructiveBg: "#ef4444",
  btnDestructiveText: "#ffffff",
  btnDestructiveLightBg: "#fef2f2",
  btnDestructiveLightText: "#ef4444",
  btnGhostText: "#64748b",
  badgeAccountBg: "#f1f5f9",
  badgeAccountText: "#475569",
  badgeCategoryBg: "#eff6ff",
  badgeCategoryText: "#3b82f6",
  badgeOwner1Bg: "#dbeafe",
  badgeOwner1Text: "#2563eb",
  badgeOwner2Bg: "#fce7f3",
  badgeOwner2Text: "#db2777",
  badgeSharedBg: "#f1f5f9",
  badgeSharedText: "#64748b",
  badgeLiquidBg: "#d1fae5",
  badgeLiquidText: "#059669",
  badgeInvestmentBg: "#ede9fe",
  badgeInvestmentText: "#7c3aed",
  badgeLiabilityBg: "#fef2f2",
  badgeLiabilityText: "#dc2626",
  badgeDuplicateExactBg: "#fef2f2",
  badgeDuplicateExactText: "#dc2626",
  badgeDuplicatePossibleBg: "#fffbeb",
  badgeDuplicatePossibleText: "#b45309",
  badgeTransferBg: "#fff7ed",
  badgeTransferText: "#c2410c",
  badgeConnectedBg: "#d1fae5",
  badgeConnectedText: "#059669",
  tableBorder: "#e2e8f0",
  tableRowBorder: "#f1f5f9",
  toggleContainerBg: "#f1f5f9",
  toggleActiveBg: "#ffffff",
  toggleActiveShadow: "0 1px 3px rgba(0,0,0,0.08)",
  toggleActiveText: "#0f172a",
  toggleInactiveText: "#64748b",
  progressTrack: "#f1f5f9",
  dateIconFilter: "none",
};

const DARK = {
  bgMain: "#0b0f1a",
  bgCard: "#141926",
  bgCardBorder: "#1e293b",
  bgCardShadow: "0 1px 2px rgba(0,0,0,0.2)",
  bgSidebar: "#060a13",
  bgHover: "#1a2234",
  bgInput: "#0f1629",
  bgInputBorder: "#1e293b",
  bgModal: "rgba(0,0,0,0.7)",
  bgNeedsAttention: "rgba(250,255,194,0.15)",
  bgInlineSuccess: "#052e16",
  bgInlineSuccessBorder: "#166534",
  bgInlineError: "#3b1111",
  bgInlineErrorBorder: "#7f1d1d",
  bgInlineWarning: "#3b2506",
  bgInlineWarningBorder: "#78350f",
  bgInlineInfo: "#1e3a5f",
  bgInlineInfoBorder: "rgb(87,121,232)",
  textPrimary: "#f1f5f9",
  textBody: "#94a3b8",
  textSecondary: "#64748b",
  textMuted: "#475569",
  textVeryMuted: "#334155",
  textInlineSuccess: "#86efac",
  textInlineError: "#fca5a5",
  textInlineWarning: "#fcd34d",
  textInlineInfo: "#93c5fd",
  positive: "#10b981",
  negative: "#ef4444",
  accent: "#3b82f6",
  warning: "#f59e0b",
  orange: "#f97316",
  btnPrimaryBg: "#e2e8f0",
  btnPrimaryText: "#0f172a",
  btnSecondaryBg: "#1a2234",
  btnSecondaryText: "#94a3b8",
  btnDestructiveBg: "#ef4444",
  btnDestructiveText: "#ffffff",
  btnDestructiveLightBg: "#3b1111",
  btnDestructiveLightText: "#fca5a5",
  btnGhostText: "#64748b",
  badgeAccountBg: "#1a2234",
  badgeAccountText: "#94a3b8",
  badgeCategoryBg: "#1e3a5f",
  badgeCategoryText: "#60a5fa",
  badgeOwner1Bg: "#1e3a5f",
  badgeOwner1Text: "#60a5fa",
  badgeOwner2Bg: "#4a1942",
  badgeOwner2Text: "#f472b6",
  badgeSharedBg: "#1a2234",
  badgeSharedText: "#64748b",
  badgeLiquidBg: "#052e16",
  badgeLiquidText: "#34d399",
  badgeInvestmentBg: "#2e1065",
  badgeInvestmentText: "#a78bfa",
  badgeLiabilityBg: "#3b1111",
  badgeLiabilityText: "#fca5a5",
  badgeDuplicateExactBg: "#3b1111",
  badgeDuplicateExactText: "#fca5a5",
  badgeDuplicatePossibleBg: "#3b2506",
  badgeDuplicatePossibleText: "#fcd34d",
  badgeTransferBg: "#3b1a06",
  badgeTransferText: "#fb923c",
  badgeConnectedBg: "#052e16",
  badgeConnectedText: "#34d399",
  tableBorder: "#1e293b",
  tableRowBorder: "#141926",
  toggleContainerBg: "#1a2234",
  toggleActiveBg: "#0f172a",
  toggleActiveShadow: "0 1px 3px rgba(0,0,0,0.3)",
  toggleActiveText: "#f1f5f9",
  toggleInactiveText: "#64748b",
  progressTrack: "#1a2234",
  dateIconFilter: "invert(0.35) sepia(0.1) saturate(1) hue-rotate(180deg)",
};

const TOOLTIP = { bg: "#0f172a", text: "#f1f5f9", radius: 6, padding: "6px 12px", fontSize: 12, shadow: "0 4px 12px rgba(0,0,0,0.15)", maxWidth: 250 };

const CATEGORY_PALETTE = [
  { color: "#ef4444", name: "Red" },
  { color: "#ec4899", name: "Pink" },
  { color: "#a855f7", name: "Purple" },
  { color: "#8b5cf6", name: "Violet" },
  { color: "#6366f1", name: "Indigo" },
  { color: "#3b82f6", name: "Blue" },
  { color: "#06b6d4", name: "Cyan" },
  { color: "#14b8a6", name: "Teal" },
  { color: "#10b981", name: "Emerald" },
  { color: "#22c55e", name: "Green" },
  { color: "#84cc16", name: "Lime" },
  { color: "#f59e0b", name: "Amber" },
  { color: "#f97316", name: "Orange" },
  { color: "#e11d48", name: "Rose" },
  { color: "#0ea5e9", name: "Sky" },
  { color: "#d946ef", name: "Fuchsia" },
];

const mono = { fontFamily: "'DM Mono', monospace" };
const sans = { fontFamily: "'DM Sans', sans-serif" };

function Section({ title, children, t }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: `2px solid ${t.bgCardBorder}` }}>{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <span style={{ width: 160, fontSize: 12, color: "inherit", opacity: 0.6, flexShrink: 0, ...sans }}>{label}</span>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function Swatch({ color, label, t }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ width: 40, height: 40, borderRadius: 6, background: color, border: `1px solid ${t.bgCardBorder}` }} />
      <span style={{ fontSize: 9, color: t.textMuted, ...mono }}>{color.length > 15 ? color.slice(0,15)+"…" : color}</span>
      {label && <span style={{ fontSize: 10, color: t.textSecondary, ...sans }}>{label}</span>}
    </div>
  );
}

function Badge({ bg, text, label, useMono }) {
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: bg, color: text, ...(useMono ? mono : sans), fontWeight: 500, display: "inline-block" }}>{label}</span>;
}

function ToastExample({ t, type }) {
  const colors = { success: { border: t.positive, icon: "✓" }, error: { border: t.negative, icon: "✗" }, info: { border: t.accent, icon: "ℹ" } };
  const msgs = { success: "Transaction saved successfully", error: "Failed to import transactions", info: "3 possible duplicates detected" };
  const c = colors[type];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
      background: t.bgCard, border: `1px solid ${t.bgCardBorder}`,
      borderLeft: `3px solid ${c.border}`, borderRadius: 8,
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxWidth: 340, ...sans, fontSize: 13,
    }}>
      <span style={{ color: c.border, fontWeight: 700, fontSize: 14 }}>{c.icon}</span>
      <span style={{ color: t.textPrimary, flex: 1 }}>{msgs[type]}</span>
      <span style={{ color: t.textMuted, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</span>
    </div>
  );
}

function InlineNotification({ t, type, message }) {
  const map = {
    success: { bg: t.bgInlineSuccess, border: t.bgInlineSuccessBorder, text: t.textInlineSuccess, msg: "Balances updated successfully." },
    error: { bg: t.bgInlineError, border: t.bgInlineErrorBorder, text: t.textInlineError, msg: "This account cannot be deleted because it has associated transactions." },
    warning: { bg: t.bgInlineWarning, border: t.bgInlineWarningBorder, text: t.textInlineWarning, msg: "Data retrieval is limited to 60 days per request." },
    info: { bg: t.bgInlineInfo, border: t.bgInlineInfoBorder, text: t.textInlineInfo, msg: "Showing data from John's accounts only." },
  };
  const c = map[type];
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 8, fontSize: 13, ...sans,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
    }}>{message || c.msg}</div>
  );
}

export default function DesignGuide() {
  const [dark, setDark] = useState(false);
  const t = dark ? DARK : LIGHT;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator { filter: ${t.dateIconFilter}; }
      `}</style>
      <div style={{ background: t.bgMain, minHeight: "100vh", padding: "24px 32px", ...sans, color: t.textPrimary }}>
        {/* Floating theme toggle */}
        <button onClick={() => setDark(!dark)} style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 999,
          width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer",
          background: dark ? "#1e293b" : "#0f172a", color: dark ? "#fbbf24" : "#f1f5f9",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, lineHeight: 1,
        }}>{dark ? "☀" : "☾"}</button>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Ledger Design System</h1>
          <p style={{ color: t.textSecondary, fontSize: 13, marginTop: 4 }}>Interactive reference for humans & LLMs · {dark ? "Dark Mode" : "Light Mode"}</p>
          <p style={{ color: t.textMuted, fontSize: 11, marginTop: 2 }}>Every color, component, and pattern. Use the ☀/☾ button to toggle themes.</p>
        </div>

        {/* Typography */}
        <Section title="Typography" t={t}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Page Title — 22px / 700 / DM Sans</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Card Title — 14px / 700 / DM Sans</div>
            <div style={{ fontSize: 13, color: t.textBody }}>Body text — 13px / 400 — table cells, descriptions, form labels</div>
            <div style={{ fontSize: 13, color: t.textSecondary }}>Secondary text — 13px / #64748b — subtitles, supplementary info</div>
            <div style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>Muted Label — 11px / uppercase / 0.05em — KPI labels, section headers</div>
            <div style={{ fontSize: 22, fontWeight: 800, ...mono, letterSpacing: "-0.02em" }}>$12,345.67 — KPI Value — 22px / 800 / DM Mono</div>
            <div style={{ fontSize: 13, ...mono, color: t.textBody }}>$1,234.56 — Table monetary — 13px / DM Mono</div>
            <div style={{ fontSize: 12, ...mono, color: t.textBody }}>2025-02-21 — Date — 12px / DM Mono</div>
            <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em" }}>Transaction Amount Display Rules:</div>
            <div style={{ fontSize: 13, color: t.textPrimary, ...mono, fontWeight: 600 }}>$187.43 — Regular expense (positive amount + expense category)</div>
            <div style={{ fontSize: 13, color: t.positive, ...mono, fontWeight: 600 }}>+$3,618.21 — Income (negative amount + income category)</div>
            <div style={{ fontSize: 13, color: t.positive, ...mono, fontWeight: 600 }}>-$50.00 — Refund (negative amount + expense category)</div>
            <div style={{ fontSize: 13, color: t.negative, ...mono, fontWeight: 600 }}>-$500.00 — Income reversal (positive amount + income category)</div>
          </div>
        </Section>

        {/* Colors */}
        <Section title="Core Colors" t={t}>
          <Row label="Backgrounds">
            <Swatch color={t.bgMain} label="Main" t={t} />
            <Swatch color={t.bgCard} label="Card" t={t} />
            <Swatch color={t.bgHover} label="Hover" t={t} />
            <Swatch color={t.bgInput} label="Input" t={t} />
            <Swatch color={t.bgSidebar} label="Sidebar" t={t} />
          </Row>
          <Row label="Text">
            {[
              { c: t.textPrimary, l: "Primary" }, { c: t.textBody, l: "Body" },
              { c: t.textSecondary, l: "Secondary" }, { c: t.textMuted, l: "Muted" },
            ].map(x => (
              <span key={x.l} style={{ fontSize: 12 }}>
                <span style={{ color: x.c, fontWeight: 600 }}>Aa</span>
                <span style={{ color: t.textMuted, fontSize: 10, marginLeft: 4 }}>{x.l}</span>
              </span>
            ))}
          </Row>
          <Row label="Semantic">
            <Swatch color={t.positive} label="Positive" t={t} />
            <Swatch color={t.negative} label="Negative" t={t} />
            <Swatch color={t.accent} label="Accent" t={t} />
            <Swatch color={t.warning} label="Warning" t={t} />
            <Swatch color={t.orange} label="Orange" t={t} />
          </Row>
        </Section>

        {/* Category Color Palette */}
        <Section title="Category Color Palette" t={t}>
          <p style={{ fontSize: 12, color: t.textSecondary, marginBottom: 12 }}>
            Categories are dynamically assigned colors from this palette. Colors should be visually distinct and work on both light and dark backgrounds. These do not change between modes.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {CATEGORY_PALETTE.map(c => (
              <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, background: c.color, display: "inline-block", border: `1px solid ${t.bgCardBorder}` }} />
                <span style={{ fontSize: 11, color: t.textBody, ...sans }}>{c.name}</span>
                <span style={{ fontSize: 9, color: t.textMuted, ...mono }}>{c.color}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 12, color: t.textSecondary }}>Usage with progress bars:</p>
            <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
              {CATEGORY_PALETTE.slice(0, 6).map(c => (
                <div key={c.name} style={{ width: 100 }}>
                  <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 3 }}>{c.name}</div>
                  <div style={{ height: 6, background: t.progressTrack, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${40 + Math.random() * 50}%`, background: c.color, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Buttons" t={t}>
          <Row label="Primary">
            <button style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: t.btnPrimaryBg, color: t.btnPrimaryText, ...sans }}>Save Transaction</button>
          </Row>
          <Row label="Secondary">
            <button style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: t.btnSecondaryBg, color: t.btnSecondaryText, ...sans }}>Cancel</button>
          </Row>
          <Row label="Destructive">
            <button style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: t.btnDestructiveBg, color: t.btnDestructiveText, ...sans }}>Delete</button>
            <button style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: t.btnDestructiveBg, color: t.btnDestructiveText, ...sans }}>Confirm Delete?</button>
            <span style={{ fontSize: 12, color: t.accent, cursor: "pointer", ...sans }}>Cancel</span>
          </Row>
          <Row label="Destructive (Light)">
            <button style={{ padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: t.btnDestructiveLightBg, color: t.btnDestructiveLightText, ...sans }}>Delete</button>
          </Row>
          <Row label="Ghost / Link">
            <button style={{ padding: "4px 8px", border: "none", background: "none", fontSize: 12, fontWeight: 500, cursor: "pointer", color: t.btnGhostText, ...sans }}>Reset Filters</button>
            <button style={{ padding: "4px 8px", border: "none", background: "none", fontSize: 12, fontWeight: 500, cursor: "pointer", color: t.accent, ...sans }}>View All →</button>
          </Row>
          <Row label="Success / Import">
            <button style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: t.positive, color: "#ffffff", ...sans }}>Import 42 Transactions</button>
          </Row>
        </Section>

        {/* Badges */}
        <Section title="Badges" t={t}>
          <Row label="Account"><Badge bg={t.badgeAccountBg} text={t.badgeAccountText} label="CC (1234)" useMono /><Badge bg={t.badgeAccountBg} text={t.badgeAccountText} label="Checking (5678)" useMono /><span style={{ fontSize: 10, color: t.textMuted }}>DM Mono · fit-content</span></Row>
          <Row label="Category"><Badge bg={t.badgeCategoryBg} text={t.badgeCategoryText} label="Groceries" /><Badge bg={t.badgeCategoryBg} text={t.badgeCategoryText} label="Dining/Eating Out" /></Row>
          <Row label="Owner"><Badge bg={t.badgeOwner1Bg} text={t.badgeOwner1Text} label="John" /><Badge bg={t.badgeOwner2Bg} text={t.badgeOwner2Text} label="Jane" /><Badge bg={t.badgeSharedBg} text={t.badgeSharedText} label="Shared" /></Row>
          <Row label="Classification"><Badge bg={t.badgeLiquidBg} text={t.badgeLiquidText} label="Liquid" /><Badge bg={t.badgeInvestmentBg} text={t.badgeInvestmentText} label="Investment" /><Badge bg={t.badgeLiabilityBg} text={t.badgeLiabilityText} label="Liability" /></Row>
          <Row label="Status"><Badge bg={t.badgeDuplicateExactBg} text={t.badgeDuplicateExactText} label="Likely Duplicate" /><Badge bg={t.badgeDuplicatePossibleBg} text={t.badgeDuplicatePossibleText} label="Possible Duplicate" /><Badge bg={t.badgeTransferBg} text={t.badgeTransferText} label="Likely Transfer" /><Badge bg={t.badgeConnectedBg} text={t.badgeConnectedText} label="Connected" /></Row>
        </Section>

        {/* Form Elements */}
        <Section title="Form Elements" t={t}>
          <Row label="Text Input">
            <input placeholder="Description..." style={{ padding: "8px 12px", border: `1px solid ${t.bgInputBorder}`, borderRadius: 8, fontSize: 13, background: t.bgInput, color: t.textPrimary, width: 240, outline: "none", ...sans }} />
          </Row>
          <Row label="Search Input">
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: t.textMuted, fontSize: 14 }}>⌕</span>
              <input placeholder="Search transactions..." style={{ padding: "8px 8px 8px 32px", border: `1px solid ${t.bgInputBorder}`, borderRadius: 8, fontSize: 13, background: t.bgInput, color: t.textPrimary, width: 260, outline: "none", ...sans }} />
            </div>
          </Row>
          <Row label="Select">
            <select style={{ padding: "8px 12px", border: `1px solid ${t.bgInputBorder}`, borderRadius: 8, fontSize: 13, background: t.bgInput, color: t.textPrimary, cursor: "pointer", ...sans }}>
              <option>All Accounts</option>
            </select>
          </Row>
          <Row label="Date Input">
            <input type="date" defaultValue="2025-02-21" style={{ padding: "8px 12px", border: `1px solid ${t.bgInputBorder}`, borderRadius: 8, fontSize: 13, background: t.bgInput, color: t.textPrimary, ...sans }} />
          </Row>
          <Row label="Toggle Group">
            <div style={{ display: "flex", background: t.toggleContainerBg, borderRadius: 8, padding: 2 }}>
              {["All", "John", "Jane"].map((x, i) => (
                <button key={x} style={{
                  padding: "6px 14px", fontSize: 12, fontWeight: i === 0 ? 600 : 400, border: "none", borderRadius: 6, cursor: "pointer", ...sans,
                  background: i === 0 ? t.toggleActiveBg : "transparent",
                  color: i === 0 ? t.toggleActiveText : t.toggleInactiveText,
                  boxShadow: i === 0 ? t.toggleActiveShadow : "none",
                }}>{x}</button>
              ))}
            </div>
          </Row>
        </Section>

        {/* Cards */}
        <Section title="Cards" t={t}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: t.bgCard, border: `1px solid ${t.bgCardBorder}`, borderRadius: 12, padding: "16px 20px", boxShadow: t.bgCardShadow }}>
              <p style={{ fontSize: 11, color: t.textMuted, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>Net Worth</p>
              <p style={{ fontSize: 22, fontWeight: 800, ...mono, margin: "4px 0 0", letterSpacing: "-0.02em" }}>$194,976.39</p>
              <p style={{ fontSize: 11, margin: "4px 0 0", color: t.positive }}>▲ +2.3%</p>
            </div>
            <div style={{ background: t.bgCard, border: `1px solid ${t.bgCardBorder}`, borderRadius: 12, padding: "16px 20px", boxShadow: t.bgCardShadow }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Standard Card</h3>
              <p style={{ fontSize: 13, color: t.textBody, marginTop: 8 }}>12px radius · 1px border · 16px 20px padding</p>
            </div>
          </div>
        </Section>

        {/* Toast Notifications */}
        <Section title="Toast Notifications" t={t}>
          <p style={{ fontSize: 12, color: t.textSecondary, marginBottom: 12 }}>
            Top-right position. Action outcomes only (save, delete, import). Auto-dismiss 3s. Stack newest on top. Never paired with inline for the same action.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Row label="Success"><ToastExample t={t} type="success" /></Row>
            <Row label="Error"><ToastExample t={t} type="error" /></Row>
            <Row label="Info"><ToastExample t={t} type="info" /></Row>
          </div>
        </Section>

        {/* Inline Notifications - Standalone */}
        <Section title="Inline Notifications — On Page Background" t={t}>
          <p style={{ fontSize: 12, color: t.textSecondary, marginBottom: 12 }}>
            Used for validation errors, constraints, and contextual info. Placed inside modals/forms. Never paired with toasts for the same action.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Row label="Success"><InlineNotification t={t} type="success" /></Row>
            <Row label="Error"><InlineNotification t={t} type="error" /></Row>
            <Row label="Warning"><InlineNotification t={t} type="warning" /></Row>
            <Row label="Info"><InlineNotification t={t} type="info" /></Row>
          </div>
        </Section>

        {/* Inline Notifications - On Card */}
        <Section title="Inline Notifications — Inside a Card" t={t}>
          <p style={{ fontSize: 12, color: t.textSecondary, marginBottom: 12 }}>
            How notifications look inside a standard card (e.g., a settings section, a form panel).
          </p>
          <div style={{ background: t.bgCard, border: `1px solid ${t.bgCardBorder}`, borderRadius: 12, padding: "16px 20px", boxShadow: t.bgCardShadow }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>Account Settings</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <InlineNotification t={t} type="error" message="This account cannot be deleted because it has associated transactions." />
              <InlineNotification t={t} type="warning" message="This will remove all account links. Previously imported transactions will not be affected." />
              <InlineNotification t={t} type="info" message="Showing data from John's accounts only." />
              <InlineNotification t={t} type="success" message="Connection saved successfully." />
            </div>
          </div>
        </Section>

        {/* Inline Notifications - Inside Modal */}
        <Section title="Inline Notifications — Inside a Modal" t={t}>
          <p style={{ fontSize: 12, color: t.textSecondary, marginBottom: 12 }}>
            How notifications look inside a modal dialog (card on a backdrop).
          </p>
          <div style={{ background: t.bgModal, borderRadius: 16, padding: 32, display: "flex", justifyContent: "center" }}>
            <div style={{ background: t.bgCard, border: `1px solid ${t.bgCardBorder}`, borderRadius: 12, padding: "20px 24px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", width: 420, maxWidth: "100%" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>Edit Account</h3>
              <InlineNotification t={t} type="error" message="This account cannot be deleted because it has associated transactions." />
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 12, color: t.textSecondary, fontWeight: 500, display: "block", marginBottom: 4 }}>Account Name</label>
                <input defaultValue="Primary Checking" style={{ width: "100%", padding: "8px 12px", border: `1px solid ${t.bgInputBorder}`, borderRadius: 8, fontSize: 13, background: t.bgInput, color: t.textPrimary, outline: "none", ...sans, boxSizing: "border-box" }} />
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 12, color: t.textSecondary, fontWeight: 500, display: "block", marginBottom: 4 }}>Last Four</label>
                <input defaultValue="5678" style={{ width: "100%", padding: "8px 12px", border: `1px solid ${t.bgInputBorder}`, borderRadius: 8, fontSize: 13, background: t.bgInput, color: t.textPrimary, outline: "none", ...sans, boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
                <button style={{ padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: t.btnDestructiveBg, color: t.btnDestructiveText, ...sans }}>Delete</button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: t.btnSecondaryBg, color: t.btnSecondaryText, ...sans }}>Cancel</button>
                  <button style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: t.btnPrimaryBg, color: t.btnPrimaryText, ...sans }}>Save</button>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Modal with Warning before delete */}
        <Section title="Inline Warning — Delete Confirmation in Modal" t={t}>
          <p style={{ fontSize: 12, color: t.textSecondary, marginBottom: 12 }}>
            Warning banners appear when a destructive action is initiated, before the second confirmation click.
          </p>
          <div style={{ background: t.bgModal, borderRadius: 16, padding: 32, display: "flex", justifyContent: "center" }}>
            <div style={{ background: t.bgCard, border: `1px solid ${t.bgCardBorder}`, borderRadius: 12, padding: "20px 24px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", width: 420, maxWidth: "100%" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>Edit Connection</h3>
              <InlineNotification t={t} type="warning" message="This will remove all account links for this connection. Previously imported transactions will not be affected." />
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 12, color: t.textSecondary, fontWeight: 500, display: "block", marginBottom: 4 }}>Connection Label</label>
                <input defaultValue="My Bank Connection" style={{ width: "100%", padding: "8px 12px", border: `1px solid ${t.bgInputBorder}`, borderRadius: 8, fontSize: 13, background: t.bgInput, color: t.textPrimary, outline: "none", ...sans, boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button style={{ padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: t.btnDestructiveBg, color: t.btnDestructiveText, ...sans }}>Confirm Delete?</button>
                  <span style={{ fontSize: 12, color: t.accent, cursor: "pointer", ...sans }}>Cancel</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: t.btnSecondaryBg, color: t.btnSecondaryText, ...sans }}>Close</button>
                  <button style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: t.btnPrimaryBg, color: t.btnPrimaryText, ...sans }}>Save</button>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Tooltip */}
        <Section title="Tooltips" t={t}>
          <p style={{ fontSize: 12, color: t.textSecondary, marginBottom: 12 }}>
            Always dark style regardless of theme. Max 250px. Viewport-aware positioning. Equal padding all sides.
          </p>
          <div style={{ marginBottom: 20, paddingTop: 50 }}>
            <Row label="Tooltip Example">
              <div style={{ position: "relative", display: "inline-block" }}>
                <Badge bg={t.badgeTransferBg} text={t.badgeTransferText} label="Likely Transfer" />
                <div style={{
                  position: "absolute", top: -44, left: 0,
                  background: TOOLTIP.bg, color: TOOLTIP.text, borderRadius: TOOLTIP.radius,
                  padding: TOOLTIP.padding, fontSize: TOOLTIP.fontSize,
                  boxShadow: TOOLTIP.shadow, ...sans, width: 300,
                }}>
                  This looks like a transfer between accounts
                  <div style={{
                    position: "absolute", bottom: -4, left: 24,
                    width: 8, height: 8, background: TOOLTIP.bg, transform: "rotate(45deg)",
                  }} />
                </div>
              </div>
            </Row>
          </div>
          <div style={{ paddingTop: 50 }}>
            <Row label="Multi-line Tooltip">
            <div style={{ position: "relative", display: "inline-block" }}>
              <span style={{ fontSize: 11, color: t.textSecondary, textDecoration: "underline dotted", cursor: "help" }}>Total Return ⓘ</span>
              <div style={{
                position: "absolute", top: -52, left: 0,
                background: TOOLTIP.bg, color: TOOLTIP.text, borderRadius: TOOLTIP.radius,
                padding: TOOLTIP.padding, fontSize: TOOLTIP.fontSize, width: 250,
                boxShadow: TOOLTIP.shadow, ...sans, lineHeight: 1.4,
              }}>
                Total return since purchase, based on cost basis vs current market value
                <div style={{
                  position: "absolute", bottom: -4, left: 24,
                  width: 8, height: 8, background: TOOLTIP.bg, transform: "rotate(45deg)",
                }} />
              </div>
            </div>
          </Row>
          </div>
        </Section>
        <Section title="Table" t={t}>
          <div style={{ background: t.bgCard, border: `1px solid ${t.bgCardBorder}`, borderRadius: 12, padding: "16px 20px", boxShadow: t.bgCardShadow, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, ...sans }}>
              <thead>
                <tr>
                  {["Date", "Description", "Account", "Category", "Amount"].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i === 4 ? "right" : "left", fontSize: 11, fontWeight: 600, color: t.textSecondary,
                      padding: "8px 10px", borderBottom: `2px solid ${t.tableBorder}`,
                      textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer",
                    }}>{h} {i === 0 && <span style={{ fontSize: 10, color: t.textMuted }}>▼</span>}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { date: "2025-02-18", desc: "Grocery Store", acct: "CC (1234)", cat: "Groceries", amt: "$187.43", amtColor: t.textPrimary },
                  { date: "2025-02-17", desc: "Employer Payroll", acct: "Checking (5678)", cat: "Take Home Pay", amt: "+$3,618.21", amtColor: t.positive },
                  { date: "2025-02-14", desc: "Online Store Refund", acct: "CC (1234)", cat: "Other Household", amt: "-$34.99", amtColor: t.positive },
                ].map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${t.tableRowBorder}` }}>
                    <td style={{ padding: "8px 10px", ...mono, fontSize: 12, color: t.textBody }}>{r.date}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 500, color: t.textPrimary }}>{r.desc}</td>
                    <td style={{ padding: "8px 10px" }}><Badge bg={t.badgeAccountBg} text={t.badgeAccountText} label={r.acct} useMono /></td>
                    <td style={{ padding: "8px 10px" }}><Badge bg={t.badgeCategoryBg} text={t.badgeCategoryText} label={r.cat} /></td>
                    <td style={{ padding: "8px 10px", textAlign: "right", ...mono, fontWeight: 600, color: r.amtColor }}>{r.amt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Row States */}
        <Section title="Special Row States" t={t}>
          <div style={{ background: t.bgCard, border: `1px solid ${t.bgCardBorder}`, borderRadius: 12, padding: "16px 20px", boxShadow: t.bgCardShadow }}>
            <div style={{ padding: "8px 10px", background: t.bgNeedsAttention, borderRadius: 6, fontSize: 13, color: t.textBody, marginBottom: 8 }}>
              Needs Attention / Uncategorized row
            </div>
            <div style={{ padding: "8px 10px", background: t.bgHover, borderRadius: 6, fontSize: 13, color: t.textBody }}>
              Hover state row
            </div>
          </div>
        </Section>

        {/* Progress Bars */}
        <Section title="Progress Bars" t={t}>
          <Row label="Under budget">
            <div style={{ width: 200, height: 6, background: t.progressTrack, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: "65%", background: t.accent, borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 11, color: t.textMuted, ...mono }}>65%</span>
          </Row>
          <Row label="Over budget">
            <div style={{ width: 200, height: 6, background: t.progressTrack, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: "100%", background: t.negative, borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 11, color: t.negative, ...mono }}>112%</span>
          </Row>
        </Section>

        {/* Delete Confirmation */}
        <Section title="Delete Confirmation Pattern" t={t}>
          <p style={{ fontSize: 12, color: t.textSecondary, marginBottom: 12 }}>Shared ConfirmDeleteButton component. Never use browser confirm(). Reverts after 3s.</p>
          <Row label="Step 1: Initial">
            <button style={{ padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: t.btnDestructiveBg, color: t.btnDestructiveText, ...sans }}>Delete</button>
          </Row>
          <Row label="Step 2: Confirm">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button style={{ padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: t.btnDestructiveBg, color: t.btnDestructiveText, ...sans }}>Confirm Delete?</button>
              <span style={{ fontSize: 12, color: t.accent, cursor: "pointer", ...sans }}>Cancel</span>
            </div>
          </Row>
        </Section>

        {/* Notification Rules */}
        <Section title="Notification Decision Rules" t={t}>
          <div style={{ background: t.bgCard, border: `1px solid ${t.bgCardBorder}`, borderRadius: 12, padding: "16px 20px", boxShadow: t.bgCardShadow }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, ...sans }}>
              <thead>
                <tr>
                  {["Scenario", "Toast", "Inline", "Both"].map(h => (
                    <th key={h} style={{ textAlign: "left", fontSize: 11, fontWeight: 600, color: t.textSecondary, padding: "6px 10px", borderBottom: `2px solid ${t.tableBorder}`, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { s: "Successful save/delete/import", toast: "✓", inline: "—" },
                  { s: "API failure (network, server)", toast: "✓", inline: "—" },
                  { s: "Missing required field", toast: "—", inline: "✓" },
                  { s: "Can't delete (has dependencies)", toast: "—", inline: "✓" },
                  { s: "Contextual info (filter, limit)", toast: "—", inline: "✓" },
                  { s: "Duplicate detected (manual entry)", toast: "✓ (action)", inline: "—" },
                ].map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${t.tableRowBorder}` }}>
                    <td style={{ padding: "6px 10px" }}>{r.s}</td>
                    <td style={{ padding: "6px 10px", color: r.toast.includes("✓") ? t.positive : t.textMuted }}>{r.toast}</td>
                    <td style={{ padding: "6px 10px", color: r.inline === "✓" ? t.positive : t.textMuted }}>{r.inline}</td>
                    <td style={{ padding: "6px 10px", color: t.negative, fontWeight: 600 }}>✗</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Interactive States */}
        <Section title="Interactive States — Hover, Focus, Active" t={t}>
          <p style={{ fontSize: 12, color: t.textSecondary, marginBottom: 16 }}>
            Every interactive element needs a visible hover/focus state. Hover shows "this is clickable." Focus shows "this is selected" (keyboard accessibility). These are mandatory — never ship an interactive element without them.
          </p>

          {/* Buttons */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Buttons — Hover lifts slightly and shifts brightness</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              {[
                { label: "Primary", bg: t.btnPrimaryBg, text: t.btnPrimaryText, hoverBg: dark ? "#cbd5e1" : "#1e293b" },
                { label: "Secondary", bg: t.btnSecondaryBg, text: t.btnSecondaryText, hoverBg: dark ? "#243044" : "#dfe3e8" },
                { label: "Destructive", bg: t.btnDestructiveBg, text: t.btnDestructiveText, hoverBg: "#dc2626" },
                { label: "Success", bg: t.positive, text: "#ffffff", hoverBg: "#059669" },
              ].map(b => (
                <div key={b.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: b.bg, color: b.text, ...sans }}>{b.label}</button>
                    <button style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: b.hoverBg, color: b.text, ...sans, transform: "translateY(-1px)", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>{b.label}</button>
                  </div>
                  <span style={{ fontSize: 10, color: t.textMuted }}>Default → Hover</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: t.btnDestructiveLightBg, color: t.btnDestructiveLightText, ...sans }}>Delete</button>
                  <button style={{ padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: dark ? "#4a1515" : "#fee2e2", color: t.btnDestructiveLightText, ...sans }}>Delete</button>
                </div>
                <span style={{ fontSize: 10, color: t.textMuted }}>Destructive Light: Default → Hover</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 12, color: t.accent, cursor: "pointer", ...sans }}>View All →</span>
                  <span style={{ fontSize: 12, color: t.accent, cursor: "pointer", ...sans, textDecoration: "underline" }}>View All →</span>
                </div>
                <span style={{ fontSize: 10, color: t.textMuted }}>Ghost/Link: Default → Hover (underline)</span>
              </div>
            </div>
          </div>

          {/* Hover Specs Table */}
          <div style={{ background: t.bgCard, border: `1px solid ${t.bgCardBorder}`, borderRadius: 12, padding: "16px 20px", boxShadow: t.bgCardShadow, marginBottom: 24 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, ...sans }}>
              <thead>
                <tr>
                  {["Element", "Hover Effect", "Transition"].map(h => (
                    <th key={h} style={{ textAlign: "left", fontSize: 11, fontWeight: 600, color: t.textSecondary, padding: "6px 10px", borderBottom: `2px solid ${t.tableBorder}`, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { el: "Primary Button", fx: "Darken bg 1 step + translateY(-1px) + shadow", tr: "all 150ms ease" },
                  { el: "Secondary Button", fx: "Darken bg 1 step", tr: "all 150ms ease" },
                  { el: "Destructive Button", fx: "Darken to #dc2626 + translateY(-1px) + shadow", tr: "all 150ms ease" },
                  { el: "Destructive Light Button", fx: "Darken bg 1 step", tr: "all 150ms ease" },
                  { el: "Success/Import Button", fx: "Darken to #059669 + translateY(-1px) + shadow", tr: "all 150ms ease" },
                  { el: "Ghost / Link Button", fx: "Add text-decoration: underline", tr: "none (instant)" },
                  { el: "Toggle Pill (inactive)", fx: "Background tint: var(--bg-hover)", tr: "background 150ms ease" },
                  { el: "Table Row (clickable)", fx: "Background: var(--bg-hover) + cursor: pointer", tr: "background 150ms ease" },
                  { el: "Clickable Badge", fx: "filter: brightness(1.1)", tr: "filter 150ms ease" },
                  { el: "Card (clickable)", fx: "Border color shifts 1 step lighter + shadow increases", tr: "all 200ms ease" },
                  { el: "Sidebar Nav Item", fx: "Background: rgba(255,255,255,0.05)", tr: "background 150ms ease" },
                  { el: "Scroll Indicator Arrow", fx: "Background darkens, shadow increases", tr: "all 150ms ease" },
                ].map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${t.tableRowBorder}` }}>
                    <td style={{ padding: "6px 10px", fontWeight: 500, color: t.textPrimary }}>{r.el}</td>
                    <td style={{ padding: "6px 10px", color: t.textBody }}>{r.fx}</td>
                    <td style={{ padding: "6px 10px", ...mono, fontSize: 11, color: t.textMuted }}>{r.tr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Toggle Group */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Toggle Group — Inactive pills show tint on hover</div>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ display: "flex", background: t.toggleContainerBg, borderRadius: 8, padding: 2 }}>
                  <button style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 6, cursor: "pointer", ...sans, background: t.toggleActiveBg, color: t.toggleActiveText, boxShadow: t.toggleActiveShadow }}>All</button>
                  <button style={{ padding: "6px 14px", fontSize: 12, fontWeight: 400, border: "none", borderRadius: 6, cursor: "pointer", ...sans, background: "transparent", color: t.toggleInactiveText }}>John</button>
                  <button style={{ padding: "6px 14px", fontSize: 12, fontWeight: 400, border: "none", borderRadius: 6, cursor: "pointer", ...sans, background: "transparent", color: t.toggleInactiveText }}>Jane</button>
                </div>
                <span style={{ fontSize: 10, color: t.textMuted }}>Default state</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ display: "flex", background: t.toggleContainerBg, borderRadius: 8, padding: 2 }}>
                  <button style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 6, cursor: "pointer", ...sans, background: t.toggleActiveBg, color: t.toggleActiveText, boxShadow: t.toggleActiveShadow }}>All</button>
                  <button style={{ padding: "6px 14px", fontSize: 12, fontWeight: 400, border: "none", borderRadius: 6, cursor: "pointer", ...sans, background: t.bgHover, color: t.toggleInactiveText }}>John</button>
                  <button style={{ padding: "6px 14px", fontSize: 12, fontWeight: 400, border: "none", borderRadius: 6, cursor: "pointer", ...sans, background: "transparent", color: t.toggleInactiveText }}>Jane</button>
                </div>
                <span style={{ fontSize: 10, color: t.textMuted }}>Hovering "John"</span>
              </div>
            </div>
          </div>

          {/* Focus States */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Focus States — Blue ring for keyboard accessibility</div>
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <input placeholder="Normal" style={{ padding: "8px 12px", border: `1px solid ${t.bgInputBorder}`, borderRadius: 8, fontSize: 13, background: t.bgInput, color: t.textPrimary, width: 160, outline: "none", ...sans }} />
                <span style={{ fontSize: 10, color: t.textMuted }}>Default</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <input placeholder="Focused" style={{ padding: "8px 12px", border: `1px solid ${t.accent}`, borderRadius: 8, fontSize: 13, background: t.bgInput, color: t.textPrimary, width: 160, outline: "none", ...sans, boxShadow: `0 0 0 3px ${t.accent}33` }} />
                <span style={{ fontSize: 10, color: t.textMuted }}>Focused (blue ring)</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <input placeholder="Error" style={{ padding: "8px 12px", border: `1px solid ${t.negative}`, borderRadius: 8, fontSize: 13, background: t.bgInput, color: t.textPrimary, width: 160, outline: "none", ...sans, boxShadow: `0 0 0 3px ${t.negative}33` }} />
                <span style={{ fontSize: 10, color: t.textMuted }}>Error state (red ring)</span>
              </div>
            </div>
          </div>

          {/* Clickable Badges */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Clickable Badges — Brightness bump on hover</div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <Badge bg={t.badgeDuplicateExactBg} text={t.badgeDuplicateExactText} label="Likely Duplicate" />
                <span style={{ fontSize: 10, color: t.textMuted }}>Default</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: t.badgeDuplicateExactBg, color: t.badgeDuplicateExactText, ...sans, fontWeight: 500, filter: "brightness(1.1)", cursor: "pointer" }}>Likely Duplicate</span>
                <span style={{ fontSize: 10, color: t.textMuted }}>Hover</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <Badge bg={t.badgeTransferBg} text={t.badgeTransferText} label="Likely Transfer" />
                <span style={{ fontSize: 10, color: t.textMuted }}>Default</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: t.badgeTransferBg, color: t.badgeTransferText, ...sans, fontWeight: 500, filter: "brightness(1.1)", cursor: "pointer" }}>Likely Transfer</span>
                <span style={{ fontSize: 10, color: t.textMuted }}>Hover</span>
              </div>
            </div>
          </div>

          {/* Clickable Card */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Clickable Card — Border + shadow shift on hover</div>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
                <div style={{ background: t.bgCard, border: `1px solid ${t.bgCardBorder}`, borderRadius: 12, padding: "16px 20px", boxShadow: t.bgCardShadow, width: "100%" }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>SF Connection</div>
                  <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>6 accounts linked</div>
                </div>
                <span style={{ fontSize: 10, color: t.textMuted }}>Default</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
                <div style={{ background: t.bgCard, border: `1px solid ${dark ? "#334155" : "#cbd5e1"}`, borderRadius: 12, padding: "16px 20px", boxShadow: dark ? "0 2px 6px rgba(0,0,0,0.3)" : "0 2px 6px rgba(0,0,0,0.08)", width: "100%", cursor: "pointer" }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>SF Connection</div>
                  <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>6 accounts linked</div>
                </div>
                <span style={{ fontSize: 10, color: t.textMuted }}>Hover</span>
              </div>
            </div>
          </div>
        </Section>

        {/* Net Worth Hero */}
        <Section title="Net Worth Hero Card" t={t}>

        {/* ──────────── Two-Factor Authentication ──────────── */}
        </Section>
        <Section title="TOTP Code Input" t={t}>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}>
            {[3, 1, 4, 1, 5, 9].map((d, i) => (
              <div key={i} style={{
                width: 44, height: 52, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, ...mono, fontWeight: 600,
                border: `1px solid ${i === 3 ? t.accent : t.bgInputBorder}`,
                borderRadius: 8, background: t.bgInput, color: t.textPrimary,
                boxShadow: i === 3 ? "0 0 0 3px rgba(59,130,246,0.2)" : "none",
              }}>{d}</div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: t.textMuted, textAlign: "center" }}>
            44×52px · 8px gap · Focus: accent border + 3px blue glow · Caret hidden
          </p>
        </Section>
          <div style={{
            background: dark ? "linear-gradient(135deg, #060a13 0%, #0f172a 100%)" : "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            borderRadius: 12, padding: "24px 32px", textAlign: "center", color: "#fff", width: "100%",
          }}>
            <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Net Worth</p>
            <p style={{ fontSize: 32, fontWeight: 800, ...mono, margin: "4px 0", letterSpacing: "-0.02em" }}>$194,976.39</p>
            <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 8 }}>
              {[
                { l: "Liquid", c: "#38bdf8", v: "$56.6k" },
                { l: "Invested", c: "#a78bfa", v: "$124.3k" },
                { l: "Physical", c: "#fbbf24", v: "$22.8k" },
                { l: "Liabilities", c: "#f87171", v: "($8.7k)" },
              ].map(x => (
                <span key={x.l} style={{ fontSize: 11 }}>
                  <span style={{ color: x.c }}>{x.l}</span>{" "}
                  <span style={{ ...mono, fontWeight: 700, fontSize: 14 }}>{x.v}</span>
                </span>
              ))}
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}
