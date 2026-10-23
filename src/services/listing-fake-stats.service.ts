import { axiosClient } from '@/lib/axios-client';

export type FakeStatsRole = 'agent' | 'dbf' | 'developer';

export type ListingFakeStatsRow = {
  listingId: string;
  title: string;
  projectName: string | null;
  roleLabel: string | null;
  cityName: string | null;
  stateName: string | null;
  ownerName: string | null;
  planCode: string | null;
  realViews: number;
  fakeViews: number;
};

export type FakeStatsSummary = {
  totalListings: number;
  realViews: number;
  fakeViews: number;
};

export type ListingFakeStatsPage = {
  items: ListingFakeStatsRow[];
  total: number;
  page: number;
  limit: number;
  summary: FakeStatsSummary | null;
};

export type FakeStatsIdOption = { id: string; name: string; count: number | null };
export type FakeStatsValueOption = { value: string; label: string; count: number | null };

export type FakeStatsFilterOptions = {
  states: FakeStatsIdOption[];
  cities: FakeStatsIdOption[];
  roles: FakeStatsValueOption[];
  plans: string[];
  planOptions: FakeStatsValueOption[];
  projects: FakeStatsIdOption[];
  summary: FakeStatsSummary | null;
};

export type FakeStatsScheduleStatus = 'pending' | 'running' | 'completed' | 'cancelled' | 'issue';

export type FakeStatsSchedule = {
  id: string;
  role: FakeStatsRole;
  roleLabel: string;
  date: string;
  startTime: string;
  endTime: string;
  timeRange: string;
  status: FakeStatsScheduleStatus;
  statusLabel: string;
  error: string | null;
  addedBy: { id: string; name: string } | null;
  listingsCount: number;
  viewsPlanned: number;
  viewsAdded: number;
  canEdit: boolean;
  canCancel: boolean;
  canDelete: boolean;
  canRenew: boolean;
};

export type FakeStatsScheduleSection = {
  role: FakeStatsRole;
  label: string;
  hasSection: boolean;
  scriptEnabled: boolean;
  counts: Record<string, number>;
  items: FakeStatsSchedule[];
};

export type FakeStatsSchedules = {
  total: number;
  historyTotal: number;
  sections: FakeStatsScheduleSection[];
};

export type FakeStatsHistory = {
  items: FakeStatsSchedule[];
  total: number;
  counts: { completed: number; cancelled: number; issue: number };
};

export type FakeStatsScheduleInput = { date: string; startTime: string; endTime: string };

export type FakeStatsRoleSettings = {
  role: FakeStatsRole;
  label: string;
  listingViewersOn: boolean;
  scriptEnabled: boolean;
  canEnableScript: boolean;
  selected: boolean;
  viewsMinPerDay: number;
  viewsMaxPerDay: number;
  maxViews: number;
};

export type ListingFakeStatsSettings = {
  cityId: string;
  cityName: string;
  stateName: string;
  roles: FakeStatsRoleSettings[];
  selectedRoles: FakeStatsRole[];
  nextRunAt: string | null;
  lastRunAt: string | null;
};

export type RoleViewsInput = Pick<
  FakeStatsRoleSettings,
  'viewsMinPerDay' | 'viewsMaxPerDay' | 'maxViews'
>;

export type ListingFakeStatsSettingsPatch = {
  scriptEnabled?: Partial<Record<FakeStatsRole, boolean>>;
  selectedRoles?: FakeStatsRole[];
  roles?: Partial<Record<FakeStatsRole, RoleViewsInput>>;
};

export type ListingFakeStatsCounts = Pick<
  ListingFakeStatsRow,
  'listingId' | 'realViews' | 'fakeViews'
>;

export type FakeStatsQuery = {
  stateId?: string;
  cityId?: string;
  role?: string;
  plan?: string;
  projectId?: string;
};

function unwrap<T>(data: unknown): T {
  const obj = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return ('data' in obj && obj.data !== undefined ? obj.data : obj) as T;
}

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function compact(query: object): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ) as Record<string, string | number>;
}

const ROLE_KEYS: FakeStatsRole[] = ['agent', 'dbf', 'developer'];

function asRole(v: unknown): FakeStatsRole | null {
  const s = str(v).toLowerCase();
  return (ROLE_KEYS as string[]).includes(s) ? (s as FakeStatsRole) : null;
}

