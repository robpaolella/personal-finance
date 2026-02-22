interface DuplicateBadgeProps {
  status: 'exact' | 'possible' | 'none';
  onClick?: () => void;
}

export default function DuplicateBadge({ status, onClick }: DuplicateBadgeProps) {
  if (status === 'none') return null;

  const isExact = status === 'exact';

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border-none badge-clickable ${
        isExact
          ? 'bg-[var(--badge-duplicate-exact-bg)] text-[var(--badge-duplicate-exact-text)]'
          : 'bg-[var(--badge-duplicate-possible-bg)] text-[var(--badge-duplicate-possible-text)]'
      }`}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      {isExact ? 'Likely Duplicate' : 'Possible Duplicate'}
    </button>
  );
}
