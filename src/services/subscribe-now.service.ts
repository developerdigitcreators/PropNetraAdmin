import { axiosClient } from '@/lib/axios-client';

export type SubscribeNowPlanTab = {
  code: string;
  displayName: string;
  sortOrder?: number;
};

export type SubscribeNowRemark = {
  id: string;
  text: string;
  createdById?: string | null;
  createdByName?: string | null;
  createdAt?: string | null;
};

export type SubscribeNowAttempt = {
  id: string;
  userId: string;
  targetPlan: string;
  fromPlan?: string | null;
  source?: string | null;
  status?: string | null;
  remarks: SubscribeNowRemark[];
  remarksCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    contact?: string | null;
    badge?: string | null;
    subscriptionStatus?: string | null;
  } | null;
};

export type SubscribeNowListResult = {
  items: SubscribeNowAttempt[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function normalizeRemark(raw: unknown): SubscribeNowRemark | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = str(row.id);
  const text = str(row.text).trim();
  if (!id || !text) return null;
  return {
    id,
    text,
    createdById: str(row.createdById || row.created_by_id) || null,
    createdByName: str(row.createdByName || row.created_by_name) || null,
    createdAt: str(row.createdAt || row.created_at) || null,
  };
}

function normalizeAttempt(raw: unknown): SubscribeNowAttempt | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = str(row.id);
  const userId = str(row.userId || row.user_id);
  if (!id || !userId) return null;
  const userRaw = asRecord(row.user);
  const remarks = Array.isArray(row.remarks)
    ? row.remarks.map(normalizeRemark).filter(Boolean) as SubscribeNowRemark[]
    : [];
  return {
    id,
    userId,
    targetPlan: str(row.targetPlan || row.target_plan),
    fromPlan: str(row.fromPlan || row.from_plan) || null,
    source: str(row.source) || null,
    status: str(row.status) || null,
    remarks,
    remarksCount: Number(row.remarksCount ?? remarks.length) || remarks.length,
    createdAt: str(row.createdAt || row.created_at) || null,
    updatedAt: str(row.updatedAt || row.updated_at) || null,
    user: userRaw
      ? {
          id: str(userRaw.id),
          name: str(userRaw.name) || null,
          email: str(userRaw.email) || null,
          contact: str(userRaw.contact) || null,
          badge: str(userRaw.badge) || null,
          subscriptionStatus:
            str(userRaw.subscriptionStatus || userRaw.subscription_status) ||
            null,
        }
      : null,
  };
}

export function subscribeNowApiError(err: unknown, fallback: string) {
  const ax = err as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const msg = ax?.response?.data?.message;
  if (Array.isArray(msg) && msg[0]) return String(msg[0]);
  if (typeof msg === 'string' && msg.trim()) return msg;
  if (typeof ax?.message === 'string' && ax.message.trim()) return ax.message;
  return fallback;
}

export const subscribeNowService = {
  listPlans: async (): Promise<SubscribeNowPlanTab[]> => {
    const response = await axiosClient.get('/admin/subscribe-now/plans');
    const rows = Array.isArray(response.data)
      ? response.data
      : Array.isArray(asRecord(response.data)?.items)
        ? (asRecord(response.data)!.items as unknown[])
        : [];
    return rows
      .map((row) => {
        const r = asRecord(row);
        if (!r) return null;
        const code = str(r.code);
        if (!code) return null;
        return {
          code,
          displayName: str(r.displayName || r.display_name) || code,
          sortOrder: Number(r.sortOrder ?? r.sort_order) || 0,
        };
      })
      .filter(Boolean) as SubscribeNowPlanTab[];
  },

  list: async (params: {
    targetPlan?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<SubscribeNowListResult> => {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const response = await axiosClient.get('/admin/subscribe-now', {
      params: {
        page,
        limit,
        ...(params.targetPlan ? { targetPlan: params.targetPlan } : {}),
      },
    });
    const data = asRecord(response.data) || {};
    const meta = asRecord(data.meta) || {};
    const items = Array.isArray(data.items)
      ? (data.items.map(normalizeAttempt).filter(Boolean) as SubscribeNowAttempt[])
      : [];
    return {
      items,
      page: Number(meta.page) || page,
      limit: Number(meta.limit) || limit,
      total: Number(meta.total) || items.length,
      totalPages: Number(meta.totalPages) || 1,
    };
  },

  get: async (id: string): Promise<SubscribeNowAttempt> => {
    const response = await axiosClient.get(`/admin/subscribe-now/${id}`);
    const item = normalizeAttempt(response.data);
    if (!item) throw new Error('Invalid attempt payload');
    return item;
  },

  addRemark: async (id: string, text: string): Promise<SubscribeNowAttempt> => {
    const response = await axiosClient.post(`/admin/subscribe-now/${id}/remarks`, {
      text,
    });
    const item = normalizeAttempt(response.data);
    if (!item) throw new Error('Invalid attempt payload');
    return item;
  },
};
