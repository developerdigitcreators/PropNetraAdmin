import { axiosClient } from '@/lib/axios-client';
import { deleteWithRemark } from '@/lib/delete-with-remark';

export type SearchSuggestionListing = {
  id: string;
  title: string;
  subtitle: string;
  thumbnailUrl: string;
  status: string;
  category: string;
};

export type SearchSuggestion = {
  id: string;
  stateId: string;
  cityId: string;
  listingId: string;
  isActive: boolean;
  sortOrder: number;
  listing: SearchSuggestionListing | null;
  stateName: string;
  cityName: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CreateSearchSuggestionPayload = {
  stateId: string;
  cityId: string;
  listingId: string;
  isActive?: boolean;
};

export type UpdateSearchSuggestionPayload = {
  listingId?: string;
  isActive?: boolean;
  sortOrder?: number;
};

export type SearchSuggestionPostOption = {
  id: string;
  title: string;
  subtitle: string;
  thumbnailUrl: string;
};

export const SEARCH_SUGGESTIONS_FILTER_KEY = 'propnetra.searchSuggestions.filters';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function asBool(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.toLowerCase().trim();
    if (['true', '1', 'on', 'active', 'yes'].includes(v)) return true;
    if (['false', '0', 'off', 'inactive', 'no'].includes(v)) return false;
  }
  return fallback;
}

function asArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const obj = asRecord(data);
  if (!obj) return [];
  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.suggestions)) return obj.suggestions;
  if (Array.isArray(obj.posts)) return obj.posts;
  if (Array.isArray(obj.data)) return obj.data;
  return [];
}

export function searchSuggestionsApiError(err: unknown, fallback: string): string {
  const e = err as {
    response?: { data?: { message?: unknown; error?: unknown } };
    message?: string;
  };
  const nested = e?.response?.data;
  const fromError =
    nested && typeof nested === 'object' && 'error' in nested
      ? (nested as { error?: { message?: unknown } }).error?.message
      : undefined;
  const msg = fromError ?? nested?.message ?? nested?.error;
  if (Array.isArray(msg)) return msg.filter(Boolean).join(', ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return e?.message || fallback;
}

function normalizeListing(raw: unknown): SearchSuggestionListing | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = pickString(row.id, row.listingId, row.listing_id);
  if (!id) return null;
  const title = pickString(
    row.title,
    row.name,
    row.projectName,
    row.project_name,
    row.propertyName,
    row.property_name,
  );
  const developer = pickString(row.developerName, row.developer_name, row.builderName, row.builder_name);
  const location = pickString(row.locationName, row.location_name, row.cityName, row.city_name);
  const subtitle = pickString(row.subtitle, row.caption, [developer, location].filter(Boolean).join(' · '));
  return {
    id,
    title: title || 'Untitled project',
    subtitle,
    thumbnailUrl: pickString(
      row.thumbnailUrl,
      row.thumbnail_url,
      row.coverImage,
      row.cover_image,
      row.imageUrl,
      row.image_url,
    ),
    status: pickString(row.status, row.listingStatus, row.listing_status),
    category: pickString(row.category, row.categoryName, row.category_name),
  };
}

export function normalizeSearchSuggestion(raw: unknown, index = 0): SearchSuggestion | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = pickString(row.id);
  if (!id) return null;

  const listingRaw = row.listing || row.post || row.project;
  const listing = normalizeListing(listingRaw);
  const listingId = pickString(row.listingId, row.listing_id, listing?.id);
  if (!listingId) return null;

  const stateObj = asRecord(row.state);
  const cityObj = asRecord(row.city);

  return {
    id,
    stateId: pickString(row.stateId, row.state_id, stateObj?.id),
    cityId: pickString(row.cityId, row.city_id, cityObj?.id),
    listingId,
    isActive: asBool(row.isActive ?? row.is_active, true),
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? index + 1) || index + 1,
    listing,
    stateName: pickString(row.stateName, row.state_name, stateObj?.name),
    cityName: pickString(row.cityName, row.city_name, cityObj?.name),
    createdAt: pickString(row.createdAt, row.created_at) || null,
    updatedAt: pickString(row.updatedAt, row.updated_at) || null,
  };
}

export function normalizeSuggestionPost(raw: unknown): SearchSuggestionPostOption | null {
  const listing = normalizeListing(raw);
  if (!listing) return null;
  return {
    id: listing.id,
    title: listing.title,
    subtitle: listing.subtitle,
    thumbnailUrl: listing.thumbnailUrl,
  };
}

export function suggestionDisplayTitle(item: SearchSuggestion): string {
  return item.listing?.title || 'Untitled project';
}

export const searchSuggestionsService = {
  list: async (params: { stateId?: string; cityId?: string }): Promise<SearchSuggestion[]> => {
    const response = await axiosClient.get('/admin/search-suggestions', {
      params: {
        ...(params.stateId ? { stateId: params.stateId } : {}),
        ...(params.cityId ? { cityId: params.cityId } : {}),
      },
    });
    return asArray(response.data)
      .map((row, index) => normalizeSearchSuggestion(row, index))
      .filter((row): row is SearchSuggestion => !!row)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  searchPosts: async (params: {
    cityId: string;
    q?: string;
  }): Promise<SearchSuggestionPostOption[]> => {
    const response = await axiosClient.get('/admin/search-suggestions/posts', {
      params: {
        cityId: params.cityId,
        ...(params.q?.trim() ? { q: params.q.trim() } : {}),
      },
    });
    return asArray(response.data)
      .map((row) => normalizeSuggestionPost(row))
      .filter((row): row is SearchSuggestionPostOption => !!row);
  },

  create: async (payload: CreateSearchSuggestionPayload): Promise<SearchSuggestion | null> => {
    const response = await axiosClient.post('/admin/search-suggestions', payload);
    return normalizeSearchSuggestion(response.data);
  },

  update: async (
    id: string,
    payload: UpdateSearchSuggestionPayload,
  ): Promise<SearchSuggestion | null> => {
    const response = await axiosClient.put(`/admin/search-suggestions/${id}`, payload);
    return normalizeSearchSuggestion(response.data);
  },

  reorder: async (orderedIds: string[]): Promise<void> => {
    await axiosClient.put('/admin/search-suggestions/reorder', { orderedIds });
  },

  remove: async (id: string, remark: string): Promise<void> => {
    await deleteWithRemark(`/admin/search-suggestions/${id}`, remark);
  },
};
