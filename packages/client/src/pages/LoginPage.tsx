import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Already logged in — redirect to dashboard
  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-sidebar)] flex items-center justify-center font-sans">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#10b981] flex items-center justify-center">
            <span className="text-white text-xl font-extrabold font-mono">$</span>
          </div>
          <span className="text-gray-100 text-2xl font-bold tracking-tight">Ledger</span>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--bg-card)] rounded-xl p-8 shadow-lg"
        >
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">Sign in</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">Enter your credentials to continue</p>

          {error && (
            <div className="bg-[var(--bg-inline-error)] border border-[var(--bg-inline-error-border)] text-[var(--text-inline-error)] text-sm rounded-lg px-4 py-2.5 mb-4">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--bg-input-border)] rounded-lg text-sm bg-[var(--bg-input)] text-[var(--text-primary)] outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]"
              placeholder="Enter username"
              required
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--bg-input-border)] rounded-lg text-sm bg-[var(--bg-input)] text-[var(--text-primary)] outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]"
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] rounded-lg text-sm font-semibold hover:opacity-90 transition-colors disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
