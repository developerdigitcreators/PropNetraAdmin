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
  realLeads: number;
  fakeLeads: number;
};

export type ListingFakeStatsPage = {
  items: ListingFakeStatsRow[];
  total: number;
  page: number;
  limit: number;
};

export type FakeStatsFilterOptions = {
  states: Array<{ id: string; name: string }>;
  cities: Array<{ id: string; name: string }>;
  roles: Array<{ value: string; label: string }>;
  plans: string[];
  projects: Array<{ id: string; name: string }>;
};

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

export type FakeStatsTimeWindow = { start: string; end: string };

export type ListingFakeStatsSettings = {
  cityId: string;
  cityName: string;
  stateName: string;
  roles: FakeStatsRoleSettings[];
  selectedRoles: FakeStatsRole[];
  timeWindow: FakeStatsTimeWindow;
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
  timeWindow?: FakeStatsTimeWindow;
};

export type ListingFakeStatsCounts = Pick<
  ListingFakeStatsRow,
  'listingId' | 'realViews' | 'fakeViews' | 'realLeads' | 'fakeLeads'
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
  const tw = rec(r.timeWindow);
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
    timeWindow: { start: str(tw.start), end: str(tw.end) },
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
    realLeads: num(r.realLeads),
    fakeLeads: num(r.fakeLeads),
  };
}

export const listingFakeStatsService = {
  filters: async (query: FakeStatsQuery): Promise<FakeStatsFilterOptions> => {
    const res = await axiosClient.get('/admin/listing-fake-stats/filters', {
      params: compact({ stateId: query.stateId, cityId: query.cityId, role: query.role, plan: query.plan }),
    });
    const body = rec(unwrap(res.data));
    const idName = (x: unknown) => {
      const o = rec(x);
      return { id: str(o.id), name: str(o.name) };
    };
    return {
      states: arr(body.states).map(idName),
      cities: arr(body.cities).map(idName),
      roles: arr(body.roles).map((x) => {
        const o = rec(x);
        return { value: str(o.value), label: str(o.label) || str(o.value) };
      }),
      plans: arr(body.plans).map(str).filter(Boolean),
      projects: arr(body.projects).map(idName),
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
};
