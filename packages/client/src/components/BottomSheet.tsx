import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const currentTranslateY = useRef(0);

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

  // Reset translate when opening
  useEffect(() => {
    if (isOpen) {
      currentTranslateY.current = 0;
      if (sheetRef.current) {
        sheetRef.current.style.transform = 'translateY(0)';
      }
    }
  }, [isOpen]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const deltaY = e.touches[0].clientY - dragStartY.current;
    // Only allow dragging downward
    const translate = Math.max(0, deltaY);
    currentTranslateY.current = translate;
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${translate}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    dragStartY.current = null;
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 200ms ease-out';
    }
    // Close if dragged more than 100px down
    if (currentTranslateY.current > 100) {
      if (sheetRef.current) {
        sheetRef.current.style.transform = 'translateY(100%)';
      }
      setTimeout(onClose, 200);
    } else {
      currentTranslateY.current = 0;
      if (sheetRef.current) {
        sheetRef.current.style.transform = 'translateY(0)';
      }
    }
  }, [onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 touch-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--bg-modal)]"
        onClick={onClose}
        style={{ animation: 'fadeIn 200ms ease-out' }}
      />
      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-[var(--bg-card)] rounded-t-2xl flex flex-col"
        style={{
          animation: 'sheetSlideUp 200ms ease-out',
          maxHeight: '92vh',
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div
          className="flex justify-center shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
          style={{ padding: '14px 0 10px' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
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
          className="flex-1 overflow-y-auto px-5 pb-1 touch-auto"
          style={{ scrollbarWidth: 'none', overscrollBehavior: 'contain' }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
