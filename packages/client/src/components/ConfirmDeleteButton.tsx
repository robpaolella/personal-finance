import { useState, useEffect, useCallback } from 'react';

interface ConfirmDeleteButtonProps {
  onConfirm: () => void | Promise<void>;
  label?: string;
  confirmLabel?: string;
  timeout?: number;
}

export default function ConfirmDeleteButton({
  onConfirm,
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
    if (!confirming) { setConfirming(true); return; }
    onConfirm();
    setConfirming(false);
  }, [confirming, onConfirm]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        className={`px-4 py-2 text-[12px] font-semibold rounded-lg border-none cursor-pointer ${
          confirming ? 'bg-[#ef4444] text-white' : 'bg-[var(--error-bg)] text-[#ef4444]'
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
