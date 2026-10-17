'use client';

import { useCallback, useEffect, useState } from 'react';
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

  const [propertyTypes, setPropertyTypes] = useState<FormSuggestionPropertyType[]>([]);
  const [propertyTypeId, setPropertyTypeId] = useState('');
  const [typesReady, setTypesReady] = useState(kind === 'location');

  const [items, setItems] = useState<FormSuggestion[]>([]);
  const [loading, setLoading] = useState(kind === 'location');
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toDelete, setToDelete] = useState<FormSuggestion | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState('');

  const listReady = kind === 'location' || Boolean(propertyTypeId);
  const selectedType = propertyTypes.find((row) => row.id === propertyTypeId);
  const propertyTypeLabel = selectedType?.label || '';

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
    if (kind === 'property' && !propertyTypeId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const rows =
        kind === 'property'
          ? await formSuggestionsService.listPropertyNames(propertyTypeId)
          : await formSuggestionsService.listLocations();
      setItems(rows);
    } catch (err) {
      setItems([]);
      setError(formSuggestionApiError(err, 'Failed to load suggestions.'));
    } finally {
      setLoading(false);
    }
  }, [kind, propertyTypeId]);

  useEffect(() => {
    if (!typesReady) return;
    void fetchItems();
  }, [typesReady, fetchItems]);

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
        });
      } else {
        await formSuggestionsService.createLocations({ location_ids: ids });
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
              {kind === 'property'
                ? 'A property type is selected. Add saved project names that are not suggestions yet.'
                : 'Add saved locations that are not suggestions yet.'}
            </p>
          </div>
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
        </div>

        {kind === 'property' ? (
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

        {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

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
              : 'No suggestions yet.'
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
      </div>

      <SuggestionAddDialog
        open={formOpen}
        kind={kind}
        propertyTypeId={propertyTypeId}
        propertyTypeName={propertyTypeLabel}
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
