// @ts-nocheck
import { useState, useEffect, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';

// Discover all .tsx mockup files in .github/mockups/
const mockupModules = import.meta.glob('../../../../.github/mockups/*.tsx');

function parseMockupEntries(): { name: string; displayName: string; path: string }[] {
  return Object.keys(mockupModules)
    .map((path) => {
      const match = path.match(/\/([^/]+)\.tsx$/);
      if (!match) return null;
      const name = match[1];
      const displayName = name
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return { name, displayName, path };
    })
    .filter(Boolean)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function MockupIndex({ entries }: { entries: { name: string; displayName: string }[] }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-main)' }}>
      <div className="max-w-[820px] mx-auto p-6">
        <h1 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          Mockups
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
          Development-only mockup viewer. Click a mockup to preview it.
        </p>
        {entries.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>
            No mockups found. Add <code>.tsx</code> files to <code>.github/mockups/</code>.
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {entries.map((entry) => (
            <a
              key={entry.name}
              href={`/mockup?mockup=${entry.name}`}
              style={{ textDecoration: 'none' }}
            >
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--bg-card-border)',
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 150ms ease, box-shadow 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-accent)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(59,130,246,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--bg-card-border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 15 }}>
                    {entry.displayName}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                    .github/mockups/{entry.name}.tsx
                  </div>
                </div>
                <span style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: 14 }}>
                  View →
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function MockupViewer({ name, entries }: { name: string; entries: { name: string; path: string }[] }) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const entry = entries.find((e) => e.name === name);
    if (!entry) {
      setError(`Mockup "${name}" not found.`);
      return;
    }
    const loader = mockupModules[entry.path];
    if (!loader) {
      setError(`Could not load mockup "${name}".`);
      return;
    }
    loader()
      .then((mod: any) => {
        const comp = mod.default || mod;
        if (typeof comp === 'function') {
          setComponent(() => comp);
        } else {
          setError(`Mockup "${name}" does not export a component.`);
        }
      })
      .catch(() => setError(`Failed to load mockup "${name}".`));
  }, [name, entries]);

  if (error) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-main)', padding: 48 }}>
        <div className="max-w-[820px] mx-auto">
          <p style={{ color: 'var(--color-negative)', fontWeight: 600 }}>{error}</p>
          <a
            href="/mockup"
            style={{ color: 'var(--color-accent)', fontSize: 13, marginTop: 8, display: 'inline-block' }}
          >
            ← Back to Mockups
          </a>
        </div>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-main)', padding: 48 }}>
        <div className="max-w-[820px] mx-auto">
          <p style={{ color: 'var(--text-muted)' }}>Loading mockup...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--bg-card)', borderBottom: '1px solid var(--bg-card-border)',
        padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <a
          href="/mockup"
          style={{ color: 'var(--color-accent)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
        >
          ← Mockups
        </a>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>|</span>
        <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>
          {name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </span>
      </div>
      <div style={{ paddingTop: 44 }}>
        <Component />
      </div>
    </div>
  );
}

export default function MockupPage() {
  const [searchParams] = useSearchParams();
  const name = searchParams.get('mockup');
  const entries = parseMockupEntries();

  if (name) {
    return <MockupViewer name={name} entries={entries} />;
  }

  return <MockupIndex entries={entries} />;
}
