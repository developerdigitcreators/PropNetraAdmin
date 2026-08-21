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
};

export type ViewProperty = {
  id: string;
  name: string;
  viewCount: number;
  city: string;
  location: string;
};

export type LeadRow = {
  id: string;
  name: string;
  contact: string;
  project: string;
  city: string;
  location: string;
  occurredAt: string | null;
  archived: boolean;
};

export type DayBucket<T> = {
  date: string;
  items: T[];
  total: number;
};

export type MonthBucket<T> = {
  month: string;
  days: DayBucket<T>[];
};

export type GroupedTab<T> = {
  days: DayBucket<T>[];
  months: MonthBucket<T>[];
  summary: T[];
};

export type UserAnalyticsRange = {
  from: string;
  to: string;
  groupBy: 'day' | 'month';
};

export type UserAnalyticsDetail = {
  user: AnalyticsUser;
  range: UserAnalyticsRange;
  views: GroupedTab<ViewProperty>;
  contacted: GroupedTab<LeadRow>;
  interested: GroupedTab<LeadRow>;
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

function asBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.toLowerCase().trim();
    if (['true', '1', 'yes', 'archived'].includes(v)) return true;
  }
  return false;
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
  return [...days].sort((a, b) => a.date.localeCompare(b.date));
}

function sortMonths<T>(months: MonthBucket<T>[]): MonthBucket<T>[] {
  return [...months]
    .map((month) => ({ ...month, days: sortDays(month.days) }))
    .sort((a, b) => a.month.localeCompare(b.month));
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
    Array.from(map.entries()).map(([month, grouped]) => ({ month, days: grouped })),
  );
}

function flattenMonths<T>(months: MonthBucket<T>[]): DayBucket<T>[] {
  return sortDays(months.flatMap((month) => month.days));
}

function mergeDays<T>(days: DayBucket<T>[], extra: DayBucket<T>[]): DayBucket<T>[] {
  const map = new Map<string, DayBucket<T>>();
  for (const day of [...days, ...extra]) {
    if (!day.date) continue;
    const existing = map.get(day.date);
    if (!existing) {
      map.set(day.date, {
        date: day.date,
        items: [...day.items],
        total: day.total,
      });
      continue;
    }
    existing.items.push(...day.items);
    existing.total = Math.max(existing.total, day.total) || existing.items.length;
  }
  return sortDays(Array.from(map.values()));
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
    contact: pickString(nested.contact, nested.phone, nested.mobile, nested.contactNo, nested.contact_no),
    email: pickString(nested.email),
  };
}

function normalizeViewProperty(raw: unknown, index: number): ViewProperty | null {
  const row = asRecord(raw);
  if (!row) return null;
  const name = pickString(
    row.name,
    row.title,
    row.project,
    row.projectName,
    row.project_name,
    row.propertyName,
    row.property_name,
    row.listingName,
    row.listing_name,
  );
  const viewCount = pickNumber(row.viewCount, row.view_count, row.views, row.count, row.total);
  const id =
    pickString(row.id, row.listingId, row.listing_id, row.propertyId, row.property_id) ||
    `${name || 'listing'}-${index}`;
  if (!name && viewCount <= 0) return null;
  return {
    id,
    name: name || 'Untitled listing',
    viewCount,
    city: pickString(row.city, row.cityName, row.city_name),
    location: pickString(row.location, row.locationName, row.location_name, row.address),
  };
}

function normalizeLead(raw: unknown, index: number): LeadRow | null {
  const row = asRecord(raw);
  if (!row) return null;
  const person = asRecord(row.user) || asRecord(row.contactedBy) || asRecord(row.contacted_by) || row;
  const name = pickString(
    person.name,
    row.name,
    row.fullName,
    row.full_name,
    row.userName,
    row.user_name,
  );
  const contact = pickString(
    person.contact,
    person.phone,
    row.contact,
    row.contactNo,
    row.contact_no,
    row.phone,
    row.mobile,
  );
  const project = pickString(
    row.project,
    row.projectName,
    row.project_name,
    row.propertyName,
    row.property_name,
    row.listingName,
    row.listing_name,
  );
  const occurredAt =
    pickString(
      row.occurredAt,
      row.occurred_at,
      row.dateTime,
      row.date_time,
      row.contactedAt,
      row.contacted_at,
      row.createdAt,
      row.created_at,
      row.timestamp,
      row.date,
    ) || null;
  const id =
    pickString(row.id, row.leadId, row.lead_id, person.id) ||
    `${name || contact || 'lead'}-${occurredAt || index}`;
  if (!name && !contact && !project) return null;
  return {
    id,
    name: name || 'Unknown',
    contact,
    project,
    city: pickString(row.city, row.cityName, row.city_name, asRecord(row.city)?.name),
    location: pickString(row.location, row.locationName, row.location_name, asRecord(row.location)?.name),
    occurredAt,
    archived: asBool(row.archived ?? row.isArchived ?? row.is_archived ?? row.status === 'archived'),
  };
}

