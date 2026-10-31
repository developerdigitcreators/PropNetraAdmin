import { axiosClient } from '@/lib/axios-client';

export type LegalSection = {
  id: string;
  title: string;
  bodyHtml: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type LegalSectionPayload = {
  title: string;
  bodyHtml: string;
  isActive?: boolean;
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
  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.sections)) return obj.sections;
  if (Array.isArray(obj.data)) return obj.data;
  return [];
}

export function normalizeLegalSection(raw: unknown, index = 0): LegalSection | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = pickString(row.id);
  const title = pickString(row.title, row.name, row.question);
  if (!id || !title) return null;
  return {
    id,
    title,
    bodyHtml: pickString(row.bodyHtml, row.body_html, row.body, row.content, row.html),
    isActive: asBool(row.isActive ?? row.is_active, true),
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? index + 1) || index + 1,
    createdAt: pickString(row.createdAt, row.created_at) || null,
    updatedAt: pickString(row.updatedAt, row.updated_at) || null,
  };
}

export const legalSectionsService = {
  list: async (slug: string): Promise<LegalSection[]> => {
    const response = await axiosClient.get(`/admin/legal/${slug}/sections`);
    return asArray(response.data)
      .map((row, index) => normalizeLegalSection(row, index))
      .filter((row): row is LegalSection => !!row)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  get: async (slug: string, id: string): Promise<LegalSection | null> => {
    const response = await axiosClient.get(`/admin/legal/${slug}/sections/${id}`);
    return normalizeLegalSection(response.data);
  },

  create: async (slug: string, payload: LegalSectionPayload): Promise<LegalSection | null> => {
    const response = await axiosClient.post(`/admin/legal/${slug}/sections`, {
      title: payload.title,
      bodyHtml: payload.bodyHtml,
      isActive: payload.isActive,
    });
    return normalizeLegalSection(response.data);
  },

  update: async (
    slug: string,
    id: string,
    payload: Partial<LegalSectionPayload>,
  ): Promise<LegalSection | null> => {
    const response = await axiosClient.put(`/admin/legal/${slug}/sections/${id}`, payload);
    return normalizeLegalSection(response.data);
  },

  reorder: async (slug: string, orderedIds: string[]): Promise<void> => {
    await axiosClient.put(`/admin/legal/${slug}/sections/reorder`, { orderedIds });
  },

  remove: async (slug: string, id: string): Promise<void> => {
    await axiosClient.delete(`/admin/legal/${slug}/sections/${id}`);
  },
};
