'use client';

import { usePathname } from 'next/navigation';
import { ReactNode, useCallback, useState } from 'react';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/use-auth-store';
import {
  APP_USERS_ANY_READ,
  APP_USERS_REFRESH_EVENT,
  defaultAppUsersPath,
  readPermissionsForTab,
} from '@/modules/app-users/app-users-access';
import { RefreshCw } from 'lucide-react';

const PAGE_COPY: Record<string, { label: string; permission: string | string[]; description: string }> = {
  '/app-users/otp-issued': {
    label: 'OTP Issued',
    permission: readPermissionsForTab('app_users_otp_issued'),
    description: 'Signups waiting for email / phone OTP verification.',
  },
  '/app-users/otp-verified': {
    label: 'OTP Verified',
    permission: readPermissionsForTab('app_users_otp_verified'),
    description: 'OTP verified signups with company or password still pending.',
  },
};

export default function AppUsersLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const page = Object.entries(PAGE_COPY).find(([path]) => pathname.startsWith(path))?.[1];
  const parentHref = defaultAppUsersPath(hasPermission);
  const [refreshBusy, setRefreshBusy] = useState(false);

  const triggerRefresh = useCallback(() => {
    setRefreshBusy(true);
    window.dispatchEvent(new Event(APP_USERS_REFRESH_EVENT));
    window.setTimeout(() => setRefreshBusy(false), 800);
  }, []);

  if (!page) return <>{children}</>;

  const fillViewport = pathname.startsWith('/app-users/otp-verified');

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{page.label}</h1>
        <p className="text-gray-500 mt-1">{page.description}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={triggerRefresh}
        disabled={refreshBusy}
      >
        <RefreshCw className="mr-1.5 size-3.5" />
        Refresh
      </Button>
    </div>
  );

  return (
    <PermissionGuard
      permission={APP_USERS_ANY_READ}
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view app users.
        </div>
      }
    >
      <PermissionGuard
        permission={page.permission}
        fallback={
          <div className="p-12 text-center text-gray-500">
            You do not have permission to view {page.label}.
          </div>
        }
      >
        <div
          className={
            fillViewport
              ? 'flex min-h-0 flex-1 flex-col gap-4'
              : 'space-y-6 pb-12'
          }
        >
          {fillViewport ? (
            <>
              <div className="shrink-0 space-y-4">
                <Breadcrumb
                  items={[
                    { label: 'App Users', href: parentHref },
                    { label: page.label },
                  ]}
                />
                {header}
              </div>
              <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            </>
          ) : (
            <>
              <Breadcrumb
                items={[
                  { label: 'App Users', href: parentHref },
                  { label: page.label },
                ]}
              />
              {header}
              {children}
            </>
          )}
        </div>
      </PermissionGuard>
    </PermissionGuard>
  );
}
