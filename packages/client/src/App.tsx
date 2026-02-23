import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import BudgetPage from './pages/BudgetPage';
import ReportsPage from './pages/ReportsPage';
import NetWorthPage from './pages/NetWorthPage';
import ImportPage from './pages/ImportPage';
import SettingsPage from './pages/SettingsPage';
import MockupPage from './pages/MockupPage';
import QAPage from './pages/QAPage';
import MobileHeader from './components/MobileHeader';
import BottomTabBar from './components/BottomTabBar';
import { NAV_ITEMS } from './lib/navItems';
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

  return <>{children}</>;
}

function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { theme, toggle: toggleTheme } = useTheme();
  const { addToast } = useToast();
  const isMobile = useIsMobile();

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
    <div className="flex h-screen bg-[var(--bg-main)] font-sans">
      {/* Sidebar */}
      <div className="w-[220px] bg-[var(--bg-sidebar)] flex flex-col shrink-0 desktop-only">
        {/* Logo */}
        <div className="p-5 pb-4 border-b border-[var(--bg-card-border)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#3b82f6] to-[#10b981] flex items-center justify-center">
              <span className="text-white text-sm font-extrabold font-mono">$</span>
            </div>
            <span className="text-[var(--sidebar-text)] text-base font-bold tracking-[-0.02em]">Ledger</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2.5 flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2.5 py-[9px] px-3 rounded-lg text-[13px] no-underline transition-colors ${
                  isActive
                    ? 'bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] font-semibold'
                    : 'text-[var(--nav-inactive-text)] font-normal hover:bg-white/5'
                }`}
              >
                {item.icon}
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--bg-card-border)]">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 text-[11px] text-[var(--nav-inactive-text)] hover:text-[var(--sidebar-text)] bg-transparent border-none cursor-pointer transition-colors"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              )}
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
              v1.0 · {user?.displayName}
              {user?.role && (
                <span
                  className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: `var(--badge-${user.role === 'owner' ? 'owner' : user.role === 'admin' ? 'admin' : 'member'}-bg)`,
                    color: `var(--badge-${user.role === 'owner' ? 'owner' : user.role === 'admin' ? 'admin' : 'member'}-text)`,
                  }}
                >
                  {user.role}
                </span>
              )}
            </span>
            <button
              onClick={logout}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--nav-inactive-text)] transition-colors bg-transparent border-none cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        <MobileHeader />
        <div className="flex-1 py-7 px-9 mobile-main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/net-worth" element={<NetWorthPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
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
            fontFamily: "'DM Sans', sans-serif",
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
