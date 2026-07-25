import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import { VendorAvatar } from './primitives';

export interface Institution {
  id: number;
  name: string;
  domain: string | null;
  logo_url: string | null;
  color: string | null;
  is_system: number;
  account_count?: number;
}

// Module-level cache so every picker instance shares one fetch of the ~200 rows.
let _cache: Institution[] | null = null;
export async function loadInstitutions(force = false): Promise<Institution[]> {
  if (_cache && !force) return _cache;
  const res = await apiFetch<{ data: Institution[] }>('/financial-institutions');
  _cache = res.data;
  return _cache;
}
export function invalidateInstitutions(): void { _cache = null; }

export default function InstitutionPicker({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (id: number | null, inst?: Institution | null) => void;
  disabled?: boolean;
}) {
  const [list, setList] = useState<Institution[]>(_cache || []);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [busy, setBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { loadInstitutions().then(setList).catch(() => {}); }, []);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setAdding(false); }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const selected = list.find((i) => i.id === value) || null;
  const q = search.trim().toLowerCase();
  const filtered = q
    ? list.filter((i) => i.name.toLowerCase().includes(q) || (i.domain || '').toLowerCase().includes(q))
    : list;

  const pick = (inst: Institution | null) => { onChange(inst?.id ?? null, inst); setOpen(false); setSearch(''); };

  const createNew = async () => {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true); setAddError(null);
    try {
      const res = await apiFetch<{ data: Institution }>('/financial-institutions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, domain: newDomain.trim() || null }),
      });
      setList(await loadInstitutions(true));
      setAdding(false); setNewName(''); setNewDomain('');
      pick(res.data);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Could not add institution');
    } finally { setBusy(false); }
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" disabled={disabled} onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2 border border-[var(--table-border)] rounded-lg text-[13px] bg-[var(--bg-input)] outline-none text-left flex items-center justify-between gap-2 cursor-pointer disabled:opacity-60">
        <span className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              <VendorAvatar name={selected.name} src={selected.logo_url || undefined} color={selected.color || 'var(--c-blue)'} size={22} />
              <span className="truncate text-[var(--text-body)]">{selected.name}</span>
            </>
          ) : (
            <span className="text-[var(--text-muted)]">Select institution…</span>
          )}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`text-[var(--text-muted)] transition-transform duration-150 flex-none ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--bg-card-border)] rounded-lg overflow-hidden" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div className="p-2 border-b border-line">
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search institutions…"
              className="w-full px-2.5 py-1.5 rounded-md bg-[var(--bg-input)] border border-line text-[13px] outline-none text-[var(--text-body)]" />
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            <button type="button" onClick={() => pick(null)}
              className="w-full px-3 py-2 text-left text-[13px] hover:bg-surface-2 flex items-center gap-2 text-[var(--text-muted)]">
              None
            </button>
            {filtered.map((i) => (
              <button key={i.id} type="button" onClick={() => pick(i)}
                className={`w-full px-3 py-2 text-left text-[13px] hover:bg-surface-2 flex items-center gap-2 ${i.id === value ? 'bg-surface-2' : ''}`}>
                <VendorAvatar name={i.name} src={i.logo_url || undefined} color={i.color || 'var(--c-blue)'} size={24} />
                <span className="truncate text-[var(--text-body)]">{i.name}</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="px-3 py-3 text-[12px] text-[var(--text-muted)]">No matches</div>}
          </div>
          <div className="border-t border-line p-2">
            {adding ? (
              <div className="flex flex-col gap-2">
                <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Institution name"
                  className="w-full px-2.5 py-1.5 rounded-md bg-[var(--bg-input)] border border-line text-[13px] outline-none text-[var(--text-body)]" />
                <input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="Domain (optional, e.g. chase.com)"
                  className="w-full px-2.5 py-1.5 rounded-md bg-[var(--bg-input)] border border-line text-[13px] outline-none text-[var(--text-body)]" />
                {addError && <span className="text-[11px] text-negative">{addError}</span>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { setAdding(false); setNewName(''); setNewDomain(''); setAddError(null); }} className="text-[12px] font-semibold text-content-2">Cancel</button>
                  <button type="button" disabled={!newName.trim() || busy} onClick={createNew} className="text-[12px] font-bold text-primary disabled:opacity-50">{busy ? 'Adding…' : 'Add'}</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => { setAdding(true); setNewName(search); }} className="w-full text-left text-[12px] font-semibold text-primary px-1 py-1">+ Add institution</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
