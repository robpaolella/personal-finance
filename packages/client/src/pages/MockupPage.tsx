import { useState } from 'react';

export default function MockupPage() {
  const [dark, setDark] = useState(
    document.documentElement.classList.contains('dark')
  );

  const toggleTheme = () => {
    setDark(!dark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] p-8">
      <button
        onClick={toggleTheme}
        className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full flex items-center justify-center text-lg"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--bg-card-border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          color: dark ? '#fbbf24' : '#64748b',
        }}
      >
        {dark ? '☀' : '☾'}
      </button>

      <div className="max-w-5xl mx-auto">
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Mockup viewer — development only. Edit MockupPage.tsx to preview designs.
        </p>
      </div>
    </div>
  );
}
