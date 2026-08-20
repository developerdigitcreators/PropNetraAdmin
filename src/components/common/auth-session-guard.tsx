'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { decodeJwtExpMs } from '@/lib/token-expiry';

/** Logs out when the access JWT expires. Admin does not refresh. */
export function AuthSessionGuard() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const tokenExpiresAt = useAuthStore((s) => s.tokenExpiresAt);

  useEffect(() => {
    if (!accessToken) return;

    const expiresAt =
      tokenExpiresAt || decodeJwtExpMs(accessToken) || 0;
    if (!expiresAt) return;

    const ms = expiresAt - Date.now();
    const logoutNow = () => {
      useAuthStore.getState().logout();
      router.replace('/login');
    };

    if (ms <= 0) {
      logoutNow();
      return;
    }

    const timer = window.setTimeout(logoutNow, ms);
    return () => window.clearTimeout(timer);
  }, [accessToken, tokenExpiresAt, router]);

  return null;
}
