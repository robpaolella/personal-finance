import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="flex-1 bg-[var(--bg-modal)]"
        onClick={onClose}
        style={{ animation: 'fadeIn 200ms ease-out' }}
      />
      {/* Sheet */}
      <div
        className="bg-[var(--bg-card)] rounded-t-2xl flex flex-col"
        style={{
          animation: 'sheetSlideUp 200ms ease-out',
          maxHeight: '92vh',
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center shrink-0" style={{ padding: '8px 0 4px' }}>
          <div className="w-9 h-1 rounded-full bg-[var(--bg-card-border)]" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between shrink-0 px-5 pt-1 pb-3">
            <span className="text-[16px] font-bold text-[var(--text-primary)]">{title}</span>
            <button
              onClick={onClose}
              className="text-[20px] leading-none text-[var(--text-muted)] cursor-pointer bg-transparent border-none p-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto px-5 pb-1"
          style={{ scrollbarWidth: 'none' }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
