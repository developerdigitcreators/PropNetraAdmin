import { axiosClient } from '@/lib/axios-client';

export type DevProjectPreview = {
  id: string;
  title: string;
  location: string;
  priceLabel: string;
  status: string;
  developerName: string;
  imageUrl: string;
  hasSimilarSet?: boolean;
};

export type DevSimilarSetSummary = {
  listingId: string;
  autoslide: string;
  isActive: boolean;
  similarCount: number;
  listing: DevProjectPreview | null;
};

export type DevSimilarSet = {
  listing: DevProjectPreview | null;
  autoslide: string;
  isActive: boolean;
  items: DevProjectPreview[];
};

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

function normalizeProject(raw: unknown): DevProjectPreview | null {
  const row = asRecord(raw);
  if (!row || !str(row.id)) return null;
  return {
    id: str(row.id),
    title: str(row.title) || 'Project',
    location: str(row.location),
    priceLabel: str(row.priceLabel),
    status: str(row.status),
    developerName: str(row.developerName),
    imageUrl: str(row.imageUrl),
    hasSimilarSet: row.hasSimilarSet === true,
  };
}

function normalizeSet(raw: unknown): DevSimilarSet {
  const row = asRecord(unwrap(raw)) || {};
  return {
    listing: normalizeProject(row.listing),
    autoslide: str(row.autoslide) || '00:00:05',
    isActive: row.isActive !== false,
    items: (Array.isArray(row.items) ? row.items : [])
      .map(normalizeProject)
      .filter((p): p is DevProjectPreview => !!p),
  };
}

export function devSimilarApiError(err: unknown, fallback: string): string {
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

const BASE = '/admin/developer-similar-projects';

export const developerSimilarProjectsService = {
  listSets: async (): Promise<DevSimilarSetSummary[]> => {
    const res = await axiosClient.get(BASE);
    return asArray(res.data)
      .map((raw) => asRecord(raw))
      .filter((row): row is Record<string, unknown> => Boolean(row && str(row.listingId)))
      .map((row) => ({
        listingId: str(row.listingId),
        autoslide: str(row.autoslide) || '00:00:05',
        isActive: row.isActive !== false,
        similarCount: Number(row.similarCount) || 0,
        listing: normalizeProject(row.listing),
      }));
  },

  searchPosts: async (q?: string): Promise<DevProjectPreview[]> => {
    const res = await axiosClient.get(`${BASE}/posts`, {
      params: { limit: 30, ...(q?.trim() ? { q: q.trim() } : {}) },
    });
    return asArray(res.data)
      .map(normalizeProject)
      .filter((p): p is DevProjectPreview => !!p);
  },

  /** Every published Developer project (backend caps each page at 50). */
  listAllPosts: async (): Promise<DevProjectPreview[]> => {
    const pageSize = 50;
    const all: DevProjectPreview[] = [];
    for (let page = 1; page <= 40; page += 1) {
      const res = await axiosClient.get(`${BASE}/posts`, { params: { page, limit: pageSize } });
      const rows = asArray(res.data);
      const total = Number(asRecord(unwrap(res.data))?.total) || 0;
      all.push(...rows.map(normalizeProject).filter((p): p is DevProjectPreview => !!p));
      if (rows.length < pageSize || (total && all.length >= total)) break;
    }
    return all;
  },

  getSet: async (listingId: string): Promise<DevSimilarSet> => {
    const res = await axiosClient.get(`${BASE}/${listingId}`);
    return normalizeSet(res.data);
  },

  saveSet: async (
    listingId: string,
    payload: { similarListingIds: string[]; autoslide: string; isActive: boolean },
  ): Promise<DevSimilarSet> => {
    const res = await axiosClient.put(`${BASE}/${listingId}`, payload);
    return normalizeSet(res.data);
  },

  deleteSet: async (listingId: string): Promise<void> => {
    await axiosClient.delete(`${BASE}/${listingId}`);
  },
};
