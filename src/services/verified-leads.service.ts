import { axiosClient } from '@/lib/axios-client';

export type VerifiedLeadStatus = 'new' | 'contacted' | 'follow_up' | 'closed';

export type VerifiedLeadAssignee = {
  id: string;
  name: string;
  contact?: string | null;
  email?: string | null;
};

export type VerifiedLeadRow = {
  id: string;
  listingId: string;
  projectName: string;
  bhk?: string | null;
  city?: string | null;
  location?: string | null;
  leadContactName?: string | null;
  leadContactPhone?: string | null;
  leadUnitNo?: string | null;
  interestedAt: string;
  status: VerifiedLeadStatus;
  statusLabel: string;
  assignedLocked: boolean;
  assignedStaff: VerifiedLeadAssignee | null;
  assignedAt?: string | null;
  username: string;
  contact?: string | null;
  email?: string | null;
  interestedUserId: string;
  planCode?: string | null;
  isNew?: boolean;
};

export type VerifiedLeadRemark = {
  id: string;
  body: string;
  status?: VerifiedLeadStatus | null;
  statusLabel?: string | null;
  createdAt: string;
  author?: { id: string; name: string } | null;
};

function unwrap<T>(response: { data?: any }): T {
  const raw = response?.data;
  if (raw && typeof raw === 'object' && 'data' in raw && raw.data !== undefined) {
    return raw.data as T;
  }
  return raw as T;
}

export function verifiedLeadsApiError(err: unknown, fallback: string) {
  const anyErr = err as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const msg = anyErr?.response?.data?.message;
  if (Array.isArray(msg) && msg[0]) return String(msg[0]);
  if (typeof msg === 'string' && msg.trim()) return msg;
  if (anyErr?.message) return anyErr.message;
  return fallback;
}

export const verifiedLeadsService = {
  async list(params: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
  } = {}) {
    const response = await axiosClient.get('/admin/verified-leads', {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 50,
        ...(params.q ? { q: params.q } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
    });
    return unwrap<{
      items: VerifiedLeadRow[];
      meta: { page: number; limit: number; total: number; totalPages: number };
      statuses: Array<{ value: VerifiedLeadStatus; label: string }>;
    }>(response);
  },

  async listAssignees() {
    const response = await axiosClient.get('/admin/verified-leads/assignees');
    return unwrap<VerifiedLeadAssignee[]>(response);
  },

  async assign(id: string, staffUserId: string) {
    const response = await axiosClient.patch(
      `/admin/verified-leads/${encodeURIComponent(id)}/assign`,
      { staffUserId },
    );
    return unwrap<VerifiedLeadRow & { remarks?: VerifiedLeadRemark[] }>(response);
  },

  async listRemarks(id: string) {
    const response = await axiosClient.get(
      `/admin/verified-leads/${encodeURIComponent(id)}/remarks`,
    );
    return unwrap<VerifiedLeadRemark[]>(response);
  },

  async addRemark(id: string, body: string, status?: VerifiedLeadStatus) {
    const response = await axiosClient.post(
      `/admin/verified-leads/${encodeURIComponent(id)}/remarks`,
      { body, ...(status ? { status } : {}) },
    );
    return unwrap<VerifiedLeadRemark>(response);
  },

  async updateStatus(id: string, status: VerifiedLeadStatus, remark: string) {
    const response = await axiosClient.patch(
      `/admin/verified-leads/${encodeURIComponent(id)}/status`,
      { status, remark },
    );
    return unwrap<VerifiedLeadRemark>(response);
  },
};
