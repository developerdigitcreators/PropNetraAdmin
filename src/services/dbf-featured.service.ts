import { axiosClient } from '@/lib/axios-client';

export type DbfListingPreview = {
  id: string;
  title: string;
  propertyName: string;
  location: string;
  priceLabel: string;
  status: string;
  builderName: string;
  imageUrl: string;
};

export type DbfSectionItem = {
  id: string;
  listingId: string;
  sortOrder: number;
  listing: DbfListingPreview | null;
};

export type DbfSection = {
  id: string;
  stateId: string;
  cityId: string;
  name: string;
  autoslide: string;
  sortOrder: number;
  isActive: boolean;
  items: DbfSectionItem[];
};

export type DbfBuilderPreview = {
  id: string;
  name: string;
  companyName: string;
  companyLogoUrl: string;
  contact: string;
};

export type DbfTopBuilderRow = {
  id: string;
  builderUserId: string;
  sortOrder: number;
  isActive: boolean;
  builder: DbfBuilderPreview | null;
};

export const DBF_FEATURED_FILTER_KEY = 'dbf-featured-filters';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value);
}

function unwrap(data: unknown): unknown {
  const obj = asRecord(data);
  if (obj && 'data' in obj && (Array.isArray(obj.data) || asRecord(obj.data))) return obj.data;
  return data;
}

function asArray(data: unknown): unknown[] {
  const value = unwrap(data);
  if (Array.isArray(value)) return value;
  const obj = asRecord(value);
  if (obj && Array.isArray(obj.items)) return obj.items;
  return [];
}

export function dbfFeaturedApiError(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: unknown; error?: unknown } }; message?: string };
  const nested = e?.response?.data;
  const fromError =
    nested && typeof nested === 'object' && asRecord(nested.error)
      ? (nested.error as { message?: unknown }).message
      : undefined;
  const msg = fromError ?? nested?.message ?? nested?.error;
  if (Array.isArray(msg)) return msg.filter(Boolean).join(', ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return e?.message || fallback;
}

function normalizeListing(raw: unknown): DbfListingPreview | null {
  const row = asRecord(raw);
  if (!row || !str(row.id)) return null;
  return {
    id: str(row.id),
    title: str(row.title) || 'Listing',
    propertyName: str(row.propertyName),
    location: str(row.location),
    priceLabel: str(row.priceLabel),
    status: str(row.status),
    builderName: str(row.builderName),
    imageUrl: str(row.imageUrl),
  };
}

function normalizeSection(raw: unknown): DbfSection | null {
  const row = asRecord(unwrap(raw));
  if (!row || !str(row.id)) return null;
  const items = Array.isArray(row.items) ? row.items : [];
  return {
    id: str(row.id),
    stateId: str(row.stateId),
    cityId: str(row.cityId),
    name: str(row.name),
    autoslide: str(row.autoslide) || '00:00:05',
    sortOrder: Number(row.sortOrder) || 0,
    isActive: row.isActive !== false,
    items: items
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item && str(item.id)))
      .map((item) => ({
        id: str(item.id),
        listingId: str(item.listingId),
        sortOrder: Number(item.sortOrder) || 0,
        listing: normalizeListing(item.listing),
      })),
  };
}

function normalizeBuilder(raw: unknown): DbfBuilderPreview | null {
  const row = asRecord(raw);
  if (!row || !str(row.id)) return null;
  return {
    id: str(row.id),
    name: str(row.name),
    companyName: str(row.companyName),
    companyLogoUrl: str(row.companyLogoUrl),
    contact: str(row.contact),
  };
}

function normalizeTopBuilders(data: unknown): DbfTopBuilderRow[] {
  return asArray(data)
    .map((raw) => asRecord(raw))
    .filter((row): row is Record<string, unknown> => Boolean(row && str(row.id)))
    .map((row) => ({
      id: str(row.id),
      builderUserId: str(row.builderUserId),
      sortOrder: Number(row.sortOrder) || 0,
      isActive: row.isActive !== false,
      builder: normalizeBuilder(row.builder),
    }));
}

