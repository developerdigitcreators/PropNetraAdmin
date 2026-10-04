'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { SearchableSelect } from '@/components/common/searchable-select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DeleteRemarkDialog } from '@/components/common/delete-remark-dialog';
import {
  developerHomeApiError,
  developerHomeService,
  type AdminTeamMember,
  type HomeDeveloperPreview,
  type NamedRow,
  type TeamMicroMarket,
} from '@/services/developer-home.service';
import { Loader2, MapPin, Plus, Trash2, UserRound } from 'lucide-react';

const selectCls =
  'h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60';

const PAGES = [
  { value: 'developer_profile', label: 'Developer profile' },
  { value: 'coming_soon', label: 'Coming Soon' },
  { value: 'banner_ads', label: 'Banner ads' },
  { value: 'group_chat', label: 'Group chat' },
] as const;

function developerLabel(d: HomeDeveloperPreview) {
  return [d.companyName || d.name, d.companyName && d.name ? d.name : null, d.contact].filter(Boolean).join(' · ');
}

export default function DeveloperTeamPage() {
  const { permissions } = useAuthStore();
  const canCreate = permissions.has('developer_team:create');
  const canUpdate = permissions.has('developer_team:update') || canCreate;
  const canDelete = permissions.has('developer_team:delete');

  const [devOptions, setDevOptions] = useState<HomeDeveloperPreview[]>([]);
  const [devQuery, setDevQuery] = useState('');
  const [devLoading, setDevLoading] = useState(false);
  const [developer, setDeveloper] = useState<HomeDeveloperPreview | null>(null);
  const devCache = useRef(new Map<string, HomeDeveloperPreview>());

  const [members, setMembers] = useState<AdminTeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mmFor, setMmFor] = useState<AdminTeamMember | null>(null);
  const [toDelete, setToDelete] = useState<AdminTeamMember | null>(null);

  const [form, setForm] = useState({ name: '', phone: '', designation: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDevLoading(true);
    const t = window.setTimeout(() => {
      developerHomeService
        .searchDevelopers(devQuery)
        .then((rows) => {
          if (cancelled) return;
          rows.forEach((r) => devCache.current.set(r.id, r));
          setDevOptions(rows);
        })
        .catch(() => !cancelled && setDevOptions([]))
        .finally(() => !cancelled && setDevLoading(false));
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [devQuery]);

  const load = useCallback(async () => {
    if (!developer) return;
    setLoading(true);
    setError('');
    try {
      setMembers(await developerHomeService.listTeam(developer.id));
    } catch (err) {
      setError(developerHomeApiError(err, 'Failed to load team members.'));
    } finally {
      setLoading(false);
    }
  }, [developer]);

  useEffect(() => {
    void load();
  }, [load]);

  const replaceMember = (m: AdminTeamMember) =>
    setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m, microMarkets: m.microMarkets ?? x.microMarkets } : x)));

  const togglePage = async (m: AdminTeamMember, page: string) => {
    if (!developer) return;
    const has = m.assignments.some((a) => a.page === page);
    const next = has ? m.assignments.filter((a) => a.page !== page) : [...m.assignments, { page, listingId: null }];
    setBusyId(m.id);
    try {
      replaceMember(await developerHomeService.setAssignments(developer.id, m.id, next));
    } catch (err) {
      setError(developerHomeApiError(err, 'Failed to update pages.'));
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (m: AdminTeamMember, isActive: boolean) => {
    if (!developer) return;
    setBusyId(m.id);
    try {
      replaceMember(await developerHomeService.updateMember(developer.id, m.id, { isActive }));
    } catch (err) {
      setError(developerHomeApiError(err, 'Failed to update member.'));
    } finally {
      setBusyId(null);
    }
  };

  const create = async () => {
    if (!developer) return;
    setCreating(true);
    setError('');
    try {
      const m = await developerHomeService.createMember(developer.id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        designation: form.designation.trim() || undefined,
        pages: ['developer_profile', 'coming_soon'],
      });
      setMembers((prev) => [...prev, { ...m, microMarkets: m.microMarkets ?? [] }]);
      setForm({ name: '', phone: '', designation: '' });
      setMmFor({ ...m, microMarkets: m.microMarkets ?? [] });
    } catch (err) {
      setError(developerHomeApiError(err, 'Failed to add member.'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <PermissionGuard
      permission="developer_team:read"
      fallback={<div className="p-12 text-center text-gray-500">You do not have permission to view this page.</div>}
    >
      <div className="space-y-6 pb-24">
        <Breadcrumb items={[{ label: 'Developer Team Members' }]} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Developer Team Members</h1>
          <p className="text-gray-500 mt-1">
            Manage a developer&apos;s sales team, the pages each member appears on, and the micro-markets they cover.
            Agents see these contacts grouped by micro-market and reveal numbers using developer-contact credits.
          </p>
        </div>

        <div className="bg-white rounded-xl border p-5 space-y-1.5 max-w-xl">
          <label className="text-sm font-medium text-gray-700">Developer</label>
          <SearchableSelect
            options={devOptions.map((d) => ({ value: d.id, label: developerLabel(d) }))}
            value={developer?.id || ''}
            selectedLabel={developer ? developerLabel(developer) : ''}
            onValueChange={(v) => setDeveloper(devCache.current.get(v) || null)}
            onSearch={setDevQuery}
            loading={devLoading}
            placeholder="Select a developer"
            searchPlaceholder="Search by company, name or phone"
            emptyText="No developers found."
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {developer && (
          <>
            {canCreate && (
              <div className="bg-white rounded-xl border p-5 space-y-3">
                <h2 className="font-semibold text-gray-900">Add team member</h2>
                <div className="grid gap-3 md:grid-cols-4">
                  <Input
                    placeholder="Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <Input
                    placeholder="10-digit mobile"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                  <Input
                    placeholder="Designation (optional)"
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  />
                  <Button onClick={() => void create()} disabled={creating || !form.name.trim() || !form.phone.trim()}>
                    {creating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
                    Add
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border divide-y">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : members.length === 0 ? (
                <p className="p-10 text-center text-gray-500">No team members yet.</p>
              ) : (
                members.map((m) => {
                  const projectCount = m.assignments.filter((a) => a.page === 'property_detail').length;
                  return (
                    <div key={m.id} className="p-4 flex flex-wrap items-start gap-4">
                      {m.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.photoUrl} alt="" className="h-12 w-12 rounded-full object-cover border" />
                      ) : (
                        <div className="h-12 w-12 rounded-full border bg-gray-50 flex items-center justify-center">
                          <UserRound className="h-5 w-5 text-gray-300" />
                        </div>
                      )}
                      <div className="min-w-[180px] flex-1 space-y-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {m.name}{' '}
                            {!m.isActive && (
                              <Badge variant="outline" className="ml-1 text-gray-500">
                                Inactive
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {[m.phone, m.designation].filter(Boolean).join(' · ')}
                            {projectCount ? ` · ${projectCount} project page${projectCount === 1 ? '' : 's'}` : ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {PAGES.map((p) => {
                            const on = m.assignments.some((a) => a.page === p.value);
                            return (
                              <button
                                type="button"
                                key={p.value}
                                disabled={!canUpdate || busyId === m.id}
                                onClick={() => void togglePage(m, p.value)}
                                className={`px-2.5 py-0.5 rounded-full border text-xs ${
                                  on ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200'
                                }`}
                              >
                                {p.label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          {(m.microMarkets || []).length ? (
                            m.microMarkets.map((mm) => (
                              <Badge key={mm.id} variant="outline" className="text-xs">
                                {mm.name}
                                {mm.cityName ? `, ${mm.cityName}` : ''}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">No micro-markets</span>
                          )}
                          {canUpdate && (
                            <button type="button" className="text-xs text-primary ml-1" onClick={() => setMmFor(m)}>
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={m.isActive}
                          disabled={!canUpdate || busyId === m.id}
                          onCheckedChange={(v) => void toggleActive(m, v)}
                        />
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setToDelete(m)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {developer && mmFor && (
          <MicroMarketDialog
            member={mmFor}
            onClose={() => setMmFor(null)}
            onSave={async (ids) => {
              const m = await developerHomeService.setMicroMarkets(developer.id, mmFor.id, ids);
              replaceMember(m);
              setMmFor(null);
            }}
          />
        )}

        <DeleteRemarkDialog
          open={Boolean(toDelete)}
          onOpenChange={(open) => !open && setToDelete(null)}
          title="Delete team member?"
          itemName={toDelete?.name}
          onConfirm={async () => {
            if (!developer || !toDelete) return;
            try {
              await developerHomeService.deleteMember(developer.id, toDelete.id);
              setMembers((prev) => prev.filter((x) => x.id !== toDelete.id));
              setToDelete(null);
            } catch (err) {
              setToDelete(null);
              setError(developerHomeApiError(err, 'Failed to delete member.'));
            }
          }}
        />
      </div>
    </PermissionGuard>
  );
}

function MicroMarketDialog({
  member,
  onClose,
  onSave,
}: {
  member: AdminTeamMember;
  onClose: () => void;
  onSave: (ids: string[]) => Promise<void>;
}) {
  const [cities, setCities] = useState<NamedRow[]>([]);
  const [cityId, setCityId] = useState('');
  const [markets, setMarkets] = useState<NamedRow[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [selected, setSelected] = useState<Map<string, TeamMicroMarket>>(
    () => new Map((member.microMarkets || []).map((m) => [m.id, m])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    developerHomeService.cities().then(setCities).catch(() => setCities([]));
  }, []);

  useEffect(() => {
    if (!cityId) {
      setMarkets([]);
      return;
    }
    setLoadingMarkets(true);
    developerHomeService
      .microMarkets(cityId)
      .then(setMarkets)
      .catch(() => setMarkets([]))
      .finally(() => setLoadingMarkets(false));
  }, [cityId]);

  const cityName = useMemo(() => cities.find((c) => c.id === cityId)?.name ?? null, [cities, cityId]);

  const toggle = (m: NamedRow) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(m.id)) next.delete(m.id);
      else next.set(m.id, { id: m.id, name: m.name, cityId, cityName: m.cityName ?? cityName });
      return next;
    });

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Micro-markets for {member.name}</DialogTitle>
          <DialogDescription>
            Agents see this member under each selected micro-market when revealing contacts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5 min-h-[28px]">
            {[...selected.values()].map((m) => (
              <Badge key={m.id} variant="outline" className="text-xs cursor-pointer" onClick={() => toggle(m)}>
                {m.name}
                {m.cityName ? `, ${m.cityName}` : ''} ×
              </Badge>
            ))}
            {!selected.size && <span className="text-xs text-gray-400">None selected</span>}
          </div>
          <select className={`${selectCls} w-full`} value={cityId} onChange={(e) => setCityId(e.target.value)}>
            <option value="">Select city</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
            {loadingMarkets ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : !cityId ? (
              <p className="p-4 text-sm text-gray-500">Pick a city to list its micro-markets.</p>
            ) : markets.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No micro-markets in this city.</p>
            ) : (
              markets.map((m) => (
                <label key={m.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m)} />
                  {m.name}
                </label>
              ))
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                setError('');
                try {
                  await onSave([...selected.keys()]);
                } catch (err) {
                  setError(developerHomeApiError(err, 'Failed to save micro-markets.'));
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
