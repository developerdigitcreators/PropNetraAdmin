'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { useIsSuperAdmin } from '@/hooks/use-is-super-admin';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { AdminDataTable } from '@/components/common/admin-data-table';
import { AdminListToolbar } from '@/components/common/admin-list-toolbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { SortableTableBody } from '@/components/common/sortable-list';
import { DeleteRemarkDialog } from '@/components/common/delete-remark-dialog';
import { locationService } from '@/services/location.service';
import {
  formSuggestionApiError,
  formSuggestionsService,
  type FormSuggestion,
  type FormSuggestionPropertyType,
} from '@/services/form-suggestions.service';
import { SuggestionAddDialog } from './suggestion-form-dialog';
import { Loader2, Plus, Trash2 } from 'lucide-react';

type SuggestionsPanelProps = {
  kind: 'property' | 'location';
};

export function SuggestionsPanel({ kind }: SuggestionsPanelProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { superAdmin, ready } = useIsSuperAdmin();
  const canRead = ready && (superAdmin || hasPermission('form_suggestions', 'read'));
  const canCreate = ready && (superAdmin || hasPermission('form_suggestions', 'create'));
  const canUpdate = ready && (superAdmin || hasPermission('form_suggestions', 'update'));
  const canDelete = ready && (superAdmin || hasPermission('form_suggestions', 'delete'));

  const [states, setStates] = useState<Array<{ id: string; name: string }>>([]);
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
  const [stateId, setStateId] = useState('');
  const [cityId, setCityId] = useState('');
  const [citiesLoading, setCitiesLoading] = useState(false);
  const stateRequestRef = useRef('');
  const cityRef = useRef('');
  cityRef.current = cityId;

  const [propertyTypes, setPropertyTypes] = useState<FormSuggestionPropertyType[]>([]);
  const [propertyTypeId, setPropertyTypeId] = useState('');
  const [typesReady, setTypesReady] = useState(kind === 'location');

  const [items, setItems] = useState<FormSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toDelete, setToDelete] = useState<FormSuggestion | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState('');

  const cityReady = Boolean(cityId);
  const listReady = cityReady && (kind === 'location' || Boolean(propertyTypeId));
  const selectedType = propertyTypes.find((row) => row.id === propertyTypeId);
  const propertyTypeLabel = selectedType?.label || '';
  const stateName = states.find((row) => row.id === stateId)?.name || '';
  const cityName = cities.find((row) => row.id === cityId)?.name || '';

  useEffect(() => {
    let cancelled = false;
    locationService
      .getStates({ activeOnly: true })
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : [];
        setStates(
          rows
            .map((row: { id?: string; name?: string }) => ({
              id: String(row?.id || ''),
              name: String(row?.name || ''),
            }))
            .filter((row) => row.id && row.name),
        );
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load states.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onStateChange = (next: string) => {
    setStateId(next);
    setCityId('');
    setCities([]);
    setItems([]);
    setFormOpen(false);
    if (!next) return;
    setCitiesLoading(true);
    stateRequestRef.current = next;
    locationService
      .getCities({ activeOnly: true, stateId: next })
      .then((data) => {
        if (stateRequestRef.current !== next) return;
        const rows = Array.isArray(data) ? data : [];
        setCities(
          rows
            .map((row: { id?: string; name?: string }) => ({
              id: String(row?.id || ''),
              name: String(row?.name || ''),
            }))
            .filter((row) => row.id && row.name),
        );
      })
      .catch(() => setError('Failed to load cities.'))
      .finally(() => setCitiesLoading(false));
  };

  const onCityChange = (next: string) => {
    setCityId(next);
    setItems([]);
    setFormOpen(false);
  };

  useEffect(() => {
    if (kind !== 'property') return;
    let cancelled = false;
    formSuggestionsService
      .listPropertyTypes()
      .then((next) => {
        if (cancelled) return;
        setPropertyTypes(next);
        setPropertyTypeId((current) =>
          current && next.some((row) => row.id === current) ? current : next[0]?.id || '',
        );
        setTypesReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load property types.');
          setTypesReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const fetchItems = useCallback(async () => {
    if (!cityId || (kind === 'property' && !propertyTypeId)) {
      setItems([]);
      setLoading(false);
      return;
    }
    const requestedCityId = cityId;
    setLoading(true);
    setError('');
    try {
      const rows =
        kind === 'property'
          ? await formSuggestionsService.listPropertyNames(propertyTypeId, cityId)
          : await formSuggestionsService.listLocations(cityId);
      if (cityRef.current !== requestedCityId) return;
      setItems(rows);
    } catch (err) {
      setItems([]);
      setError(formSuggestionApiError(err, 'Failed to load suggestions.'));
    } finally {
      setLoading(false);
    }
  }, [kind, propertyTypeId, cityId]);

  useEffect(() => {
    if (!cityId) return;
    if (kind === 'property' && !typesReady) return;
    void fetchItems();
  }, [cityId, typesReady, fetchItems, kind]);

  const openCreate = () => {
    setFormError('');
    setFormOpen(true);
  };

  const handleSave = async (ids: string[]) => {
    setSaving(true);
    setFormError('');
    try {
      if (kind === 'property') {
        await formSuggestionsService.createPropertyNames({
          property_type_id: propertyTypeId,
          property_name_ids: ids,
          state_id: stateId,
          city_id: cityId,
        });
      } else {
        await formSuggestionsService.createLocations({
          location_ids: ids,
          state_id: stateId,
          city_id: cityId,
        });
      }
      setFormOpen(false);
      await fetchItems();
    } catch (err) {
      setFormError(formSuggestionApiError(err, 'Failed to save suggestions.'));
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (ordered: Array<FormSuggestion & { sortOrder: number }>) => {
    const previous = items;
    setItems(ordered);
    const changed = ordered.filter((row, index) => previous[index]?.id !== row.id || previous.find((p) => p.id === row.id)?.sortOrder !== row.sortOrder);
    try {
      for (const row of changed) {
        const payload = { sort_order: row.sortOrder };
        if (kind === 'property') {
          await formSuggestionsService.updatePropertyName(row.id, payload);
        } else {
          await formSuggestionsService.updateLocation(row.id, payload);
        }
      }
    } catch (err) {
      setItems(previous);
      setError(formSuggestionApiError(err, 'Failed to update sort order.'));
    }
  };

  const handleToggleActive = async (item: FormSuggestion, next: boolean) => {
    setStatusBusyId(item.id);
    const previous = items;
    setItems((rows) => rows.map((row) => (row.id === item.id ? { ...row, isActive: next } : row)));
    try {
      const payload = { is_active: next };
      if (kind === 'property') {
        await formSuggestionsService.updatePropertyName(item.id, payload);
      } else {
        await formSuggestionsService.updateLocation(item.id, payload);
      }
    } catch (err) {
      setItems(previous);
      setError(formSuggestionApiError(err, 'Failed to update suggestion.'));
    } finally {
      setStatusBusyId('');
    }
  };

  const handleDelete = async (remark: string) => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      if (kind === 'property') {
        await formSuggestionsService.removePropertyName(toDelete.id, remark);
      } else {
        await formSuggestionsService.removeLocation(toDelete.id, remark);
      }
      setToDelete(null);
      await fetchItems();
    } catch (err) {
      setError(formSuggestionApiError(err, 'Failed to delete suggestion.'));
    } finally {
      setDeleting(false);
    }
  };

  const title = kind === 'property' ? 'Property name suggestions' : 'Location suggestions';

  if (!ready) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="p-12 text-center text-gray-500">
        You do not have permission to view form suggestions.
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl space-y-6 pb-16">
        <Breadcrumb items={[{ label: title }]} />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
            <p className="mt-1 text-gray-500">
              Select a state, then a city. Suggestions load only for that city.
            </p>
          </div>
          {cityReady ? (
            <AdminListToolbar
              onRefresh={() => void fetchItems()}
              refreshDisabled={loading || !listReady}
            >
              {canCreate && listReady ? (
                <Button onClick={openCreate} className="bg-primary text-white hover:bg-primary/90">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add
                </Button>
              ) : null}
            </AdminListToolbar>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={stateId} onValueChange={(value) => onStateChange(value ?? '')}>
            <SelectTrigger className="w-56 bg-white">
              <span>{stateName || 'Select State'}</span>
            </SelectTrigger>
            <SelectContent>
              {states.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {stateId ? (
            <Select
              value={cityId}
              onValueChange={(value) => onCityChange(value ?? '')}
              disabled={citiesLoading}
            >
              <SelectTrigger className="w-56 bg-white">
                <span>
                  {citiesLoading ? 'Loading cities…' : cityName || 'Select City'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {cities.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {kind === 'property' && cityReady ? (
            <Select value={propertyTypeId} onValueChange={(value) => setPropertyTypeId(value ?? '')}>
              <SelectTrigger className="w-72 bg-white">
                <span>{propertyTypeLabel || 'Select property type'}</span>
              </SelectTrigger>
              <SelectContent>
                {propertyTypes.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

        {cityReady ? (
        <AdminDataTable
          page={1}
          limit={Math.max(items.length, 1)}
          total={items.length}
          totalPages={1}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
          loading={loading || (kind === 'property' && !typesReady)}
          isEmpty={listReady && !items.length}
          emptyMessage={
            kind === 'property' && !propertyTypeId
              ? 'Select a property type to see its suggestions.'
              : 'No suggestions for this city yet.'
          }
          syncKey={items.length}
          hidePaginationWhenEmpty
        >
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/80">
              <tr>
                <th className="px-5 py-3 font-semibold text-gray-700">Label</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Sort</th>
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
                  <td className="px-5 py-4 font-medium text-gray-900">{item.label}</td>
                  <td className="px-5 py-4">{dragHandle}</td>
                  <td className="px-5 py-4">
                    {canUpdate ? (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.isActive}
                          disabled={statusBusyId === item.id}
                          onCheckedChange={(checked) => void handleToggleActive(item, Boolean(checked))}
                        />
                        <span className="text-xs text-gray-500">{item.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    ) : item.isActive ? (
                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                        Inactive
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canDelete ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setToDelete(item)}
                          className="text-red-500 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </>
              )}
            />
          </table>
        </AdminDataTable>
        ) : null}
      </div>

      <SuggestionAddDialog
        open={formOpen}
        kind={kind}
        propertyTypeId={propertyTypeId}
        propertyTypeName={propertyTypeLabel}
        cityId={cityId}
        cityName={cityName}
        submitting={saving}
        error={formError}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setFormError('');
        }}
        onSubmit={(ids) => void handleSave(ids)}
      />

      <DeleteRemarkDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete suggestion"
        itemName={toDelete?.label}
        submitting={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