const BASE = '/admin/dbf-featured';

export const dbfFeaturedService = {
  listSections: async (params: { stateId: string; cityId: string }): Promise<DbfSection[]> => {
    const res = await axiosClient.get(`${BASE}/sections`, { params });
    return asArray(res.data)
      .map((row) => normalizeSection(row))
      .filter((row): row is DbfSection => !!row);
  },

  createSection: async (payload: {
    stateId: string;
    cityId: string;
    name: string;
    autoslide?: string;
  }): Promise<DbfSection | null> => {
    const res = await axiosClient.post(`${BASE}/sections`, payload);
    return normalizeSection(res.data);
  },

  updateSection: async (
    id: string,
    payload: { name?: string; autoslide?: string; isActive?: boolean },
  ): Promise<DbfSection | null> => {
    const res = await axiosClient.put(`${BASE}/sections/${id}`, payload);
    return normalizeSection(res.data);
  },

  deleteSection: async (id: string): Promise<void> => {
    await axiosClient.delete(`${BASE}/sections/${id}`);
  },

  reorderSections: async (orderedIds: string[]): Promise<void> => {
    await axiosClient.put(`${BASE}/sections/reorder`, { orderedIds });
  },

  addItem: async (sectionId: string, listingId: string): Promise<DbfSection | null> => {
    const res = await axiosClient.post(`${BASE}/sections/${sectionId}/items`, { listingId });
    return normalizeSection(res.data);
  },

  removeItem: async (itemId: string): Promise<DbfSection | null> => {
    const res = await axiosClient.delete(`${BASE}/items/${itemId}`);
    return normalizeSection(res.data);
  },

  reorderItems: async (sectionId: string, orderedIds: string[]): Promise<DbfSection | null> => {
    const res = await axiosClient.put(`${BASE}/sections/${sectionId}/items/reorder`, {
      orderedIds,
    });
    return normalizeSection(res.data);
  },

  searchPosts: async (params: { cityId: string; q?: string }): Promise<DbfListingPreview[]> => {
    const res = await axiosClient.get(`${BASE}/posts`, {
      params: { cityId: params.cityId, ...(params.q?.trim() ? { q: params.q.trim() } : {}) },
    });
    return asArray(res.data)
      .map((row) => normalizeListing(row))
      .filter((row): row is DbfListingPreview => !!row);
  },

  listTopBuilders: async (): Promise<DbfTopBuilderRow[]> => {
    const res = await axiosClient.get(`${BASE}/top-builders`);
    return normalizeTopBuilders(res.data);
  },

  addTopBuilder: async (builderUserId: string): Promise<DbfTopBuilderRow[]> => {
    const res = await axiosClient.post(`${BASE}/top-builders`, { builderUserId });
    return normalizeTopBuilders(res.data);
  },

  setTopBuilderActive: async (id: string, isActive: boolean): Promise<DbfTopBuilderRow[]> => {
    const res = await axiosClient.put(`${BASE}/top-builders/${id}`, { isActive });
    return normalizeTopBuilders(res.data);
  },

  removeTopBuilder: async (id: string): Promise<DbfTopBuilderRow[]> => {
    const res = await axiosClient.delete(`${BASE}/top-builders/${id}`);
    return normalizeTopBuilders(res.data);
  },

  reorderTopBuilders: async (orderedIds: string[]): Promise<DbfTopBuilderRow[]> => {
    const res = await axiosClient.put(`${BASE}/top-builders/reorder`, { orderedIds });
    return normalizeTopBuilders(res.data);
  },

  searchBuilders: async (q?: string): Promise<DbfBuilderPreview[]> => {
    const res = await axiosClient.get(`${BASE}/builders`, {
      params: q?.trim() ? { q: q.trim() } : {},
    });
    return asArray(res.data)
      .map((row) => normalizeBuilder(row))
      .filter((row): row is DbfBuilderPreview => !!row);
  },
};
