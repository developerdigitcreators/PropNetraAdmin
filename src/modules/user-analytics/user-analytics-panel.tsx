'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { SearchableSelect } from '@/components/common/searchable-select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  countTabItems,
  sumViewCount,
  userAnalyticsApiError,
  userAnalyticsService,
  type AnalyticsPlace,
  type AnalyticsUser,
  type DayBucket,
  type GroupedTab,
  type LeadRow,
  type MonthBucket,
  type UserAnalyticsDetail,
  type ViewProperty,
} from '@/services/user-analytics.service';
import {
  BarChart3,
  CalendarRange,
  Eye,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
} from 'lucide-react';

type DetailTab = 'views' | 'contacted' | 'inquiry';

function parseLocalDate(iso: string) {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDayLabel(iso: string) {
  const date = parseLocalDate(iso);
  if (!date) return iso || '—';
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatMonthLabel(ym: string) {
  const match = ym.match(/^(\d{4})-(\d{2})/);
  if (!match) return ym;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  if (Number.isNaN(date.getTime())) return ym;
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDayLabel(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function userLabel(user: Pick<AnalyticsUser, 'name' | 'contact' | 'email'>) {
  return [user.name || 'Unnamed user', user.contact || user.email].filter(Boolean).join(' · ');
}

function dash(value?: string | null) {
  return value?.trim() || '—';
}

function timelineDays<T>(tab: GroupedTab<T>, groupBy: 'day' | 'month'): DayBucket<T>[] {
  if (groupBy === 'day') {
    return tab.days.length ? tab.days : tab.months.flatMap((month) => month.days);
  }
  return [];
}

function timelineMonths<T>(tab: GroupedTab<T>, groupBy: 'day' | 'month'): MonthBucket<T>[] {
  if (groupBy !== 'month') return [];
  if (tab.months.length) return tab.months;
  if (!tab.days.length) return [];
  const map = new Map<string, DayBucket<T>[]>();
  for (const day of tab.days) {
    const key = day.date.slice(0, 7) || 'unknown';
    const list = map.get(key) || [];
    list.push(day);
    map.set(key, list);
  }
  return Array.from(map.entries()).map(([month, days]) => ({ month, days }));
}

function EmptyState({ icon: Icon, text }: { icon: typeof Eye; text: string }) {
  return (
    <div className="px-6 py-16 text-center text-gray-500">
      <Icon className="mx-auto mb-3 h-8 w-8 text-gray-300" />
      {text}
    </div>
  );
}

function DaySection({ date, children }: { date: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-4 py-2.5">
        <CalendarRange className="h-3.5 w-3.5 text-gray-400" />
        <h4 className="text-sm font-semibold text-gray-800">{formatDayLabel(date)}</h4>
      </div>
      {children}
    </section>
  );
}

function MonthSection({ month, children }: { month: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
          {formatMonthLabel(month)}
        </span>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ViewsTable({ items, empty }: { items: ViewProperty[]; empty?: string }) {
  if (!items.length) {
    return <p className="px-4 py-6 text-sm text-gray-500">{empty || 'No listing views on this date.'}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100 bg-gray-50/60">
          <tr>
            <th className="px-4 py-2.5 font-semibold text-gray-700">Listing</th>
            <th className="px-4 py-2.5 font-semibold text-gray-700">City</th>
            <th className="px-4 py-2.5 font-semibold text-gray-700">Location</th>
            <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Views</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className="border-b border-gray-50 last:border-0">
              <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
              <td className="px-4 py-3 text-gray-600">{dash(row.city)}</td>
              <td className="px-4 py-3 text-gray-600">{dash(row.location)}</td>
              <td className="px-4 py-3 text-right">
                <Badge variant="secondary" className="bg-primary-light text-primary">
                  {row.viewCount}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeadsTable({ items, empty }: { items: LeadRow[]; empty?: string }) {
  if (!items.length) {
    return <p className="px-4 py-6 text-sm text-gray-500">{empty || 'No records on this date.'}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100 bg-gray-50/60">
          <tr>
            <th className="px-4 py-2.5 font-semibold text-gray-700">Name</th>
            <th className="px-4 py-2.5 font-semibold text-gray-700">Contact no</th>
            <th className="px-4 py-2.5 font-semibold text-gray-700">Project</th>
            <th className="px-4 py-2.5 font-semibold text-gray-700">City</th>
            <th className="px-4 py-2.5 font-semibold text-gray-700">Location</th>
            <th className="px-4 py-2.5 font-semibold text-gray-700">Date & time</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className="border-b border-gray-50 last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{dash(row.name)}</span>
                  {row.archived && (
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                      Archived
                    </Badge>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-gray-600">{dash(row.contact)}</td>
              <td className="px-4 py-3 text-gray-900">{dash(row.project)}</td>
              <td className="px-4 py-3 text-gray-600">{dash(row.city)}</td>
              <td className="px-4 py-3 text-gray-600">{dash(row.location)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                {formatDateTime(row.occurredAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeadTabContent({
  tab,
  groupBy,
  empty,
  emptyDay,
}: {
  tab: GroupedTab<LeadRow>;
  groupBy: 'day' | 'month';
  empty: string;
  emptyDay: string;
}) {
  const hasTimeline = tab.days.length > 0 || tab.months.length > 0;
  if (!hasTimeline && tab.summary.length) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <LeadsTable items={tab.summary} empty={empty} />
      </div>
    );
  }
  return (
    <GroupedTimeline
      tab={tab}
      groupBy={groupBy}
      empty={empty}
      renderDay={(day) => <LeadsTable items={day.items} empty={emptyDay} />}
    />
  );
}

function GroupedTimeline<T>({
  tab,
  groupBy,
  empty,
  renderDay,
}: {
  tab: GroupedTab<T>;
  groupBy: 'day' | 'month';
  empty: string;
  renderDay: (day: DayBucket<T>) => ReactNode;
}) {
  const months = timelineMonths(tab, groupBy);
  const days = timelineDays(tab, groupBy);
  const hasTimeline = months.length > 0 || days.length > 0;

  if (!hasTimeline) {
    return <EmptyState icon={CalendarRange} text={empty} />;
  }

  if (groupBy === 'month') {
    return (
      <div className="space-y-6">
        {months.map((month) => (
          <MonthSection key={month.month} month={month.month}>
            {month.days.map((day) => (
              <DaySection key={day.date} date={day.date}>
                {renderDay(day)}
              </DaySection>
            ))}
          </MonthSection>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {days.map((day) => (
        <DaySection key={day.date} date={day.date}>
          {renderDay(day)}
        </DaySection>
      ))}
    </div>
  );
}

export function UserAnalyticsPanel() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [stateId, setStateId] = useState('');
  const [cityId, setCityId] = useState('');
  const [userId, setUserId] = useState('');

  const [states, setStates] = useState<AnalyticsPlace[]>([]);
  const [cities, setCities] = useState<AnalyticsPlace[]>([]);
  const [users, setUsers] = useState<AnalyticsUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AnalyticsUser | null>(null);

  const [statesLoading, setStatesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [error, setError] = useState('');
  const [detail, setDetail] = useState<UserAnalyticsDetail | null>(null);
  const [tab, setTab] = useState<DetailTab>('views');

  const rangeReady = !!from && !!to && from <= to;
  const rangeError = !!from && !!to && from > to ? 'End date must be on or after the start date.' : '';
  const canPickState = rangeReady;
  const canPickCity = rangeReady && !!stateId;
  const canPickUser = rangeReady && !!stateId && !!cityId;

  const stateName = states.find((row) => row.id === stateId)?.name;
  const cityName = cities.find((row) => row.id === cityId)?.name;

  const userOptions = useMemo(
    () => users.map((user) => ({ value: user.id, label: userLabel(user) })),
    [users],
  );

  useEffect(() => {
    if (!rangeReady) {
      setStates([]);
      setStateId('');
      return;
    }
    let cancelled = false;
    setStatesLoading(true);
    userAnalyticsService
      .getStates()
      .then((items) => {
        if (!cancelled) setStates(items);
      })
      .catch((err) => {
        if (!cancelled) {
          setStates([]);
          setError(userAnalyticsApiError(err, 'Failed to load states.'));
        }
      })
      .finally(() => {
        if (!cancelled) setStatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rangeReady]);

  useEffect(() => {
    if (!canPickCity) {
      setCities([]);
      setCityId('');
      return;
    }
    let cancelled = false;
    setCitiesLoading(true);
    userAnalyticsService
      .getCities(stateId)
      .then((items) => {
        if (!cancelled) setCities(items);
      })
      .catch((err) => {
        if (!cancelled) {
          setCities([]);
          setError(userAnalyticsApiError(err, 'Failed to load cities.'));
        }
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canPickCity, stateId]);

  const loadUsers = useCallback(
    (search = '') => {
      if (!canPickUser) {
        setUsers([]);
        return;
      }
      setUsersLoading(true);
      userAnalyticsService
        .searchUsers({ stateId, cityId, from, to, search })
        .then(setUsers)
        .catch((err) => {
          setUsers([]);
          setError(userAnalyticsApiError(err, 'Failed to search users.'));
        })
        .finally(() => setUsersLoading(false));
    },
    [canPickUser, cityId, from, stateId, to],
  );

  useEffect(() => {
    if (!canPickUser) {
      setUsers([]);
      setUserId('');
      setSelectedUser(null);
      setDetail(null);
      return;
    }
    loadUsers('');
  }, [canPickUser, loadUsers]);

  useEffect(() => {
    if (!userId || !rangeReady) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setError('');
    userAnalyticsService
      .getUserAnalytics({
        userId,
        from,
        to,
        stateId,
        cityId,
        fallbackUser: selectedUser,
      })
      .then((next) => {
        if (!cancelled) setDetail(next);
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail(null);
          setError(userAnalyticsApiError(err, 'Failed to load user analytics.'));
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cityId, from, rangeReady, selectedUser, stateId, to, userId]);

  const pickUser = (id: string) => {
    setUserId(id);
    const match = users.find((user) => user.id === id) || null;
    setSelectedUser(match);
    setTab('views');
  };

  const groupBy =
    detail?.range.groupBy || (from && to && from.slice(0, 7) !== to.slice(0, 7) ? 'month' : 'day');
  const viewsCount = detail ? sumViewCount(detail.views) : 0;
  const contactedCount = detail ? countTabItems(detail.contacted) : 0;
  const inquiryCount = detail ? countTabItems(detail.interested) : 0;

  const onTabChange = (value: string | null) => {
    if (value === 'views' || value === 'contacted' || value === 'inquiry') setTab(value);
  };

  const viewsHasTimeline = Boolean(
    detail && (detail.views.days.length || detail.views.months.length),
  );

  return (
    <PermissionGuard
      permission="user_analytics:read"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view User Analytics.
        </div>
      }
    >
      <div className="max-w-7xl space-y-6 pb-16">
        <Breadcrumb items={[{ label: 'User Analytics' }]} />

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">User Analytics</h1>
          <p className="mt-1 text-gray-500">
            Choose a date range, then state, city, and a user to see listing views, contacts, and inquiries.
          </p>
        </div>

        <div className="relative z-20 overflow-visible rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">From</span>
              <Input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setUserId('');
                  setSelectedUser(null);
                  setDetail(null);
                }}
                className="h-9 bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">To</span>
              <Input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => {
                  setTo(e.target.value);
                  setUserId('');
                  setSelectedUser(null);
                  setDetail(null);
                }}
                className="h-9 bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">State</span>
              <Select
                value={stateId || null}
                onValueChange={(value) => {
                  setStateId(value ?? '');
                  setCityId('');
                  setUserId('');
                  setSelectedUser(null);
                  setDetail(null);
                }}
                disabled={!canPickState}
              >
                <SelectTrigger className="h-9 w-full bg-white">
                  <span className={!stateName ? 'text-muted-foreground' : ''}>
                    {statesLoading
                      ? 'Loading…'
                      : stateName || (canPickState ? 'Select state' : 'Select dates first')}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {states.map((state) => (
                    <SelectItem key={state.id} value={state.id}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">City</span>
              <Select
                value={cityId || null}
                onValueChange={(value) => {
                  setCityId(value ?? '');
                  setUserId('');
                  setSelectedUser(null);
                  setDetail(null);
                }}
                disabled={!canPickCity}
              >
                <SelectTrigger className="h-9 w-full bg-white">
                  <span className={!cityName ? 'text-muted-foreground' : ''}>
                    {citiesLoading
                      ? 'Loading…'
                      : cityName || (canPickCity ? 'Select city' : 'Select state first')}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <div className="relative z-30 sm:col-span-2">
              <span className="mb-1 block text-sm font-medium text-gray-700">User</span>
              <SearchableSelect
                options={userOptions}
                value={userId}
                onValueChange={pickUser}
                onSearch={canPickUser ? loadUsers : undefined}
                loading={usersLoading}
                disabled={!canPickUser}
                placeholder={canPickUser ? 'Search user' : 'Select city first'}
                searchPlaceholder="Search name, phone, or email"
                emptyText="No users found."
                selectedLabel={selectedUser ? userLabel(selectedUser) : undefined}
              />
            </div>
          </div>
          {rangeError && <p className="mt-3 text-sm text-red-600">{rangeError}</p>}
        </div>

        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        {!userId ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-gray-500">
            <BarChart3 className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            Select a user to load views, contacts, and inquiries for the chosen range.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Selected user</p>
                <h2 className="mt-1 truncate text-lg font-semibold text-gray-900">
                  {selectedUser?.name || detail?.user.name || 'User'}
                </h2>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  {(selectedUser?.contact || detail?.user.contact) && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {selectedUser?.contact || detail?.user.contact}
                    </span>
                  )}
                  {(cityName || stateName) && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {[cityName, stateName].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {from && to && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarRange className="h-3.5 w-3.5" />
                      {formatDayLabel(from)} – {formatDayLabel(to)}
                    </span>
                  )}
                </div>
              </div>
              {groupBy === 'month' && (
                <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-600">
                  Grouped by month
                </Badge>
              )}
            </div>

            {detailLoading && !detail ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Tabs value={tab} onValueChange={onTabChange} className="w-full">
                <TabsList className="mb-4 h-auto border bg-white p-1 shadow-sm">
                  <TabsTrigger
                    value="views"
                    className="gap-1.5 rounded-md px-5 data-[state=active]:bg-primary-light data-[state=active]:text-primary"
                  >
                    <Eye className="h-4 w-4" />
                    Views
                    <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {viewsCount}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="contacted"
                    className="gap-1.5 rounded-md px-5 data-[state=active]:bg-primary-light data-[state=active]:text-primary"
                  >
                    <Phone className="h-4 w-4" />
                    Contacted
                    <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {contactedCount}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="inquiry"
                    className="gap-1.5 rounded-md px-5 data-[state=active]:bg-primary-light data-[state=active]:text-primary"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Inquiry
                    <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {inquiryCount}
                    </span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="views" className="space-y-4">
                  {detail?.views.summary.length ? (
                    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                      <div className="border-b border-gray-100 px-4 py-3">
                        <h3 className="text-sm font-semibold text-gray-900">Listings in range</h3>
                        <p className="text-xs text-gray-500">
                          View counts for every property this user listed.
                        </p>
                      </div>
                      <ViewsTable items={detail.views.summary} />
                    </div>
                  ) : null}
                  {viewsHasTimeline || !detail?.views.summary.length ? (
                    <GroupedTimeline
                      tab={detail?.views || { days: [], months: [], summary: [] }}
                      groupBy={groupBy}
                      empty="No listing views in this range."
                      renderDay={(day) =>
                        day.items.length ? (
                          <ViewsTable items={day.items} />
                        ) : (
                          <p className="px-4 py-6 text-sm text-gray-600">
                            {day.total
                              ? `${day.total} view${day.total === 1 ? '' : 's'}`
                              : 'No listing views on this date.'}
                          </p>
                        )
                      }
                    />
                  ) : null}
                </TabsContent>

                <TabsContent value="contacted">
                  <LeadTabContent
                    tab={detail?.contacted || { days: [], months: [], summary: [] }}
                    groupBy={groupBy}
                    empty="No one contacted this user’s listings in this range."
                    emptyDay="No contacts on this date."
                  />
                </TabsContent>

                <TabsContent value="inquiry">
                  <LeadTabContent
                    tab={detail?.interested || { days: [], months: [], summary: [] }}
                    groupBy={groupBy}
                    empty="No inquiries for this user’s listings in this range."
                    emptyDay="No inquiries on this date."
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
