import { useState } from 'react';

interface TransferBadgeProps {
  isLikelyTransfer: boolean;
  tooltipText?: string;
}

export default function TransferBadge({ isLikelyTransfer, tooltipText }: TransferBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!isLikelyTransfer) return null;

  const tip = tooltipText || "This looks like a transfer between your accounts, not an expense or income.";

  return (
    <span className="relative inline-flex">
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#fff7ed] text-[#ea580c] cursor-default"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
        Likely Transfer
      </span>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-[var(--text-primary)] text-white text-[11px] rounded-md whitespace-nowrap z-50 shadow-lg">
          {tip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--text-primary)]" />
        </div>
      )}
    </span>
  );
}
