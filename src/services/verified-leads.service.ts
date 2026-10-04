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
  nextFollowUpAt?: string | null;
  sourceKind?: 'lead' | 'viewer';
  dashboardAlert?: boolean;
  latestRemark?: VerifiedLeadRemark | null;
  userRole?: VerifiedLeadUserRole | 'other' | null;
  userRoleLabel?: string | null;
};

export type VerifiedLeadKind = 'all' | 'leads' | 'listing_viewers';
export type VerifiedLeadUserRole = 'agent' | 'developer' | 'direct_builder_floor';

/** Filters shared by the list and filter-options calls ('all' / '' = not applied). */
export type VerifiedLeadFilters = {
  kind?: VerifiedLeadKind;
  status?: string;
  userRole?: string;
  project?: string;
  assigneeId?: string;
  from?: string;
  to?: string;
  followUpFrom?: string;
  followUpTo?: string;
  q?: string;
};

export type VerifiedLeadFilterOption = {
  value: string;
  label: string;
  count: number;
  contact?: string | null;
};

export type VerifiedLeadFilterOptions = {
  total: number;
  status: VerifiedLeadFilterOption[];
  kind: VerifiedLeadFilterOption[];
  userRole: VerifiedLeadFilterOption[];
  project: VerifiedLeadFilterOption[];
  assignee: VerifiedLeadFilterOption[];
};

/** Single source for query params so list and filter-options never diverge. */
export function buildVerifiedLeadsQuery(
  f: VerifiedLeadFilters,
): Record<string, string> {
  const out: Record<string, string> = {};
  const put = (key: string, value?: string) => {
    const v = (value ?? '').trim();
    if (v && v !== 'all') out[key] = v;
  };
  put('kind', f.kind);
  put('status', f.status);
  put('userRole', f.userRole);
  put('project', f.project);
  put('assigneeId', f.assigneeId);
  put('from', f.from);
  put('to', f.to);
  put('followUpFrom', f.followUpFrom);
  put('followUpTo', f.followUpTo);
  put('q', f.q);
  return out;
}

function asOptions(raw: unknown): VerifiedLeadFilterOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row): VerifiedLeadFilterOption | null => {
      const r = row as Record<string, unknown>;
      const value = String(r?.value ?? '');
      if (!value) return null;
      return {
        value,
        label: String(r.label ?? value),
        count: Number(r.count) || 0,
        contact: r.contact == null ? null : String(r.contact),
      };
    })
    .filter((o): o is VerifiedLeadFilterOption => !!o);
}

export type VerifiedLeadRemark = {
  id: string;
  body: string;
  status?: VerifiedLeadStatus | null;
  statusLabel?: string | null;
  nextFollowUpAt?: string | null;
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
  async list(
    filters: VerifiedLeadFilters,
    paging: { page?: number; limit?: number } = {},
  ) {
    const response = await axiosClient.get('/admin/verified-leads', {
      params: {
        page: paging.page ?? 1,
        limit: paging.limit ?? 50,
        ...buildVerifiedLeadsQuery(filters),
      },
    });
    return unwrap<{
      items: VerifiedLeadRow[];
      meta: { page: number; limit: number; total: number; totalPages: number };
      statuses: Array<{ value: VerifiedLeadStatus; label: string }>;
    }>(response);
  },

  async filterOptions(filters: VerifiedLeadFilters): Promise<VerifiedLeadFilterOptions> {
    const response = await axiosClient.get('/admin/verified-leads/filter-options', {
      params: buildVerifiedLeadsQuery(filters),
    });
    const body = (unwrap<Record<string, unknown>>(response) || {}) as Record<
      string,
      unknown
    >;
    return {
      total: Number(body.total) || 0,
      status: asOptions(body.status),
      kind: asOptions(body.kind),
      userRole: asOptions(body.userRole),
      project: asOptions(body.project),
      assignee: asOptions(body.assignee),
    };
  },

  async listRemarks(id: string) {
    const response = await axiosClient.get(
      `/admin/verified-leads/${encodeURIComponent(id)}/remarks`,
    );
    return unwrap<VerifiedLeadRemark[]>(response);
  },

  async addRemark(
    id: string,
    body: string,
    status?: VerifiedLeadStatus,
    nextFollowUpAt?: string,
  ) {
    const response = await axiosClient.post(
      `/admin/verified-leads/${encodeURIComponent(id)}/remarks`,
      {
        body,
        ...(status ? { status } : {}),
        ...(nextFollowUpAt ? { nextFollowUpAt } : {}),
      },
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
