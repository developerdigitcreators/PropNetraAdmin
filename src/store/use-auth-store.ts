import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Cookies from 'js-cookie';
import {
  decodeJwtExpMs,
  resolveTokenExpiresAtMs,
} from '@/lib/token-expiry';
import { permissionSetHas } from '@/lib/super-admin';

type TokenExpiryInput = {
  expiresIn?: number | string | null;
  tokenExpiresAt?: string | null;
};

interface AuthState {
  user: { id: string; email: string; roleScope?: string; name?: string } | null;
  activeRole: string | null;
  accessToken: string | null;
  tokenExpiresAt: number | null;
  permissions: Set<string>;
  setAuthData: (
    user: any,
    token: string,
    permissions: string[],
    persistCookie?: boolean,
    expiry?: TokenExpiryInput,
  ) => void;
  setActiveRole: (role: string) => void;
  hasPermission: (moduleName: string, action: string) => boolean;
  logout: () => void;
}

function cookieExpires(tokenExpiresAt: number | null) {
  return tokenExpiresAt ? new Date(tokenExpiresAt) : undefined;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      activeRole: null,
      accessToken: null,
      tokenExpiresAt: null,
      permissions: new Set(),
      setAuthData: (user, token, permissions, persistCookie = true, expiry) => {
        if (!token) return;
        const tokenExpiresAt = resolveTokenExpiresAtMs({
          token,
          tokenExpiresAt: expiry?.tokenExpiresAt,
          expiresIn: expiry?.expiresIn,
        });
        // Cookie is what middleware uses. Delay it until the workspace is chosen
        // so a refresh on /login cannot skip role selection.
        if (persistCookie) {
          Cookies.set('access_token', token, {
            expires: cookieExpires(tokenExpiresAt),
          });
        }
        set({
          user,
          accessToken: token,
          tokenExpiresAt,
          permissions: new Set(permissions),
        });
      },
      setActiveRole: (role) => {
        const token = get().accessToken;
        const tokenExpiresAt = get().tokenExpiresAt;
        Cookies.set('active_role', role, {
          expires: cookieExpires(tokenExpiresAt),
        });
        if (token) {
          Cookies.set('access_token', token, {
            expires: cookieExpires(tokenExpiresAt),
          });
        }
        set({ activeRole: role });
      },
      hasPermission: (moduleName, action) =>
        permissionSetHas(get().permissions, `${moduleName}:${action}`),
      logout: () => {
        Cookies.remove('access_token');
        Cookies.remove('active_role');
        set({
          user: null,
          accessToken: null,
          tokenExpiresAt: null,
          permissions: new Set(),
          activeRole: null,
        });
      },
    }),
    {
      name: 'propnetra-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        ...state,
        permissions: Array.from(state.permissions),
      }),
      merge: (persistedState: any, currentState) => {
        const accessToken = persistedState?.accessToken || null;
        const storedExpiry = Number(persistedState?.tokenExpiresAt);
        const tokenExpiresAt = Number.isFinite(storedExpiry)
          ? storedExpiry
          : accessToken
            ? decodeJwtExpMs(accessToken)
            : null;
        return {
          ...currentState,
          ...persistedState,
          accessToken,
          tokenExpiresAt,
          permissions: new Set(persistedState?.permissions || []),
        };
      },
    },
  ),
);
