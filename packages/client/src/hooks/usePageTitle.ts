import { useLocation } from 'react-router-dom';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/transactions': 'Transactions',
  '/budget': 'Budget',
  '/reports': 'Reports',
  '/net-worth': 'Net Worth',
  '/import': 'Import',
  '/settings': 'Settings',
};

export function usePageTitle(override?: string): string {
  const { pathname } = useLocation();
  if (override) return override;
  return ROUTE_TITLES[pathname] || 'Ledger';
}
