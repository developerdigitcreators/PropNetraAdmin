'use client';

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { AdminListToolbar } from '@/components/common/admin-list-toolbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SortableGrid, SortableTableBody } from '@/components/common/sortable-list';
import { AutoslideTimePicker } from '@/components/common/autoslide-time-picker';
import { DbfPickDialog, type DbfPickOption } from '@/modules/dbf-featured/dbf-pick-dialog';
import { locationService } from '@/services/location.service';
import { withCount } from '@/lib/filter-label';
import { useUrlFilters } from '@/hooks/use-url-filters';
import {
  dbfFeaturedApiError,
  dbfFeaturedService,
  type DbfSection,
  type DbfTopBuilderRow,
} from '@/services/dbf-featured.service';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';

type LocItem = { id: string; name: string; state_id?: string; state?: { id: string } };

export default function DbfFeaturedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <DbfFeaturedPageInner />
    </Suspense>
  );
}

function DbfFeaturedPageInner() {
  const { filters, setFilters } = useUrlFilters({ tab: 'sections', stateId: '', cityId: '' });
  const tab = filters.tab === 'builders' ? 'builders' : 'sections';

  return (
    <PermissionGuard
      permission="dbf_featured:read"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view Direct Builder Floor Featured.
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl pb-16">
        <Breadcrumb items={[{ label: 'Direct Builder Floor Featured' }]} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Direct Builder Floor Featured
          </h1>
          <p className="mt-1 text-gray-500">
            Curate the auto-scroll post sections shown at the top of Direct Builder Floor results,
            and the Top Builders list.
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setFilters({ tab: String(v) })}>
          <TabsList>
            <TabsTrigger value="sections">Auto-scroll sections</TabsTrigger>
            <TabsTrigger value="builders">Top Builders</TabsTrigger>
          </TabsList>
          <TabsContent value="sections" className="pt-4">
            <SectionsTab
              stateId={filters.stateId}
              cityId={filters.cityId}
              onFiltersChange={(next) => setFilters(next)}
            />
          </TabsContent>
          <TabsContent value="builders" className="pt-4">
            <TopBuildersTab />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}

