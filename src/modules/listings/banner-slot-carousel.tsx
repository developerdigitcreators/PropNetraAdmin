'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { axiosClient } from '@/lib/axios-client';
import {
  flattenBannerList,
  normalizeListResponse,
  type AdBanner,
} from '@/services/banner-ads.service';

type Slide = { id: string; mediaUrl: string; mediaType: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function slideFromRow(raw: unknown, index: number): Slide | null {
  if (typeof raw === 'string' && raw.trim()) {
    return { id: `slide-${index}`, mediaUrl: raw.trim(), mediaType: 'image' };
  }
  const row = asRecord(raw);
  if (!row) return null;
  const mediaUrl = [row.mediaUrl, row.media_url, row.imageUrl, row.image, row.url]
    .find((v) => typeof v === 'string' && v.trim()) as string | undefined;
  if (!mediaUrl) return null;
  const mediaType = String(row.mediaType || row.media_type || 'image');
  const id = String(row.id || `slide-${index}`);
  return { id, mediaUrl: mediaUrl.trim(), mediaType };
}

function slidesFromValue(value: unknown): Slide[] {
  if (value == null || typeof value === 'string') return [];
  const lists: unknown[] = [];
  if (Array.isArray(value)) lists.push(value);
  const row = asRecord(value);
  if (row) {
    for (const key of ['items', 'banners', 'ads', 'data']) {
      if (Array.isArray(row[key])) lists.push(row[key]);
    }
    const sections = row.sections;
    if (sections && typeof sections === 'object') {
      lists.push(Object.values(sections as Record<string, unknown>).flat());
    }
  }
  const slides: Slide[] = [];
  lists.flat().forEach((item, index) => {
    const slide = slideFromRow(item, index);
    if (slide) slides.push(slide);
  });
  return slides;
}

export function BannerSlotCarousel({
  bannerPlacement,
  cityId,
  stateId,
}: {
  bannerPlacement: unknown;
  cityId?: string;
  stateId?: string;
}) {
  const embedded = useMemo(
    () => slidesFromValue(bannerPlacement),
    [bannerPlacement],
  );
  const placementKey =
    typeof bannerPlacement === 'string' ? bannerPlacement.trim() : '';
  const [remote, setRemote] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!placementKey || embedded.length > 0) {
      setRemote([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void axiosClient
      .get('/admin/ads', {
        params: {
          placement: placementKey,
          ...(stateId ? { stateId } : {}),
          ...(cityId ? { cityId } : {}),
        },
      })
      .then((response) => {
        if (cancelled) return;
        const list = flattenBannerList(normalizeListResponse(response.data));
        setRemote(
          list
            .filter((banner: AdBanner) => banner.isActive !== false && !!banner.mediaUrl)
            .map((banner) => ({
              id: banner.id,
              mediaUrl: banner.mediaUrl,
              mediaType: banner.mediaType || 'image',
            })),
        );
      })
      .catch(() => {
        if (!cancelled) setRemote([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [placementKey, cityId, stateId, embedded.length]);

  const slides = embedded.length > 0 ? embedded : remote;
  const [index, setIndex] = useState(0);
  const safeIndex = slides.length ? index % slides.length : 0;
  const current = slides[safeIndex];

  if (loading && slides.length === 0) {
    return (
      <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading banners…
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
        No banners for this placement.
      </div>
    );
  }

  const go = (delta: number) => {
    setIndex((prev) => (prev + delta + slides.length) % slides.length);
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
      {current.mediaType === 'video' ? (
        <video
          key={current.id}
          src={current.mediaUrl}
          className="h-44 w-full object-cover"
          controls
          playsInline
        />
      ) : (
        <img
          key={current.id}
          src={current.mediaUrl}
          alt=""
          className="h-44 w-full object-cover"
        />
      )}
      {slides.length > 1 ? (
        <>
          <button
            type="button"
            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow"
            onClick={() => go(-1)}
            aria-label="Previous banner"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow"
            onClick={() => go(1)}
            aria-label="Next banner"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Banner ${i + 1}`}
                className={`h-1.5 w-1.5 rounded-full ${i === safeIndex ? 'bg-white' : 'bg-white/50'}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
