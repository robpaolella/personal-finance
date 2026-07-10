import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import TwoFASetupPage from './pages/TwoFASetupPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import BudgetPage from './pages/BudgetPage';
import ReportsPage from './pages/ReportsPage';
import NetWorthPage from './pages/NetWorthPage';
import ImportPage from './pages/ImportPage';
import SettingsPage from './pages/SettingsPage';
import MockupPage from './pages/MockupPage';
import QAPage from './pages/QAPage';
import RecurringPage from './pages/RecurringPage';
import InvestmentsPage from './pages/InvestmentsPage';
import MobileHeader from './components/MobileHeader';
import BottomTabBar from './components/BottomTabBar';
import LedgerLogo from './components/LedgerLogo';
import { NAV_ITEMS, UTILITY_ITEMS } from './lib/navItems';
import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiFetch } from './lib/api';
import { useIsMobile } from './hooks/useIsMobile';

function getInitialTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem('ledger-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('ledger-theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => t === 'light' ? 'dark' : 'light');
  return { theme, toggle };
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
        <div className="text-[var(--text-secondary)] text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to forced 2FA setup if required (but not if already on that page)
  if (user.twofaSetupRequired && location.pathname !== '/setup-2fa') {
    return <Navigate to="/setup-2fa" replace />;
  }

  return <>{children}</>;
}

function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();
  const { addToast } = useToast();
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('ledger-sidebar-collapsed') === 'true');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('ledger-sidebar-collapsed', String(next));
      return next;
    });
  };

  const showFab = isMobile && location.pathname === '/transactions';

  const handlePermissionDenied = useCallback((e: Event) => {
    const msg = (e as CustomEvent).detail || 'Permission denied';
    addToast(msg, 'error');
  }, [addToast]);

  useEffect(() => {
    window.addEventListener('permission-denied', handlePermissionDenied);
    return () => window.removeEventListener('permission-denied', handlePermissionDenied);
  }, [handlePermissionDenied]);

  return (
    <div className="flex app-shell-height bg-bg font-sans">
      {/* Sidebar */}
      <div
        className="bg-surface border-r border-line flex flex-col shrink-0 desktop-only overflow-hidden"
        style={{ width: sidebarCollapsed ? 64 : 236, transition: 'width 200ms ease' }}
      >
        {/* Logo / Expand toggle */}
        <div
          className="flex items-center border-b border-line"
          style={{ padding: sidebarCollapsed ? '20px 0 16px' : '20px 20px 16px', justifyContent: sidebarCollapsed ? 'center' : 'space-between' }}
        >
          {sidebarCollapsed ? (
            <div
              onClick={toggleSidebar}
              className="text-content-3 hover:text-content cursor-pointer flex items-center justify-center transition-colors"
              title="Expand sidebar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" /><line x1="20" y1="4" x2="20" y2="20" />
              </svg>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <LedgerLogo size={28} className="shrink-0" />
                <span className="text-content text-base font-extrabold tracking-[-0.02em] whitespace-nowrap">Ledger</span>
              </div>
              <button
                onClick={toggleSidebar}
                className="bg-transparent border-none text-content-3 hover:text-content hover:bg-surface-2 cursor-pointer p-1 rounded flex items-center justify-center transition-colors"
                title="Collapse sidebar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" /><line x1="4" y1="4" x2="4" y2="20" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 flex flex-col gap-0.5" style={{ padding: sidebarCollapsed ? '12px 8px' : '12px 10px' }}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={sidebarCollapsed ? item.label : undefined}
                className={`flex items-center gap-2.5 rounded-[11px] text-sm no-underline transition-colors ${
                  isActive
                    ? 'bg-primary/15 text-primary font-semibold'
                    : 'text-content-2 font-medium hover:bg-surface-2 hover:text-content'
                }`}
                style={{ padding: sidebarCollapsed ? '9px 0' : '9px 12px', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
              >
                <span className="shrink-0 flex">{item.icon}</span>
                {!sidebarCollapsed && item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer: account menu trigger */}
        <div className="border-t border-line p-3">
          <button
            onClick={() => setAccountMenuOpen((o) => !o)}
            className="flex items-center w-full rounded-[11px] cursor-pointer hover:bg-surface-2 transition-colors"
            style={sidebarCollapsed ? { justifyContent: 'center', padding: 8 } : { justifyContent: 'flex-start', gap: 10, padding: '8px 10px' }}
            title={sidebarCollapsed ? (user?.displayName ?? 'Account') : undefined}
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-[13px]"
              style={{ background: 'color-mix(in srgb, var(--primary) 16%, transparent)', color: 'var(--primary)' }}
            >
              {user?.displayName?.charAt(0).toUpperCase() ?? '?'}
            </div>
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 min-w-0 text-left text-sm font-semibold text-content leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                  {user?.displayName}
                </span>
                <svg className="shrink-0 text-content-3" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Account menu popover — fixed so it escapes the sidebar's overflow */}
      {accountMenuOpen && (
        <div className="desktop-only">
          <div className="fixed inset-0 z-40" onClick={() => setAccountMenuOpen(false)} />
          <div
            className="fixed z-50 bg-elevated border border-line rounded-[12px] shadow-md p-1.5"
            style={{ left: 12, bottom: 68, width: 216 }}
            role="menu"
          >
            {UTILITY_ITEMS.map((item) => (
              <button
                key={item.to}
                onClick={() => { navigate(item.to); setAccountMenuOpen(false); }}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm font-medium text-content-2 hover:bg-surface-2 hover:text-content transition-colors"
                role="menuitem"
              >
                <span className="shrink-0 text-content-3 flex">{item.icon}</span>{item.label}
              </button>
            ))}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm font-medium text-content-2 hover:bg-surface-2 hover:text-content transition-colors"
              role="menuitem"
            >
              <span className="shrink-0 text-content-3 flex">
                {theme === 'light' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                )}
              </span>
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </button>
            <div className="h-px bg-line my-1" />
            <button
              onClick={() => { setAccountMenuOpen(false); logout(); }}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm font-semibold text-negative hover:bg-negative/10 transition-colors"
              role="menuitem"
            >
              <span className="shrink-0 flex">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </span>
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        <MobileHeader />
        <div className="flex-1 py-7 px-9 mobile-main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/accounts" element={<NetWorthPage />} />
            <Route path="/net-worth" element={<Navigate to="/accounts" replace />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/recurring" element={<RecurringPage />} />
            <Route path="/investments" element={<InvestmentsPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
      {showFab && (
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-add-transaction'));
          }}
          className="mobile-only fixed z-10 flex items-center gap-1 cursor-pointer border-none"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
            background: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)',
            padding: '10px 24px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'Hanken Grotesk', sans-serif",
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Transaction
        </button>
      )}
      <BottomTabBar />
    </div>
  );
}

export default function App() {
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);

  useEffect(() => {
    apiFetch<{ data: { setupRequired: boolean } }>('/setup/status', { skipAuth: true })
      .then(res => setSetupRequired(res.data.setupRequired))
      .catch(() => setSetupRequired(false));
  }, []);

  if (setupRequired === null) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
        <div className="text-[var(--text-secondary)] text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {setupRequired ? (
            <Route path="*" element={<SetupPage />} />
          ) : (
            <>
              {import.meta.env.DEV && <Route path="/mockup" element={<MockupPage />} />}
              {import.meta.env.DEV && <Route path="/qa" element={<QAPage />} />}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/setup-2fa" element={<ProtectedRoute><TwoFASetupPage /></ProtectedRoute>} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              />
            </>
          )}
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
