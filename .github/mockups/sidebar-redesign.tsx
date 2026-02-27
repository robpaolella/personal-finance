import { useState } from 'react';

/* ───── nav icons (matching navItems.tsx) ───── */
const icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
  ),
  transactions: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
  ),
  budget: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
  ),
  reports: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  ),
  networth: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>
  ),
  import: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  ),
};

const NAV_ITEMS = [
  { label: 'Dashboard', icon: icons.dashboard },
  { label: 'Transactions', icon: icons.transactions },
  { label: 'Budget', icon: icons.budget },
  { label: 'Reports', icon: icons.reports },
  { label: 'Net Worth', icon: icons.networth },
  { label: 'Import', icon: icons.import },
  { label: 'Settings', icon: icons.settings },
];

/* ───── collapse/expand icons (arrow with line) ───── */
const CollapseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
    <line x1="4" y1="4" x2="4" y2="20" />
  </svg>
);
const ExpandIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
    <line x1="20" y1="4" x2="20" y2="20" />
  </svg>
);

/* ───── theme/moon/sun icons ───── */
const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

/* ───── sign-out icon ───── */
const SignOutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export default function SidebarRedesignMockup() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [collapsed, setCollapsed] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('ledger-theme', next ? 'dark' : 'light');
  };

  const sidebarBg = dark ? '#060a13' : '#0f172a';
  const dividerColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)';
  const sidebarText = '#f1f5f9';
  const navInactive = '#94a3b8';
  const navActiveBg = dark ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.15)';
  const navActiveText = '#93c5fd';
  const hoverBg = 'rgba(255,255,255,0.05)';
  const cardBg = dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.07)';
  const cardBorder = dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)';
  const mainBg = dark ? '#0b0f1a' : '#f4f6f9';

  const sidebarWidth = collapsed ? 64 : 220;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'DM Sans', sans-serif", background: mainBg }}>
      {/* ───── Sidebar ───── */}
      <div
        style={{
          width: sidebarWidth,
          background: sidebarBg,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          transition: 'width 200ms ease',
          overflow: 'hidden',
        }}
      >
        {/* Logo / Expand toggle */}
        <div
          style={{
            padding: collapsed ? '20px 0 16px' : '20px 20px 16px',
            borderBottom: `1px solid ${dividerColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
          }}
        >
          {collapsed ? (
            <div
              onClick={() => setCollapsed(false)}
              style={{
                color: navInactive,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 150ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = sidebarText; }}
              onMouseLeave={e => { e.currentTarget.style.color = navInactive; }}
              title="Expand sidebar"
            >
              <ExpandIcon />
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: 'linear-gradient(135deg, #3b82f6, #10b981)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ color: '#fff', fontSize: 14, fontWeight: 800, fontFamily: "'DM Mono', monospace" }}>$</span>
                </div>
                <span style={{ color: sidebarText, fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                  Ledger
                </span>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: navInactive,
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 150ms ease, background 150ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = sidebarText; e.currentTarget.style.background = hoverBg; }}
                onMouseLeave={e => { e.currentTarget.style.color = navInactive; e.currentTarget.style.background = 'transparent'; }}
                title="Collapse sidebar"
              >
                <CollapseIcon />
              </button>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: collapsed ? '12px 8px' : '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map((item, idx) => {
            const isActive = idx === activeIdx;
            return (
              <button
                key={item.label}
                onClick={() => setActiveIdx(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: collapsed ? '9px 0' : '9px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? navActiveText : navInactive,
                  background: isActive ? navActiveBg : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'background 150ms ease, color 150ms ease',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  width: '100%',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = hoverBg; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                title={collapsed ? item.label : undefined}
              >
                <span style={{ flexShrink: 0, display: 'flex' }}>{item.icon}</span>
                {!collapsed && item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: collapsed ? '8px' : '12px', borderTop: `1px solid ${dividerColor}` }}>
          {/* Theme toggle */}
          {collapsed ? (
            <div
              onClick={toggleTheme}
              style={{
                display: 'flex',
                justifyContent: 'center',
                color: navInactive,
                cursor: 'pointer',
                marginBottom: 14,
                transition: 'color 150ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = sidebarText; }}
              onMouseLeave={e => { e.currentTarget.style.color = navInactive; }}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </div>
          ) : (
            <button
              onClick={toggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                justifyContent: 'flex-start',
                width: '100%',
                padding: '8px 10px',
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                borderRadius: 8,
                cursor: 'pointer',
                color: navInactive,
                fontSize: 12,
                fontWeight: 500,
                transition: 'background 150ms ease, color 150ms ease',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                marginBottom: 8,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = sidebarText; }}
              onMouseLeave={e => { e.currentTarget.style.background = cardBg; e.currentTarget.style.color = navInactive; }}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span style={{ display: 'flex', flexShrink: 0 }}>{dark ? <SunIcon /> : <MoonIcon />}</span>
              {dark ? 'Light mode' : 'Dark mode'}
            </button>
          )}

          {/* User card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: collapsed ? 0 : 10,
              padding: collapsed ? 0 : '8px 10px',
              background: collapsed ? 'transparent' : cardBg,
              border: collapsed ? 'none' : `1px solid ${cardBorder}`,
              borderRadius: 8,
              overflow: 'hidden',
              marginBottom: collapsed ? 6 : 8,
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#1e3a5f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 12,
                color: '#60a5fa',
                flexShrink: 0,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              R
            </div>
            {!collapsed && (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: sidebarText, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Robert
                  </div>
                </div>
                {/* Sign out icon pinned right */}
                <div
                  onClick={() => {}}
                  style={{
                    color: navInactive,
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 150ms ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = sidebarText; }}
                  onMouseLeave={e => { e.currentTarget.style.color = navInactive; }}
                  title="Sign out"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </div>
              </>
            )}
          </div>

          {/* Version */}
          <div
            style={{
              textAlign: 'center',
              fontSize: 10,
              color: dark ? 'rgba(148,163,184,0.4)' : 'rgba(148,163,184,0.5)',
              fontFamily: "'DM Mono', monospace",
              paddingTop: 2,
            }}
          >
            {collapsed ? 'v1.0' : 'v1.0.0'}
          </div>
        </div>
      </div>

      {/* ───── Fake main content ───── */}
      <div style={{ flex: 1, padding: '28px 36px', overflow: 'auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: dark ? '#f1f5f9' : '#0f172a', marginBottom: 16 }}>
          {NAV_ITEMS[activeIdx].label}
        </h1>

        {/* Controls strip */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: `1px solid ${dark ? '#1e293b' : '#e8ecf1'}`,
              background: dark ? '#141926' : '#fff',
              color: dark ? '#f1f5f9' : '#0f172a',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {collapsed ? '↔ Expand Sidebar' : '↔ Collapse Sidebar'}
          </button>
          <button
            onClick={toggleTheme}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: `1px solid ${dark ? '#1e293b' : '#e8ecf1'}`,
              background: dark ? '#141926' : '#fff',
              color: dark ? '#f1f5f9' : '#0f172a',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {dark ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>

        {/* Placeholder cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              style={{
                background: dark ? '#141926' : '#fff',
                border: `1px solid ${dark ? '#1e293b' : '#e8ecf1'}`,
                borderRadius: 12,
                padding: 20,
                height: 120,
              }}
            >
              <div style={{ width: '60%', height: 12, background: dark ? '#1e293b' : '#e8ecf1', borderRadius: 6, marginBottom: 12 }} />
              <div style={{ width: '40%', height: 24, background: dark ? '#1e293b' : '#e8ecf1', borderRadius: 6 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
