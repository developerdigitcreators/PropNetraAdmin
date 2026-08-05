import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Cookies from 'js-cookie';

interface AuthState {
  user: { id: string; email: string; roleScope?: string; name?: string } | null;
  activeRole: string | null;
  accessToken: string | null;
  permissions: Set<string>;
  setAuthData: (user: any, token: string, permissions: string[]) => void;
  setActiveRole: (role: string) => void;
  hasPermission: (moduleName: string, action: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      activeRole: null,
      accessToken: null,
      permissions: new Set(),
      setAuthData: (user, token, permissions) => {
        // Also save token to cookie for Next.js middleware
        Cookies.set('access_token', token, { expires: 1 });
        set({
          user,
          accessToken: token,
          permissions: new Set(permissions),
        });
      },
      setActiveRole: (role) => {
        Cookies.set('active_role', role, { expires: 1 });
        set({ activeRole: role });
      },
      hasPermission: (moduleName, action) => {
        const perms = get().permissions;
        return perms.has(`${moduleName}:${action}`) || perms.has('ALL:ALL');
      },
      logout: () => {
        Cookies.remove('access_token');
        Cookies.remove('active_role');
        set({ user: null, accessToken: null, permissions: new Set(), activeRole: null });
      },
    }),
    {
      name: 'propnetra-auth-storage',
      storage: createJSONStorage(() => localStorage),
      // We need to serialize/deserialize Set properly
      partialize: (state) => ({
        ...state,
        permissions: Array.from(state.permissions),
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        permissions: new Set(persistedState.permissions || []),
      }),
    }
  )
);
