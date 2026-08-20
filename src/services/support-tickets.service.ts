import { axiosClient } from '@/lib/axios-client';

export type TicketStatus = 'pending' | 'resolved' | 'closed';
export type TicketTier = 'elite' | 'pro' | 'network' | null;

export type TicketUser = {
  id: string | null;
  name: string;
  email: string;
  contact: string;
  badge: string | null;
  network: boolean;
  subscribed: boolean;
  tier: TicketTier;
};

export type TicketMessage = {
  id: string;
  body: string;
  kind: 'open' | 'reissue';
  createdAt: string | null;
};

export type TicketRemark = {
  id: string;
  text: string;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: { id: string | null; name: string };
};

export type SupportTicketItem = {
  id: string;
  ticketNo: number;
  issueType: string;
  status: TicketStatus;
  reissueCount: number;
  createdAt: string | null;
  updatedAt: string | null;
  remarksCount: number;
  user: TicketUser;
  messages?: TicketMessage[];
  remarks?: TicketRemark[];
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
  if (Array.isArray(obj.tickets)) return obj.tickets;
  if (Array.isArray(obj.data)) return obj.data;
  return [];
}

function asStatus(value: unknown): TicketStatus {
  const raw = pickString(value).toLowerCase();
  if (raw === 'resolved' || raw === 'closed' || raw === 'pending') return raw;
  return 'pending';
}

function asTier(value: unknown): TicketTier {
  const raw = pickString(value).toLowerCase();
  if (raw === 'elite' || raw === 'pro' || raw === 'network') return raw;
  return null;
}

function normalizeUser(raw: unknown): TicketUser {
  const row = asRecord(raw);
  return {
    id: pickString(row?.id) || null,
    name: pickString(row?.name),
    email: pickString(row?.email),
    contact: pickString(row?.contact, row?.phone),
    badge: pickString(row?.badge) || null,
    network: row?.network === true,
    subscribed: row?.subscribed === true,
    tier: asTier(row?.tier),
  };
}

function normalizeMessage(raw: unknown): TicketMessage | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = pickString(row.id);
  const body = pickString(row.body, row.message, row.text);
  if (!id || !body) return null;
  return {
    id,
    body,
    kind: pickString(row.kind).toLowerCase() === 'reissue' ? 'reissue' : 'open',
    createdAt: pickString(row.createdAt, row.created_at) || null,
  };
}

function normalizeRemark(raw: unknown): TicketRemark | null {
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

function normalizeTicket(raw: unknown): SupportTicketItem | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = pickString(row.id);
  const issueType = pickString(row.issueType, row.issue_type);
  if (!id || !issueType) return null;
  const remarks = Array.isArray(row.remarks)
    ? row.remarks.map(normalizeRemark).filter((item): item is TicketRemark => !!item)
    : undefined;
  const messages = Array.isArray(row.messages)
    ? row.messages.map(normalizeMessage).filter((item): item is TicketMessage => !!item)
    : undefined;
  return {
    id,
    ticketNo: Number(row.ticketNo ?? row.ticket_no ?? 0) || 0,
    issueType,
    status: asStatus(row.status),
    reissueCount: Number(row.reissueCount ?? row.reissue_count ?? 0) || 0,
    createdAt: pickString(row.createdAt, row.created_at) || null,
    updatedAt: pickString(row.updatedAt, row.updated_at) || null,
    remarksCount: Number(row.remarksCount ?? row.remarks_count ?? remarks?.length ?? 0) || 0,
    user: normalizeUser(row.user),
    messages,
    remarks,
  };
}

export function ticketApiError(err: unknown, fallback: string): string {
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

export const supportTicketsService = {
  list: async (search?: string, status?: TicketStatus | ''): Promise<SupportTicketItem[]> => {
    const response = await axiosClient.get('/admin/support-tickets', {
      params: {
        ...(search?.trim() ? { search: search.trim() } : {}),
        ...(status ? { status } : {}),
      },
    });
    return asArray(response.data)
      .map(normalizeTicket)
      .filter((row): row is SupportTicketItem => !!row);
  },

  get: async (id: string): Promise<SupportTicketItem | null> => {
    const response = await axiosClient.get(`/admin/support-tickets/${id}`);
    return normalizeTicket(response.data);
  },

  remove: async (id: string): Promise<void> => {
    await axiosClient.delete(`/admin/support-tickets/${id}`);
  },

  addRemark: async (id: string, text: string): Promise<SupportTicketItem | null> => {
    const response = await axiosClient.post(`/admin/support-tickets/${id}/remarks`, { text });
    return normalizeTicket(response.data);
  },

  updateRemark: async (
    id: string,
    remarkId: string,
    text: string,
  ): Promise<SupportTicketItem | null> => {
    const response = await axiosClient.put(`/admin/support-tickets/${id}/remarks/${remarkId}`, {
      text,
    });
    return normalizeTicket(response.data);
  },

  removeRemark: async (id: string, remarkId: string): Promise<SupportTicketItem | null> => {
    const response = await axiosClient.delete(
      `/admin/support-tickets/${id}/remarks/${remarkId}`,
    );
    return normalizeTicket(response.data);
  },

  updateStatus: async (
    id: string,
    status: TicketStatus,
    text: string,
  ): Promise<SupportTicketItem | null> => {
    const response = await axiosClient.put(`/admin/support-tickets/${id}/status`, {
      status,
      text,
    });
    return normalizeTicket(response.data);
  },
};
