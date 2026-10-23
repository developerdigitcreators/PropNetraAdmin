'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { isSuperAdmin } from '@/lib/super-admin';

const noopSubscribe = () => () => {};

/** `ready` is false during SSR and hydration so server and first client render agree. */
export function useIsSuperAdmin() {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const activeRole = useAuthStore((s) => s.activeRole);
  const accessToken = useAuthStore((s) => s.accessToken);
  const ready = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  const superAdmin = useMemo(
    () => ready && isSuperAdmin({ user, permissions, activeRole, accessToken }),
    [ready, user, permissions, activeRole, accessToken],
  );

  return { superAdmin, ready };
}
