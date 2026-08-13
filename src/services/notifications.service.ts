import { axiosClient } from '@/lib/axios-client';

export const NOTIFICATION_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'listing', label: 'Listing' },
  { value: 'chat', label: 'Chat' },
  { value: 'promotional', label: 'Promotional' },
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]['value'] | string;

export type AdminNotificationUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  contact?: string | null;
};

export type AdminNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  userId?: string | null;
  userIds?: string[];
  user?: AdminNotificationUser | null;
  users?: AdminNotificationUser[];
  recipientCount?: number;
  status?: string | null;
  createdAt?: string | null;
  sentAt?: string | null;
};

export type NotificationListParams = {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
};

export type NotificationListResult = {
  items: AdminNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  serverPaginated: boolean;
};

export type SendNotificationPayload = {
  userId: string;
  title: string;
  body: string;
  type: string;
};

export type SendBulkNotificationPayload = {
  userIds: string[];
  title: string;
  body: string;
  type: string;
};

function str(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function asUser(raw: unknown): AdminNotificationUser | null {
  if (!raw || typeof raw !== 'object') return null;
  const u = raw as Record<string, unknown>;
  return {
    id: str(u.id || u.userId || u.user_id) || undefined,
    name: (u.name as string) ?? null,
    email: (u.email as string) ?? null,
    contact: (u.contact as string) ?? (u.phone as string) ?? null,
  };
}

function asUsers(raw: unknown): AdminNotificationUser[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(asUser).filter((u): u is AdminNotificationUser => !!u);
}

export function normalizeNotification(raw: unknown): AdminNotification {
  const n = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const user = asUser(n.user || n.recipient);
  const users = asUsers(n.users || n.recipients);
  const userIds = Array.isArray(n.userIds)
    ? (n.userIds as unknown[]).map(str).filter(Boolean)
    : Array.isArray(n.user_ids)
      ? (n.user_ids as unknown[]).map(str).filter(Boolean)
      : [];
  const userId = str(n.userId || n.user_id || user?.id) || null;
  const recipientCount =
    Number(n.recipientCount ?? n.recipient_count ?? n.sentCount ?? n.sent_count) ||
    users.length ||
    userIds.length ||
    (userId ? 1 : 0);

  return {
    id: str(n.id),
    title: str(n.title),
    body: str(n.body || n.message),
    type: str(n.type || 'general'),
    userId,
    userIds,
    user,
    users,
    recipientCount,
    status: (n.status as string) ?? null,
    createdAt: str(n.createdAt || n.created_at || n.sentAt || n.sent_at) || null,
    sentAt: str(n.sentAt || n.sent_at) || null,
  };
}

function asListResult(data: unknown, page: number, limit: number): NotificationListResult {
  if (Array.isArray(data)) {
    const items = data.map(normalizeNotification);
    return {
      items,
      total: items.length,
      page: 1,
      limit: items.length || limit,
      totalPages: 1,
      serverPaginated: false,
    };
  }

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const rawItems = obj.items || obj.notifications || obj.data || obj.rows;
    const items = Array.isArray(rawItems) ? rawItems.map(normalizeNotification) : [];
    const hasPaging =
      obj.total != null || obj.page != null || obj.totalPages != null || obj.limit != null;
    const total = Number(obj.total ?? obj.count ?? items.length) || items.length;
    const p = Number(obj.page ?? page) || page;
    const l = Number(obj.limit ?? obj.pageSize ?? obj.perPage ?? limit) || limit;
    const totalPages = Number(obj.totalPages ?? obj.total_pages ?? Math.max(1, Math.ceil(total / l))) || 1;
    return {
      items,
      total,
      page: p,
      limit: l,
      totalPages,
      serverPaginated: hasPaging,
    };
  }

  return { items: [], total: 0, page, limit, totalPages: 1, serverPaginated: false };
}

export function notificationApiError(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: unknown; error?: unknown } }; message?: string };
  const msg = e?.response?.data?.message ?? e?.response?.data?.error;
  if (Array.isArray(msg)) return msg.filter(Boolean).join(', ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return e?.message || fallback;
}

export const notificationsService = {
  getNotifications: async (params: NotificationListParams = {}): Promise<NotificationListResult> => {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const query: Record<string, string | number> = { page, limit };
    if (params.search?.trim()) query.search = params.search.trim();
    if (params.type?.trim()) query.type = params.type.trim();
    const response = await axiosClient.get('/admin/notifications', { params: query });
    return asListResult(response.data, page, limit);
  },

  send: async (payload: SendNotificationPayload) => {
    const response = await axiosClient.post('/admin/notifications/send', payload);
    return response.data;
  },

  sendBulk: async (payload: SendBulkNotificationPayload) => {
    const response = await axiosClient.post('/admin/notifications/send-bulk', payload);
    return response.data;
  },
};
