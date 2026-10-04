'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { decodeJwtExpMs } from '@/lib/token-expiry';
import { axiosClient } from '@/lib/axios-client';

/**
 * Logs out when the access JWT expires (admin does not refresh the token), and
 * re-reads permissions from /auth/me on load and tab focus so role changes and
 * newly added modules show without logging in again.
 */
export function AuthSessionGuard() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const tokenExpiresAt = useAuthStore((s) => s.tokenExpiresAt);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const res = await axiosClient.get('/auth/me');
        let body: any = res.data;
        while (body && typeof body === 'object' && !Array.isArray(body.permissions) && body.data) {
          body = body.data;
        }
        const perms = body?.user?.permissions ?? body?.permissions;
        if (!cancelled && Array.isArray(perms)) useAuthStore.getState().setPermissions(perms);
      } catch {
        // Keep the permissions from login when offline or the call fails.
      }
    };
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [accessToken]);

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
