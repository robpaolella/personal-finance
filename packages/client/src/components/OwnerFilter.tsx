interface OwnerFilterProps {
  value: string;
  onChange: (owner: string) => void;
  users: { id: number; displayName: string }[];
}

const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const UsersIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default function OwnerFilter({ value, onChange, users }: OwnerFilterProps) {
  return (
    <div className="flex bg-[var(--filter-container-bg)] rounded-lg p-0.5">
      <button
        onClick={() => onChange('All')}
        className={`flex items-center gap-[5px] px-3.5 py-1.5 text-xs rounded-md border-none cursor-pointer transition-all ${
          value === 'All'
            ? 'bg-[var(--filter-active-pill)] text-[var(--text-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
            : 'bg-transparent text-[var(--text-secondary)]'
        }`}
      >
        <UsersIcon />
        All
      </button>
      {users.map((u) => (
        <button
          key={u.id}
          onClick={() => onChange(u.displayName)}
          className={`flex items-center gap-[5px] px-3.5 py-1.5 text-xs rounded-md border-none cursor-pointer transition-all ${
            value === u.displayName
              ? 'bg-[var(--filter-active-pill)] text-[var(--text-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
              : 'bg-transparent text-[var(--text-secondary)]'
          }`}
        >
          <UserIcon />
          {u.displayName}
        </button>
      ))}
    </div>
  );
}
