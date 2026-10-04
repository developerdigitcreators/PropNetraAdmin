import { axiosClient } from '@/lib/axios-client';

export type CityInterestRow = {
  cityId: string;
  cityName: string;
  stateId: string | null;
  stateName: string;
  isActive: boolean;
  statusLabel: string;
  actualRequests: number;
  manualPush: number;
  total: number;
  goal: number;
  percent: number;
};

export type CityInterestFilterState = { id: string; name: string };
export type CityInterestFilterCity = {
  id: string;
  name: string;
  stateId: string | null;
  isActive: boolean;
};

export type CityInterestFilters = {
  states: CityInterestFilterState[];
  cities: CityInterestFilterCity[];
};

export type CityInterestUpdate = {
  goal?: number;
  addFake?: number;
};

function unwrap<T>(data: unknown): T {
  const obj = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return ('data' in obj && obj.data !== undefined ? obj.data : obj) as T;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function normalizeRow(raw: unknown): CityInterestRow {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const isActive = r.isActive === true;
  return {
    cityId: str(r.cityId ?? r.id),
    cityName: str(r.cityName),
    stateId: r.stateId == null ? null : str(r.stateId),
    stateName: str(r.stateName),
    isActive,
    statusLabel: str(r.statusLabel) || (isActive ? 'Active' : 'Inactive'),
    actualRequests: num(r.actualRequests ?? r.real),
    manualPush: num(r.manualPush ?? r.fakeManual),
    total: num(r.total),
    goal: num(r.goal),
    percent: Math.max(0, Math.min(100, num(r.percent))),
  };
}

export const cityInterestService = {
  filters: async (): Promise<CityInterestFilters> => {
    const res = await axiosClient.get('/admin/city-interest/filters');
    const body = unwrap<{ states?: unknown[]; cities?: unknown[] }>(res.data);
    return {
      states: (Array.isArray(body?.states) ? body.states : []).map((s) => {
        const r = (s || {}) as Record<string, unknown>;
        return { id: str(r.id), name: str(r.name) };
      }),
      cities: (Array.isArray(body?.cities) ? body.cities : []).map((c) => {
        const r = (c || {}) as Record<string, unknown>;
        return {
          id: str(r.id),
          name: str(r.name),
          stateId: r.stateId == null ? null : str(r.stateId),
          isActive: r.isActive === true,
        };
      }),
    };
  },

  list: async (params: { stateId?: string; cityId?: string }): Promise<CityInterestRow[]> => {
    const query: Record<string, string> = {};
    if (params.stateId) query.stateId = params.stateId;
    if (params.cityId) query.cityId = params.cityId;
    const res = await axiosClient.get('/admin/city-interest', { params: query });
    const body = unwrap<{ items?: unknown[] }>(res.data);
    return Array.isArray(body?.items) ? body.items.map(normalizeRow) : [];
  },

  update: async (cityId: string, patch: CityInterestUpdate): Promise<CityInterestRow> => {
    const res = await axiosClient.put(`/admin/city-interest/${cityId}`, patch);
    return normalizeRow(unwrap(res.data));
  },
};
