interface SortableHeaderProps {
  label: string;
  sortKey: string;
  activeSortKey: string;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
  align?: 'left' | 'right' | 'center';
}

export default function SortableHeader({ label, sortKey, activeSortKey, sortDir, onSort, align = 'left' }: SortableHeaderProps) {
  const isActive = sortKey === activeSortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] cursor-pointer select-none hover:text-[var(--text-primary)] transition-colors text-${align}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && (
          <span className="text-[var(--text-primary)]">{sortDir === 'asc' ? '▲' : '▼'}</span>
        )}
      </span>
    </th>
  );
}
