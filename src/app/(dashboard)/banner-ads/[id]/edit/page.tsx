'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { locationService } from '@/services/location.service';
import {
  bannerAdsService,
  flattenBannerList,
  type AdBanner,
} from '@/services/banner-ads.service';
import { BannerForm } from '@/modules/banner-ads/banner-form';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Loader2 } from 'lucide-react';

function EditBannerContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const bannerId = params.id;
  const stateId = searchParams.get('stateId') || '';
  const cityId = searchParams.get('cityId') || '';
  const placement = searchParams.get('placement') || '';
  const section = searchParams.get('section') || '';

  const [stateName, setStateName] = useState('');
  const [cityName, setCityName] = useState('');
  const [banner, setBanner] = useState<AdBanner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!bannerId || !stateId || !cityId || !placement) {
      router.replace('/banner-ads');
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([
      locationService.getStates(),
      locationService.getCities(),
      bannerAdsService.getBanners({ stateId, cityId, placement }),
    ])
      .then(([states, cities, list]) => {
        if (cancelled) return;
        const state = (Array.isArray(states) ? states : []).find((s: any) => s.id === stateId);
        const city = (Array.isArray(cities) ? cities : []).find((c: any) => c.id === cityId);
        const found = flattenBannerList(list).find((b) => b.id === bannerId) || null;

        if (!state || !city || !found) {
          setError('Banner not found for this page.');
          return;
        }
        setStateName(state.name);
        setCityName(city.name);
        setBanner(found);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError('Failed to load banner.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bannerId, stateId, cityId, placement, router]);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !banner) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-gray-600">{error || 'Banner not found.'}</p>
        <button className="text-primary text-sm underline" onClick={() => router.push('/banner-ads')}>
          Back to Banner Ads
        </button>
      </div>
    );
  }

  return (
    <PermissionGuard permission="ads:update" fallback={<div className="p-12 text-center text-gray-500">You do not have permission to edit banners.</div>}>
      <div className="space-y-6 pb-16">
        <Breadcrumb
          items={[
            { label: 'Banner Ads', href: '/banner-ads' },
            { label: 'Edit Banner' },
          ]}
        />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edit Banner</h1>
          <p className="text-gray-500 mt-1">
            {cityName}, {stateName}
          </p>
        </div>
        <BannerForm
          mode="edit"
          stateId={stateId}
          cityId={cityId}
          stateName={stateName}
          cityName={cityName}
          lockedPlacement={placement || banner.placement}
          lockedSection={section || banner.section || 'general'}
          banner={banner}
        />
      </div>
    </PermissionGuard>
  );
}

export default function EditBannerPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <EditBannerContent />
    </Suspense>
  );
}
