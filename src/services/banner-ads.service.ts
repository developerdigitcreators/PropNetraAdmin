import { axiosClient } from '@/lib/axios-client';
import { deleteWithRemark } from '@/lib/delete-with-remark';

export type BannerLinkType = 'none' | 'post' | 'page';
export type BannerMediaType = 'image' | 'video';
export type BannerSectionKey = 'top' | 'general' | string;

export type AdBanner = {
  id: string;
  stateId: string;
  cityId: string;
  mediaUrl: string;
  mediaType: BannerMediaType;
  placement?: string;
  section?: BannerSectionKey | null;
  linkType: BannerLinkType;
  linkLabel?: string | null;
  listingId?: string | null;
  pageKey?: string | null;
  sortOrder: number;
  status?: string | null;
  isActive?: boolean;
  listing?: { id: string; title?: string; name?: string } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type BannerListParams = {
  stateId: string;
  cityId: string;
  placement: string;
};

export type BannerListResponse = {
  sections: Record<string, AdBanner[]>;
  items: AdBanner[];
  autoslide?: string | null;
  autoslideMs?: number | null;
  autoslideOptions?: string[];
};

export type AdAutoslideOption = {
  value: string;
  label: string;
};

export type UpdateAdsSettingsPayload = {
  stateId: string;
  cityId: string;
  placement: string;
  autoslide: string;
};

export type CreateBannerPayload = {
  stateId: string;
  cityId: string;
  mediaUrl: string;
  mediaType: BannerMediaType;
  placement: string;
  section: string;
  linkType: BannerLinkType;
  listingId?: string | null;
  pageKey?: string | null;
  isActive?: boolean;
};

export type UpdateBannerPayload = Partial<CreateBannerPayload> & {
  sortOrder?: number;
  status?: string;
};

export type AdPageOption = {
  key: string;
  label: string;
};

export type AdPlacementOption = {
  key: string;
  label: string;
};

export type AdSectionOption = {
  key: string;
  label: string;
};

export type AdPostOption = {
  id: string;
  title?: string;
  name?: string;
};

export const BANNER_FILTER_STORAGE_KEY = 'banner-ads-filters';

export const DEFAULT_PLACEMENTS: AdPlacementOption[] = [
  { key: 'home', label: 'Home' },
  { key: 'popup', label: 'Home page popup' },
  { key: 'search', label: 'Search results' },
  { key: 'listing_detail', label: 'Listing detail' },
  { key: 'refer_and_earn', label: 'Refer & Earn' },
  { key: 'chat_notification', label: 'Chat notification page' },
  { key: 'developer_chat', label: 'Developer chat page' },
  { key: 'developer_property', label: 'Developer Property Page' },
  { key: 'developer_profile', label: 'Developer Profile Page' },
  { key: 'buy_requirement', label: 'Buy Requirement Page' },
  { key: 'rental_listing', label: 'Rental listing page' },
  { key: 'resale_listing', label: 'Resale listing page' },
  { key: 'developer_home', label: 'Developer Home page' },
  { key: 'direct_builder_floor', label: 'Direct Builder floor' },
];

export const DEFAULT_SECTIONS: AdSectionOption[] = [
  { key: 'top', label: 'Top Banner' },
  { key: 'general', label: 'General Banner' },
];

export const DEFAULT_AUTOSLIDE = '00:00:05';

export const DEFAULT_AUTOSLIDE_OPTIONS = [
  '00:00:03',
  '00:00:05',
  '00:00:10',
  '00:00:15',
  '00:00:30',
  '00:01:00',
];

/** Normalize API autoslide values (string | number | object) to HH:MM:SS string. */
export function normalizeAutoslideValue(value: unknown, fallback = DEFAULT_AUTOSLIDE): string {
  if (value == null || value === '') return fallback;

  if (typeof value === 'number' && Number.isFinite(value)) {
    // Treat large numbers as ms, small as seconds
    const totalSec = value >= 1000 ? Math.round(value / 1000) : Math.round(value);
    const hh = Math.floor(totalSec / 3600);
    const mm = Math.floor((totalSec % 3600) / 60);
    const ss = totalSec % 60;
    return [hh, mm, ss].map((n) => String(n).padStart(2, '0')).join(':');
  }

  if (typeof value === 'object') {
    const obj = value as { value?: unknown; key?: unknown; autoslide?: unknown };
    return normalizeAutoslideValue(obj.value ?? obj.key ?? obj.autoslide, fallback);
  }

  const str = String(value).trim();
  if (!str) return fallback;
  // Already HH:MM:SS
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(str)) {
    const [h, m, s] = str.split(':');
    return [h, m, s].map((p) => p.padStart(2, '0')).join(':');
  }
  // Plain seconds string
  if (/^\d+$/.test(str)) {
    return normalizeAutoslideValue(Number(str), fallback);
  }
  return str;
}

