'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { AdminDataTable } from '@/components/common/admin-data-table';
import { AdminListToolbar } from '@/components/common/admin-list-toolbar';
import { useFloatingToast } from '@/components/common/floating-toast';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { planLabelFromCode } from '@/lib/plan-labels';
import { apiErrorInfo } from '@/services/password-reset.service';
import {
  listingFakeStatsService,
  type FakeStatsFilterOptions,
  type FakeStatsRole,
  type FakeStatsSchedules,
  type FakeStatsSummary,
  type ListingFakeStatsRow,
  type ListingFakeStatsSettings,
} from '@/services/listing-fake-stats.service';
import { ScheduleSection, type RoleDraft } from '@/modules/listing-fake-stats/schedule-section';
import { ScheduleHistoryDialog } from '@/modules/listing-fake-stats/schedule-history-dialog';
import { Check, History, Loader2, Pencil, Plus, X } from 'lucide-react';

const ALL = 'all';
const REFRESH_MS = 30_000;

const EMPTY_OPTIONS: FakeStatsFilterOptions = {
  states: [],
  cities: [],
  roles: [],
  plans: [],
  planOptions: [],
  projects: [],
  summary: null,
};

const EMPTY_DRAFT: RoleDraft = { viewsMinPerDay: '', viewsMaxPerDay: '', maxViews: '' };

type Option = { id: string; name: string; count?: number | null };

function draftsFrom(s: ListingFakeStatsSettings): Partial<Record<FakeStatsRole, RoleDraft>> {
  return Object.fromEntries(
    s.roles.map((r) => [
      r.role,
      {
        viewsMinPerDay: String(r.viewsMinPerDay),
        viewsMaxPerDay: String(r.viewsMaxPerDay),
        maxViews: String(r.maxViews),
      },
    ]),
  );
}

