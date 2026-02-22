import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react';

interface ScrollableListProps {
  maxHeight: number | string;
  children: ReactNode;
  className?: string;
}

export default function ScrollableList({ maxHeight, children, className = '' }: ScrollableListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showIndicator, setShowIndicator] = useState(false);

  const checkOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
    const hasOverflow = el.scrollHeight > el.clientHeight + 4;
    setShowIndicator(hasOverflow && !atBottom);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [checkOverflow, children]);

  const scrollDown = () => {
    scrollRef.current?.scrollBy({ top: 200, behavior: 'smooth' });
  };

  return (
    <div className="relative h-full overflow-hidden" style={{ maxHeight }}>
      <div
        ref={scrollRef}
        onScroll={checkOverflow}
        className={`overflow-y-auto overflow-x-hidden hide-scrollbar h-full ${className}`}
      >
        {children}
      </div>

      {showIndicator && (
        <>
          {/* Gradient fade */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[40px] pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent, var(--bg-card))' }}
          />
          {/* Scroll down button */}
          <button
            onClick={scrollDown}
            className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[28px] h-[28px] rounded-full flex items-center justify-center border border-[var(--bg-card-border)] cursor-pointer"
            style={{
              background: 'var(--bg-card)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