export function normalizeAutoslideOptions(raw: unknown): string[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.items)) list = obj.items;
    else if (Array.isArray(obj.options)) list = obj.options;
    else if (Array.isArray(obj.data)) list = obj.data;
  }
  const values = list
    .map((item) => normalizeAutoslideValue(item, ''))
    .filter(Boolean);
  return values.length ? Array.from(new Set(values)) : DEFAULT_AUTOSLIDE_OPTIONS;
}

/** Parse HH:MM:SS into numeric parts. */
export function parseAutoslideParts(value: unknown): { hh: number; mm: number; ss: number } {
  const normalized = normalizeAutoslideValue(value, DEFAULT_AUTOSLIDE);
  const [h, m, s] = normalized.split(':').map((p) => Number(p));
  return {
    hh: Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 0,
    mm: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0,
    ss: Number.isFinite(s) ? Math.min(59, Math.max(0, s)) : 5,
  };
}

/** Build HH:MM:SS from parts. */
export function buildAutoslideValue(hh: number, mm: number, ss: number): string {
  const h = Math.min(23, Math.max(0, Math.floor(hh) || 0));
  const m = Math.min(59, Math.max(0, Math.floor(mm) || 0));
  const s = Math.min(59, Math.max(0, Math.floor(ss) || 0));
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function detectMediaType(url: string): BannerMediaType {
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  if (/\.(mp4|webm|mov|m4v|ogg)$/.test(clean)) return 'video';
  return 'image';
}

export function formatBannerLinkLabel(banner: AdBanner): string {
  if (banner.linkLabel) return banner.linkLabel;
  if (banner.linkType === 'post') {
    const title = banner.listing?.title || banner.listing?.name;
    return title ? `Post: ${title}` : 'Post';
  }
  if (banner.linkType === 'page') {
    if (banner.pageKey === 'refer_and_earn') return 'Page: Refer & Earn';
    return banner.pageKey ? `Page: ${banner.pageKey}` : 'Page';
  }
  return 'No link';
}

export function isBannerActive(banner: AdBanner): boolean {
  if (typeof banner.isActive === 'boolean') return banner.isActive;
  if (banner.status) return banner.status.toLowerCase() === 'active';
  return true;
}

function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
  }
  return [];
}

function mapKeyLabelOptions(
  raw: Array<{ key: string; label?: string } | string>,
  fallbackLabel?: (key: string) => string
): { key: string; label: string }[] {
  return raw.map((item) =>
    typeof item === 'string'
      ? { key: item, label: fallbackLabel?.(item) || item }
      : { key: item.key, label: item.label || fallbackLabel?.(item.key) || item.key }
  );
}

function normalizeListResponse(data: unknown): BannerListResponse {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as {
      sections?: Record<string, AdBanner[]>;
      items?: AdBanner[];
      autoslide?: string | null;
      autoslideMs?: number | null;
      autoslideOptions?: string[];
    };
    const sections: Record<string, AdBanner[]> = {};
    if (obj.sections && typeof obj.sections === 'object') {
      for (const [key, value] of Object.entries(obj.sections)) {
        sections[key] = Array.isArray(value) ? value : [];
      }
    }
    const items = Array.isArray(obj.items) ? obj.items : [];
    if (!Object.keys(sections).length && items.length) {
      for (const item of items) {
        const key = item.section || 'general';
        if (!sections[key]) sections[key] = [];
        sections[key].push(item);
      }
    }
    return {
      sections,
      items,
      autoslide: normalizeAutoslideValue(obj.autoslide, DEFAULT_AUTOSLIDE),
      autoslideMs: obj.autoslideMs ?? null,
      autoslideOptions: Array.isArray(obj.autoslideOptions)
        ? normalizeAutoslideOptions(obj.autoslideOptions)
        : undefined,
    };
  }

  const rows = asArray<AdBanner>(data);
  const sections: Record<string, AdBanner[]> = { top: [], general: [] };
  for (const row of rows) {
    const key = row.section || 'general';
    if (!sections[key]) sections[key] = [];
    sections[key].push(row);
  }
  return { sections, items: rows, autoslide: DEFAULT_AUTOSLIDE };
}

