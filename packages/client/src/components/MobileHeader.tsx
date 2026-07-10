import { usePageTitle } from '../hooks/usePageTitle';
import LedgerLogo from './LedgerLogo';

export default function MobileHeader() {
  const title = usePageTitle();

  return (
    <div
      className="mobile-only sticky top-0 z-40 flex items-center justify-between bg-[var(--bg-card)] border-b border-[var(--bg-card-border)]"
      style={{ padding: '10px 20px 12px' }}
    >
      <div className="flex items-center gap-2">
        <LedgerLogo size={22} />
        <span className="text-[17px] font-bold text-[var(--text-primary)]">{title}</span>
      </div>
    </div>
  );
}
