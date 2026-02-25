import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import InlineNotification from '../components/InlineNotification';
import TotpCodeInput from '../components/TotpCodeInput';

interface SetupData {
  qrCodeUrl: string;
  secret: string;
  otpauthUri: string;
}

export default function TwoFASetupPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'start' | 'scan' | 'verify' | 'backup'>('start');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (verifyCode.length === 6 && step === 'scan' && !loading) {
      handleVerify({ preventDefault: () => {} } as FormEvent);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifyCode]);

  const handleStartSetup = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ data: SetupData }>('/auth/2fa/setup', { method: 'POST' });
      setSetupData(res.data);
      setStep('scan');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!setupData) return;
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ data: { backupCodes: string[] } }>('/auth/2fa/confirm', {
        method: 'POST',
        body: JSON.stringify({ token: verifyCode, secret: setupData.secret }),
      });
      setBackupCodes(res.data.backupCodes);
      setStep('backup');
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBackupCodes = async () => {
    const text = backupCodes.join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadBackupCodes = () => {
    const text = `Ledger 2FA Backup Codes\nGenerated: ${new Date().toLocaleDateString()}\nUser: ${user?.username}\n\n${backupCodes.join('\n')}\n\nEach code can only be used once.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ledger-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDone = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-sidebar)] flex items-center justify-center font-sans">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#10b981] flex items-center justify-center">
            <span className="text-white text-xl font-extrabold font-mono">$</span>
          </div>
          <span className="text-gray-100 text-2xl font-bold tracking-tight">Ledger</span>
        </div>

        <div className="bg-[var(--bg-card)] rounded-xl p-8 shadow-lg">
          {step === 'start' && (
            <>
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Set Up Two-Factor Authentication</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-2">
                Your administrator requires two-factor authentication for your account.
              </p>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                You'll need an authenticator app like Google Authenticator, Authy, or 1Password.
              </p>

              {error && <InlineNotification type="error" message={error} className="mb-4" />}

              <button
                onClick={handleStartSetup}
                disabled={loading}
                className="w-full py-2.5 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] rounded-lg text-sm font-semibold btn-primary transition-colors disabled:opacity-60"
              >
                {loading ? 'Setting up...' : 'Get Started'}
              </button>
            </>
          )}

          {step === 'scan' && setupData && (
            <>
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Scan QR Code</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                Scan this QR code with your authenticator app, then enter the 6-digit code to verify.
              </p>

              {error && <InlineNotification type="error" message={error} className="mb-4" />}

              {/* QR Code */}
              <div className="flex justify-center mb-4">
                <div className="bg-white p-3 rounded-lg">
                  <img src={setupData.qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              </div>

              {/* Manual entry */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-xs text-[var(--color-accent)] hover:underline bg-transparent border-none cursor-pointer mb-2"
                >
                  {showSecret ? 'Hide manual entry key' : "Can't scan? Enter key manually"}
                </button>
                {showSecret && (
                  <div className="bg-[var(--bg-input)] border border-[var(--bg-input-border)] rounded-lg p-3 mt-1">
                    <p className="text-xs text-[var(--text-muted)] mb-1">Secret key:</p>
                    <code className="text-sm font-mono text-[var(--text-primary)] break-all select-all">
                      {setupData.secret}
                    </code>
                  </div>
                )}
              </div>

              <form onSubmit={handleVerify}>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-3 uppercase tracking-wide">
                  Verification Code
                </label>
                <TotpCodeInput
                  value={verifyCode}
                  onChange={setVerifyCode}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || verifyCode.length !== 6}
                  className="w-full mt-4 py-2.5 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] rounded-lg text-sm font-semibold btn-primary transition-colors disabled:opacity-60"
                >
                  {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
                </button>
              </form>
            </>
          )}

          {step === 'backup' && (
            <>
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                <span className="text-[var(--color-positive)] mr-2">✓</span>
                2FA Enabled
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mb-2">
                Save these backup codes in a safe place. Each code can only be used once.
              </p>
              <p className="text-xs text-[var(--color-negative)] font-medium mb-4">
                ⚠ These codes won't be shown again.
              </p>

              <div className="bg-[var(--bg-input)] border border-[var(--bg-input-border)] rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, i) => (
                    <code key={i} className="text-sm font-mono text-[var(--text-primary)] text-center py-1">
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={handleCopyBackupCodes}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold border border-[var(--bg-card-border)] bg-[var(--btn-secondary-bg)] text-[var(--text-primary)] cursor-pointer transition-colors hover:brightness-95"
                >
                  {copied ? '✓ Copied!' : 'Copy All'}
                </button>
                <button
                  onClick={handleDownloadBackupCodes}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold border border-[var(--bg-card-border)] bg-[var(--btn-secondary-bg)] text-[var(--text-primary)] cursor-pointer transition-colors hover:brightness-95"
                >
                  Download .txt
                </button>
              </div>

              <button
                onClick={handleDone}
                className="w-full py-2.5 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] rounded-lg text-sm font-semibold btn-primary transition-colors"
              >
                Continue to Ledger
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
