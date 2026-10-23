import { axiosClient } from '@/lib/axios-client';
import { deleteWithRemark } from '@/lib/delete-with-remark';

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CreateFaqPayload = {
  question: string;
  answer: string;
  isActive?: boolean;
};

export type UpdateFaqPayload = Partial<CreateFaqPayload> & {
  sortOrder?: number;
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
  if (Array.isArray(obj.faqs)) return obj.faqs;
  if (Array.isArray(obj.data)) return obj.data;
  return [];
}

export function faqApiError(err: unknown, fallback: string): string {
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

export function normalizeFaq(raw: unknown, index = 0): FaqItem | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = pickString(row.id);
  const question = pickString(row.question, row.title);
  if (!id || !question) return null;
  return {
    id,
    question,
    answer: pickString(row.answer, row.content, row.body),
    isActive: asBool(row.isActive ?? row.is_active, true),
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? index + 1) || index + 1,
    createdAt: pickString(row.createdAt, row.created_at) || null,
    updatedAt: pickString(row.updatedAt, row.updated_at) || null,
  };
}

export const faqsService = {
  list: async (): Promise<FaqItem[]> => {
    const response = await axiosClient.get('/admin/faqs');
    return asArray(response.data)
      .map((row, index) => normalizeFaq(row, index))
      .filter((row): row is FaqItem => !!row)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  create: async (payload: CreateFaqPayload): Promise<FaqItem | null> => {
    const response = await axiosClient.post('/admin/faqs', payload);
    return normalizeFaq(response.data);
  },

  update: async (id: string, payload: UpdateFaqPayload): Promise<FaqItem | null> => {
    const response = await axiosClient.put(`/admin/faqs/${id}`, payload);
    return normalizeFaq(response.data);
  },

  reorder: async (orderedIds: string[]): Promise<void> => {
    await axiosClient.put('/admin/faqs/reorder', { orderedIds });
  },

  remove: async (id: string, remark: string): Promise<void> => {
    await deleteWithRemark(`/admin/faqs/${id}`, remark);
  },
};
