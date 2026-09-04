import { axiosClient } from '@/lib/axios-client';

export type AccountDeletionStatus = 'pending_otp' | 'completed';
export type AccountDeletionChannel = 'mobile' | 'email' | '';

export type AccountDeletionUser = {
  id: string;
  name: string;
  email: string;
  contact: string;
  status: string;
  deletedAt: string | null;
};

export type AccountDeletionRequest = {
  id: string;
  status: AccountDeletionStatus;
  reason: string;
  channel: AccountDeletionChannel;
  createdAt: string | null;
  completedAt: string | null;
  otpExpiresAt: string | null;
  isNew?: boolean;
  user: AccountDeletionUser | null;
};

export type AccountDeletionListResult = {
  items: AccountDeletionRequest[];
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

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function pickNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

function asArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const obj = asRecord(data);
  if (!obj) return [];
  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.requests)) return obj.requests;
  if (Array.isArray(obj.accountDeletions)) return obj.accountDeletions;
  if (Array.isArray(obj.data)) return obj.data;
  return [];
}

function asStatus(value: unknown): AccountDeletionStatus {
  const raw = pickString(value).toLowerCase().replace(/[\s-]+/g, '_');
  if (raw === 'completed' || raw === 'complete' || raw === 'verified') return 'completed';
  return 'pending_otp';
}

function asChannel(value: unknown): AccountDeletionChannel {
  const raw = pickString(value).toLowerCase();
  if (raw === 'mobile' || raw === 'phone' || raw === 'sms') return 'mobile';
  if (raw === 'email') return 'email';
  return '';
}

function normalizeUser(raw: unknown): AccountDeletionUser | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = pickString(row.id, row.userId, row.user_id);
  const name = pickString(row.name, row.fullName, row.full_name);
  const email = pickString(row.email);
  const contact = pickString(row.contact, row.phone, row.mobile);
  const status = pickString(row.status, row.accountStatus, row.account_status);
  const deletedAt =
    pickString(row.deletedAt, row.deleted_at) || null;
  if (!id && !name && !email && !contact) return null;
  return { id, name, email, contact, status, deletedAt };
}

export function normalizeAccountDeletion(raw: unknown): AccountDeletionRequest | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = pickString(row.id);
  if (!id) return null;
  const user =
    normalizeUser(row.user) ||
    normalizeUser(row.account) ||
    normalizeUser({
      id: row.userId ?? row.user_id,
      name: row.userName ?? row.user_name,
      email: row.userEmail ?? row.user_email,
      contact: row.userContact ?? row.user_contact ?? row.phone ?? row.mobile,
      status: row.userStatus ?? row.user_status,
      deletedAt: row.userDeletedAt ?? row.user_deleted_at,
    });

  return {
    id,
    status: asStatus(row.status),
    reason: pickString(row.reason, row.deleteReason, row.delete_reason),
    channel: asChannel(row.channel, row.otpChannel, row.otp_channel),
    createdAt:
      pickString(row.createdAt, row.created_at, row.requestedAt, row.requested_at) || null,
    completedAt:
      pickString(
        row.completedAt,
        row.completed_at,
        row.verifiedAt,
        row.verified_at,
        row.confirmedAt,
        row.confirmed_at,
      ) || null,
    otpExpiresAt:
      pickString(row.otpExpiresAt, row.otp_expires_at, row.expiresAt, row.expires_at) || null,
    isNew: row.isNew === true,
    user,
  };
}

function normalizeList(data: unknown, page: number, limit: number): AccountDeletionListResult {
  const root = asRecord(data);
  const items = asArray(data)
    .map(normalizeAccountDeletion)
    .filter((row): row is AccountDeletionRequest => !!row);

  const total =
    pickNumber(root?.total, root?.totalCount, root?.total_count, root?.count) ?? items.length;
  const resolvedPage = pickNumber(root?.page, root?.currentPage, root?.current_page) ?? page;
  const resolvedLimit = pickNumber(root?.limit, root?.pageSize, root?.page_size) ?? limit;
  const totalPages =
    pickNumber(root?.totalPages, root?.total_pages) ??
    Math.max(1, Math.ceil(total / Math.max(1, resolvedLimit)));

  return {
    items,
    total,
    page: resolvedPage,
    limit: resolvedLimit,
    totalPages,
  };
}

export function accountDeletionApiError(err: unknown, fallback: string): string {
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

export const accountDeletionsService = {
  list: async (params?: {
    status?: AccountDeletionStatus | '';
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<AccountDeletionListResult> => {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const response = await axiosClient.get('/admin/account-deletions', {
      params: {
        status: params?.status || undefined,
        search: params?.search?.trim() || undefined,
        page,
        limit,
      },
    });
    return normalizeList(response.data, page, limit);
  },

  get: async (id: string): Promise<AccountDeletionRequest | null> => {
    const response = await axiosClient.get(`/admin/account-deletions/${id}`);
    const root = asRecord(response.data);
    const nested = root?.data ?? root?.request ?? root?.item ?? response.data;
    return normalizeAccountDeletion(nested);
  },
};
