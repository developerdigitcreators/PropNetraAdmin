'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { locationService } from '@/services/location.service';
import {
  COMING_SOON_POPUP_PLACEMENT,
  comingSoonPopupAdsHref,
} from '@/services/banner-ads.service';
import { BannerForm } from '@/modules/banner-ads/banner-form';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Loader2 } from 'lucide-react';

function NewComingSoonPopupAd() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stateId = searchParams.get('stateId') || '';
  const cityId = searchParams.get('cityId') || '';
  const [stateName, setStateName] = useState('');
  const [cityName, setCityName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stateId || !cityId) {
      router.replace('/developer-home-sections');
      return;
    }
    let cancelled = false;
    Promise.all([
      locationService.getStates({ activeOnly: true }),
      locationService.getCities({ activeOnly: true, stateId }),
    ])
      .then(([states, cities]) => {
        if (cancelled) return;
        const state = (Array.isArray(states) ? states : []).find((row: { id?: string }) => row.id === stateId);
        const city = (Array.isArray(cities) ? cities : []).find((row: { id?: string }) => row.id === cityId);
        if (!state || !city) {
          router.replace('/developer-home-sections');
          return;
        }
        setStateName(state.name);
        setCityName(city.name);
      })
      .catch(() => router.replace('/developer-home-sections'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stateId, cityId, router]);

  if (!stateId || !cityId || loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const listHref = comingSoonPopupAdsHref(stateId, cityId);

  return (
    <PermissionGuard
      permission="ads:create"
      fallback={<div className="p-12 text-center text-gray-500">You do not have permission to create ads.</div>}
    >
      <div className="space-y-6 pb-16">
        <Breadcrumb
          items={[
            { label: 'Coming Soon popup ads', href: listHref },
            { label: 'Add' },
          ]}
        />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Add popup ad</h1>
          <p className="mt-1 text-gray-500">
            {cityName}, {stateName}
          </p>
        </div>
        <BannerForm
          mode="create"
          stateId={stateId}
          cityId={cityId}
          stateName={stateName}
          cityName={cityName}
          lockedPlacement={COMING_SOON_POPUP_PLACEMENT}
          lockedSection="general"
          listHref={listHref}
        />
      </div>
    </PermissionGuard>
  );
}

export default function NewComingSoonPopupAdPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <NewComingSoonPopupAd />
    </Suspense>
  );
}
