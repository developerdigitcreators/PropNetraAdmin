'use client';

import { ReactNode } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { permissionSetHas } from '@/lib/super-admin';

interface PermissionGuardProps {
  permission: string | string[]; // Format: "module_name:action"
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
  const allowed = useAuthStore((state) => {
    const keys = Array.isArray(permission) ? permission : [permission];
    return keys.some((key) => permissionSetHas(state.permissions, key));
  });

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
