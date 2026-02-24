import { usePageTitle } from '../hooks/usePageTitle';

export default function MobileHeader() {
  const title = usePageTitle();

  return (
    <div
      className="mobile-only sticky top-0 z-40 flex items-center justify-between bg-[var(--bg-card)] border-b border-[var(--bg-card-border)]"
      style={{ padding: '10px 20px 12px' }}
    >
      <div className="flex items-center gap-2">
        <div className="w-[22px] h-[22px] rounded-[5px] bg-gradient-to-br from-[#3b82f6] to-[#10b981] flex items-center justify-center">
          <span className="text-white text-[11px] font-extrabold font-mono">$</span>
        </div>
        <span className="text-[17px] font-bold text-[var(--text-primary)]">{title}</span>
      </div>
    </div>
  );
}