function SectionsTab({
  stateId,
  cityId,
  onFiltersChange,
}: {
  stateId: string;
  cityId: string;
  onFiltersChange: (next: { stateId?: string; cityId?: string }) => void;
}) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('dbf_featured', 'create');
  const canUpdate = hasPermission('dbf_featured', 'update');
  const canDelete = hasPermission('dbf_featured', 'delete');

  const [states, setStates] = useState<LocItem[]>([]);
  const [cities, setCities] = useState<LocItem[]>([]);
  const [filtersReady, setFiltersReady] = useState(false);
  const [sections, setSections] = useState<DbfSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [pickSectionId, setPickSectionId] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const ready = Boolean(stateId && cityId);
  const citiesForState = useMemo(
    () => cities.filter((c) => c.state_id === stateId || c.state?.id === stateId),
    [cities, stateId],
  );
  const cityCountByState = useCallback(
    (sid: string) => cities.filter((c) => c.state_id === sid || c.state?.id === sid).length,
    [cities],
  );
  const stateName = states.find((s) => s.id === stateId)?.name || '';
  const cityName = cities.find((c) => c.id === cityId)?.name || '';

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      locationService.getStates({ activeOnly: true }),
      locationService.getCities({ activeOnly: true }),
    ])
      .then(([statesRes, citiesRes]) => {
        if (cancelled) return;
        const nextStates = (Array.isArray(statesRes) ? statesRes : []) as LocItem[];
        const nextCities = (Array.isArray(citiesRes) ? citiesRes : []) as LocItem[];
        setStates(nextStates);
        setCities(nextCities);
        const validState = stateId && nextStates.some((s) => s.id === stateId) ? stateId : '';
        const validCity =
          validState &&
          cityId &&
          nextCities.some(
            (c) => c.id === cityId && (c.state_id === validState || c.state?.id === validState),
          )
            ? cityId
            : '';
        if (validState !== stateId || validCity !== cityId) {
          onFiltersChange({ stateId: validState, cityId: validCity });
        }
        setFiltersReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load states and cities.');
          setFiltersReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSections = useCallback(async () => {
    if (!stateId || !cityId) {
      setSections([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setSections(await dbfFeaturedService.listSections({ stateId, cityId }));
    } catch (err) {
      setSections([]);
      setError(dbfFeaturedApiError(err, 'Failed to load sections.'));
    } finally {
      setLoading(false);
    }
  }, [stateId, cityId]);

  useEffect(() => {
    if (!filtersReady) return;
    void fetchSections();
  }, [filtersReady, fetchSections]);

  const replaceSection = (next: DbfSection | null) => {
    if (!next) return;
    setSections((rows) => rows.map((row) => (row.id === next.id ? next : row)));
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      setCreateError('Enter a section name.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const created = await dbfFeaturedService.createSection({ stateId, cityId, name });
      setCreateOpen(false);
      setNewName('');
      if (created) setExpanded((prev) => ({ ...prev, [created.id]: true }));
      await fetchSections();
    } catch (err) {
      setCreateError(dbfFeaturedApiError(err, 'Failed to create section.'));
    } finally {
      setCreating(false);
    }
  };

  const handleReorderSections = async (ordered: Array<DbfSection & { sortOrder: number }>) => {
    const previous = sections;
    setSections(ordered);
    try {
      await dbfFeaturedService.reorderSections(ordered.map((s) => s.id));
    } catch (err) {
      setSections(previous);
      setError(dbfFeaturedApiError(err, 'Failed to reorder sections.'));
    }
  };

  const handleDeleteSection = async (section: DbfSection) => {
    if (!window.confirm(`Delete section "${section.name}"?`)) return;
    try {
      await dbfFeaturedService.deleteSection(section.id);
      setSections((rows) => rows.filter((row) => row.id !== section.id));
    } catch (err) {
      setError(dbfFeaturedApiError(err, 'Failed to delete section.'));
    }
  };

  const searchPosts = useCallback(
    async (q: string): Promise<DbfPickOption[]> => {
      if (!cityId) return [];
      const rows = await dbfFeaturedService.searchPosts({ cityId, q });
      const existing = new Set(
        sections.find((s) => s.id === pickSectionId)?.items.map((i) => i.listingId) ?? [],
      );
      return rows
        .filter((row) => !existing.has(row.id))
        .map((row) => ({
          value: row.id,
          label: [row.title, row.location, row.priceLabel].filter(Boolean).join(' — '),
        }));
    },
    [cityId, sections, pickSectionId],
  );

  const handleAddPost = async (listingId: string) => {
    if (!pickSectionId) return;
    setAdding(true);
    setAddError('');
    try {
      replaceSection(await dbfFeaturedService.addItem(pickSectionId, listingId));
      setPickSectionId('');
    } catch (err) {
      setAddError(dbfFeaturedApiError(err, 'Failed to add post.'));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={stateId}
            onValueChange={(v) => {
              onFiltersChange({ stateId: v ?? '', cityId: '' });
              setSections([]);
            }}
          >
            <SelectTrigger className="w-52 bg-white">
              <span>
                {stateName ? withCount(stateName, cityCountByState(stateId)) : 'Select State'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {states.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {withCount(s.name, cityCountByState(s.id))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={cityId}
            onValueChange={(v) => onFiltersChange({ cityId: v ?? '' })}
            disabled={!stateId}
          >
            <SelectTrigger className="w-48 bg-white">
              <span>
                {cityName
                  ? withCount(cityName, sections.length)
                  : stateId
                    ? 'Select City'
                    : 'Select state first'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {citiesForState.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <AdminListToolbar
          onRefresh={() => void fetchSections()}
          refreshBusy={loading}
          refreshDisabled={!ready}
          onReset={() => {
            onFiltersChange({ stateId: '', cityId: '' });
            setSections([]);
          }}
        >
          {canCreate && ready ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setNewName('');
                setCreateError('');
                setCreateOpen(true);
              }}
              className="bg-primary text-white hover:bg-primary/90"
            >
              <Plus className="mr-1.5 size-3.5" />
              Add section
            </Button>
          ) : null}
        </AdminListToolbar>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!ready ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-gray-500">
          Select State and City to manage auto-scroll sections.
        </div>
      ) : loading && !sections.length ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !sections.length ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-gray-500">
          No sections for {cityName || 'this city'} yet. Add a section, then add posts to it.
        </div>
      ) : (
        <SortableGrid
          items={sections}
          disabled={!canUpdate}
          onReorder={handleReorderSections}
          className="grid-cols-1 sm:grid-cols-1 md:grid-cols-1"
          renderItem={(section, { dragHandle }) => (
            <SectionCard
              section={section}
              dragHandle={dragHandle}
              expanded={Boolean(expanded[section.id])}
              onToggleExpanded={() =>
                setExpanded((prev) => ({ ...prev, [section.id]: !prev[section.id] }))
              }
              canUpdate={canUpdate}
              canDelete={canDelete}
              onChanged={replaceSection}
              onError={setError}
              onDelete={() => void handleDeleteSection(section)}
              onAddPost={() => {
                setAddError('');
                setPickSectionId(section.id);
              }}
            />
          )}
        />
      )}

      <Dialog open={createOpen} onOpenChange={(next) => !creating && setCreateOpen(next)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add section</DialogTitle>
            <DialogDescription>
              New auto-scroll section for {cityName || 'this city'}. Autoslide defaults to
              00:00:05.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Section name</label>
              <Input
                value={newName}
                maxLength={120}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Premium floors"
              />
            </div>
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button onClick={() => void handleCreate()} disabled={creating}>
                {creating && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Add section
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DbfPickDialog
        open={Boolean(pickSectionId)}
        title="Add post"
        description={`Only published Direct Builder Floor posts from ${cityName || 'this city'} can be added.`}
        fieldLabel="Post"
        placeholder="Select post"
        searchPlaceholder="Search Direct Builder Floor posts…"
        emptyText="No published Direct Builder Floor posts found for this city."
        submitLabel="Add post"
        submitting={adding}
        error={addError}
        search={searchPosts}
        onOpenChange={(open) => {
          if (!open) {
            setPickSectionId('');
            setAddError('');
          }
        }}
        onSubmit={(value) => void handleAddPost(value)}
      />
    </div>
  );
}

function SectionCard({
  section,
  dragHandle,
  expanded,
  onToggleExpanded,
  canUpdate,
  canDelete,
  onChanged,
  onError,
  onDelete,
  onAddPost,
}: {
  section: DbfSection;
  dragHandle: ReactNode;
  expanded: boolean;
  onToggleExpanded: () => void;
  canUpdate: boolean;
  canDelete: boolean;
  onChanged: (next: DbfSection | null) => void;
  onError: (message: string) => void;
  onDelete: () => void;
  onAddPost: () => void;
}) {
  const [name, setName] = useState(section.name);
  const [autoslide, setAutoslide] = useState(section.autoslide);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [removingId, setRemovingId] = useState('');

  useEffect(() => {
    setName(section.name);
    setAutoslide(section.autoslide);
  }, [section.name, section.autoslide]);

  const dirty = name.trim() !== section.name || autoslide !== section.autoslide;

  const save = async () => {
    if (!name.trim()) {
      onError('Section name is required.');
      return;
    }
    setSaving(true);
    try {
      onChanged(
        await dbfFeaturedService.updateSection(section.id, { name: name.trim(), autoslide }),
      );
    } catch (err) {
      onError(dbfFeaturedApiError(err, 'Failed to save section.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (next: boolean) => {
    setToggling(true);
    try {
      onChanged(await dbfFeaturedService.updateSection(section.id, { isActive: next }));
    } catch (err) {
      onError(dbfFeaturedApiError(err, 'Failed to update section.'));
    } finally {
      setToggling(false);
    }
  };

  const removeItem = async (itemId: string) => {
    setRemovingId(itemId);
    try {
      onChanged(await dbfFeaturedService.removeItem(itemId));
    } catch (err) {
      onError(dbfFeaturedApiError(err, 'Failed to remove post.'));
    } finally {
      setRemovingId('');
    }
  };

  const reorderItems = async (ordered: Array<DbfSection['items'][number] & { sortOrder: number }>) => {
    onChanged({ ...section, items: ordered });
    try {
      onChanged(
        await dbfFeaturedService.reorderItems(
          section.id,
          ordered.map((i) => i.id),
        ),
      );
    } catch (err) {
      onChanged(section);
      onError(dbfFeaturedApiError(err, 'Failed to reorder posts.'));
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        {dragHandle}
        <button
          type="button"
          onClick={onToggleExpanded}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />
          )}
          <span className="truncate font-semibold text-gray-900">{section.name}</span>
          <Badge variant="outline" className="bg-white text-gray-600 border-gray-200">
            {section.items.length} post{section.items.length === 1 ? '' : 's'}
          </Badge>
          <Badge variant="outline" className="bg-white text-gray-600 border-gray-200">
            {section.autoslide}
          </Badge>
        </button>
        <div className="flex items-center gap-2">
          <Switch
            checked={section.isActive}
            disabled={!canUpdate || toggling}
            onCheckedChange={(checked) => void toggleActive(Boolean(checked))}
          />
          <span className="text-xs text-gray-500">{section.isActive ? 'Active' : 'Hidden'}</span>
        </div>
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-500 hover:bg-red-50 hover:text-red-600"
            title="Delete section"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-gray-100 px-4 py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Section name</label>
              <Input
                value={name}
                maxLength={120}
                disabled={!canUpdate}
                onChange={(e) => setName(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Autoslide time (HH:MM:SS)</label>
              <AutoslideTimePicker
                value={autoslide}
                onChange={setAutoslide}
                disabled={!canUpdate}
              />
            </div>
            {canUpdate && (
              <Button size="sm" onClick={() => void save()} disabled={!dirty || saving}>
                {saving ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Save
              </Button>
            )}
            <div className="flex-1" />
            {canUpdate && (
              <Button size="sm" variant="outline" onClick={onAddPost}>
                <Plus className="mr-1.5 size-3.5" />
                Add post
              </Button>
            )}
          </div>

          {!section.items.length ? (
            <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
              No posts yet. Sections without posts are hidden in the app.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50/80">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold text-gray-700">Post</th>
                    <th className="px-4 py-2.5 font-semibold text-gray-700">Builder</th>
                    <th className="px-4 py-2.5 font-semibold text-gray-700">Price</th>
                    <th className="px-4 py-2.5 font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-2.5 font-semibold text-gray-700">Sort</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <SortableTableBody
                  items={section.items}
                  disabled={!canUpdate}
                  onReorder={reorderItems}
                  renderRow={(item, { dragHandle: rowHandle }) => (
                    <>
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                            {item.listing?.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.listing.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-gray-400">
                                <Building2 className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900">
                              {item.listing?.title || item.listingId}
                            </p>
                            <p className="truncate text-xs text-gray-500">
                              {item.listing?.location}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{item.listing?.builderName || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{item.listing?.priceLabel || '—'}</td>
                      <td className="px-4 py-3">
                        {item.listing?.status ? (
                          <Badge variant="outline" className="bg-white text-gray-700 border-gray-200">
                            {item.listing.status}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">{rowHandle}</td>
                      <td className="px-4 py-3 text-right">
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={removingId === item.id}
                            onClick={() => void removeItem(item.id)}
                            className="text-red-500 hover:bg-red-50 hover:text-red-600"
                            title="Remove post"
                          >
                            {removingId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </td>
                    </>
                  )}
                />
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TopBuildersTab() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('dbf_featured', 'create');
  const canUpdate = hasPermission('dbf_featured', 'update');
  const canDelete = hasPermission('dbf_featured', 'delete');

  const [rows, setRows] = useState<DbfTopBuilderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [pickOpen, setPickOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await dbfFeaturedService.listTopBuilders());
    } catch (err) {
      setRows([]);
      setError(dbfFeaturedApiError(err, 'Failed to load top builders.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const searchBuilders = useCallback(
    async (q: string): Promise<DbfPickOption[]> => {
      const existing = new Set(rows.map((r) => r.builderUserId));
      const found = await dbfFeaturedService.searchBuilders(q);
      return found
        .filter((b) => !existing.has(b.id))
        .map((b) => ({
          value: b.id,
          label: [b.companyName || b.name, b.contact].filter(Boolean).join(' — '),
        }));
    },
    [rows],
  );

  const handleAdd = async (builderUserId: string) => {
    setAdding(true);
    setAddError('');
    try {
      setRows(await dbfFeaturedService.addTopBuilder(builderUserId));
      setPickOpen(false);
    } catch (err) {
      setAddError(dbfFeaturedApiError(err, 'Failed to add builder.'));
    } finally {
      setAdding(false);
    }
  };

  const handleReorder = async (ordered: Array<DbfTopBuilderRow & { sortOrder: number }>) => {
    const previous = rows;
    setRows(ordered);
    try {
      setRows(await dbfFeaturedService.reorderTopBuilders(ordered.map((r) => r.id)));
    } catch (err) {
      setRows(previous);
      setError(dbfFeaturedApiError(err, 'Failed to reorder builders.'));
    }
  };

  const handleToggle = async (row: DbfTopBuilderRow, next: boolean) => {
    setBusyId(row.id);
    try {
      setRows(await dbfFeaturedService.setTopBuilderActive(row.id, next));
    } catch (err) {
      setError(dbfFeaturedApiError(err, 'Failed to update builder.'));
    } finally {
      setBusyId('');
    }
  };

  const handleRemove = async (row: DbfTopBuilderRow) => {
    setBusyId(row.id);
    try {
      setRows(await dbfFeaturedService.removeTopBuilder(row.id));
    } catch (err) {
      setError(dbfFeaturedApiError(err, 'Failed to remove builder.'));
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          One list for all cities, shown in this order. If empty, app shows auto-ranked builders.
        </p>
        <AdminListToolbar onRefresh={() => void fetchRows()} refreshBusy={loading}>
          {canCreate ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setAddError('');
                setPickOpen(true);
              }}
              className="bg-primary text-white hover:bg-primary/90"
            >
              <Plus className="mr-1.5 size-3.5" />
              Add builder
            </Button>
          ) : null}
        </AdminListToolbar>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && !rows.length ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !rows.length ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-gray-500">
          No curated builders. The app shows auto-ranked builders.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/80">
              <tr>
                <th className="px-5 py-3 font-semibold text-gray-700">Builder</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Contact</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Sort</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Status</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <SortableTableBody
              items={rows}
              disabled={!canUpdate}
              onReorder={handleReorder}
              renderRow={(row, { dragHandle }) => (
                <>
                  <td className="px-5 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                        {row.builder?.companyLogoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.builder.companyLogoUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-400">
                            <Building2 className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">
                          {row.builder?.companyName || row.builder?.name || row.builderUserId}
                        </p>
                        {row.builder?.companyName && row.builder?.name ? (
                          <p className="truncate text-xs text-gray-500">{row.builder.name}</p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-700">{row.builder?.contact || '—'}</td>
                  <td className="px-5 py-3">{dragHandle}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={row.isActive}
                        disabled={!canUpdate || busyId === row.id}
                        onCheckedChange={(checked) => void handleToggle(row, Boolean(checked))}
                      />
                      <span className="text-xs text-gray-500">
                        {row.isActive ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyId === row.id}
                        onClick={() => void handleRemove(row)}
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        title="Remove builder"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </>
              )}
            />
          </table>
        </div>
      )}

      <DbfPickDialog
        open={pickOpen}
        title="Add builder"
        description="Pick a Direct Builder Floor builder to feature in Top Builders."
        fieldLabel="Builder"
        placeholder="Select builder"
        searchPlaceholder="Search builders by name, company or phone…"
        emptyText="No Direct Builder Floor builders found."
        submitLabel="Add builder"
        submitting={adding}
        error={addError}
        search={searchBuilders}
        onOpenChange={(open) => {
          setPickOpen(open);
          if (!open) setAddError('');
        }}
        onSubmit={(value) => void handleAdd(value)}
      />
    </div>
  );
}
