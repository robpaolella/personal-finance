import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TAB_BAR_ITEMS, MORE_MENU_ITEMS, MORE_ROUTES, icons } from '../lib/navItems';

export default function BottomTabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [showMore, setShowMore] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const isMoreActive = MORE_ROUTES.some(r =>
    r === '/' ? pathname === '/' : pathname.startsWith(r)
  );

  useEffect(() => {
    if (!showMore) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMore]);

  const isTabActive = (to: string) =>
    to === '/' ? pathname === '/' : pathname.startsWith(to);

  return (
    <div className="mobile-only">
      {/* More Menu Popover */}
      {showMore && (
        <>
          <div
            className="fixed inset-0 z-[44]"
            onClick={() => setShowMore(false)}
          />
          <div
            ref={popoverRef}
            className="fixed z-[45] bg-[var(--bg-card)] border border-[var(--bg-card-border)] rounded-xl"
            style={{
              bottom: 66,
              right: 16,
              padding: '6px 0',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              minWidth: 160,
            }}
          >
            {MORE_MENU_ITEMS.map((item) => {
              const active = isTabActive(item.to);
              return (
                <div
                  key={item.to}
                  onClick={() => {
                    navigate(item.to);
                    setShowMore(false);
                  }}
                  className="flex items-center gap-2.5 cursor-pointer"
                  style={{
                    padding: '10px 16px',
                    fontSize: 13,
                    color: active ? 'var(--color-accent)' : 'var(--text-primary)',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {item.icon}
                  {item.label}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Tab Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center bg-[var(--bg-card)] border-t border-[var(--bg-card-border)]"
        style={{ padding: '6px 0 env(safe-area-inset-bottom, 18px)' }}
      >
        {TAB_BAR_ITEMS.map((tab) => {
          const active = isTabActive(tab.to);
          return (
            <div
              key={tab.to}
              onClick={() => {
                navigate(tab.to);
                setShowMore(false);
              }}
              className="flex flex-col items-center cursor-pointer"
              style={{
                gap: 2,
                color: active ? 'var(--color-accent)' : 'var(--text-muted)',
                minWidth: 64,
              }}
            >
              {tab.icon}
              <span style={{ fontSize: 9, fontWeight: active ? 600 : 400 }}>{tab.label}</span>
            </div>
          );
        })}

        {/* More Tab */}
        <div
          onClick={() => setShowMore(!showMore)}
          className="flex flex-col items-center cursor-pointer"
          style={{
            gap: 2,
            color: (isMoreActive || showMore) ? 'var(--color-accent)' : 'var(--text-muted)',
            minWidth: 64,
          }}
        >
          {icons.more}
          <span style={{ fontSize: 9, fontWeight: isMoreActive ? 600 : 400 }}>More</span>
        </div>
      </div>
    </div>
  );
}
