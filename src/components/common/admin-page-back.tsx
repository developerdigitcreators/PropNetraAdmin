'use client';

import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { PageBackButton } from '@/components/common/page-back-button';
import { bannerAdsListHref } from '@/services/banner-ads.service';

/** Parent route for common nested admin screens; otherwise dashboard. */
function resolveBackHref(
  pathname: string,
  searchParams: URLSearchParams,
): string {
  if (pathname.startsWith('/banner-ads/') && pathname !== '/banner-ads') {
    return bannerAdsListHref({
      stateId: searchParams.get('stateId'),
      cityId: searchParams.get('cityId'),
      placement: searchParams.get('placement'),
    });
  }
  if (/^\/listings\/form-modules\/[^/]+\/fields/.test(pathname)) {
    return '/listings/form-modules';
  }
  if (pathname.startsWith('/rbac/app-users')) {
    return '/app-users';
  }
  if (pathname === '/developer-user' && searchParams.get('editListingId')) {
    const params = new URLSearchParams();
    const developerId = searchParams.get('developerId');
    if (developerId) params.set('developerId', developerId);
    params.set('tab', 'listings');
    const qs = params.toString();
    return qs ? `/developer-user?${qs}` : '/developer-user';
  }
  return '/';
}

function AdminPageBackInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (!pathname || pathname === '/') return null;

  return (
    <div className="mb-1">
      <PageBackButton href={resolveBackHref(pathname, searchParams)} />
    </div>
  );
}

export function AdminPageBack() {
  return (
    <Suspense fallback={null}>
      <AdminPageBackInner />
    </Suspense>
  );
}
