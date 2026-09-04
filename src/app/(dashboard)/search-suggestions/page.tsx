'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { SortableTableBody } from '@/components/common/sortable-list';
import { DeleteRemarkDialog } from '@/components/common/delete-remark-dialog';
import { SuggestionFormDialog } from '@/modules/search-suggestions/suggestion-form-dialog';
import { locationService } from '@/services/location.service';
import { withCount } from '@/lib/filter-label';
import {
  SEARCH_SUGGESTIONS_FILTER_KEY,
  searchSuggestionsApiError,
  searchSuggestionsService,
  suggestionDisplayTitle,
  type SearchSuggestion,
} from '@/services/search-suggestions.service';
import {
  Building2,
  Edit2,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';

type LocItem = { id: string; name: string; state_id?: string; state?: { id: string } };

function readStoredFilters(): { stateId: string; cityId: string } {
  if (typeof window === 'undefined') return { stateId: '', cityId: '' };
  try {
    const raw = sessionStorage.getItem(SEARCH_SUGGESTIONS_FILTER_KEY);
    if (!raw) return { stateId: '', cityId: '' };
    const parsed = JSON.parse(raw) as { stateId?: string; cityId?: string };
    return { stateId: parsed.stateId || '', cityId: parsed.cityId || '' };
  } catch {
    return { stateId: '', cityId: '' };
  }
}

function writeStoredFilters(stateId: string, cityId: string) {
  sessionStorage.setItem(SEARCH_SUGGESTIONS_FILTER_KEY, JSON.stringify({ stateId, cityId }));
}

export default function SearchSuggestionsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('search_suggestions', 'create');
  const canUpdate = hasPermission('search_suggestions', 'update');
  const canDelete = hasPermission('search_suggestions', 'delete');

  const [states, setStates] = useState<LocItem[]>([]);
  const [cities, setCities] = useState<LocItem[]>([]);
  const [stateId, setStateId] = useState('');
  const [cityId, setCityId] = useState('');
  const [filtersReady, setFiltersReady] = useState(false);

  const [items, setItems] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SearchSuggestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toDelete, setToDelete] = useState<SearchSuggestion | null>(null);
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
    Promise.all([locationService.getStates(), locationService.getCities()])
      .then(([statesRes, citiesRes]) => {
        if (cancelled) return;
        const nextStates = (Array.isArray(statesRes) ? statesRes : []) as LocItem[];
        const nextCities = (Array.isArray(citiesRes) ? citiesRes : []) as LocItem[];
        setStates(nextStates);
        setCities(nextCities);

        const stored = readStoredFilters();
        const validState =
          stored.stateId && nextStates.some((s) => s.id === stored.stateId) ? stored.stateId : '';
        const validCity =
          validState &&
          stored.cityId &&
          nextCities.some(
            (c) =>
              c.id === stored.cityId &&
              (c.state_id === validState || c.state?.id === validState),
          )
            ? stored.cityId
            : '';
        setStateId(validState);
        setCityId(validCity);
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
  }, []);

  useEffect(() => {
    if (!filtersReady) return;
    writeStoredFilters(stateId, cityId);
  }, [filtersReady, stateId, cityId]);

  const fetchSuggestions = useCallback(async () => {
    if (!stateId || !cityId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setItems(await searchSuggestionsService.list({ stateId, cityId }));
    } catch (err) {
      setItems([]);
      setError(searchSuggestionsApiError(err, 'Failed to load search suggestions.'));
    } finally {
      setLoading(false);
    }
  }, [stateId, cityId]);

  useEffect(() => {
    if (!filtersReady) return;
    void fetchSuggestions();
  }, [filtersReady, fetchSuggestions]);

  const onStateChange = (next: string) => {
    setStateId(next);
    setCityId('');
    setItems([]);
  };

  const openCreate = () => {
    setEditing(null);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (item: SearchSuggestion) => {
    setEditing(item);
    setFormError('');
    setFormOpen(true);
  };

  const handleSave = async (payload: { listingId: string; isActive: boolean }) => {
    if (!stateId || !cityId) return;
    setSaving(true);
    setFormError('');
    try {
      if (editing?.id) {
        await searchSuggestionsService.update(editing.id, {
          listingId: payload.listingId,
          isActive: payload.isActive,
        });
      } else {
        await searchSuggestionsService.create({
          stateId,
          cityId,
          listingId: payload.listingId,
          isActive: payload.isActive,
        });
      }
      setFormOpen(false);
      setEditing(null);
      await fetchSuggestions();
    } catch (err) {
      setFormError(searchSuggestionsApiError(err, 'Failed to save suggestion.'));
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (ordered: Array<SearchSuggestion & { sortOrder: number }>) => {
    const previous = items;
    setItems(ordered);
    try {
      await searchSuggestionsService.reorder(ordered.map((item) => item.id));
    } catch (err) {
      setItems(previous);
      setError(searchSuggestionsApiError(err, 'Failed to reorder suggestions.'));
    }
  };

  const handleToggleActive = async (item: SearchSuggestion, next: boolean) => {
    setStatusBusyId(item.id);
    const previous = items;
    setItems((rows) =>
      rows.map((row) => (row.id === item.id ? { ...row, isActive: next } : row)),
    );
    try {
      await searchSuggestionsService.update(item.id, { isActive: next });
    } catch (err) {
      setItems(previous);
      setError(searchSuggestionsApiError(err, 'Failed to update suggestion visibility.'));
    } finally {
      setStatusBusyId('');
    }
  };

  const handleDelete = async (remark: string) => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await searchSuggestionsService.remove(toDelete.id, remark);
      setToDelete(null);
      await fetchSuggestions();
    } catch (err) {
      setError(searchSuggestionsApiError(err, 'Failed to delete suggestion.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PermissionGuard
      permission="search_suggestions:read"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view Search Suggestions.
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl pb-16">
        <Breadcrumb items={[{ label: 'Search Suggestions' }]} />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Search Suggestions</h1>
            <p className="mt-1 text-gray-500">
              Curate Developer project shortcuts shown in app search for each city. Only published
              Developer listings can be linked.
            </p>
          </div>
          {canCreate && ready && (
            <Button onClick={openCreate} className="bg-primary text-white hover:bg-primary/90">
              <Plus className="mr-1.5 h-4 w-4" />
              Add suggestion
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={stateId} onValueChange={(v) => onStateChange(v ?? '')}>
            <SelectTrigger className="w-52 bg-white">
              <span>
                {stateName
                  ? withCount(stateName, cityCountByState(stateId))
                  : 'Select State'}
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
            onValueChange={(v) => setCityId(v ?? '')}
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

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {!ready ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-gray-500">
            Select State and City to view and manage search suggestions.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50/80">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-gray-700">Project</th>
                    <th className="px-5 py-3 font-semibold text-gray-700">Details</th>
                    <th className="px-5 py-3 font-semibold text-gray-700">Sort</th>
                    <th className="px-5 py-3 font-semibold text-gray-700">Status</th>
                    <th className="px-5 py-3 text-right font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                {loading ? (
                  <tbody>
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                      </td>
                    </tr>
                  </tbody>
                ) : items.length === 0 ? (
                  <tbody>
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                        <Search className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                        No suggestions for {cityName || 'this city'} yet. Add a Developer project.
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <SortableTableBody
                    items={items}
                    disabled={!canUpdate}
                    onReorder={handleReorder}
                    renderRow={(item, { dragHandle }) => (
                      <>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                              {item.listing?.thumbnailUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.listing.thumbnailUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-gray-400">
                                  <Building2 className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-gray-900">
                                {suggestionDisplayTitle(item)}
                              </p>
                              <p className="truncate text-xs text-gray-500">
                                {item.listing?.subtitle || item.listingId}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {item.listing?.category && (
                              <Badge variant="outline" className="bg-white text-gray-700 border-gray-200">
                                {item.listing.category}
                              </Badge>
                            )}
                            {item.listing?.status && (
                              <Badge variant="outline" className="bg-white text-gray-700 border-gray-200">
                                {item.listing.status}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">{dragHandle}</td>
                        <td className="px-5 py-4">
                          {canUpdate ? (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={item.isActive}
                                disabled={statusBusyId === item.id}
                                onCheckedChange={(checked) =>
                                  handleToggleActive(item, Boolean(checked))
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
                          <div className="flex items-center justify-end gap-1">
                            {canUpdate && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(item)}
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4 text-gray-500" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setToDelete(item)}
                                className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  />
                )}
              </table>
            </div>
          </div>
        )}
      </div>

      <SuggestionFormDialog
        open={formOpen}
        suggestion={editing}
        stateId={stateId}
        cityId={cityId}
        cityName={cityName}
        submitting={saving}
        error={formError}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditing(null);
            setFormError('');
          }
        }}
        onSubmit={handleSave}
      />

      <DeleteRemarkDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete suggestion?"
        itemName={toDelete ? suggestionDisplayTitle(toDelete) : undefined}
        submitting={deleting}
        onConfirm={handleDelete}
      />
    </PermissionGuard>
  );
}
