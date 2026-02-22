import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export default function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; arrowLeft: number; flipped: boolean } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const rect = trigger.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();
    const margin = 8;

    let top = rect.top - tipRect.height - 6;
    let flipped = false;

    if (top < margin) {
      top = rect.bottom + 6;
      flipped = true;
    }

    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    let arrowLeft = tipRect.width / 2;

    if (left < margin) {
      arrowLeft = arrowLeft + (left - margin);
      left = margin;
    } else if (left + tipRect.width > window.innerWidth - margin) {
      const shift = left + tipRect.width - (window.innerWidth - margin);
      arrowLeft = arrowLeft + shift;
      left = left - shift;
    }

    setCoords({ top, left, arrowLeft, flipped });
  }, []);

  useEffect(() => {
    if (visible) {
      requestAnimationFrame(updatePosition);
    }
  }, [visible, updatePosition]);

  const handleEnter = () => {
    timerRef.current = setTimeout(() => setVisible(true), 200);
  };

  const handleLeave = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
    setCoords(null);
  };

  return (
    <>
      <span ref={triggerRef} onMouseEnter={handleEnter} onMouseLeave={handleLeave} style={{ display: 'inline-flex' }}>
        {children}
      </span>
      {visible && createPortal(
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            top: coords?.top ?? -9999,
            left: coords?.left ?? -9999,
            zIndex: 99999,
            background: '#0f172a',
            color: '#f1f5f9',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 12,
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            width: 'max-content',
            maxWidth: 250,
            lineHeight: 1.4,
            whiteSpace: 'pre-line',
            opacity: coords ? 1 : 0,
            transition: 'opacity 150ms ease',
            pointerEvents: 'none',
          }}
        >
          {content}
          <div
            style={{
              position: 'absolute',
              [coords?.flipped ? 'top' : 'bottom']: -4,
              left: coords?.arrowLeft ?? 0,
              width: 8,
              height: 8,
              background: '#0f172a',
              transform: 'translateX(-50%) rotate(45deg)',
            }}
          />
        </div>,
        document.body,
      )}
    </>
  );
}
