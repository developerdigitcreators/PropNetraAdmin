'use client';

import { ReactNode } from 'react';
import { useAuthStore } from '@/store/use-auth-store';

interface PermissionGuardProps {
  permission: string | string[]; // Format: "module_name:action"
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
  const hasPermission = useAuthStore((state) => {
    if (state.permissions.has('ALL:ALL')) return true;
    const keys = Array.isArray(permission) ? permission : [permission];
    return keys.some((key) => state.permissions.has(key));
  });

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
