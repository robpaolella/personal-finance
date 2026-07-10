import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TAB_BAR_ITEMS, MORE_MENU_ITEMS, MORE_ROUTES, icons } from '../lib/navItems';
import BottomSheet from './BottomSheet';

const MORE_DESCRIPTIONS: Record<string, string> = {
  '/accounts': 'Balances, assets & net worth',
  '/reports': 'Income & expense breakdown',
  '/recurring': 'Bills, income & subscriptions',
  '/investments': 'Holdings & portfolio',
  '/settings': 'Accounts, categories, users',
  '/import': 'CSV & bank sync import',
};

export default function BottomTabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = MORE_ROUTES.some(r =>
    r === '/' ? pathname === '/' : pathname.startsWith(r)
  );

  const isTabActive = (to: string) =>
    to === '/' ? pathname === '/' : pathname.startsWith(to);

  return (
    <div className="mobile-only">
      {/* More Menu Bottom Sheet */}
      <BottomSheet isOpen={showMore} onClose={() => setShowMore(false)}>
        <div className="flex flex-col" style={{ gap: 12 }}>
          {MORE_MENU_ITEMS.map((item) => {
            const active = isTabActive(item.to);
            return (
              <div
                key={item.to}
                onClick={() => {
                  navigate(item.to);
                  setShowMore(false);
                }}
                className="flex items-center cursor-pointer bg-surface border border-line rounded-[10px]"
                style={{
                  padding: '14px 16px',
                  gap: 12,
                  borderLeft: active ? '3px solid var(--primary)' : undefined,
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0, color: active ? 'var(--primary)' : 'var(--text-3)' }}>
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 14, fontWeight: 600, color: active ? 'var(--primary)' : 'var(--text)' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 1 }}>
                    {MORE_DESCRIPTIONS[item.to]}
                  </div>
                </div>
                <span style={{ color: 'var(--text-3)', fontSize: 14, flexShrink: 0 }}>›</span>
              </div>
            );
          })}
        </div>
      </BottomSheet>

      {/* Tab Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center bg-surface border-t border-line select-none"
        style={{ padding: '10px 0 max(22px, env(safe-area-inset-bottom))' }}
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
              className="flex flex-col items-center justify-center cursor-pointer tab-bar-icon"
              style={{
                gap: 4,
                color: active ? 'var(--primary)' : 'var(--text-3)',
                minWidth: 64,
                minHeight: 48,
              }}
            >
              {tab.icon}
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{tab.label}</span>
            </div>
          );
        })}

        {/* More Tab */}
        <div
          onClick={() => setShowMore(!showMore)}
          className="flex flex-col items-center justify-center cursor-pointer tab-bar-icon"
          style={{
            gap: 4,
            color: (isMoreActive || showMore) ? 'var(--primary)' : 'var(--text-3)',
            minWidth: 64,
            minHeight: 48,
          }}
        >
          {icons.more}
          <span style={{ fontSize: 10, fontWeight: isMoreActive ? 600 : 400 }}>More</span>
        </div>
      </div>
    </div>
  );
}
