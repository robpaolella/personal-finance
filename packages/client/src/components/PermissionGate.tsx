import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

interface PermissionGateProps {
  permission: string;
  children: ReactNode;
  fallback?: 'hidden' | 'disabled';
}

export default function PermissionGate({ permission, children, fallback = 'hidden' }: PermissionGateProps) {
  const { hasPermission } = useAuth();

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  if (fallback === 'hidden') {
    return null;
  }

  // disabled: render with reduced opacity and no interaction
  return (
    <div style={{ opacity: 0.4, pointerEvents: 'none' }} title="You don't have permission">
      {children}
    </div>
  );
}
