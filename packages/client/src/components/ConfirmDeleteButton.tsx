import { useState, useEffect, useCallback } from 'react';

interface ConfirmDeleteButtonProps {
  onConfirm: () => void | Promise<void>;
  onFirstClick?: () => void;
  label?: string;
  confirmLabel?: string;
  timeout?: number;
}

export default function ConfirmDeleteButton({
  onConfirm,
  onFirstClick,
  label = 'Delete',
  confirmLabel = 'Confirm Delete?',
  timeout = 3000,
}: ConfirmDeleteButtonProps) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), timeout);
    return () => clearTimeout(t);
  }, [confirming, timeout]);

  const handleClick = useCallback(() => {
    if (!confirming) { setConfirming(true); onFirstClick?.(); return; }
    onConfirm();
    setConfirming(false);
  }, [confirming, onConfirm, onFirstClick]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        className={`px-4 py-2 text-[12px] font-semibold rounded-lg border-none cursor-pointer ${
          confirming ? 'bg-[var(--btn-destructive-bg)] text-[var(--btn-destructive-text)]' : 'bg-[var(--btn-destructive-light-bg)] text-[var(--btn-destructive-light-text)]'
        }`}
      >
        {confirming ? confirmLabel : label}
      </button>
      {confirming && (
        <button
          onClick={() => setConfirming(false)}
          className="text-[12px] text-[var(--text-secondary)] bg-transparent border-none cursor-pointer underline"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