function normalizeSettings(raw: unknown): ListingFakeStatsSettings {
  const r = rec(raw);
  return {
    cityId: str(r.cityId),
    cityName: str(r.cityName),
    stateName: str(r.stateName),
    roles: arr(r.roles)
      .map((x) => {
        const o = rec(x);
        const role = asRole(o.role);
        if (!role) return null;
        return {
          role,
          label: str(o.label) || role,
          listingViewersOn: o.listingViewersOn === true,
          scriptEnabled: o.scriptEnabled === true,
          canEnableScript: o.canEnableScript !== false,
          selected: o.selected === true,
          viewsMinPerDay: num(o.viewsMinPerDay),
          viewsMaxPerDay: num(o.viewsMaxPerDay),
          maxViews: num(o.maxViews),
        } satisfies FakeStatsRoleSettings;
      })
      .filter((x): x is FakeStatsRoleSettings => x !== null),
    selectedRoles: arr(r.selectedRoles)
      .map(asRole)
      .filter((x): x is FakeStatsRole => x !== null),
    nextRunAt: str(r.nextRunAt) || null,
    lastRunAt: str(r.lastRunAt) || null,
  };
}

function normalizeRow(raw: unknown): ListingFakeStatsRow {
  const r = rec(raw);
  return {
    listingId: str(r.listingId),
    title: str(r.title),
    projectName: str(r.projectName) || null,
    roleLabel: str(r.roleLabel) || null,
    cityName: str(r.cityName) || null,
    stateName: str(r.stateName) || null,
    ownerName: str(r.ownerName) || null,
    planCode: str(r.planCode) || null,
    realViews: num(r.realViews),
    fakeViews: num(r.fakeViews),
  };
}

function optCount(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeSummary(raw: unknown): FakeStatsSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = rec(raw);
  return {
    totalListings: num(r.totalListings ?? r.total ?? r.listings),
    realViews: num(r.realViews),
    fakeViews: num(r.fakeViews),
  };
}

const SCHEDULE_STATUSES: FakeStatsScheduleStatus[] = ['pending', 'running', 'completed', 'cancelled', 'issue'];

function asStatus(v: unknown): FakeStatsScheduleStatus {
  const s = str(v).toLowerCase();
  if (s === 'canceled') return 'cancelled';
  if (s === 'failed' || s === 'error') return 'issue';
  return (SCHEDULE_STATUSES as string[]).includes(s) ? (s as FakeStatsScheduleStatus) : 'pending';
}

function hhmm(v: unknown) {
  const m = /^(\d{1,2}):(\d{2})/.exec(str(v));
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
}

function normalizeSchedule(raw: unknown): FakeStatsSchedule {
  const r = rec(raw);
  const by = rec(r.addedBy);
  const startTime = hhmm(r.startTime);
  const endTime = hhmm(r.endTime);
  const status = asStatus(r.status);
  return {
    id: str(r.id),
    role: asRole(r.role) || 'agent',
    roleLabel: str(r.roleLabel) || str(r.role),
    date: str(r.date).slice(0, 10),
    startTime,
    endTime,
    timeRange: str(r.timeRange) || (startTime && endTime ? `${startTime}–${endTime}` : ''),
    status,
    statusLabel: str(r.statusLabel) || status.charAt(0).toUpperCase() + status.slice(1),
    error: str(r.error) || null,
    addedBy: by.id || by.name ? { id: str(by.id), name: str(by.name) } : null,
    listingsCount: num(r.listingsCount),
    viewsPlanned: num(r.viewsPlanned),
    viewsAdded: num(r.viewsAdded),
    canEdit: r.canEdit === true,
    canCancel: r.canCancel === true,
    canDelete: r.canDelete === true,
    canRenew: r.canRenew === true,
  };
}

function normalizeCounts(raw: unknown): Record<string, number> {
  return Object.fromEntries(Object.entries(rec(raw)).map(([k, v]) => [k.toLowerCase(), num(v)]));
}

