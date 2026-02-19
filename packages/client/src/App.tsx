import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import type { ReactNode } from 'react';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-text-secondary text-sm">Loading...</div>
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

  return (
    <div className="flex h-screen bg-surface font-sans">
      <div className="w-[220px] bg-sidebar flex flex-col shrink-0">
        <div className="p-5 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-accent to-positive flex items-center justify-center">
              <span className="text-white text-sm font-extrabold font-mono">$</span>
            </div>
            <span className="text-gray-100 text-base font-bold tracking-tight">Ledger</span>
          </div>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          <span className="text-text-muted text-xs px-3 py-2">Dashboard coming soon...</span>
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[#94a3b8] text-xs">{user?.displayName}</span>
            <button
              onClick={logout}
              className="text-[#94a3b8] text-xs hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-white/10 text-[11px] text-[#475569]">
          v1.0 · Local
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-7 px-9">
        <h1 className="text-[22px] font-bold text-text-primary">Welcome to Ledger</h1>
        <p className="text-text-secondary text-sm mt-1">
          Hello, {user?.displayName}! Your personal finance tracker is ready.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
