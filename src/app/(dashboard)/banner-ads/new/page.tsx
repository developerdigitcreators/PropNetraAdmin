'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { locationService } from '@/services/location.service';
import { bannerAdsService, DEFAULT_SECTIONS } from '@/services/banner-ads.service';
import { BannerForm } from '@/modules/banner-ads/banner-form';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Loader2 } from 'lucide-react';

function NewBannerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stateId = searchParams.get('stateId') || '';
  const cityId = searchParams.get('cityId') || '';
  const placement = searchParams.get('placement') || '';
  const section = searchParams.get('section') || '';

  const [stateName, setStateName] = useState('');
  const [cityName, setCityName] = useState('');
  const [pageLabel, setPageLabel] = useState(placement);
  const [sectionLabel, setSectionLabel] = useState(section);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stateId || !cityId || !placement || !section) {
      router.replace('/banner-ads');
      return;
    }
    let cancelled = false;
    Promise.all([
      locationService.getStates(),
      locationService.getCities(),
      bannerAdsService.getPlacements(),
      bannerAdsService.getSections(),
    ])
      .then(([states, cities, placements, sections]) => {
        if (cancelled) return;
        const state = (Array.isArray(states) ? states : []).find((s: any) => s.id === stateId);
        const city = (Array.isArray(cities) ? cities : []).find((c: any) => c.id === cityId);
        if (!state || !city) {
          router.replace('/banner-ads');
          return;
        }
        setStateName(state.name);
        setCityName(city.name);
        setPageLabel(placements.find((p) => p.key === placement)?.label || placement);
        setSectionLabel(
          (sections.length ? sections : DEFAULT_SECTIONS).find((s) => s.key === section)?.label || section
        );
      })
      .catch(() => router.replace('/banner-ads'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stateId, cityId, placement, section, router]);

  if (!stateId || !cityId || !placement || !section || loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PermissionGuard permission="ads:create" fallback={<div className="p-12 text-center text-gray-500">You do not have permission to create banners.</div>}>
      <div className="space-y-6 pb-16">
        <Breadcrumb
          items={[
            { label: 'Banner Ads', href: '/banner-ads' },
            { label: 'Add New Banner' },
          ]}
        />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Add New Banner</h1>
          <p className="text-gray-500 mt-1">
            {cityName}, {stateName} · {pageLabel} · {sectionLabel}
          </p>
        </div>
        <BannerForm
          mode="create"
          stateId={stateId}
          cityId={cityId}
          stateName={stateName}
          cityName={cityName}
          lockedPlacement={placement}
          lockedSection={section}
        />
      </div>
    </PermissionGuard>
  );
}

export default function NewBannerPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <NewBannerContent />
    </Suspense>
  );
}