function dayItems<T>(
  row: Record<string, unknown>,
  mapItem: (raw: unknown, index: number) => T | null,
): T[] {
  return asArray(
    row,
    'items',
    'properties',
    'listings',
    'views',
    'contacts',
    'contacted',
    'leads',
    'users',
    'inquiries',
    'interested',
    'entries',
  )
    .map((item, index) => mapItem(item, index))
    .filter((item): item is T => !!item);
}

function normalizeDayBucket<T>(
  raw: unknown,
  mapItem: (raw: unknown, index: number) => T | null,
  fallbackDate = '',
): DayBucket<T> | null {
  if (typeof raw === 'string') {
    const date = isoDate(raw);
    return date ? { date, items: [], total: 0 } : null;
  }
  const row = asRecord(raw);
  if (!row) return null;
  const date = isoDate(row.date ?? row.day ?? row.key ?? row.label) || fallbackDate;
  const nested = asRecord(row.bucket) || asRecord(row.data) || row;
  const items = dayItems(nested, mapItem);
  const total = pickNumber(nested.total, nested.count, nested.viewCount, nested.view_count, nested.views);
  if (!date && items.length === 0) return null;
  return {
    date: date || fallbackDate,
    items,
    total: total || items.reduce((sum, item) => {
      const count = (item as { viewCount?: number }).viewCount;
      return sum + (typeof count === 'number' ? count : 1);
    }, 0),
  };
}

function normalizeMonthBucket<T>(
  raw: unknown,
  mapItem: (raw: unknown, index: number) => T | null,
): MonthBucket<T> | null {
  const row = asRecord(raw);
  if (!row) return null;
  const nested = asRecord(row.bucket) || asRecord(row.data) || row;
  const days = asArray(nested, 'days', 'dates', 'entries', 'items')
    .map((day) => normalizeDayBucket(day, mapItem))
    .filter((day): day is DayBucket<T> => !!day && !!day.date);
  const month =
    pickString(nested.month, nested.monthKey, nested.month_key, nested.key).replace(/^(\d{4}-\d{2}).*/, '$1') ||
    (days[0] ? monthKeyFromDate(days[0].date) : '');
  if (!month && days.length === 0) return null;
  const leftoverItems = days.length ? [] : dayItems(nested, mapItem);
  const leftoverDays =
    leftoverItems.length && month
      ? [
          {
            date: `${month}-01`,
            items: leftoverItems,
            total: leftoverItems.length,
          },
        ]
      : [];
  return {
    month: month || 'unknown',
    days: sortDays([...days, ...leftoverDays]),
  };
}

function normalizeGroupedTab<T>(
  raw: unknown,
  mapItem: (raw: unknown, index: number) => T | null,
  summaryKeys: string[],
): GroupedTab<T> {
  const row = asRecord(raw);
  const source = row ? (asRecord(row.tab) || asRecord(row.data) || row) : null;
  const summary = source
    ? asArray(source, ...summaryKeys)
        .map((item, index) => mapItem(item, index))
        .filter((item): item is T => !!item)
    : [];

  const days = source
    ? asArray(source, 'days', 'dates', 'timeline')
        .map((day) => normalizeDayBucket(day, mapItem))
        .filter((day): day is DayBucket<T> => !!day && !!day.date)
    : [];

  const months = source
    ? asArray(source, 'months', 'groups')
        .map((month) => normalizeMonthBucket(month, mapItem))
        .filter((month): month is MonthBucket<T> => !!month)
    : [];

  const flatItems: { date: string; item: T }[] = [];
  if (source) {
    asArray(source, 'items', 'entries', 'records', 'leads', 'contacts', 'contacted', 'interested', 'inquiries')
      .forEach((item, index) => {
        const mapped = mapItem(item, index);
        if (!mapped) return;
        const obj = asRecord(item);
        const date = isoDate(
          obj?.date ??
            obj?.occurredAt ??
            obj?.occurred_at ??
            obj?.dateTime ??
            obj?.date_time ??
            obj?.createdAt ??
            obj?.created_at,
        );
        flatItems.push({ date, item: mapped });
      });
  }

  const flatDays = flatItems
    .filter((row) => row.date)
    .reduce<DayBucket<T>[]>((acc, row) => {
      const existing = acc.find((day) => day.date === row.date);
      if (existing) {
        existing.items.push(row.item);
        existing.total += 1;
        return acc;
      }
      acc.push({ date: row.date, items: [row.item], total: 1 });
      return acc;
    }, []);

  const mergedDays = mergeDays(days, [...flattenMonths(months), ...flatDays]);
  const mergedMonths = months.length ? sortMonths(months) : groupDaysByMonth(mergedDays);

  const dateless = flatItems.filter((row) => !row.date).map((row) => row.item);

  return {
    days: mergedDays,
    months: mergedMonths,
    summary: summary.length ? summary : dateless,
  };
}