function sameDraft(a: RoleDraft | undefined, b: RoleDraft | undefined) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function formatIst(iso: string | null) {
  if (!iso) return '–';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '–';
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function withCount(o: Option) {
  return o.count != null ? `${o.name} (${o.count})` : o.name;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'All',
  allowAll = true,
  disabled,
  className,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  allowAll?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-500">{label}</label>
      <Select
        value={value || (allowAll ? ALL : null)}
        onValueChange={(v) => onChange(!v || v === ALL ? '' : v)}
      >
        <SelectTrigger className={`h-9 min-w-[180px] bg-white ${className || ''}`} disabled={disabled}>
          <SelectValue placeholder={placeholder}>
            {(v: string) => {
              const o = options.find((x) => x.id === v);
              return o ? withCount(o) : placeholder;
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allowAll ? (
            <SelectItem value={ALL} label="All">
              All
            </SelectItem>
          ) : null}
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id} label={withCount(o)}>
              {withCount(o)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FakeViewsCell({
  row,
  canUpdate,
  onSaved,
  onError,
}: {
  row: ListingFakeStatsRow;
  canUpdate: boolean;
  onSaved: (patch: Partial<ListingFakeStatsRow> & { listingId: string }) => void;
  onError: (message: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const value = draft == null ? NaN : Number.parseInt(draft, 10);
  const valid = Number.isFinite(value) && value >= 0;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const res = await listingFakeStatsService.update(row.listingId, { fakeViewCount: value });
      onSaved({ ...res, listingId: row.listingId });
      setDraft(null);
    } catch (err) {
      onError(apiErrorInfo(err, 'Failed to save fake views.').message);
    } finally {
      setSaving(false);
    }
  };

  if (draft == null) {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-orange-600">
        {row.fakeViews}
        {canUpdate ? (
          <button
            type="button"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            onClick={() => setDraft(String(row.fakeViews))}
            title="Edit fake views"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </span>
    );
  }
  return (
    <form
      className="flex items-center justify-end gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Input
        autoFocus
        type="number"
        min={0}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="h-8 w-20 text-right"
      />
      <Button
        type="submit"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-green-600"
        disabled={!valid || saving}
        title="Save"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-gray-400"
        onClick={() => setDraft(null)}
        disabled={saving}
        title="Cancel"
      >
        <X className="h-4 w-4" />
      </Button>
    </form>
  );
}

function SummaryBar({ summary, total }: { summary: FakeStatsSummary | null; total: number }) {
  const parts: Array<[string, number, string]> = [
    ['Total listings', summary?.totalListings ?? total, 'text-gray-900'],
  ];
  if (summary) {
    parts.push(
      ['Real views', summary.realViews, 'text-gray-900'],
      ['Fake views', summary.fakeViews, 'text-orange-600'],
    );
  }
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
      {parts.map(([label, value, tone], i) => (
        <span key={label} className="inline-flex items-center gap-1">
          {i > 0 ? <span className="text-gray-300">·</span> : null}
          {label}: <span className={`font-semibold ${tone}`}>{value.toLocaleString('en-IN')}</span>
        </span>
      ))}
    </p>
  );
}

export default function ListingFakeStatsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canUpdate = hasPermission('listing_fake_stats', 'update');
  const toast = useFloatingToast();

  const [stateId, setStateId] = useState('');
  const [cityId, setCityId] = useState('');
  const [role, setRole] = useState('');
  const [plan, setPlan] = useState('');
  const [projectId, setProjectId] = useState('');
  const [options, setOptions] = useState<FakeStatsFilterOptions>(EMPTY_OPTIONS);

  const [settings, setSettings] = useState<ListingFakeStatsSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [togglingRole, setTogglingRole] = useState<FakeStatsRole | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<FakeStatsRole, RoleDraft>>>({});
  const [savingRole, setSavingRole] = useState<FakeStatsRole | null>(null);
  const [roleErrors, setRoleErrors] = useState<Partial<Record<FakeStatsRole, string>>>({});
  const [loadError, setLoadError] = useState('');

  const [schedules, setSchedules] = useState<FakeStatsSchedules | null>(null);
  const [addRole, setAddRole] = useState<FakeStatsRole | ''>('');
  const [addingRoles, setAddingRoles] = useState<FakeStatsRole[]>([]);
  const [adding, setAdding] = useState(false);
  const [viewsError, setViewsError] = useState('');
  const [sectionDirty, setSectionDirty] = useState<Partial<Record<FakeStatsRole, boolean>>>({});
  const [historyOpen, setHistoryOpen] = useState(false);

  const [items, setItems] = useState<ListingFakeStatsRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<FakeStatsSummary | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listingFakeStatsService
      .filters({ stateId, cityId, role, plan })
      .then((o) => !cancelled && setOptions(o))
      .catch((err) => !cancelled && toast.show(apiErrorInfo(err, 'Failed to load filters.').message, 'error'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateId, cityId, role, plan]);

  useEffect(() => {
    if (!cityId) return;
    let cancelled = false;
    Promise.all([listingFakeStatsService.getSettings(cityId), listingFakeStatsService.getSchedules(cityId)])
      .then(([s, sch]) => {
        if (cancelled) return;
        setSettings(s);
        setDrafts(draftsFrom(s));
        setSchedules(sch);
      })
      .catch((err) => !cancelled && setLoadError(apiErrorInfo(err, 'Failed to load settings.').message))
      .finally(() => !cancelled && setSettingsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [cityId]);

  /** Reloads schedules and the run times without touching unsaved drafts. */
  const refreshSchedules = useCallback(async () => {
    if (!cityId) return;
    try {
      const [s, sch] = await Promise.all([
        listingFakeStatsService.getSettings(cityId),
        listingFakeStatsService.getSchedules(cityId),
      ]);
      setSettings(s);
      setDrafts((prev) => ({ ...draftsFrom(s), ...prev }));
      setSchedules(sch);
    } catch (err) {
      toast.show(apiErrorInfo(err, 'Failed to refresh schedules.').message, 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId]);

  const hasActiveRuns = useMemo(
    () =>
      (schedules?.sections || []).some((s) =>
        s.items.some((i) => i.status === 'pending' || i.status === 'running'),
      ),
    [schedules],
  );

  useEffect(() => {
    if (!cityId || !hasActiveRuns) return;
    const timer = window.setInterval(() => void refreshSchedules(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [cityId, hasActiveRuns, refreshSchedules]);

  const fetchList = useCallback(async () => {
    if (!cityId) return;
    setLoading(true);
    setError('');
    try {
      const res = await listingFakeStatsService.list({ stateId, cityId, role, plan, projectId, page, limit });
      setItems(res.items);
      setTotal(res.total);
      setSummary(res.summary);
    } catch (err) {
      setItems([]);
      setTotal(0);
      setSummary(null);
      setError(apiErrorInfo(err, 'Failed to load listings.').message);
    } finally {
      setLoading(false);
    }
  }, [stateId, cityId, role, plan, projectId, page, limit]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const sections = useMemo(() => {
    if (!settings) return [];
    const byRole = new Map((schedules?.sections || []).map((s) => [s.role, s]));
    return settings.roles
      .filter((r) => byRole.get(r.role)?.hasSection || addingRoles.includes(r.role))
      .map((r) => {
        const s = byRole.get(r.role);
        return {
          role: r.role,
          label: s?.label || r.label,
          scriptEnabled: r.scriptEnabled,
          counts: s?.counts || {},
          items: s?.items || [],
        };
      });
  }, [settings, schedules, addingRoles]);

  const savedDrafts = useMemo(() => (settings ? draftsFrom(settings) : {}), [settings]);
  const draftsDirty = sections.some((s) => !sameDraft(drafts[s.role], savedDrafts[s.role]));
  const { dialog: unsavedDialog, confirmLeave } = useUnsavedChangesGuard({
    dirty: draftsDirty || Object.values(sectionDirty).some(Boolean),
  });

  const onSectionDirty = useCallback((r: FakeStatsRole, dirty: boolean) => {
    setSectionDirty((prev) => (Boolean(prev[r]) === dirty ? prev : { ...prev, [r]: dirty }));
  }, []);

  const changeState = async (id: string) => {
    if (!(await confirmLeave())) return;
    setStateId(id);
    resetCity('');
  };

  const selectCity = async (id: string) => {
    if (!(await confirmLeave())) return;
    resetCity(id);
  };

  const resetCity = (id: string) => {
    setCityId(id);
    setRole('');
    setPlan('');
    setProjectId('');
    setPage(1);
    setSettings(null);
    setSchedules(null);
    setDrafts({});
    setRoleErrors({});
    setLoadError('');
    setViewsError('');
    setAddRole('');
    setAddingRoles([]);
    setSectionDirty({});
    setHistoryOpen(false);
    setSettingsLoading(!!id);
    setItems([]);
    setTotal(0);
    setSummary(null);
  };

  const toggleScript = async (r: FakeStatsRole, value: boolean) => {
    if (!cityId) return;
    setTogglingRole(r);
    try {
      const s = await listingFakeStatsService.updateSettings(cityId, { scriptEnabled: { [r]: value } });
      setSettings(s);
      setDrafts((prev) => ({ ...draftsFrom(s), ...prev }));
      if (!value && addRole === r) setAddRole('');
      void refreshSchedules();
    } catch (err) {
      toast.show(apiErrorInfo(err, 'Failed to update the script.').message, 'error');
    } finally {
      setTogglingRole(null);
    }
  };

  const saveRoleSettings = async (r: FakeStatsRole) => {
    if (!cityId || !settings) return;
    const d = drafts[r];
    const vals = {
      viewsMinPerDay: Number.parseInt(d?.viewsMinPerDay ?? '', 10),
      viewsMaxPerDay: Number.parseInt(d?.viewsMaxPerDay ?? '', 10),
      maxViews: Number.parseInt(d?.maxViews ?? '', 10),
    };
    const fail = (message: string) => setRoleErrors((prev) => ({ ...prev, [r]: message }));
    if (Object.values(vals).some((v) => !Number.isFinite(v) || v < 0)) {
      fail('Enter 0 or more in every field.');
      return;
    }
    if (vals.viewsMaxPerDay < vals.viewsMinPerDay) {
      fail('Views max per day cannot be lower than the min.');
      return;
    }
    setRoleErrors((prev) => ({ ...prev, [r]: '' }));
    setSavingRole(r);
    try {
      const s = await listingFakeStatsService.updateSettings(cityId, { roles: { [r]: vals } });
      setSettings(s);
      setDrafts((prev) => ({ ...prev, [r]: draftsFrom(s)[r] }));
      toast.show('Settings saved.');
    } catch (err) {
      fail(apiErrorInfo(err, 'Failed to save settings.').message);
    } finally {
      setSavingRole(null);
    }
  };

  const addSchedule = async () => {
    if (!cityId || !settings || !addRole) return;
    const r = addRole;
    setViewsError('');
    setAdding(true);
    try {
      if (!settings.selectedRoles.includes(r)) {
        const s = await listingFakeStatsService.updateSettings(cityId, {
          selectedRoles: [...settings.selectedRoles, r],
        });
        setSettings(s);
        setDrafts((prev) => ({ ...draftsFrom(s), ...prev }));
      }
      setAddingRoles((prev) => (prev.includes(r) ? prev : [...prev, r]));
      void refreshSchedules();
    } catch (err) {
      setViewsError(apiErrorInfo(err, 'Failed to add the role.').message);
    } finally {
      setAdding(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const planOptions: Option[] = options.planOptions.map((p) => ({
    id: p.value,
    name: p.label && p.label !== p.value ? p.label : planLabelFromCode(p.value) || p.value,
    count: p.count,
  }));
  const roleFilterOptions: Option[] = options.roles.map((r) => ({ id: r.value, name: r.label, count: r.count }));
  const scriptRoles = settings?.roles || [];
  const historyRoles = scriptRoles.map((r) => ({ value: r.role, label: r.label }));

  const stateCitySelects = (
    <>
      <FilterSelect
        label="Select State"
        value={stateId}
        options={options.states}
        placeholder="Select state"
        allowAll={false}
        onChange={(v) => void changeState(v)}
      />
      <FilterSelect
        label="Select City"
        value={cityId}
        options={options.cities}
        placeholder="Select city"
        allowAll={false}
        disabled={!stateId}
        onChange={(v) => void selectCity(v)}
      />
    </>
  );

  return (
    <PermissionGuard
      permission="listing_fake_stats:read"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view fake listing stats.
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl pb-16">
        <Breadcrumb items={[{ label: 'Fake Listing Stats' }]} />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Fake Listing Stats</h1>
            <p className="mt-1 text-gray-500">
              Real and fake views per listing, per city. Fake numbers are visible only here in admin.
            </p>
          </div>
          {cityId ? (
            <AdminListToolbar
              onRefresh={() => {
                void fetchList();
                void refreshSchedules();
              }}
              refreshBusy={loading}
            />
          ) : null}
        </div>

        <div className="flex flex-wrap items-end gap-3">{stateCitySelects}</div>

        {!cityId ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
            Select a state and city
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900">Script status</h2>
              {settingsLoading && !settings ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                <table className="mt-3 w-full text-left text-sm">
                  <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="py-2 font-medium">Role</th>
                      <th className="py-2 font-medium">Listing viewers status</th>
                      <th className="py-2 text-right font-medium">Script running status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scriptRoles.map((r) => {
                      const blocked = !r.canEnableScript && !r.scriptEnabled;
                      return (
                        <tr key={r.role} className="border-b border-gray-50 last:border-0">
                          <td className="py-3 font-medium text-gray-900">{r.label}</td>
                          <td className="py-3">
                            <span
                              className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                                r.listingViewersOn ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {r.listingViewersOn ? 'ON' : 'OFF'}
                            </span>
                          </td>
                          <td className="py-3">
                            <div
                              className="flex items-center justify-end gap-2"
                              title={blocked ? 'Turn off Listing Viewers in Feature Controls first' : undefined}
                            >
                              {togglingRole === r.role ? (
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              ) : null}
                              <Switch
                                checked={r.scriptEnabled}
                                disabled={!canUpdate || blocked || togglingRole === r.role}
                                onCheckedChange={(v: boolean) => void toggleScript(r.role, v)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {loadError ? <p className="mt-2 text-sm text-red-600">{loadError}</p> : null}
            </div>

            <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Views</h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Next run: <span className="font-medium text-gray-700">{formatIst(settings?.nextRunAt ?? null)}</span>
                    {' · '}
                    Last run: <span className="font-medium text-gray-700">{formatIst(settings?.lastRunAt ?? null)}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canUpdate ? (
                    <>
                      <Select
                        value={addRole || null}
                        onValueChange={(v) => setAddRole((v as FakeStatsRole) || '')}
                      >
                        <SelectTrigger className="h-9 min-w-[200px] bg-white" disabled={!settings}>
                          <SelectValue placeholder="Select role">
                            {(v: string) => scriptRoles.find((r) => r.role === v)?.label || 'Select role'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {scriptRoles.map((r) => (
                            <SelectItem key={r.role} value={r.role} label={r.label} disabled={!r.scriptEnabled}>
                              <span className={r.scriptEnabled ? '' : 'text-gray-400'}>{r.label}</span>
                              {!r.scriptEnabled ? (
                                <span className="ml-2 text-[11px] text-gray-400">Script off</span>
                              ) : null}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button className="h-9" onClick={() => void addSchedule()} disabled={!addRole || adding}>
                        {adding ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-1 h-4 w-4" />
                        )}
                        Add
                      </Button>
                    </>
                  ) : null}
                  <Button variant="outline" className="h-9" onClick={() => setHistoryOpen(true)} disabled={!settings}>
                    <History className="mr-1 h-4 w-4" />
                    History ({schedules?.historyTotal ?? 0})
                  </Button>
                </div>
              </div>
              {viewsError ? <p className="text-sm text-red-600">{viewsError}</p> : null}

              {settingsLoading && !settings ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : sections.length ? (
                sections.map((s) => (
                  <ScheduleSection
                    key={s.role}
                    cityId={cityId}
                    role={s.role}
                    label={s.label}
                    scriptEnabled={s.scriptEnabled}
                    counts={s.counts}
                    items={s.items}
                    canUpdate={canUpdate}
                    draft={drafts[s.role] || EMPTY_DRAFT}
                    onDraftChange={(d) => setDrafts((prev) => ({ ...prev, [s.role]: d }))}
                    onSaveSettings={() => void saveRoleSettings(s.role)}
                    savingSettings={savingRole === s.role}
                    settingsError={roleErrors[s.role] || ''}
                    adding={addingRoles.includes(s.role)}
                    onCloseAdd={() => setAddingRoles((prev) => prev.filter((x) => x !== s.role))}
                    onChanged={() => void refreshSchedules()}
                    onDirtyChange={onSectionDirty}
                    onToast={(m) => toast.show(m)}
                  />
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-500">
                  No role sections yet. Pick a role with the script ON and press + Add.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              {stateCitySelects}
              <FilterSelect
                label="User Role"
                value={role}
                options={roleFilterOptions}
                onChange={(v) => {
                  setRole(v);
                  setProjectId('');
                  setPage(1);
                }}
              />
              <FilterSelect
                label="Plan"
                value={plan}
                options={planOptions}
                onChange={(v) => {
                  setPlan(v);
                  setProjectId('');
                  setPage(1);
                }}
              />
              <FilterSelect
                label="Project Name"
                value={projectId}
                options={options.projects}
                className="min-w-[220px]"
                onChange={(v) => {
                  setProjectId(v);
                  setPage(1);
                }}
              />
            </div>

            <SummaryBar summary={summary ?? options.summary} total={total} />

            <AdminDataTable
              page={page}
              limit={limit}
              total={total}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={(n: number) => {
                setLimit(n);
                setPage(1);
              }}
              loading={loading}
              error={error || null}
              isEmpty={!items.length}
              emptyMessage="No listings found for these filters."
              syncKey={items.length}
            >
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50/80">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-gray-700">Project</th>
                    <th className="px-5 py-3 font-semibold text-gray-700">Role</th>
                    <th className="px-5 py-3 font-semibold text-gray-700">Owner</th>
                    <th className="px-5 py-3 font-semibold text-gray-700">Plan</th>
                    <th className="px-5 py-3 font-semibold text-gray-700">City</th>
                    <th className="px-5 py-3 text-right font-semibold text-gray-700">Real views</th>
                    <th className="px-5 py-3 text-right font-semibold text-gray-700">Fake views</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.listingId} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{row.projectName || row.title || '—'}</p>
                        {row.projectName && row.title && row.title !== row.projectName ? (
                          <p className="text-xs text-gray-500">{row.title}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-gray-700">{row.roleLabel || '—'}</td>
                      <td className="px-5 py-4 text-gray-700">{row.ownerName || '—'}</td>
                      <td className="px-5 py-4 text-gray-700">
                        {row.planCode ? planLabelFromCode(row.planCode) || row.planCode : '—'}
                      </td>
                      <td className="px-5 py-4 text-gray-700">{row.cityName || '—'}</td>
                      <td className="px-5 py-4 text-right font-medium text-gray-900">{row.realViews}</td>
                      <td className="px-5 py-4 text-right">
                        <FakeViewsCell
                          row={row}
                          canUpdate={canUpdate}
                          onSaved={(patch) =>
                            setItems((rows) =>
                              rows.map((r) => (r.listingId === patch.listingId ? { ...r, ...patch } : r)),
                            )
                          }
                          onError={(m) => toast.show(m, 'error')}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminDataTable>
          </>
        )}
      </div>
      {cityId ? (
        <ScheduleHistoryDialog
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          cityId={cityId}
          roles={historyRoles}
          canUpdate={canUpdate}
          onChanged={() => void refreshSchedules()}
          onToast={(m) => toast.show(m)}
        />
      ) : null}
      {toast.node}
      {unsavedDialog}
    </PermissionGuard>
  );
}
