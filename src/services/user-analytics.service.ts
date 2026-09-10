import { axiosClient } from '@/lib/axios-client';

export type AnalyticsPlace = {
  id: string;
  name: string;
};

export type AnalyticsUser = {
  id: string;
  name: string;
  contact: string;
  email: string;
  city?: string;
  companyName?: string;
  address?: string;
};

export type PersonRow = {
  id: string;
  name: string;
  contact: string;
  project: string;
  city: string;
  location: string;
  bhk: string;
  occurredAt: string | null;
  channels: string[];
};

export type DayBucket<T> = {
  date: string;
  items: T[];
  total: number;
  detailAvailable: boolean;
  usageHint?: UsageHint | null;
};

export type MonthBucket<T> = {
  month: string;
  days: DayBucket<T>[];
  total: number;
};

export type GroupedTab<T> = {
  days: DayBucket<T>[];
  months: MonthBucket<T>[];
  summary: T[];
  total: number;
};

export type UsageHint = {
  period?: string;
  viewsUsed?: number;
  viewsLimit?: number | null;
  unlimitedViews?: boolean;
  coinsUsed?: number;
  coinsGranted?: number;
};

export type UserAnalyticsRange = {
  from: string;
  to: string;
  groupBy: 'day' | 'month';
};

export type UserAnalyticsDetail = {
  user: AnalyticsUser;
  range: UserAnalyticsRange;
  usage: UsageHint | null;
  views: GroupedTab<PersonRow>;
  contacted: GroupedTab<PersonRow>;
  interested: GroupedTab<PersonRow>;
};

export type UserAnalyticsTab = 'views' | 'contacted' | 'interested';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function pickNumber(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.toLowerCase().trim();
    if (['true', '1', 'yes'].includes(v)) return true;
    if (['false', '0', 'no'].includes(v)) return false;
  }
  return fallback;
}

function asArray(data: unknown, ...keys: string[]): unknown[] {
  if (Array.isArray(data)) return data;
  const obj = asRecord(data);
  if (!obj) return [];
  for (const key of keys) {
    if (Array.isArray(obj[key])) return obj[key] as unknown[];
  }
  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.data)) return obj.data;
  return [];
}

