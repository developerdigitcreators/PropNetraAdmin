'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { AdminListToolbar } from '@/components/common/admin-list-toolbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { SortableTableBody } from '@/components/common/sortable-list';
import { DeleteRemarkDialog } from '@/components/common/delete-remark-dialog';
import { AddHotspotDialog } from '@/modules/resale-hotspots/add-hotspot-dialog';
import { locationService } from '@/services/location.service';
import { withCount } from '@/lib/filter-label';
import { useUrlFilters } from '@/hooks/use-url-filters';
import {
  resaleHotspotsApiError,
  resaleHotspotsService,
  type ResaleHotspot,
} from '@/services/resale-hotspots.service';
import { Loader2, Plus, Trash2 } from 'lucide-react';

type LocItem = { id: string; name: string; state_id?: string; state?: { id: string } };

export default function ResaleHotspotsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <ResaleHotspotsPageInner />
    </Suspense>
  );
}

function ResaleHotspotsPageInner() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('resale_hotspots', 'create');
  const canUpdate = hasPermission('resale_hotspots', 'update');
  const canDelete = hasPermission('resale_hotspots', 'delete');

  const [states, setStates] = useState<LocItem[]>([]);
  const [cities, setCities] = useState<LocItem[]>([]);
  const { filters, setFilters, resetFilters } = useUrlFilters({
    stateId: '',
    cityId: '',
  });
  const stateId = filters.stateId;
  const cityId = filters.cityId;
  const [filtersReady, setFiltersReady] = useState(false);

  const [items, setItems] = useState<ResaleHotspot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toDelete, setToDelete] = useState<ResaleHotspot | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState('');

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
          setFilters({ stateId: validState, cityId: validCity });
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

  const fetchHotspots = useCallback(async () => {
    if (!stateId || !cityId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setItems(await resaleHotspotsService.list({ stateId, cityId }));
    } catch (err) {
      setItems([]);
      setError(resaleHotspotsApiError(err, 'Failed to load resale hotspots.'));
    } finally {
      setLoading(false);
    }
  }, [stateId, cityId]);

  useEffect(() => {
    if (!filtersReady) return;
    void fetchHotspots();
  }, [filtersReady, fetchHotspots]);

  const handleReorder = async (ordered: Array<ResaleHotspot & { sortOrder: number }>) => {
    if (!cityId) return;
    const previous = items;
    setItems(ordered);
    try {
      await resaleHotspotsService.reorder(
        cityId,
        ordered.map((item) => item.id),
      );
    } catch (err) {
      setItems(previous);
      setError(resaleHotspotsApiError(err, 'Failed to save chip order.'));
    }
  };

  const handleToggleActive = async (item: ResaleHotspot, next: boolean) => {
    setStatusBusyId(item.id);
    const previous = items;
    setItems((rows) => rows.map((row) => (row.id === item.id ? { ...row, isActive: next } : row)));
    try {
      await resaleHotspotsService.update(item.id, { isActive: next });
    } catch (err) {
      setItems(previous);
      setError(resaleHotspotsApiError(err, 'Failed to update chip visibility.'));
    } finally {
      setStatusBusyId('');
    }
  };

  const handleAdd = async (microMarketId: string) => {
    if (!stateId || !cityId) return;
    setSaving(true);
    setFormError('');
    try {
      await resaleHotspotsService.create({ stateId, cityId, microMarketId });
      setFormOpen(false);
      await fetchHotspots();
    } catch (err) {
      setFormError(resaleHotspotsApiError(err, 'Failed to add hotspot.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (remark: string) => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await resaleHotspotsService.remove(toDelete.id, remark);
      setToDelete(null);
      await fetchHotspots();
    } catch (err) {
      setError(resaleHotspotsApiError(err, 'Failed to remove hotspot.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PermissionGuard
      permission="resale_hotspots:read"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view Resale Hotspots.
        </div>
      }
    >
      <div className="space-y-6 w-full pb-16">
        <Breadcrumb items={[{ label: 'Resale Hotspots' }]} />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Resale Hotspots</h1>
            <p className="mt-1 text-gray-500">
              Chips for a city, in drag order. A chip tap in the app searches with that
              micromarket.
            </p>
          </div>
          <AdminListToolbar
            onRefresh={() => void fetchHotspots()}
            refreshBusy={loading}
            refreshDisabled={!ready}
            onReset={() => {
              resetFilters();
              setItems([]);
            }}
          >
            {canCreate && ready ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setFormError('');
                  setFormOpen(true);
                }}
                className="bg-primary text-white hover:bg-primary/90"
              >
                <Plus className="mr-1.5 size-3.5" />
                Add chip
              </Button>
            ) : null}
          </AdminListToolbar>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={stateId} onValueChange={(v) => setFilters({ stateId: v ?? '', cityId: '' })}>
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
            onValueChange={(v) => setFilters({ cityId: v ?? '' })}
            disabled={!stateId}
          >
            <SelectTrigger className="w-48 bg-white">
              <span>
                {cityName
                  ? withCount(cityName, items.length)
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

        {!ready ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-gray-500">
            Select State and City to manage resale hotspot chips.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {error ? <p className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">{error}</p> : null}
            {loading && !items.length ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !items.length ? (
              <div className="px-6 py-16 text-center text-gray-500">
                No hotspot chips for {cityName || 'this city'} yet.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50/80">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-gray-700">Micromarket</th>
                    <th className="px-5 py-3 font-semibold text-gray-700">Order</th>
                    <th className="px-5 py-3 font-semibold text-gray-700">Status</th>
                    <th className="px-5 py-3 text-right font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <SortableTableBody
                  items={items}
                  disabled={!canUpdate}
                  onReorder={handleReorder}
                  renderRow={(item, { dragHandle }) => (
                    <>
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{item.microMarketName}</p>
                      </td>
                      <td className="px-5 py-4">{dragHandle}</td>
                      <td className="px-5 py-4">
                        {canUpdate ? (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={item.isActive}
                              disabled={statusBusyId === item.id}
                              onCheckedChange={(checked) =>
                                void handleToggleActive(item, Boolean(checked))
                              }
                            />
                            <span className="text-xs text-gray-500">
                              {item.isActive ? 'Visible' : 'Hidden'}
                            </span>
                          </div>
                        ) : item.isActive ? (
                          <Badge className="bg-green-100 text-green-700">Visible</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                            Hidden
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {canDelete ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setToDelete(item)}
                            className="text-red-500 hover:bg-red-50 hover:text-red-600"
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </td>
                    </>
                  )}
                />
              </table>
            )}
          </div>
        )}
      </div>

      <AddHotspotDialog
        open={formOpen}
        cityId={cityId}
        cityName={cityName}
        submitting={saving}
        error={formError}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setFormError('');
        }}
        onSubmit={(microMarketId) => void handleAdd(microMarketId)}
      />

      <DeleteRemarkDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Remove hotspot?"
        itemName={toDelete?.microMarketName}
        submitting={deleting}
        onConfirm={handleDelete}
      />
    </PermissionGuard>
  );
}
