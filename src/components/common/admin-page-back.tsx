'use client';

import { usePathname } from 'next/navigation';
import { PageBackButton } from '@/components/common/page-back-button';

/** Parent route for common nested admin screens; otherwise dashboard. */
function resolveBackHref(pathname: string): string {
  if (pathname.startsWith('/banner-ads/') && pathname !== '/banner-ads') {
    return '/banner-ads';
  }
  if (/^\/listings\/form-modules\/[^/]+\/fields/.test(pathname)) {
    return '/listings/form-modules';
  }
  if (pathname.startsWith('/rbac/app-users')) {
    return '/app-users';
  }
  return '/';
}

export function AdminPageBack() {
  const pathname = usePathname();
  if (!pathname || pathname === '/') return null;

  return (
    <div className="mb-1">
      <PageBackButton href={resolveBackHref(pathname)} />
    </div>
  );
}