export function flattenBannerList(response: BannerListResponse): AdBanner[] {
  if (response.items?.length) return response.items;
  return Object.values(response.sections || {}).flat();
}

export const bannerAdsService = {
  getBanners: async (params: BannerListParams): Promise<BannerListResponse> => {
    const response = await axiosClient.get('/admin/ads', {
      params: {
        stateId: params.stateId,
        cityId: params.cityId,
        placement: params.placement,
      },
    });
    return normalizeListResponse(response.data);
  },

  createBanner: async (payload: CreateBannerPayload): Promise<AdBanner> => {
    const response = await axiosClient.post('/admin/ads', payload);
    return response.data;
  },

  updateBanner: async (id: string, payload: UpdateBannerPayload): Promise<AdBanner> => {
    const response = await axiosClient.put(`/admin/ads/${id}`, payload);
    return response.data;
  },

  reorderBanners: async (orderedIds: string[]): Promise<void> => {
    await axiosClient.put('/admin/ads/reorder', { orderedIds });
  },

  deleteBanner: async (id: string, remark: string): Promise<void> => {
    await deleteWithRemark(`/admin/ads/${id}`, remark);
  },

  getPages: async (): Promise<AdPageOption[]> => {
    const response = await axiosClient.get('/admin/ads/pages');
    const raw = asArray<AdPageOption | string>(response.data);
    return mapKeyLabelOptions(raw, (key) =>
      key === 'refer_and_earn' ? 'Refer & Earn' : key
    );
  },

  /** App pages where banners can appear (Home, Search, etc.). */
  getPlacements: async (): Promise<AdPlacementOption[]> => {
    try {
      const response = await axiosClient.get('/admin/ads/placements');
      const raw = asArray<AdPlacementOption | string>(response.data);
      const mapped = mapKeyLabelOptions(raw, (key) =>
        DEFAULT_PLACEMENTS.find((p) => p.key === key)?.label || key
      );
      return mapped.length ? mapped : DEFAULT_PLACEMENTS;
    } catch {
      return DEFAULT_PLACEMENTS;
    }
  },

  /** Sections within a page (Top Banner, General Banner). Popup has General only. */
  getSections: async (placement?: string): Promise<AdSectionOption[]> => {
    try {
      const response = await axiosClient.get('/admin/ads/sections', {
        params: placement ? { placement } : undefined,
      });
      const raw = asArray<AdSectionOption | string>(response.data);
      const mapped = mapKeyLabelOptions(raw, (key) =>
        DEFAULT_SECTIONS.find((s) => s.key === key)?.label || key
      );
      const list = mapped.length ? mapped : DEFAULT_SECTIONS;
      if (placement === 'popup') {
        return list.filter((s) => s.key === 'general');
      }
      return list;
    } catch {
      return placement === 'popup'
        ? DEFAULT_SECTIONS.filter((s) => s.key === 'general')
        : DEFAULT_SECTIONS;
    }
  },

  getPosts: async (cityId: string, q?: string): Promise<AdPostOption[]> => {
    const response = await axiosClient.get('/admin/ads/posts', {
      params: { cityId, ...(q ? { q } : {}) },
    });
    return asArray<AdPostOption>(response.data);
  },

  getAutoslideOptions: async (): Promise<string[]> => {
    try {
      const response = await axiosClient.get('/admin/ads/autoslide-options');
      return normalizeAutoslideOptions(response.data);
    } catch {
      return DEFAULT_AUTOSLIDE_OPTIONS;
    }
  },

  updateSettings: async (payload: UpdateAdsSettingsPayload): Promise<void> => {
    await axiosClient.put('/admin/ads/settings', payload);
  },
};

export function postDisplayTitle(post: AdPostOption): string {
  return post.title || post.name || post.id;
}
