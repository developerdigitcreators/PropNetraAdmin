'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { AdminDataTable } from '@/components/common/admin-data-table';
import { AdminListToolbar } from '@/components/common/admin-list-toolbar';
import { MultiSelect } from '@/components/common/multi-select';
import { useFloatingToast } from '@/components/common/floating-toast';
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
  type ListingFakeStatsRow,
  type ListingFakeStatsSettings,
  type RoleViewsInput,
} from '@/services/listing-fake-stats.service';
import { Check, Loader2, Pencil, X } from 'lucide-react';

const ALL = 'all';

type RoleDraft = { viewsMinPerDay: string; viewsMaxPerDay: string; maxViews: string };

const EMPTY_OPTIONS: FakeStatsFilterOptions = {
  states: [],
  cities: [],
  roles: [],
  plans: [],
  projects: [],
};

const ROLE_FIELDS: Array<[keyof RoleDraft, string]> = [
  ['viewsMinPerDay', 'Views min per day'],
  ['viewsMaxPerDay', 'Views max per day'],
  ['maxViews', 'Max fake views per listing'],
];

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

function enabledRoles(s: ListingFakeStatsSettings | null): Set<FakeStatsRole> {
  return new Set((s?.roles || []).filter((r) => r.scriptEnabled).map((r) => r.role));
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

function toHHmm(value: string) {
  const m = /^(\d{1,2}):(\d{2})/.exec(value || '');
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
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
  options: Array<{ id: string; name: string }>;
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
            {(v: string) => options.find((o) => o.id === v)?.name || placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allowAll ? (
            <SelectItem value={ALL} label="All">
              All
            </SelectItem>
          ) : null}
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id} label={o.name}>
              {o.name}
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
  const [selectedRoles, setSelectedRoles] = useState<FakeStatsRole[]>([]);
  const [drafts, setDrafts] = useState<Partial<Record<FakeStatsRole, RoleDraft>>>({});
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  const [items, setItems] = useState<ListingFakeStatsRow[]>([]);
  const [total, setTotal] = useState(0);
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

  const applySettings = useCallback((s: ListingFakeStatsSettings) => {
    const enabled = enabledRoles(s);
    setSettings(s);
    setSelectedRoles(s.selectedRoles.filter((r) => enabled.has(r)));
    setDrafts(draftsFrom(s));
    setWindowStart(toHHmm(s.timeWindow.start));
    setWindowEnd(toHHmm(s.timeWindow.end));
  }, []);

  useEffect(() => {
    if (!cityId) return;
    let cancelled = false;
    listingFakeStatsService
      .getSettings(cityId)
      .then((s) => !cancelled && applySettings(s))
      .catch((err) => !cancelled && setSettingsError(apiErrorInfo(err, 'Failed to load settings.').message))
      .finally(() => !cancelled && setSettingsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [cityId, applySettings]);

  const fetchList = useCallback(async () => {
    if (!cityId) return;
    setLoading(true);
    setError('');
    try {
      const res = await listingFakeStatsService.list({
        stateId,
        cityId,
        role,
        plan,
        projectId,
        page,
        limit,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      setItems([]);
      setTotal(0);
      setError(apiErrorInfo(err, 'Failed to load listings.').message);
    } finally {
      setLoading(false);
    }
  }, [stateId, cityId, role, plan, projectId, page, limit]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const selectCity = (id: string) => {
    setCityId(id);
    setRole('');
    setPlan('');
    setProjectId('');
    setPage(1);
    setSettings(null);
    setSettingsError('');
    setSettingsLoading(!!id);
    setItems([]);
    setTotal(0);
  };

  const toggleScript = async (r: FakeStatsRole, value: boolean) => {
    if (!cityId) return;
    setTogglingRole(r);
    setSettingsError('');
    try {
      const s = await listingFakeStatsService.updateSettings(cityId, { scriptEnabled: { [r]: value } });
      const enabled = enabledRoles(s);
      setSettings(s);
      setSelectedRoles((prev) => prev.filter((x) => enabled.has(x)));
      setDrafts((prev) => ({ ...draftsFrom(s), ...prev }));
    } catch (err) {
      toast.show(apiErrorInfo(err, 'Failed to update the script.').message, 'error');
    } finally {
      setTogglingRole(null);
    }
  };

  const roleOptions = useMemo(
    () =>
      (settings?.roles || [])
        .filter((r) => r.scriptEnabled)
        .map((r) => ({ value: r.role, label: r.label })),
    [settings],
  );

  const saveSettings = async () => {
    if (!cityId || !settings) return;
    const roles: Partial<Record<FakeStatsRole, RoleViewsInput>> = {};
    for (const r of selectedRoles) {
      const d = drafts[r];
      const label = settings.roles.find((x) => x.role === r)?.label || r;
      const vals = {
        viewsMinPerDay: Number.parseInt(d?.viewsMinPerDay ?? '', 10),
        viewsMaxPerDay: Number.parseInt(d?.viewsMaxPerDay ?? '', 10),
        maxViews: Number.parseInt(d?.maxViews ?? '', 10),
      };
      if (Object.values(vals).some((v) => !Number.isFinite(v) || v < 0)) {
        setSettingsError(`${label}: enter 0 or more in every field.`);
        return;
      }
      if (vals.viewsMaxPerDay < vals.viewsMinPerDay) {
        setSettingsError(`${label}: views max per day cannot be lower than the min.`);
        return;
      }
      roles[r] = vals;
    }
    if (!windowStart || !windowEnd) {
      setSettingsError('Pick a start and end time.');
      return;
    }
    setSettingsError('');
    setSavingSettings(true);
    try {
      applySettings(
        await listingFakeStatsService.updateSettings(cityId, {
          selectedRoles,
          roles,
          timeWindow: { start: windowStart, end: windowEnd },
        }),
      );
      toast.show('Settings saved.');
    } catch (err) {
      setSettingsError(apiErrorInfo(err, 'Failed to save settings.').message);
    } finally {
      setSavingSettings(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const planOptions = options.plans.map((code) => ({
    id: code,
    name: planLabelFromCode(code) || code,
  }));

  const stateCitySelects = (
    <>
      <FilterSelect
        label="Select State"
        value={stateId}
        options={options.states}
        placeholder="Select state"
        allowAll={false}
        onChange={(v) => {
          setStateId(v);
          selectCity('');
        }}
      />
      <FilterSelect
        label="Select City"
        value={cityId}
        options={options.cities}
        placeholder="Select city"
        allowAll={false}
        disabled={!stateId}
        onChange={selectCity}
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
              Real and fake views / leads per listing, per city. Fake numbers are visible only here in admin.
            </p>
          </div>
          {cityId ? (
            <AdminListToolbar onRefresh={() => void fetchList()} refreshBusy={loading} />
          ) : null}
        </div>

        <div className="flex flex-wrap items-end gap-3">{stateCitySelects}</div>

        {!cityId ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
            Select a state and city
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
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
                      {(settings?.roles || []).map((r) => {
                        const blocked = !r.canEnableScript && !r.scriptEnabled;
                        return (
                          <tr key={r.role} className="border-b border-gray-50 last:border-0">
                            <td className="py-3 font-medium text-gray-900">{r.label}</td>
                            <td className="py-3">
                              <span
                                className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                                  r.listingViewersOn
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {r.listingViewersOn ? 'ON' : 'OFF'}
                              </span>
                            </td>
                            <td className="py-3">
                              <div
                                className="flex items-center justify-end gap-2"
                                title={
                                  blocked ? 'Turn off Listing Viewers in Feature Controls first' : undefined
                                }
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
              </div>

              <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-gray-900">Views</h2>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Roles</label>
                  <MultiSelect
                    options={roleOptions}
                    values={selectedRoles}
                    onChange={(v) => setSelectedRoles(v as FakeStatsRole[])}
                    placeholder={roleOptions.length ? 'Select roles' : 'Turn on a script first'}
                    emptyText="No role has the script turned on."
                    disabled={!canUpdate || !settings}
                  />
                </div>

                {selectedRoles.map((r) => {
                  const label = settings?.roles.find((x) => x.role === r)?.label || r;
                  const d = drafts[r] || { viewsMinPerDay: '', viewsMaxPerDay: '', maxViews: '' };
                  return (
                    <div key={r} className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
                      <p className="text-sm font-semibold text-gray-900">{label}</p>
                      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {ROLE_FIELDS.map(([key, fieldLabel]) => (
                          <div key={key} className="space-y-1">
                            <p className="text-xs text-gray-500">{fieldLabel}</p>
                            <Input
                              type="number"
                              min={0}
                              value={d[key]}
                              disabled={!canUpdate}
                              onChange={(e) =>
                                setDrafts((prev) => ({ ...prev, [r]: { ...d, [key]: e.target.value } }))
                              }
                              className="h-9 bg-white"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Time range</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="time"
                      value={windowStart}
                      disabled={!canUpdate || !settings}
                      onChange={(e) => setWindowStart(e.target.value)}
                      className="h-9 w-36"
                    />
                    <span className="text-sm text-gray-500">to</span>
                    <Input
                      type="time"
                      value={windowEnd}
                      disabled={!canUpdate || !settings}
                      onChange={(e) => setWindowEnd(e.target.value)}
                      className="h-9 w-36"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    The end can be earlier than the start (runs past midnight).
                  </p>
                </div>

                <p className="text-sm text-gray-700">
                  Next run: <span className="font-medium">{formatIst(settings?.nextRunAt ?? null)}</span>
                </p>

                {settingsError ? <p className="text-sm text-red-600">{settingsError}</p> : null}

                {canUpdate ? (
                  <Button onClick={() => void saveSettings()} disabled={savingSettings || !settings}>
                    {savingSettings && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                    Save settings
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              {stateCitySelects}
              <FilterSelect
                label="User Role"
                value={role}
                options={options.roles.map((r) => ({ id: r.value, name: r.label }))}
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
                    <th className="px-5 py-3 text-right font-semibold text-gray-700">Real leads</th>
                    <th className="px-5 py-3 text-right font-semibold text-gray-700">Fake leads</th>
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
                      <td className="px-5 py-4 text-right font-medium text-gray-900">{row.realLeads}</td>
                      <td className="px-5 py-4 text-right font-medium text-orange-600">{row.fakeLeads}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminDataTable>
          </>
        )}
      </div>
      {toast.node}
    </PermissionGuard>
  );
}
