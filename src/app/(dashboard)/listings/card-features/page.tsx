'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2, Save, Trash2 } from 'lucide-react';
import { PermissionGuard } from '@/components/common/permission-guard';
import { SortableTableBody } from '@/components/common/sortable-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/store/use-auth-store';
import {
  listingCardFeaturesService,
  type CardFeatureContexts,
  type CardFeatureRow,
} from '@/services/listing-card-features.service';

const EMPTY_CONTEXTS: CardFeatureContexts = {
  categories: [],
  buildingTypes: [],
  propertyTypes: [],
};

function withOrder(rows: CardFeatureRow[]): CardFeatureRow[] {
  return rows.map((row, index) => ({ ...row, sortOrder: index }));
}

function selectionHint(label: string, count: number) {
  const names = Array.from({ length: count }, (_, index) => `${label} ${index + 1}`);
  const shown =
    names.length <= 1
      ? names[0] || label
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `Form allows ${count} selections. Label shows as ${shown}.`;
}

function rowSnapshot(rows: CardFeatureRow[]) {
  return JSON.stringify(
    rows.map((row) => ({
      fieldId: row.fieldId,
      isVisible: row.isVisible,
      sortOrder: row.sortOrder,
      displayLabel: row.displayLabel,
    })),
  );
}

export default function ListingCardFeaturesPage() {
  const canUpdate = useAuthStore((s) => s.permissions.has('form_modules:update'));
  const [contexts, setContexts] = useState<CardFeatureContexts>(EMPTY_CONTEXTS);
  const [categoryId, setCategoryId] = useState('');
  const [buildingTypeId, setBuildingTypeId] = useState('');
  const [propertyTypeId, setPropertyTypeId] = useState('');
  const [rows, setRows] = useState<CardFeatureRow[]>([]);
  const [baseline, setBaseline] = useState('');
  const [pendingIcons, setPendingIcons] = useState<Record<string, File>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [loadingContexts, setLoadingContexts] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [saving, setSaving] = useState(false);
  const [iconBusyId, setIconBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    let cancelled = false;
    listingCardFeaturesService
      .getContexts()
      .then((data) => {
        if (!cancelled) setContexts(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(listingCardFeaturesService.errorMessage(err, 'Failed to load card feature filters.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingContexts(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const buildingTypes = useMemo(
    () =>
      contexts.buildingTypes.filter(
        (row) => !row.categoryId || row.categoryId === categoryId,
      ),
    [contexts.buildingTypes, categoryId],
  );

  const propertyTypes = useMemo(
    () =>
      contexts.propertyTypes.filter(
        (row) => !row.buildingTypeId || row.buildingTypeId === buildingTypeId,
      ),
    [contexts.propertyTypes, buildingTypeId],
  );

  const selectionReady = Boolean(categoryId && buildingTypeId && propertyTypeId);
  const snapshot = useMemo(() => rowSnapshot(rows), [rows]);
  const dirty = selectionReady && (snapshot !== baseline || Object.keys(pendingIcons).length > 0);

  const loadRows = useCallback(async (cat: string, building: string, property: string) => {
    setLoadingRows(true);
    setError('');
    setNotice('');
    setPendingIcons({});
    setPreviews((current) => {
      Object.values(current).forEach((url) => URL.revokeObjectURL(url));
      return {};
    });
    try {
      const data = await listingCardFeaturesService.getFeatures({
        categoryId: cat,
        buildingTypeId: building,
        propertyTypeId: property,
      });
      const ordered = withOrder(data);
      setRows(ordered);
      setBaseline(rowSnapshot(ordered));
    } catch (err) {
      setRows([]);
      setBaseline('');
      setError(listingCardFeaturesService.errorMessage(err, 'Failed to load card features.'));
    } finally {
      setLoadingRows(false);
    }
  }, []);

  useEffect(() => {
    if (!selectionReady) {
      setRows([]);
      setBaseline('');
      return;
    }
    void loadRows(categoryId, buildingTypeId, propertyTypeId);
  }, [selectionReady, categoryId, buildingTypeId, propertyTypeId, loadRows]);

  const visibleCountBefore = (index: number) =>
    rows.slice(0, index).filter((row) => row.isVisible).length;

  const queueIcon = (fieldId: string, file: File | undefined) => {
    if (!file) return;
    setPendingIcons((current) => ({ ...current, [fieldId]: file }));
    setPreviews((current) => {
      if (current[fieldId]) URL.revokeObjectURL(current[fieldId]);
      return { ...current, [fieldId]: URL.createObjectURL(file) };
    });
    setNotice('');
  };

  const uploadQueued = async (saved: CardFeatureRow[], queued: Record<string, File>) => {
    const entries = Object.entries(queued);
    if (entries.length === 0) return saved;
    let next = saved;
    for (const [fieldId, file] of entries) {
      const row = next.find((item) => item.fieldId === fieldId);
      if (!row?.id) {
        throw new Error(`Save the list before uploading an icon for ${row?.fieldLabel || 'this field'}.`);
      }
      setIconBusyId(row.id);
      const updated = await listingCardFeaturesService.uploadIcon(row.id, file);
      if (updated?.iconUrl) {
        next = next.map((item) =>
          item.fieldId === fieldId ? { ...item, id: updated.id || item.id, iconUrl: updated.iconUrl } : item,
        );
      }
    }
    return next;
  };

  const save = async () => {
    if (!selectionReady || !canUpdate) return;
    setSaving(true);
    setError('');
    setNotice('');
    const queued = { ...pendingIcons };
    try {
      const saved = await listingCardFeaturesService.saveFeatures({
        categoryId,
        buildingTypeId,
        propertyTypeId,
        items: rows.map((row, index) => ({
          fieldId: row.fieldId,
          sortOrder: index,
          isVisible: row.isVisible,
          displayLabel: row.displayLabel.trim(),
        })),
      });
      await uploadQueued(withOrder(saved), queued);
      const ordered = withOrder(
        await listingCardFeaturesService.getFeatures({
          categoryId,
          buildingTypeId,
          propertyTypeId,
        }),
      );
      setRows(ordered);
      setPendingIcons({});
      setPreviews((current) => {
        Object.values(current).forEach((url) => URL.revokeObjectURL(url));
        return {};
      });
      setBaseline(rowSnapshot(ordered));
      setNotice('Card features saved.');
    } catch (err) {
      setError(listingCardFeaturesService.errorMessage(err, 'Failed to save card features.'));
    } finally {
      setIconBusyId(null);
      setSaving(false);
    }
  };

  const removeIcon = async (row: CardFeatureRow) => {
    if (!canUpdate) return;
    if (pendingIcons[row.fieldId]) {
      setPendingIcons((current) => {
        const next = { ...current };
        delete next[row.fieldId];
        return next;
      });
      setPreviews((current) => {
        if (current[row.fieldId]) URL.revokeObjectURL(current[row.fieldId]);
        const next = { ...current };
        delete next[row.fieldId];
        return next;
      });
      return;
    }
    if (!row.id || !row.iconUrl) return;
    setIconBusyId(row.id);
    setError('');
    try {
      await listingCardFeaturesService.deleteIcon(row.id);
      setRows((current) =>
        current.map((item) => (item.fieldId === row.fieldId ? { ...item, iconUrl: null } : item)),
      );
    } catch (err) {
      setError(listingCardFeaturesService.errorMessage(err, 'Failed to remove icon.'));
    } finally {
      setIconBusyId(null);
    }
  };

  return (
    <PermissionGuard
      permission="form_modules:read"
      fallback={<div className="p-12 text-center text-gray-500">You do not have permission to view card features.</div>}
    >
      <div className="space-y-6 pb-24">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Card features</h1>
            <p className="mt-1 text-gray-500">
              Choose which listing-form fields appear as chips on app listing cards for each category, building type, and property type.
            </p>
          </div>
          <Button onClick={() => void save()} disabled={!canUpdate || !dirty || saving || loadingRows}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <FilterSelect
              label="Category"
              placeholder="Select category"
              value={categoryId}
              disabled={loadingContexts}
              options={contexts.categories}
              onChange={(value) => {
                setCategoryId(value);
                setBuildingTypeId('');
                setPropertyTypeId('');
              }}
            />
            <FilterSelect
              label="Building type"
              placeholder="Select building type"
              value={buildingTypeId}
              disabled={!categoryId || loadingContexts}
              options={buildingTypes}
              onChange={(value) => {
                setBuildingTypeId(value);
                setPropertyTypeId('');
              }}
            />
            <FilterSelect
              label="Property type"
              placeholder="Select property type"
              value={propertyTypeId}
              disabled={!buildingTypeId || loadingContexts}
              options={propertyTypes}
              onChange={setPropertyTypeId}
            />
          </div>
          <p className="mt-4 text-sm text-gray-500">
            The first 4 filled values on a listing are the app card’s first horizontal row. Remaining chips show when the card expands. Empty values are skipped, and the next filled chip moves up. Media, address, geo, notes, and floor-pricing tables are not included. Developer project cards do not use this list.
          </p>
        </div>

        {error ? <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}
        {notice ? <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p> : null}

        {!selectionReady ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <h3 className="mb-2 text-lg font-medium text-gray-900">Complete selection required</h3>
            <p className="text-sm text-gray-500">Select a category, building type, and property type to edit card chips.</p>
          </div>
        ) : loadingRows ? (
          <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-gray-700">Module</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Field</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Label</th>
                    <th className="px-6 py-4 text-center font-semibold text-gray-700">Show</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Icon</th>
                  </tr>
                </thead>
                {rows.length === 0 ? (
                  <tbody>
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No chip-worthy fields are visible on this listing form.
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <SortableTableBody
                    items={rows.map((row) => ({ ...row, id: row.fieldId }))}
                    disabled={!canUpdate || saving}
                    onReorder={(ordered) => {
                      setRows(
                        withOrder(
                          ordered.map((item) => {
                            const source = rows.find((row) => row.fieldId === item.fieldId);
                            return source ? { ...source } : { ...item, id: item.id === item.fieldId ? null : item.id };
                          }),
                        ),
                      );
                    }}
                    renderRow={(item, { dragHandle, index }) => {
                      const row = rows.find((entry) => entry.fieldId === item.fieldId) || item;
                      const preview = previews[row.fieldId];
                      const iconSrc = preview || row.iconUrl;
                      const primary = row.isVisible && visibleCountBefore(index) < 4;
                      const busy = iconBusyId != null && iconBusyId === row.id;
                      return (
                        <>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {dragHandle}
                              <div>
                                <p className="font-medium text-gray-900">{row.moduleName}</p>
                                {primary ? (
                                  <p className="mt-0.5 text-xs text-primary">Primary row</p>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-800">{row.fieldLabel}</td>
                          <td className="px-6 py-4" onClick={(event) => event.stopPropagation()}>
                            <Input
                              value={row.displayLabel}
                              disabled={!canUpdate || saving}
                              placeholder={row.fieldLabel}
                              className="h-9 min-w-44 bg-gray-50"
                              onChange={(event) => {
                                const value = event.target.value;
                                setRows((current) =>
                                  current.map((entry) =>
                                    entry.fieldId === row.fieldId ? { ...entry, displayLabel: value } : entry,
                                  ),
                                );
                              }}
                            />
                            {row.maxSelections != null ? (
                              <p className="mt-1 max-w-xs text-xs text-gray-500">
                                {selectionHint(row.displayLabel.trim() || row.fieldLabel, row.maxSelections)}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-6 py-4 text-center" onClick={(event) => event.stopPropagation()}>
                            <Switch
                              checked={row.isVisible}
                              disabled={!canUpdate || saving}
                              onCheckedChange={(value) => {
                                setRows((current) =>
                                  current.map((entry) =>
                                    entry.fieldId === row.fieldId ? { ...entry, isVisible: Boolean(value) } : entry,
                                  ),
                                );
                              }}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {iconSrc ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={iconSrc} alt="" className="h-9 w-9 rounded-md border border-gray-200 object-contain bg-gray-50" />
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed border-gray-200 text-gray-400">
                                  <ImagePlus className="h-4 w-4" />
                                </div>
                              )}
                              <input
                                ref={(node) => {
                                  fileRefs.current[row.fieldId] = node;
                                }}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) => {
                                  queueIcon(row.fieldId, event.target.files?.[0]);
                                  event.target.value = '';
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!canUpdate || saving || busy}
                                onClick={() => fileRefs.current[row.fieldId]?.click()}
                              >
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Icon'}
                              </Button>
                              {iconSrc ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={!canUpdate || saving || busy}
                                  onClick={() => void removeIcon(row)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              ) : null}
                              {!row.id && pendingIcons[row.fieldId] ? (
                                <span className="text-xs text-gray-500">Uploads on save</span>
                              ) : null}
                            </div>
                          </td>
                        </>
                      );
                    }}
                  />
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

function FilterSelect({
  label,
  placeholder,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  options: Array<{ id: string; name: string }>;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.id === value)?.name;
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <Select value={value || ''} onValueChange={(next) => next && onChange(next)} disabled={disabled}>
        <SelectTrigger className="h-11 w-full border-gray-200 bg-gray-50 disabled:opacity-50">
          {selected ? <span>{selected}</span> : <SelectValue placeholder={placeholder} />}
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
          {options.length === 0 ? <div className="p-2 text-sm text-gray-500">No options</div> : null}
        </SelectContent>
      </Select>
    </div>
  );
}
