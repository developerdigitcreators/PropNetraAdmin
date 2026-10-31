import { axiosClient } from '@/lib/axios-client';

export type AnalyticsPlace = {
  id: string;
  name: string;
};

export type AnalyticsAppRole = 'developer' | 'floor' | 'agent' | string;

export type AnalyticsUser = {
  id: string;
  name: string;
  contact: string;
  email: string;
  city?: string;
  companyName?: string;
  address?: string;
  appRole?: AnalyticsAppRole | null;
};

export type AnalyticsMode = 'agent' | 'publisher_developer' | 'publisher_floor';

export type AnalyticsTabMeta = { key: string; label: string };

export type AnalyticsSummary = {
  listingViews: number;
  shares: number;
  brochures: number | null;
  contacts: number;
  saves: number;
};

export type PublisherUsage = {
  limits: Record<string, number | null>;
  usage: Record<string, number>;
};

export type AgentTabs = {
  views: GroupedTab<PersonRow>;
  contacted: GroupedTab<PersonRow>;
  interested: GroupedTab<PersonRow>;
  listingViewers: GroupedTab<PersonRow>;
};

export type PublisherTabs = Record<string, GroupedTab<PersonRow>>;

export type PersonRow = {
  id: string;
  name: string;
  contact: string;
  project: string;
  city: string;
  location: string;
  bhk: string;
  listingStatus?: string;
  listingId?: string;
  occurredAt: string | null;
  channels: string[];
  /** Plan code snapshot at contact-reveal time (contacted / leads). */
  actorPlanCodeAtEvent?: string | null;
  teamMemberName?: string;
  source?: string;
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

/** @deprecated alias — prefer UserAnalyticsDetail */
export type UserAnalyticsResponse = UserAnalyticsDetail;

export type UserAnalyticsDetail = {
  analyticsMode: AnalyticsMode;
  user: AnalyticsUser;
  range: UserAnalyticsRange;
  usage: UsageHint | null;
  publisherUsage?: PublisherUsage;
  summary?: AnalyticsSummary;
  tabMeta: AnalyticsTabMeta[];
  tabsByKey: PublisherTabs;
  views: GroupedTab<PersonRow>;
  contacted: GroupedTab<PersonRow>;
  interested: GroupedTab<PersonRow>;
  listingViewers: GroupedTab<PersonRow>;
  listingViewersFake: ListingViewersFake;
};

export type PublisherListingStatus = 'active' | 'inactive' | 'expired';

export type AgentListingCategoryGroup = 'resale_rent' | 'buy_requirement' | 'dbf';

export type PublisherTrack = 'developer' | 'dbf';

export type PublisherMetricKey =
  | 'views'
  | 'share'
  | 'brochure'
  | 'save'
  | 'reveal'
  | 'call'
  | 'wa';

export type PublisherListingCounts = {
  views: number;
  share: number;
  brochure?: number;
  save: number;
  reveal: number;
  call: number;
  wa: number;
};

export type PublisherListingRow = {
  listingId: string;
  title: string;
  city: string;
  status: string;
  counts: PublisherListingCounts;
};

export type PublisherListingsResponse = {
  track: PublisherTrack;
  status: PublisherListingStatus;
  items: PublisherListingRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PublisherEventRow = {
  id: string;
  name: string;
  contact: string;
  project?: string;
  city?: string;
  location?: string;
  bhk?: string;
  occurredAt: string | null;
  teamMemberName?: string;
  source?: string;
  channels: string[];
  listingId?: string;
  listingStatus?: string;
  actorPlanCodeAtEvent?: string | null;
};

export type PaginatedPublisherEvents = {
  items: PublisherEventRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PublisherListingViewersResponse = {
  status: PublisherListingStatus;
  grouped: GroupedTab<PersonRow>;
  listingViewersFake: ListingViewersFake;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PublisherLeadsResponse = {
  grouped: GroupedTab<PersonRow>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const MY_LISTING_ANALYTICS_METRICS = [
  'viewers',
  'leads',
  'call',
  'whatsapp',
] as const;

/** Developer app My Listings metric ids (API `availableMetrics` when ownerKind is developer). */
export const DEVELOPER_MY_LISTING_ANALYTICS_METRICS = [
  'views',
  'shares',
  'brochures',
  'saves',
  'contact_reveal',
  'call',
  'whatsapp',
] as const;

export type MyListingAnalyticsMetric = string;

export type MyListingAnalyticsOwnerKind = 'developer' | 'agent' | 'dbf';

export type MyListingAnalyticsConfig = {
  enabled: boolean;
  metrics: MyListingAnalyticsMetric[];
  ownerKind?: MyListingAnalyticsOwnerKind;
  /** Metrics shown on app My Listings (after admin selection + global gates). */
  displayMetrics: MyListingAnalyticsMetric[];
  /** Role + Feature Control: listing viewers popup/reveal allowed. */
  viewersPopupEnabled: boolean;
  /** @deprecated prefer displayMetrics — kept when API still sends it */
  effectiveMetrics?: MyListingAnalyticsMetric[];
  availableMetrics: MyListingAnalyticsMetric[];
  metricLabels: Record<string, string>;
  maxMetrics: number;
  defaults: {
    enabled: boolean;
    metrics: MyListingAnalyticsMetric[];
  };
};

export type UpdateMyListingAnalyticsPayload = {
  enabled: boolean;
  metrics: MyListingAnalyticsMetric[];
};

export const PUBLISHER_ANALYTICS_TABS = [
  'listingViewers',
  'leads',
] as const;

export type PublisherAnalyticsTabKey = (typeof PUBLISHER_ANALYTICS_TABS)[number];

export type FakeListingViews = {
  listingId: string;
  name: string;
  fakeViews: number;
};

export type ListingViewersFake = {
  fakeViews: number;
  listings: FakeListingViews[];
};

export type UserAnalyticsTab = 'views' | 'contacted' | 'interested' | 'listingViewers' | string;

export const DEFAULT_AGENT_TAB_META: AnalyticsTabMeta[] = [
  { key: 'views', label: 'Views' },
  { key: 'contacted', label: 'Listing contacts' },
  { key: 'interested', label: 'Leads' },
  { key: 'listingViewers', label: 'Listing viewers' },
];

export function isPublisherAnalyticsMode(mode?: AnalyticsMode | null): boolean {
  return mode === 'publisher_developer' || mode === 'publisher_floor';
}

export function isPublisherAppRole(appRole?: string | null): boolean {
  const r = String(appRole || '')
    .trim()
    .toLowerCase();
  return r === 'developer' || r === 'floor';
}

/** Map profile URL `aTab` to API `tab` query for agent mode. */
export function analyticsTabToApiParam(aTab: string, mode: AnalyticsMode): string | undefined {
  if (!aTab.trim()) return undefined;
  if (isPublisherAnalyticsMode(mode)) return aTab.trim();
  if (aTab === 'leads') return 'interested';
  if (aTab === 'listingViewers') return 'listingViewers';
  return aTab;
}

/** Map API tab key to profile URL `aTab` for agent mode. */
export function apiTabToAnalyticsTab(key: string, mode: AnalyticsMode): string {
  if (isPublisherAnalyticsMode(mode)) return key;
  if (key === 'interested') return 'leads';
  return key;
}

export function mergeAnalyticsDetail(
  prev: UserAnalyticsDetail | null,
  next: UserAnalyticsDetail,
  tabKey?: string,
): UserAnalyticsDetail {
  if (!prev) return next;
  const merged: UserAnalyticsDetail = {
    ...next,
    tabMeta: next.tabMeta.length ? next.tabMeta : prev.tabMeta,
    summary: next.summary ?? prev.summary,
    publisherUsage: next.publisherUsage ?? prev.publisherUsage,
    usage: next.usage ?? prev.usage,
    tabsByKey: { ...prev.tabsByKey, ...next.tabsByKey },
  };
  if (tabKey && next.tabsByKey[tabKey]) {
    merged.tabsByKey[tabKey] = next.tabsByKey[tabKey];
  }
  if (next.analyticsMode === 'agent') {
    merged.views = next.views.total ? next.views : prev.views;
    merged.contacted = next.contacted.total ? next.contacted : prev.contacted;
    merged.interested = next.interested.total ? next.interested : prev.interested;
    merged.listingViewers = next.listingViewers.total
      ? next.listingViewers
      : prev.listingViewers;
    if (tabKey === 'views' || tabKey === 'interested' || tabKey === 'contacted' || tabKey === 'listingViewers') {
      const patch = next.tabsByKey[tabKey] || next.tabsByKey[tabKey === 'interested' ? 'leads' : tabKey];
      if (patch?.total || patch?.days.length) {
        if (tabKey === 'views') merged.views = patch;
        if (tabKey === 'contacted') merged.contacted = patch;
        if (tabKey === 'interested') merged.interested = patch;
        if (tabKey === 'listingViewers') merged.listingViewers = patch;
      }
    }
    merged.listingViewersFake =
      next.listingViewersFake.fakeViews || next.listingViewersFake.listings.length
        ? next.listingViewersFake
        : prev.listingViewersFake;
  }
  return merged;
}

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
    appRole:
      pickString(nested.appRole, nested.app_role, row.appRole, row.app_role) ||
      null,
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
  const actorPlanCodeAtEvent =
    pickString(
      row.actorPlanCodeAtEvent,
      row.actor_plan_code_at_event,
      person.actorPlanCodeAtEvent,
      person.actor_plan_code_at_event,
    ) || null;
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
    actorPlanCodeAtEvent,
    listingId:
      pickString(row.listingId, row.listing_id) || undefined,
    listingStatus: pickString(row.listingStatus, row.listing_status, row.status) || undefined,
    teamMemberName:
      pickString(row.teamMemberName, row.team_member_name, row.teamMember) ||
      undefined,
    source: pickString(row.source, row.contactSource, row.contact_source) || undefined,
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

function normalizeListingViewersFake(tab: unknown, payload: Record<string, unknown>): ListingViewersFake {
  const row = asRecord(tab) || {};
  const rawListings = Array.isArray(row.fakeListings)
    ? row.fakeListings
    : Array.isArray(payload.fakeListings)
      ? payload.fakeListings
      : [];
  const listings = rawListings
    .map((raw): FakeListingViews | null => {
      const item = asRecord(raw);
      if (!item) return null;
      return {
        listingId: pickString(item.listingId, item.id),
        name: pickString(item.projectName, item.title, item.name) || 'Listing',
        fakeViews: pickNumber(item.fakeViews, item.count),
      };
    })
    .filter((item): item is FakeListingViews => !!item);
  return {
    fakeViews:
      pickNumber(row.fakeViews, row.fake_views, payload.fakeViews, payload.fake_views) ||
      listings.reduce((sum, l) => sum + l.fakeViews, 0),
    listings,
  };
}

/** Build day/month timeline from a flat `items` array (publisher viewers/leads API). */
export function groupFlatPersonItems(raw: unknown): GroupedTab<PersonRow> {
  const row = asRecord(raw);
  const items = (row ? asArray(row, 'items', 'records', 'data', 'entries') : asArray(raw))
    .map((item, index) => normalizePerson(item, index))
    .filter((item): item is PersonRow => !!item);
  if (!items.length) return emptyTab();

  const dayMap = new Map<string, PersonRow[]>();
  for (const person of items) {
    const date = isoDate(person.occurredAt) || 'unknown';
    const list = dayMap.get(date) || [];
    list.push(person);
    dayMap.set(date, list);
  }
  const days = sortDays(
    Array.from(dayMap.entries()).map(([date, list]) => ({
      date,
      items: list,
      total: list.length,
      detailAvailable: true,
    })),
  );
  return {
    days,
    months: groupDaysByMonth(days),
    summary: [],
    total: pickNumber(row?.total) || items.length,
  };
}

function responseHasNestedDayItems(raw: unknown): boolean {
  const row = asRecord(raw);
  if (!row) return false;
  for (const day of asArray(row, 'days')) {
    const d = asRecord(day);
    if (d && asArray(d, 'items').length > 0) return true;
  }
  const tabs = asRecord(row.tabs);
  if (tabs && responseHasNestedDayItems(tabs)) return true;
  const grouped = asRecord(row.grouped);
  if (grouped && responseHasNestedDayItems(grouped)) return true;
  return false;
}

function normalizePublisherPagedGrouped(raw: unknown): {
  grouped: GroupedTab<PersonRow>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} {
  const row = asRecord(raw) || {};
  const flat = asArray(row, 'items', 'records', 'data');
  let grouped: GroupedTab<PersonRow>;
  if (flat.length && !responseHasNestedDayItems(row)) {
    grouped = groupFlatPersonItems(row);
  } else {
    grouped = normalizeGroupedTab(row.grouped ?? row.tabs ?? row);
    if (
      flat.length &&
      grouped.days.some((d) => d.total > 0 && d.items.length === 0)
    ) {
      grouped = groupFlatPersonItems(row);
    } else if (!grouped.days.length && flat.length) {
      grouped = groupFlatPersonItems(row);
    }
  }
  const total = pickNumber(row.total) || grouped.total;
  return {
    grouped: { ...grouped, total: total || grouped.total },
    total,
    page: pickNumber(row.page, 1) || 1,
    limit: pickNumber(row.limit, 20) || 20,
    totalPages: pickNumber(row.totalPages, row.total_pages, 1) || 1,
  };
}

function resolveGroupBy(
  raw: unknown,
  from: string,
  to: string,
): 'day' | 'month' {
  const row = asRecord(raw);
  const value = pickString(row?.groupBy, row?.group_by).toLowerCase();
  if (value === 'day' || value === 'days' || value === 'date') return 'day';
  if (value === 'month' || value === 'months') return 'month';
  return spansMultipleMonths(from, to) ? 'month' : 'day';
}

function emptyTab(): GroupedTab<PersonRow> {
  return { days: [], months: [], summary: [], total: 0 };
}

function normalizeTabMeta(raw: unknown): AnalyticsTabMeta[] {
  const list = asArray(raw, 'tabMeta', 'tabs_meta');
  const out: AnalyticsTabMeta[] = [];
  for (const item of list) {
    const row = asRecord(item);
    if (!row) continue;
    const key = pickString(row.key, row.id);
    const label = pickString(row.label, row.name, row.title);
    if (!key) continue;
    out.push({ key, label: label || key.replace(/_/g, ' ') });
  }
  return out;
}

function normalizeSummary(raw: unknown): AnalyticsSummary | undefined {
  const row = asRecord(raw);
  if (!row) return undefined;
  return {
    listingViews: pickNumber(row.listingViews, row.listing_views, row.views),
    shares: pickNumber(row.shares),
    brochures:
      row.brochures === null || row.brochures === undefined
        ? row.brochureDownloads === null
          ? null
          : pickNumber(row.brochures, row.brochureDownloads, row.brochure_downloads) || null
        : pickNumber(row.brochures, row.brochureDownloads),
    contacts: pickNumber(row.contacts),
    saves: pickNumber(row.saves),
  };
}

function normalizePublisherUsage(raw: unknown): PublisherUsage | undefined {
  const row = asRecord(raw);
  if (!row) return undefined;
  const limitsRaw = asRecord(row.limits) || {};
  const usageRaw = asRecord(row.usage) || {};
  const limits: Record<string, number | null> = {};
  const usage: Record<string, number> = {};
  for (const [k, v] of Object.entries(limitsRaw)) {
    limits[k] = v === null ? null : pickNumber(v);
  }
  for (const [k, v] of Object.entries(usageRaw)) {
    usage[k] = pickNumber(v);
  }
  if (!Object.keys(limits).length && !Object.keys(usage).length) return undefined;
  return { limits, usage };
}

function resolveAnalyticsMode(
  raw: unknown,
  appRole?: string | null,
): AnalyticsMode {
  const value = pickString(raw).toLowerCase();
  if (
    value === 'agent' ||
    value === 'publisher_developer' ||
    value === 'publisher_floor'
  ) {
    return value;
  }
  const role = String(appRole || '')
    .trim()
    .toLowerCase();
  if (role === 'developer') return 'publisher_developer';
  if (role === 'floor') return 'publisher_floor';
  return 'agent';
}

function normalizeTabsByKey(
  tabsRaw: unknown,
  tabMeta: AnalyticsTabMeta[],
  mode: AnalyticsMode,
): PublisherTabs {
  const tabs = asRecord(tabsRaw) || {};
  const keys = tabMeta.length
    ? tabMeta.map((t) => t.key)
    : Object.keys(tabs);
  const out: PublisherTabs = {};
  for (const key of keys) {
    const aliases: unknown[] = [tabs[key]];
    if (key === 'interested' || key === 'leads') {
      aliases.push(tabs.interested, tabs.leads);
    }
    if (key === 'contacted' || key === 'contacts') {
      aliases.push(tabs.contacted, tabs.contacts);
    }
    if (key === 'listingViewers' || key === 'listing_viewers') {
      aliases.push(tabs.listingViewers, tabs.listing_viewers, tabs.viewers);
    }
    let picked: unknown = undefined;
    for (const candidate of aliases) {
      if (candidate !== undefined && candidate !== null) {
        picked = candidate;
        break;
      }
    }
    out[key] = normalizeGroupedTab(picked);
  }
  if (mode === 'agent' && !keys.length) {
    out.views = normalizeGroupedTab(tabs.views);
    out.contacted = normalizeGroupedTab(tabs.contacted ?? tabs.contacts);
    out.interested = normalizeGroupedTab(
      tabs.interested ?? tabs.leads ?? tabs.inquiry,
    );
    out.listingViewers = normalizeGroupedTab(
      tabs.listingViewers ?? tabs.listing_viewers ?? tabs.viewers,
    );
  }
  return out;
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
  const tabsRaw = asRecord(payload.tabs) || payload;
  const analyticsMode = resolveAnalyticsMode(
    payload.analyticsMode ?? payload.analytics_mode,
    user.appRole,
  );
  const tabMeta =
    normalizeTabMeta(payload.tabMeta ?? payload.tab_meta) ||
    (analyticsMode === 'agent' ? DEFAULT_AGENT_TAB_META : []);
  const resolvedMeta =
    tabMeta.length > 0
      ? tabMeta
      : analyticsMode === 'agent'
        ? DEFAULT_AGENT_TAB_META
        : [];
  const tabsByKey = normalizeTabsByKey(tabsRaw, resolvedMeta, analyticsMode);

  const views = tabsByKey.views ?? normalizeGroupedTab(tabsRaw.views) ?? emptyTab();
  const contacted =
    tabsByKey.contacted ??
    tabsByKey.contacts ??
    normalizeGroupedTab(tabsRaw.contacted ?? tabsRaw.contacts) ??
    emptyTab();
  const interested =
    tabsByKey.interested ??
    tabsByKey.leads ??
    normalizeGroupedTab(tabsRaw.interested ?? tabsRaw.leads) ??
    emptyTab();
  const listingViewers =
    tabsByKey.listingViewers ??
    normalizeGroupedTab(
      tabsRaw.listingViewers ?? tabsRaw.listing_viewers ?? tabsRaw.viewers,
    ) ??
    emptyTab();

  return {
    analyticsMode,
    user,
    range: {
      from,
      to,
      groupBy: resolveGroupBy(rangeRow, from, to),
    },
    usage: normalizeUsage(payload.usage),
    publisherUsage: normalizePublisherUsage(payload.publisherUsage ?? payload.publisher_usage),
    summary: normalizeSummary(payload.summary),
    tabMeta: resolvedMeta,
    tabsByKey: {
      ...tabsByKey,
      views,
      contacted,
      interested,
      listingViewers,
    },
    views,
    contacted,
    interested,
    listingViewers,
    listingViewersFake: normalizeListingViewersFake(
      tabsRaw.listingViewers ?? tabsRaw.listing_viewers ?? tabsRaw.viewers,
      payload,
    ),
  };
}

function emptyDetailFallback(
  params: {
    userId: string;
    from: string;
    to: string;
    fallbackUser?: AnalyticsUser | null;
  },
): UserAnalyticsDetail {
  const user =
    params.fallbackUser ||
    ({ id: params.userId, name: '', contact: '', email: '' } satisfies AnalyticsUser);
  const mode = resolveAnalyticsMode(undefined, user.appRole);
  return {
    analyticsMode: mode,
    user,
    range: {
      from: params.from,
      to: params.to,
      groupBy: spansMultipleMonths(params.from, params.to) ? 'month' : 'day',
    },
    usage: null,
    tabMeta: mode === 'agent' ? DEFAULT_AGENT_TAB_META : [],
    tabsByKey: {},
    views: emptyTab(),
    contacted: emptyTab(),
    interested: emptyTab(),
    listingViewers: emptyTab(),
    listingViewersFake: { fakeViews: 0, listings: [] },
  };
}

function normalizePublisherTrack(raw: unknown, appRole?: string | null): PublisherTrack {
  const v = pickString(raw).toLowerCase();
  if (v === 'dbf' || v === 'floor') return 'dbf';
  if (v === 'developer') return 'developer';
  const role = String(appRole || '').toLowerCase();
  return role === 'floor' ? 'dbf' : 'developer';
}

function normalizePublisherCounts(raw: unknown): PublisherListingCounts {
  const row = asRecord(raw) || {};
  const counts: PublisherListingCounts = {
    views: pickNumber(row.views, row.view, row.listingViews),
    share: pickNumber(row.share, row.shares),
    save: pickNumber(row.save, row.saves),
    reveal: pickNumber(
      row.reveal,
      row.reveals,
      row.contactReveals,
      row.contact_reveals,
      row.contact_reveal,
    ),
    call: pickNumber(row.call, row.calls),
    wa: pickNumber(row.wa, row.whatsapp, row.whatsApp),
  };
  if (row.brochure != null || row.brochures != null || row.brochureDownloads != null) {
    counts.brochure = pickNumber(row.brochure, row.brochures, row.brochureDownloads);
  }
  return counts;
}

const PUBLISHER_METRIC_API: Record<PublisherMetricKey, string> = {
  views: 'views',
  share: 'shares',
  brochure: 'brochures',
  save: 'saves',
  reveal: 'contact_reveal',
  call: 'call',
  wa: 'whatsapp',
};

function normalizePublisherListingRow(raw: unknown, index: number): PublisherListingRow | null {
  const row = asRecord(raw);
  if (!row) return null;
  const listingId = pickString(row.listingId, row.listing_id, row.id);
  if (!listingId) return null;
  return {
    listingId,
    title: pickString(row.title, row.displayTitle, row.display_title, row.projectName) || 'Listing',
    city: pickString(row.city, row.cityName, row.city_name),
    status: pickString(row.status) || 'active',
    counts: normalizePublisherCounts(row.counts ?? row.metrics ?? row),
  };
}

function normalizePublisherListings(raw: unknown, appRole?: string | null): PublisherListingsResponse {
  const row = asRecord(raw) || {};
  const items = asArray(row, 'items', 'listings')
    .map(normalizePublisherListingRow)
    .filter((item): item is PublisherListingRow => !!item);
  const statusRaw = pickString(row.status, row.listingStatus).toLowerCase();
  const status: PublisherListingStatus =
    statusRaw === 'inactive'
      ? 'inactive'
      : statusRaw === 'expired'
        ? 'expired'
        : 'active';
  return {
    track: normalizePublisherTrack(row.track, appRole),
    status,
    items,
    total: pickNumber(row.total) || items.length,
    page: pickNumber(row.page, 1) || 1,
    limit: pickNumber(row.limit, 50) || 50,
    totalPages: pickNumber(row.totalPages, row.total_pages, 1) || 1,
  };
}

function normalizePublisherEventRow(raw: unknown, index: number): PublisherEventRow | null {
  const person = normalizePerson(raw, index);
  if (!person) return null;
  return {
    id: person.id,
    name: person.name,
    contact: person.contact,
    project: person.project || undefined,
    city: person.city || undefined,
    location: person.location || undefined,
    bhk: person.bhk || undefined,
    occurredAt: person.occurredAt,
    teamMemberName: person.teamMemberName,
    source: person.source,
    channels: person.channels,
    listingId: person.listingId,
    listingStatus: person.listingStatus,
    actorPlanCodeAtEvent: person.actorPlanCodeAtEvent,
  };
}

function normalizePaginatedEvents(raw: unknown): PaginatedPublisherEvents {
  const row = asRecord(raw) || {};
  const items = asArray(row, 'items', 'events', 'records')
    .map(normalizePublisherEventRow)
    .filter((item): item is PublisherEventRow => !!item);
  return {
    items,
    total: pickNumber(row.total) || items.length,
    page: pickNumber(row.page, 1) || 1,
    limit: pickNumber(row.limit, 20) || 20,
    totalPages: pickNumber(row.totalPages, row.total_pages, 1) || 1,
  };
}

function normalizePublisherViewers(raw: unknown): PublisherListingViewersResponse {
  const row = asRecord(raw) || {};
  const statusRaw = pickString(row.status).toLowerCase();
  const status: PublisherListingStatus =
    statusRaw === 'inactive' ? 'inactive' : 'active';
  const parsed = normalizePublisherPagedGrouped(row);
  return {
    status,
    grouped: parsed.grouped,
    total: parsed.total,
    page: parsed.page,
    limit: parsed.limit,
    totalPages: parsed.totalPages,
    listingViewersFake: normalizeListingViewersFake(row, row),
  };
}

function normalizePublisherLeads(raw: unknown): PublisherLeadsResponse {
  const parsed = normalizePublisherPagedGrouped(asRecord(raw) || {});
  return {
    grouped: parsed.grouped,
    total: parsed.total,
    page: parsed.page,
    limit: parsed.limit,
    totalPages: parsed.totalPages,
  };
}

export function publisherTrackFromAppRole(appRole?: string | null): PublisherTrack {
  return normalizePublisherTrack(undefined, appRole);
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
    const response = await axiosClient.get('/admin/states', { params: { activeOnly: true } });
    return asArray(response.data, 'states')
      .map(normalizePlace)
      .filter((row): row is AnalyticsPlace => !!row);
  },

  getCities: async (stateId: string): Promise<AnalyticsPlace[]> => {
    const response = await axiosClient.get('/admin/cities', {
      params: { activeOnly: true, ...listParams({ stateId }) },
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
    tab?: string;
    fallbackUser?: AnalyticsUser | null;
  }): Promise<UserAnalyticsDetail> => {
    const modeHint = resolveAnalyticsMode(
      undefined,
      params.fallbackUser?.appRole,
    );
    const tabParam = params.tab
      ? analyticsTabToApiParam(params.tab, modeHint)
      : undefined;
    const response = await axiosClient.get(`/admin/user-analytics/users/${params.userId}`, {
      params: listParams({
        from: params.from,
        to: params.to,
        stateId: params.stateId,
        cityId: params.cityId,
        tab: tabParam,
      }),
    });
    const detail = normalizeDetail(response.data, params.fallbackUser);
    if (!detail) {
      return emptyDetailFallback(params);
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

  fetchPublisherListings: async (
    userId: string,
    params: { status?: PublisherListingStatus; page?: number; limit?: number },
    appRole?: string | null,
  ): Promise<PublisherListingsResponse> => {
    const response = await axiosClient.get(
      `/admin/user-analytics/users/${encodeURIComponent(userId)}/publisher-listings`,
      {
        params: listParams({
          status: params.status,
          page: params.page != null ? String(params.page) : undefined,
          limit: params.limit != null ? String(params.limit) : undefined,
        }),
      },
    );
    return normalizePublisherListings(response.data, appRole);
  },

  fetchPublisherListingEvents: async (
    userId: string,
    listingId: string,
    params: { metric: PublisherMetricKey; page?: number; limit?: number },
  ): Promise<PaginatedPublisherEvents> => {
    const response = await axiosClient.get(
      `/admin/user-analytics/users/${encodeURIComponent(userId)}/publisher-listings/${encodeURIComponent(listingId)}/events`,
      {
        params: listParams({
          metric: PUBLISHER_METRIC_API[params.metric] || params.metric,
          page: params.page != null ? String(params.page) : undefined,
          limit: params.limit != null ? String(params.limit) : undefined,
        }),
      },
    );
    return normalizePaginatedEvents(response.data);
  },

  fetchPublisherListingViewers: async (
    userId: string,
    params?: { status?: PublisherListingStatus; page?: number; limit?: number },
  ): Promise<PublisherListingViewersResponse> => {
    const response = await axiosClient.get(
      `/admin/user-analytics/users/${encodeURIComponent(userId)}/publisher-listing-viewers`,
      {
        params: listParams({
          status: params?.status,
          page: params?.page != null ? String(params.page) : undefined,
          limit: params?.limit != null ? String(params.limit) : undefined,
        }),
      },
    );
    return normalizePublisherViewers(response.data);
  },

  fetchPublisherLeads: async (
    userId: string,
    params?: { page?: number; limit?: number },
  ): Promise<PublisherLeadsResponse> => {
    const response = await axiosClient.get(
      `/admin/user-analytics/users/${encodeURIComponent(userId)}/publisher-leads`,
      {
        params: listParams({
          page: params?.page != null ? String(params.page) : undefined,
          limit: params?.limit != null ? String(params.limit) : undefined,
        }),
      },
    );
    return normalizePublisherLeads(response.data);
  },

  fetchAgentListings: async (
    userId: string,
    params: {
      status?: PublisherListingStatus;
      categoryGroup?: AgentListingCategoryGroup;
      page?: number;
      limit?: number;
    },
  ): Promise<PublisherListingsResponse> => {
    const response = await axiosClient.get(
      `/admin/user-analytics/users/${encodeURIComponent(userId)}/agent-listings`,
      {
        params: listParams({
          status: params.status,
          categoryGroup: params.categoryGroup,
          page: params.page != null ? String(params.page) : undefined,
          limit: params.limit != null ? String(params.limit) : undefined,
        }),
      },
    );
    return normalizePublisherListings(response.data, params.categoryGroup === 'dbf' ? 'floor' : 'agent');
  },

  fetchAgentListingEvents: async (
    userId: string,
    listingId: string,
    params: {
      metric: PublisherMetricKey;
      categoryGroup?: AgentListingCategoryGroup;
      page?: number;
      limit?: number;
    },
  ): Promise<PaginatedPublisherEvents> => {
    const response = await axiosClient.get(
      `/admin/user-analytics/users/${encodeURIComponent(userId)}/agent-listings/${encodeURIComponent(listingId)}/events`,
      {
        params: listParams({
          metric: PUBLISHER_METRIC_API[params.metric] || params.metric,
          categoryGroup: params.categoryGroup,
          page: params.page != null ? String(params.page) : undefined,
          limit: params.limit != null ? String(params.limit) : undefined,
        }),
      },
    );
    return normalizePaginatedEvents(response.data);
  },

  fetchMyListingAnalytics: async (
    userId: string,
  ): Promise<MyListingAnalyticsConfig> => {
    const response = await axiosClient.get(
      `/admin/user-analytics/users/${encodeURIComponent(userId)}/my-listing-analytics`,
    );
    return normalizeMyListingAnalytics(response.data);
  },

  updateMyListingAnalytics: async (
    userId: string,
    payload: UpdateMyListingAnalyticsPayload,
  ): Promise<MyListingAnalyticsConfig> => {
    const response = await axiosClient.patch(
      `/admin/user-analytics/users/${encodeURIComponent(userId)}/my-listing-analytics`,
      payload,
    );
    return normalizeMyListingAnalytics(response.data);
  },
};

function parseMyListingMetricIds(raw: unknown): MyListingAnalyticsMetric[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: MyListingAnalyticsMetric[] = [];
  for (const item of list) {
    const key = String(item).trim().toLowerCase();
    if (!key || !/^[a-z0-9_]+$/.test(key)) continue;
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

function normalizeMyListingMetricList(
  raw: unknown,
  allowed?: MyListingAnalyticsMetric[],
): MyListingAnalyticsMetric[] {
  const parsed = parseMyListingMetricIds(raw);
  if (!allowed?.length) return parsed;
  const set = new Set(allowed);
  return parsed.filter((id) => set.has(id));
}

function normalizeMyListingMetricLabels(raw: unknown): Record<string, string> {
  const row = asRecord(raw);
  if (!row) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const id = String(key).trim().toLowerCase();
    const label = pickString(value);
    if (id && label) out[id] = label;
  }
  return out;
}

function normalizeMyListingOwnerKind(raw: unknown): MyListingAnalyticsOwnerKind | undefined {
  const v = pickString(raw).toLowerCase();
  if (v === 'developer' || v === 'agent' || v === 'dbf') return v;
  return undefined;
}

function normalizeMyListingAnalytics(raw: unknown): MyListingAnalyticsConfig {
  const row = asRecord(asRecord(raw)?.data ?? raw) || {};
  const defaultsRaw = asRecord(row.defaults) || {};
  const legacyDefault = [...MY_LISTING_ANALYTICS_METRICS];
  const available =
    parseMyListingMetricIds(row.availableMetrics ?? row.available_metrics).length > 0
      ? parseMyListingMetricIds(row.availableMetrics ?? row.available_metrics)
      : legacyDefault;
  const defaultMetrics =
    normalizeMyListingMetricList(defaultsRaw.metrics, available).length > 0
      ? normalizeMyListingMetricList(defaultsRaw.metrics, available)
      : available.slice(0, 4);
  const effectiveLegacy = normalizeMyListingMetricList(
    row.effectiveMetrics ?? row.effective_metrics,
    available,
  );
  const displayMetricsRaw = normalizeMyListingMetricList(
    row.displayMetrics ?? row.display_metrics,
    available,
  );
  const displayMetrics =
    displayMetricsRaw.length > 0 ? displayMetricsRaw : effectiveLegacy;
  const metricLabels = normalizeMyListingMetricLabels(row.metricLabels ?? row.metric_labels);
  const maxMetrics = Math.max(1, pickNumber(row.maxMetrics, row.max_metrics) || 4);
  return {
    enabled: asBool(row.enabled, true),
    metrics: normalizeMyListingMetricList(row.metrics, available),
    ownerKind: normalizeMyListingOwnerKind(row.ownerKind ?? row.owner_kind),
    displayMetrics,
    viewersPopupEnabled: asBool(
      row.viewersPopupEnabled ?? row.viewers_popup_enabled,
      false,
    ),
    effectiveMetrics: effectiveLegacy.length ? effectiveLegacy : undefined,
    availableMetrics: available,
    metricLabels,
    maxMetrics,
    defaults: {
      enabled: asBool(defaultsRaw.enabled, true),
      metrics: defaultMetrics,
    },
  };
}

export function validateMyListingAnalyticsPayload(
  payload: UpdateMyListingAnalyticsPayload,
  options?: {
    availableMetrics?: MyListingAnalyticsMetric[];
    maxMetrics?: number;
  },
): string | null {
  const max = options?.maxMetrics ?? 4;
  const available = options?.availableMetrics;
  const unique = normalizeMyListingMetricList(payload.metrics, available);
  if (unique.length !== payload.metrics.length) {
    return 'Each metric can only be selected once.';
  }
  if (unique.length > max) {
    return `At most ${max} metrics are allowed.`;
  }
  if (available?.length) {
    const set = new Set(available);
    for (const m of unique) {
      if (!set.has(m)) return 'Invalid metric in selection.';
    }
  }
  if (payload.enabled && unique.length === 0) {
    return 'Choose at least one metric when My Listings analytics is enabled.';
  }
  return null;
}
