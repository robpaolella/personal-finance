import { fmt } from '../lib/formatters';

interface TransactionSummary {
  date: string;
  description: string;
  amount: number;
  accountName?: string | null;
  category?: string | null;
  notes?: string | null;
}

interface DuplicateComparisonProps {
  incoming: TransactionSummary;
  existing: TransactionSummary;
  onImportAnyway: () => void;
  onSkip: () => void;
}

function CompareRow({ label, left, right }: { label: string; left: string; right: string }) {
  const differ = left.toLowerCase() !== right.toLowerCase();
  return (
    <tr className="border-b border-[var(--table-row-border)]">
      <td className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-1.5 w-[90px]">
        {label}
      </td>
      <td className={`px-2.5 py-1.5 text-[12px] text-[var(--text-body)] ${differ ? 'bg-[var(--bg-needs-attention)]' : ''}`}>
        {left}
      </td>
      <td className={`px-2.5 py-1.5 text-[12px] text-[var(--text-body)] ${differ ? 'bg-[var(--bg-needs-attention)]' : ''}`}>
        {right}
      </td>
    </tr>
  );
}

export default function DuplicateComparison({ incoming, existing, onImportAnyway, onSkip }: DuplicateComparisonProps) {
  return (
    <div className="bg-[var(--bg-input)] border border-[var(--table-border)] rounded-lg p-3 my-1">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr>
            <th className="w-[90px]" />
            <th className="text-[11px] font-semibold uppercase tracking-[0.04em] px-2.5 py-1 text-left text-[var(--badge-category-text)]">
              Incoming
            </th>
            <th className="text-[11px] font-semibold uppercase tracking-[0.04em] px-2.5 py-1 text-left text-[var(--text-secondary)]">
              Existing
            </th>
          </tr>
        </thead>
        <tbody>
          <CompareRow label="Date" left={incoming.date} right={existing.date} />
          <CompareRow label="Description" left={incoming.description} right={existing.description} />
          <CompareRow
            label="Amount"
            left={`${incoming.amount < 0 ? '+' : ''}${fmt(Math.abs(incoming.amount))}`}
            right={`${existing.amount < 0 ? '+' : ''}${fmt(Math.abs(existing.amount))}`}
          />
          {(incoming.accountName || existing.accountName) && (
            <CompareRow label="Account" left={incoming.accountName || '—'} right={existing.accountName || '—'} />
          )}
          {(incoming.category || existing.category) && (
            <CompareRow label="Category" left={incoming.category || '—'} right={existing.category || '—'} />
          )}
        </tbody>
      </table>
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onSkip}
          className="px-3 py-1.5 text-[11px] font-semibold rounded-md bg-[var(--btn-secondary-bg)] text-[var(--text-secondary)] border-none cursor-pointer">
          Skip
        </button>
        <button onClick={onImportAnyway}
          className="px-3 py-1.5 text-[11px] font-semibold rounded-md bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-none cursor-pointer">
          Import Anyway
        </button>
      </div>
    </div>
  );
}