function resolveGroupBy(raw: unknown, from: string, to: string): 'day' | 'month' {
  const row = asRecord(raw);
  const value = pickString(row?.groupBy, row?.group_by).toLowerCase();
  if (value === 'day' || value === 'days' || value === 'date') return 'day';
  if (value === 'month' || value === 'months') return 'month';
  return spansMultipleMonths(from, to) ? 'month' : 'day';
}

function emptyTab<T>(): GroupedTab<T> {
  return { days: [], months: [], summary: [] };
}

function normalizeDetail(raw: unknown, fallbackUser?: AnalyticsUser | null): UserAnalyticsDetail | null {
  const row = asRecord(raw);
  if (!row) return null;
  const payload = asRecord(row.detail) || asRecord(row.result) || row;
  const user = normalizeUser(payload.user) || fallbackUser || null;
  if (!user) return null;

  const rangeRow = asRecord(payload.range) || payload;
  const from = isoDate(rangeRow.from ?? rangeRow.start ?? rangeRow.startDate ?? rangeRow.start_date);
  const to = isoDate(rangeRow.to ?? rangeRow.end ?? rangeRow.endDate ?? rangeRow.end_date);
  const tabs = asRecord(payload.tabs) || payload;

  return {
    user,
    range: {
      from,
      to,
      groupBy: resolveGroupBy(rangeRow, from, to),
    },
    views: normalizeGroupedTab(tabs.views, normalizeViewProperty, ['properties', 'listings', 'summary']),
    contacted: normalizeGroupedTab(
      tabs.contacted ?? tabs.contacts ?? tabs.contact,
      normalizeLead,
      ['items', 'leads', 'contacts'],
    ),
    interested: normalizeGroupedTab(
      tabs.interested ?? tabs.inquiry ?? tabs.inquiries,
      normalizeLead,
      ['items', 'leads', 'inquiries'],
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

export function countTabItems<T>(tab: GroupedTab<T>): number {
  const fromDays = tab.days.reduce((sum, day) => sum + day.items.length, 0);
  if (fromDays) return fromDays;
  const fromMonths = tab.months.reduce(
    (sum, month) => sum + month.days.reduce((inner, day) => inner + day.items.length, 0),
    0,
  );
  if (fromMonths) return fromMonths;
  return tab.summary.length;
}

export function sumViewCount(tab: GroupedTab<ViewProperty>): number {
  const fromSummary = tab.summary.reduce((sum, item) => sum + item.viewCount, 0);
  if (fromSummary) return fromSummary;
  const fromDays = tab.days.reduce((sum, day) => {
    const itemSum = day.items.reduce((inner, item) => inner + item.viewCount, 0);
    return sum + (itemSum || day.total);
  }, 0);
  if (fromDays) return fromDays;
  return tab.months.reduce((sum, month) => {
    return (
      sum +
      month.days.reduce((inner, day) => {
        const itemSum = day.items.reduce((count, item) => count + item.viewCount, 0);
        return inner + (itemSum || day.total);
      }, 0)
    );
  }, 0);
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
        views: emptyTab(),
        contacted: emptyTab(),
        interested: emptyTab(),
      };
    }
    if (!detail.range.from) detail.range.from = params.from;
    if (!detail.range.to) detail.range.to = params.to;
    if (!detail.range.groupBy) {
      detail.range.groupBy = spansMultipleMonths(detail.range.from, detail.range.to) ? 'month' : 'day';
    }
    return detail;
  },
};
