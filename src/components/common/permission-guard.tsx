'use client';

import { ReactNode } from 'react';
import { useAuthStore } from '@/store/use-auth-store';

interface PermissionGuardProps {
  permission: string; // Format: "module_name:action"
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
  const hasPermission = useAuthStore((state) => {
    // Super admins might have 'ALL:ALL' or we check specifically
    return state.permissions.has(permission) || state.permissions.has('ALL:ALL');
  });

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
