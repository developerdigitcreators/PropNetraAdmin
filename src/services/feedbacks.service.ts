import { axiosClient } from '@/lib/axios-client';

export type FeedbackUser = {
  id: string | null;
  name: string;
  email: string;
  contact: string;
};

export type FeedbackRemark = {
  id: string;
  text: string;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: { id: string | null; name: string };
};

export type FeedbackItem = {
  id: string;
  message: string;
  createdAt: string | null;
  remarksCount: number;
  user: FeedbackUser;
  remarks?: FeedbackRemark[];
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

function asArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const obj = asRecord(data);
  if (!obj) return [];
  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.feedbacks)) return obj.feedbacks;
  if (Array.isArray(obj.data)) return obj.data;
  return [];
}

function normalizeUser(raw: unknown): FeedbackUser {
  const row = asRecord(raw);
  return {
    id: pickString(row?.id) || null,
    name: pickString(row?.name),
    email: pickString(row?.email),
    contact: pickString(row?.contact, row?.phone),
  };
}

function normalizeRemark(raw: unknown): FeedbackRemark | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = pickString(row.id);
  const text = pickString(row.text, row.remark, row.message);
  if (!id || !text) return null;
  const createdBy = asRecord(row.createdBy) || asRecord(row.created_by);
  return {
    id,
    text,
    createdAt: pickString(row.createdAt, row.created_at) || null,
    updatedAt: pickString(row.updatedAt, row.updated_at) || null,
    createdBy: {
      id: pickString(createdBy?.id) || null,
      name: pickString(createdBy?.name),
    },
  };
}

function normalizeFeedback(raw: unknown): FeedbackItem | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = pickString(row.id);
  const message = pickString(row.message);
  if (!id || !message) return null;
  const remarks = Array.isArray(row.remarks)
    ? row.remarks.map(normalizeRemark).filter((item): item is FeedbackRemark => !!item)
    : undefined;
  return {
    id,
    message,
    createdAt: pickString(row.createdAt, row.created_at) || null,
    remarksCount: Number(row.remarksCount ?? row.remarks_count ?? remarks?.length ?? 0) || 0,
    user: normalizeUser(row.user),
    remarks,
  };
}

export function feedbackApiError(err: unknown, fallback: string): string {
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

export const feedbacksService = {
  list: async (search?: string): Promise<FeedbackItem[]> => {
    const response = await axiosClient.get('/admin/feedbacks', {
      params: search?.trim() ? { search: search.trim() } : undefined,
    });
    return asArray(response.data)
      .map(normalizeFeedback)
      .filter((row): row is FeedbackItem => !!row);
  },

  get: async (id: string): Promise<FeedbackItem | null> => {
    const response = await axiosClient.get(`/admin/feedbacks/${id}`);
    return normalizeFeedback(response.data);
  },

  remove: async (id: string): Promise<void> => {
    await axiosClient.delete(`/admin/feedbacks/${id}`);
  },

  addRemark: async (id: string, text: string): Promise<FeedbackItem | null> => {
    const response = await axiosClient.post(`/admin/feedbacks/${id}/remarks`, { text });
    return normalizeFeedback(response.data);
  },

  updateRemark: async (
    id: string,
    remarkId: string,
    text: string,
  ): Promise<FeedbackItem | null> => {
    const response = await axiosClient.put(`/admin/feedbacks/${id}/remarks/${remarkId}`, {
      text,
    });
    return normalizeFeedback(response.data);
  },

  removeRemark: async (id: string, remarkId: string): Promise<FeedbackItem | null> => {
    const response = await axiosClient.delete(`/admin/feedbacks/${id}/remarks/${remarkId}`);
    return normalizeFeedback(response.data);
  },
};
