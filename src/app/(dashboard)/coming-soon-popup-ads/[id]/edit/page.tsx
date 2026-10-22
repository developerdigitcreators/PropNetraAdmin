'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { locationService } from '@/services/location.service';
import {
  bannerAdsService,
  COMING_SOON_POPUP_PLACEMENT,
  comingSoonPopupAdsHref,
  flattenBannerList,
  type AdBanner,
} from '@/services/banner-ads.service';
import { BannerForm } from '@/modules/banner-ads/banner-form';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Loader2 } from 'lucide-react';

function EditComingSoonPopupAd() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const stateId = searchParams.get('stateId') || '';
  const cityId = searchParams.get('cityId') || '';
  const [stateName, setStateName] = useState('');
  const [cityName, setCityName] = useState('');
  const [banner, setBanner] = useState<AdBanner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!params.id || !stateId || !cityId) {
      router.replace('/developer-home-sections');
      return;
    }
    let cancelled = false;
    Promise.all([
      locationService.getStates({ activeOnly: true }),
      locationService.getCities({ activeOnly: true, stateId }),
      bannerAdsService.getBanners({
        stateId,
        cityId,
        placement: COMING_SOON_POPUP_PLACEMENT,
      }),
    ])
      .then(([states, cities, list]) => {
        if (cancelled) return;
        const state = (Array.isArray(states) ? states : []).find((row: { id?: string }) => row.id === stateId);
        const city = (Array.isArray(cities) ? cities : []).find((row: { id?: string }) => row.id === cityId);
        const found = flattenBannerList(list).find((row) => row.id === params.id) || null;
        if (!state || !city || !found) {
          setError('Ad not found for this city.');
          return;
        }
        setStateName(state.name);
        setCityName(city.name);
        setBanner(found);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load ad.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, stateId, cityId, router]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const listHref = comingSoonPopupAdsHref(stateId, cityId);

  if (error || !banner) {
    return (
      <div className="space-y-3 py-12 text-center text-gray-600">
        <p>{error || 'Ad not found.'}</p>
        <button type="button" className="text-sm text-primary underline" onClick={() => router.push(listHref)}>
          Back
        </button>
      </div>
    );
  }

  return (
    <PermissionGuard
      permission="ads:update"
      fallback={<div className="p-12 text-center text-gray-500">You do not have permission to edit ads.</div>}
    >
      <div className="space-y-6 pb-16">
        <Breadcrumb
          items={[
            { label: 'Coming Soon popup ads', href: listHref },
            { label: 'Edit' },
          ]}
        />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edit popup ad</h1>
          <p className="mt-1 text-gray-500">
            {cityName}, {stateName}
          </p>
        </div>
        <BannerForm
          mode="edit"
          stateId={stateId}
          cityId={cityId}
          stateName={stateName}
          cityName={cityName}
          lockedPlacement={COMING_SOON_POPUP_PLACEMENT}
          lockedSection="general"
          banner={banner}
          listHref={listHref}
        />
      </div>
    </PermissionGuard>
  );
}

export default function EditComingSoonPopupAdPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <EditComingSoonPopupAd />
    </Suspense>
  );
}
