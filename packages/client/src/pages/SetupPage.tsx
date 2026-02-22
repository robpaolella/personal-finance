import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import InlineNotification from '../components/InlineNotification';

export default function SetupPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!/^[a-z0-9]{3,20}$/.test(username)) {
      setError('Username must be 3-20 lowercase letters and numbers');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{ data: { token: string } }>('/setup/create-admin', {
        method: 'POST',
        body: JSON.stringify({ username, password, displayName }),
        skipAuth: true,
      });

      localStorage.setItem('token', res.data.token);
      navigate('/', { replace: true });
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
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
        <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] rounded-xl p-8 shadow-lg">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">Welcome to Ledger</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Create your administrator account to get started.
          </p>

          {error && <InlineNotification type="error" message={error} className="mb-4" />}

          <div className="mb-4">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--bg-input-border)] rounded-lg text-sm bg-[var(--bg-input)] text-[var(--text-primary)] outline-none"
              placeholder="Your name"
              required
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="w-full px-3 py-2.5 border border-[var(--bg-input-border)] rounded-lg text-sm bg-[var(--bg-input)] text-[var(--text-primary)] outline-none"
              placeholder="Choose a username"
              required
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">Lowercase letters and numbers only</p>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--bg-input-border)] rounded-lg text-sm bg-[var(--bg-input)] text-[var(--text-primary)] outline-none"
              placeholder="Create a password"
              required
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">Minimum 8 characters</p>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--bg-input-border)] rounded-lg text-sm bg-[var(--bg-input)] text-[var(--text-primary)] outline-none"
              placeholder="Confirm your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] rounded-lg text-sm font-semibold btn-primary transition-colors disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating account...
              </span>
            ) : (
              'Create Account & Get Started'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
