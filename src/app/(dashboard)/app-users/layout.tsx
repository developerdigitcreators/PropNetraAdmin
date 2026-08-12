'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { PermissionGuard } from '@/components/common/permission-guard';

const PAGE_LABELS: Record<string, string> = {
  '/app-users/master-data': 'Master Data',
  '/app-users/otp-issued': 'OTP Issued',
  '/app-users/otp-verified': 'OTP Verified',
};

export default function AppUsersLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pageLabel =
    Object.entries(PAGE_LABELS).find(([path]) => pathname.startsWith(path))?.[1] ||
    'Master Data';

  return (
    <PermissionGuard
      permission="users:read"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view app users.
        </div>
      }
    >
      <div className="space-y-6 pb-12">
        <Breadcrumb
          items={[
            { label: 'App Users', href: '/app-users/master-data' },
            { label: pageLabel },
          ]}
        />

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{pageLabel}</h1>
          <p className="text-gray-500 mt-1">
            {pageLabel === 'Master Data'
              ? 'Manage registered app users (Agents, Builders, etc).'
              : pageLabel === 'OTP Issued'
                ? 'Signups waiting for email / phone OTP verification.'
                : 'OTP verified signups with company or password still pending.'}
          </p>
        </div>

        {children}
      </div>
    </PermissionGuard>
  );
}