function isoDate(value: unknown): string {
  const raw = pickString(value);
  if (!raw) return '';
  const day = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (day) return day[1];
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function monthKeyFromDate(date: string): string {
  return date.slice(0, 7);
}

function spansMultipleMonths(from: string, to: string): boolean {
  return !!from && !!to && monthKeyFromDate(from) !== monthKeyFromDate(to);
}

function sortDays<T>(days: DayBucket<T>[]): DayBucket<T>[] {
  return [...days].sort((a, b) => b.date.localeCompare(a.date));
}

function sortMonths<T>(months: MonthBucket<T>[]): MonthBucket<T>[] {
  return [...months]
    .map((month) => ({ ...month, days: sortDays(month.days) }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

function groupDaysByMonth<T>(days: DayBucket<T>[]): MonthBucket<T>[] {
  const map = new Map<string, DayBucket<T>[]>();
  for (const day of days) {
    const key = monthKeyFromDate(day.date) || 'unknown';
    const list = map.get(key) || [];
    list.push(day);
    map.set(key, list);
  }
  return sortMonths(
    Array.from(map.entries()).map(([month, grouped]) => ({
      month,
      days: grouped,
      total: grouped.reduce((sum, day) => sum + day.total, 0),
    })),
  );
}

export function userAnalyticsApiError(err: unknown, fallback: string): string {
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

function normalizePlace(raw: unknown): AnalyticsPlace | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = pickString(row.id, row.stateId, row.state_id, row.cityId, row.city_id);
  const name = pickString(row.name, row.label, row.title);
  if (!id || !name) return null;
  return { id, name };
}

function normalizeUser(raw: unknown): AnalyticsUser | null {
  const row = asRecord(raw);
  if (!row) return null;
  const nested = asRecord(row.user) || row;
  const id = pickString(nested.id, nested.userId, nested.user_id);
  if (!id) return null;
  return {
    id,
    name: pickString(nested.name, nested.fullName, nested.full_name),
    contact: pickString(nested.contact, nested.phone, nested.mobile),
    email: pickString(nested.email),
    city: pickString(nested.city, nested.cityName, nested.city_name) || undefined,
    companyName:
      pickString(nested.companyName, nested.company_name, nested.company) ||
      undefined,
    address: pickString(nested.address) || undefined,
  };
}

function normalizeChannels(raw: unknown): string[] {
  const row = asRecord(raw);
  const fromArray = asArray(row?.channels ?? raw);
  const list = fromArray
    .map((item) => pickString(item).toLowerCase())
    .filter((item) => item === 'call' || item === 'whatsapp');
  const single = pickString(row?.channel).toLowerCase();
  if (single === 'call' || single === 'whatsapp') list.push(single);
  return [...new Set(list)];
}

function normalizePerson(raw: unknown, index: number): PersonRow | null {
  const row = asRecord(raw);
  if (!row) return null;
  const person = asRecord(row.user) || row;
  const name = pickString(person.name, row.name, row.fullName);
  const contact = pickString(person.contact, person.phone, row.contact, row.phone);
  const project = pickString(
    row.project,
    row.projectName,
    row.project_name,
    row.displayTitle,
    row.display_title,
  );
  const occurredAt =
    pickString(
      row.occurredAt,
      row.occurred_at,
      row.dateTime,
      row.date_time,
      row.createdAt,
      row.created_at,
      row.interestedAt,
      row.interested_at,
      row.date,
    ) || null;
  const id =
    pickString(row.id, row.userId, row.user_id, person.id) ||
    `${name || contact || 'person'}-${occurredAt || index}`;
  if (!name && !contact && !project) return null;
  return {
    id,
    name: name || 'Unknown',
    contact,
    project,
    city: pickString(row.city, row.cityName, row.city_name),
    location: pickString(row.location, row.locationName, row.location_name),
    bhk: pickString(row.bhk, row.BHK),
    occurredAt,
    channels: normalizeChannels(row),
  };
}

function normalizeUsage(raw: unknown): UsageHint | null {
  const row = asRecord(raw);
  if (!row) return null;
  return {
    period: pickString(row.period) || undefined,
    viewsUsed: pickNumber(row.viewsUsed, row.views_used),
    viewsLimit:
      row.viewsLimit === null || row.views_limit === null
        ? null
        : pickNumber(row.viewsLimit, row.views_limit),
    unlimitedViews: asBool(row.unlimitedViews ?? row.unlimited_views),
    coinsUsed: pickNumber(row.coinsUsed, row.coins_used, row.coinsSpent, row.coins_spent),
    coinsGranted: pickNumber(row.coinsGranted, row.coins_granted),
  };
}

function normalizeDayBucket(raw: unknown): DayBucket<PersonRow> | null {
  const row = asRecord(raw);
  if (!row) return null;
  const date = isoDate(row.date ?? row.day ?? row.key);
  if (!date) return null;
  const items = asArray(row, 'items', 'entries', 'records')
    .map((item, index) => normalizePerson(item, index))
    .filter((item): item is PersonRow => !!item);
  const total = pickNumber(row.count, row.total) || items.length;
  return {
    date,
    items,
    total,
    detailAvailable: asBool(row.detailAvailable ?? row.detail_available, items.length > 0 || total === 0),
    usageHint: normalizeUsage(row.usage ?? row.usageHint),
  };
}

function normalizeGroupedTab(raw: unknown): GroupedTab<PersonRow> {
  const row = asRecord(raw);
  const source = row ? (asRecord(row.tab) || asRecord(row.data) || row) : null;
  const days = source
    ? asArray(source, 'days', 'dates', 'timeline')
        .map(normalizeDayBucket)
        .filter((day): day is DayBucket<PersonRow> => !!day)
    : [];

  const monthsRaw = source
    ? asArray(source, 'months', 'groups')
        .map((monthRaw) => {
          const month = asRecord(monthRaw);
          if (!month) return null;
          const key =
            pickString(month.key, month.month, month.monthKey).replace(/^(\d{4}-\d{2}).*/, '$1') ||
            '';
          const monthDays = asArray(month, 'days')
            .map(normalizeDayBucket)
            .filter((day): day is DayBucket<PersonRow> => !!day);
          if (!key && !monthDays.length) return null;
          return {
            month: key || monthKeyFromDate(monthDays[0]?.date || '') || 'unknown',
            days: sortDays(monthDays),
            total: pickNumber(month.count, month.total) || monthDays.reduce((s, d) => s + d.total, 0),
          } satisfies MonthBucket<PersonRow>;
        })
        .filter((month): month is MonthBucket<PersonRow> => !!month)
    : [];

  const mergedDays = sortDays(days.length ? days : monthsRaw.flatMap((m) => m.days));
  const months = monthsRaw.length ? sortMonths(monthsRaw) : groupDaysByMonth(mergedDays);
  const total =
    pickNumber(source?.total) ||
    mergedDays.reduce((sum, day) => sum + day.total, 0);

  return {
    days: mergedDays,
    months,
    summary: [],
    total,
  };
}

function resolveGroupBy(raw: unknown, from: string, to: string): 'day' | 'month' {
  const row = asRecord(raw);
  const value = pickString(row?.groupBy, row?.group_by).toLowerCase();
  if (value === 'day' || value === 'days' || value === 'date') return 'day';
  if (value === 'month' || value === 'months') return 'month';
  return spansMultipleMonths(from, to) ? 'month' : 'day';
}

function emptyTab(): GroupedTab<PersonRow> {
  return { days: [], months: [], summary: [], total: 0 };
}

function normalizeDetail(raw: unknown, fallbackUser?: AnalyticsUser | null): UserAnalyticsDetail | null {
  const row = asRecord(raw);
  if (!row) return null;
  const payload = asRecord(row.detail) || asRecord(row.result) || row;
  const user = normalizeUser(payload.user) || fallbackUser || null;
  if (!user) return null;

  const rangeRow = asRecord(payload.range) || payload;
  const from = isoDate(rangeRow.from ?? rangeRow.start);
  const to = isoDate(rangeRow.to ?? rangeRow.end);
  const tabs = asRecord(payload.tabs) || payload;

  return {
    user,
    range: {
      from,
      to,
      groupBy: resolveGroupBy(rangeRow, from, to),
    },
    usage: normalizeUsage(payload.usage),
    views: normalizeGroupedTab(tabs.views),
    contacted: normalizeGroupedTab(tabs.contacted ?? tabs.contacts),
    interested: normalizeGroupedTab(
      tabs.interested ?? tabs.leads ?? tabs.inquiry ?? tabs.inquiries,
    ),
  };
}

function listParams(params: Record<string, string | undefined>) {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value?.trim()) next[key] = value.trim();
  }
  return next;
}

export function countTabItems(tab: GroupedTab<PersonRow>): number {
  if (tab.total) return tab.total;
  return tab.days.reduce((sum, day) => sum + day.total, 0);
}

export const userAnalyticsService = {
  getStates: async (): Promise<AnalyticsPlace[]> => {
    const response = await axiosClient.get('/admin/user-analytics/states');
    return asArray(response.data, 'states')
      .map(normalizePlace)
      .filter((row): row is AnalyticsPlace => !!row);
  },

  getCities: async (stateId: string): Promise<AnalyticsPlace[]> => {
    const response = await axiosClient.get('/admin/user-analytics/cities', {
      params: listParams({ stateId }),
    });
    return asArray(response.data, 'cities')
      .map(normalizePlace)
      .filter((row): row is AnalyticsPlace => !!row);
  },

  searchUsers: async (params: {
    stateId?: string;
    cityId?: string;
    from?: string;
    to?: string;
    search?: string;
  }): Promise<AnalyticsUser[]> => {
    const response = await axiosClient.get('/admin/user-analytics/users', {
      params: listParams({
        stateId: params.stateId,
        cityId: params.cityId,
        from: params.from,
        to: params.to,
        search: params.search,
      }),
    });
    return asArray(response.data, 'users', 'suggestions')
      .map(normalizeUser)
      .filter((row): row is AnalyticsUser => !!row);
  },

  getUserAnalytics: async (params: {
    userId: string;
    from: string;
    to: string;
    stateId?: string;
    cityId?: string;
    tab?: UserAnalyticsTab;
    fallbackUser?: AnalyticsUser | null;
  }): Promise<UserAnalyticsDetail> => {
    const response = await axiosClient.get(`/admin/user-analytics/users/${params.userId}`, {
      params: listParams({
        from: params.from,
        to: params.to,
        stateId: params.stateId,
        cityId: params.cityId,
        tab: params.tab,
      }),
    });
    const detail = normalizeDetail(response.data, params.fallbackUser);
    if (!detail) {
      return {
        user: params.fallbackUser || { id: params.userId, name: '', contact: '', email: '' },
        range: {
          from: params.from,
          to: params.to,
          groupBy: spansMultipleMonths(params.from, params.to) ? 'month' : 'day',
        },
        usage: null,
        views: emptyTab(),
        contacted: emptyTab(),
        interested: emptyTab(),
      };
    }
    if (!detail.range.from) detail.range.from = params.from;
    if (!detail.range.to) detail.range.to = params.to;
    if (!detail.range.groupBy) {
      detail.range.groupBy = spansMultipleMonths(detail.range.from, detail.range.to)
        ? 'month'
        : 'day';
    }
    return detail;
  },
};
