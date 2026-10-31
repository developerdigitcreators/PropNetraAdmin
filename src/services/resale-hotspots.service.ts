import { axiosClient } from '@/lib/axios-client';
import { deleteWithRemark } from '@/lib/delete-with-remark';

export type ResaleHotspot = {
  id: string;
  stateId: string;
  cityId: string;
  microMarketId: string;
  microMarketName: string;
  isActive: boolean;
  sortOrder: number;
};

export type ResaleHotspotOption = {
  id: string;
  name: string;
};

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
  for (const key of ['items', 'hotspots', 'options', 'microMarkets', 'data']) {
    if (Array.isArray(obj[key])) return obj[key] as unknown[];
  }
  return [];
}

export function resaleHotspotsApiError(err: unknown, fallback: string): string {
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

export function normalizeResaleHotspot(raw: unknown, index = 0): ResaleHotspot | null {
  const row = asRecord(raw);
  if (!row) return null;
  const mm = asRecord(row.microMarket ?? row.micro_market);
  const id = pickString(row.id);
  const microMarketId = pickString(row.microMarketId, row.micro_market_id, mm?.id);
  if (!id || !microMarketId) return null;
  const stateObj = asRecord(row.state);
  const cityObj = asRecord(row.city);
  return {
    id,
    stateId: pickString(row.stateId, row.state_id, stateObj?.id),
    cityId: pickString(row.cityId, row.city_id, cityObj?.id),
    microMarketId,
    microMarketName:
      pickString(
        row.microMarketName,
        row.micro_market_name,
        row.name,
        mm?.name,
        mm?.title,
      ) || 'Micromarket',
    isActive: asBool(row.isActive ?? row.is_active, true),
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? index + 1) || index + 1,
  };
}

export function normalizeResaleHotspotOption(raw: unknown): ResaleHotspotOption | null {
  const row = asRecord(raw);
  if (!row) return null;
  const mm = asRecord(row.microMarket ?? row.micro_market);
  const id = pickString(row.microMarketId, row.micro_market_id, row.id, mm?.id);
  if (!id) return null;
  return {
    id,
    name: pickString(row.name, row.microMarketName, row.micro_market_name, mm?.name) || 'Micromarket',
  };
}

export const resaleHotspotsService = {
  list: async (params: { stateId?: string; cityId?: string }): Promise<ResaleHotspot[]> => {
    const response = await axiosClient.get('/admin/resale-hotspots', {
      params: {
        ...(params.stateId ? { stateId: params.stateId } : {}),
        ...(params.cityId ? { cityId: params.cityId } : {}),
      },
    });
    return asArray(response.data)
      .map((row, index) => normalizeResaleHotspot(row, index))
      .filter((row): row is ResaleHotspot => !!row)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  options: async (cityId: string): Promise<ResaleHotspotOption[]> => {
    const response = await axiosClient.get('/admin/resale-hotspots/options', {
      params: { cityId },
    });
    return asArray(response.data)
      .map((row) => normalizeResaleHotspotOption(row))
      .filter((row): row is ResaleHotspotOption => !!row);
  },

  create: async (payload: {
    stateId: string;
    cityId: string;
    microMarketId: string;
  }): Promise<ResaleHotspot | null> => {
    const response = await axiosClient.post('/admin/resale-hotspots', payload);
    return normalizeResaleHotspot(response.data);
  },

  update: async (id: string, payload: { isActive: boolean }): Promise<ResaleHotspot | null> => {
    const response = await axiosClient.put(`/admin/resale-hotspots/${id}`, payload);
    return normalizeResaleHotspot(response.data);
  },

  reorder: async (cityId: string, orderedIds: string[]): Promise<void> => {
    await axiosClient.put('/admin/resale-hotspots/reorder', { cityId, orderedIds });
  },

  remove: async (id: string, remark: string): Promise<void> => {
    await deleteWithRemark(`/admin/resale-hotspots/${id}`, remark);
  },
};