export const listingFakeStatsService = {
  filters: async (query: FakeStatsQuery): Promise<FakeStatsFilterOptions> => {
    const res = await axiosClient.get('/admin/listing-fake-stats/filters', {
      params: compact({ stateId: query.stateId, cityId: query.cityId, role: query.role, plan: query.plan }),
    });
    const body = rec(unwrap(res.data));
    const idName = (x: unknown): FakeStatsIdOption => {
      const o = rec(x);
      return { id: str(o.id), name: str(o.name), count: optCount(o.count) };
    };
    const valueLabel = (x: unknown): FakeStatsValueOption => {
      const o = rec(x);
      return { value: str(o.value), label: str(o.label) || str(o.value), count: optCount(o.count) };
    };
    const plans = arr(body.plans)
      .map((p) => (typeof p === 'object' ? str(rec(p).value) : str(p)))
      .filter(Boolean);
    const planOptions = arr(body.planOptions).length
      ? arr(body.planOptions).map(valueLabel)
      : arr(body.plans)
          .map((p) =>
            typeof p === 'object' ? valueLabel(p) : { value: str(p), label: str(p), count: null },
          )
          .filter((p) => p.value);
    return {
      states: arr(body.states).map(idName),
      cities: arr(body.cities).map(idName),
      roles: arr(body.roles).map(valueLabel),
      plans,
      planOptions,
      projects: arr(body.projects).map(idName),
      summary: normalizeSummary(body.summary),
    };
  },

  list: async (
    query: FakeStatsQuery & { page?: number; limit?: number },
  ): Promise<ListingFakeStatsPage> => {
    const params = compact({ ...query, page: query.page || 1, limit: query.limit || 20 });
    const res = await axiosClient.get('/admin/listing-fake-stats', { params });
    const body = rec(unwrap(res.data));
    return {
      items: arr(body.items).map(normalizeRow),
      total: num(body.total),
      page: num(body.page) || Number(params.page),
      limit: num(body.limit) || Number(params.limit),
      summary: normalizeSummary(body.summary),
    };
  },

  update: async (
    listingId: string,
    patch: { fakeViewCount: number },
  ): Promise<ListingFakeStatsCounts> => {
    const res = await axiosClient.put(`/admin/listing-fake-stats/${listingId}`, patch);
    return unwrap<ListingFakeStatsCounts>(res.data);
  },

  getSettings: async (cityId: string): Promise<ListingFakeStatsSettings> => {
    const res = await axiosClient.get('/admin/listing-fake-stats/settings', { params: { cityId } });
    return normalizeSettings(unwrap(res.data));
  },

  updateSettings: async (
    cityId: string,
    patch: ListingFakeStatsSettingsPatch,
  ): Promise<ListingFakeStatsSettings> => {
    const res = await axiosClient.put('/admin/listing-fake-stats/settings', patch, {
      params: { cityId },
    });
    return normalizeSettings(unwrap(res.data));
  },

  getSchedules: async (cityId: string): Promise<FakeStatsSchedules> => {
    const res = await axiosClient.get('/admin/listing-fake-stats/schedules', { params: { cityId } });
    const body = rec(unwrap(res.data));
    return {
      total: num(body.total),
      historyTotal: num(body.historyTotal),
      sections: arr(body.sections)
        .map((x) => {
          const o = rec(x);
          const role = asRole(o.role);
          if (!role) return null;
          return {
            role,
            label: str(o.label || o.roleLabel) || role,
            hasSection: o.hasSection !== false,
            scriptEnabled: o.scriptEnabled === true,
            counts: normalizeCounts(o.counts),
            items: arr(o.items).map(normalizeSchedule),
          } satisfies FakeStatsScheduleSection;
        })
        .filter((x): x is FakeStatsScheduleSection => x !== null),
    };
  },

  createSchedule: async (
    cityId: string,
    input: FakeStatsScheduleInput & { role: FakeStatsRole },
  ): Promise<FakeStatsSchedule> => {
    const res = await axiosClient.post('/admin/listing-fake-stats/schedules', input, { params: { cityId } });
    return normalizeSchedule(unwrap(res.data));
  },

  updateSchedule: async (id: string, input: Partial<FakeStatsScheduleInput>): Promise<FakeStatsSchedule> => {
    const res = await axiosClient.put(`/admin/listing-fake-stats/schedules/${id}`, input);
    return normalizeSchedule(unwrap(res.data));
  },

  cancelSchedule: async (id: string): Promise<void> => {
    await axiosClient.post(`/admin/listing-fake-stats/schedules/${id}/cancel`);
  },

  getHistory: async (query: {
    cityId: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<FakeStatsHistory> => {
    const res = await axiosClient.get('/admin/listing-fake-stats/schedules/history', {
      params: compact({ ...query, page: query.page || 1, limit: query.limit || 20 }),
    });
    const body = rec(unwrap(res.data));
    const counts = rec(body.counts);
    return {
      items: arr(body.items).map(normalizeSchedule),
      total: num(body.total),
      counts: {
        completed: num(counts.completed),
        cancelled: num(counts.cancelled),
        issue: num(counts.issue),
      },
    };
  },

  renewSchedule: async (
    id: string,
    input: { date: string; startTime?: string; endTime?: string },
  ): Promise<FakeStatsSchedule> => {
    const res = await axiosClient.post(`/admin/listing-fake-stats/schedules/${id}/renew`, input);
    return normalizeSchedule(unwrap(res.data));
  },

  deleteSchedule: async (id: string): Promise<void> => {
    await axiosClient.delete(`/admin/listing-fake-stats/schedules/${id}`);
  },

  bulkDeleteSchedules: async (
    body: { ids: string[] } | { all: true; cityId: string; role?: string },
  ): Promise<void> => {
    await axiosClient.post('/admin/listing-fake-stats/schedules/bulk-delete', body);
  },
};
