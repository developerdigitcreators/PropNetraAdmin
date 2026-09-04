'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { PermissionGuard } from '@/components/common/permission-guard';
import { useAuthStore } from '@/store/use-auth-store';
import {
  APP_USERS_ANY_READ,
  defaultAppUsersPath,
  readPermissionsForTab,
} from '@/modules/app-users/app-users-access';

const PAGE_COPY: Record<string, { label: string; permission: string | string[]; description: string }> = {
  '/app-users/master-data': {
    label: 'Master Data',
    permission: readPermissionsForTab('app_users_master'),
    description: 'Manage registered app users (Agents, Builders, etc).',
  },
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

  if (!page) return <>{children}</>;

  const fillViewport = pathname.startsWith('/app-users/otp-verified');

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
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-gray-900">{page.label}</h1>
                  <p className="text-gray-500 mt-1">{page.description}</p>
                </div>
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
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">{page.label}</h1>
                <p className="text-gray-500 mt-1">{page.description}</p>
              </div>
              {children}
            </>
          )}
        </div>
      </PermissionGuard>
    </PermissionGuard>
  );
}
