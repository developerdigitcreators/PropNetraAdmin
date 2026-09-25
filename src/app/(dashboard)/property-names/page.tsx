'use client';

import { Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { locationService } from '@/services/location.service';
import { listingConfigService } from '@/services/listing-config.service';
import { PermissionGuard } from '@/components/common/permission-guard';
import { AdminDataTable } from '@/components/common/admin-data-table';
import { AdminListToolbar } from '@/components/common/admin-list-toolbar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit2, Trash2, Search, AlertTriangle } from 'lucide-react';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { withCount } from '@/lib/filter-label';
import { DeleteRemarkDialog } from '@/components/common/delete-remark-dialog';
import { ImageUrlOrUpload } from '@/components/image-url-or-upload';
import { MultiSelect } from '@/components/common/multi-select';
import { useClientPagedRows } from '@/hooks/use-client-paged-rows';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { useDialogUnsavedGuard } from '@/hooks/use-unsaved-changes-guard';

type NameSuggestion = {
  id: string;
  name: string;
  status?: string | null;
  cityName?: string | null;
  exactMatch?: boolean;
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function asList(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const nested = (data as { data?: unknown; items?: unknown }).data
      ?? (data as { items?: unknown }).items;
    if (Array.isArray(nested)) return nested;
  }
  return [];
}

function normalizePropertyName(raw: any) {
  const typesRaw = Array.isArray(raw?.property_types)
    ? raw.property_types
    : Array.isArray(raw?.propertyTypes)
      ? raw.propertyTypes
      : raw?.property_type || raw?.propertyType
        ? [raw.property_type || raw.propertyType]
        : [];
  const propertyTypes = typesRaw.filter((t: any) => t && (t.id || t.name));
  const propertyTypeIds = (
    Array.isArray(raw?.propertyTypeIds) && raw.propertyTypeIds.length
      ? raw.propertyTypeIds
      : propertyTypes.map((t: any) => t.id)
  )
    .map((id: unknown) => pickStr(id))
    .filter(Boolean);
  const propertyType = propertyTypes[0] || raw?.property_type || raw?.propertyType || null;
  const propertyTypeId = pickStr(
    propertyTypeIds[0],
    raw?.property_type_id,
    raw?.propertyTypeId,
    propertyType?.id,
  );
  return {
    ...raw,
    property_type: propertyType,
    property_type_id: propertyTypeId,
    property_types: propertyTypes,
    propertyTypeIds,
    image_url: pickStr(raw?.image_url, raw?.imageUrl),
  };
}

function typeNameKey(name?: string | null) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Prefer labeled options from property-type-options (keeps Direct builder floor separate). */
function projectNamePropertyTypeOptions(rows: any[]) {
  const sorted = [...rows].sort((a, b) => {
    const aDbf = Boolean(a?.isDirectBuilderFloor);
    const bDbf = Boolean(b?.isDirectBuilderFloor);
    if (aDbf !== bDbf) return aDbf ? 1 : -1;
    const aLabel = String(a?.label || a?.displayName || a?.name || '');
    const bLabel = String(b?.label || b?.displayName || b?.name || '');
    return aLabel.localeCompare(bLabel);
  });
  const seen = new Set<string>();
  const out: any[] = [];
  for (const row of sorted) {
    const id = String(row?.id || '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

function propertyTypeOptionLabel(row: any) {
  return String(row?.label || row?.displayName || row?.name || '—');
}

function canonicalPropertyTypeId(propertyTypes: any[], rawId?: string | null, rawName?: string | null) {
  if (rawId && propertyTypes.some((t) => t.id === rawId)) return rawId;
  if (rawId) {
    const match = propertyTypes.find((t) => t.id === rawId);
    if (match) return match.id as string;
  }
  if (rawName) {
    const key = typeNameKey(rawName);
    const match = propertyTypes.find(
      (t) =>
        typeNameKey(t.label) === key ||
        typeNameKey(t.displayName) === key ||
        typeNameKey(t.name) === key,
    );
    if (match) return match.id as string;
  }
  return '';
}

function isApproved(status?: string) {
  return status === 'approved' || status === 'admin_added';
}

function DeleteModal({ isOpen, onClose, onConfirm, name, isSubmitting }: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (remark: string) => void;
  name?: string;
  isSubmitting?: boolean;
}) {
  return (
    <DeleteRemarkDialog
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={name ? `Delete "${name}"?` : 'Delete?'}
      itemName={name}
      submitting={isSubmitting}
      onConfirm={onConfirm}
    />
  );
}

export default function PropertyNamesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <PropertyNamesPageInner />
    </Suspense>
  );
}

function PropertyNamesPageInner() {
  const { permissions } = useAuthStore();
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [microMarkets, setMicroMarkets] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [propertyNames, setPropertyNames] = useState<any[]>([]);
  const { filters, setFilters, resetFilters } = useUrlFilters({
    q: '',
    cityId: '',
    mmId: '',
  });
  const search = filters.q;
  const filterCityId = filters.cityId;
  const filterMmId = filters.mmId;
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [nameSuggestions, setNameSuggestions] = useState<NameSuggestion[]>([]);
  const [nameSuggestLoading, setNameSuggestLoading] = useState(false);
  const nameSuggestSeq = useRef(0);
  const [form, setForm] = useState({
    name: '',
    state_id: '',
    city_id: '',
    micro_market_id: '',
    property_type_ids: [] as string[],
    image_url: '',
    location_ids: [] as string[],
  });
  const baselineRef = useRef('');
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);
  const uniqueTypes = projectNamePropertyTypeOptions(propertyTypes);

  const formSnapshot = useMemo(() => JSON.stringify(form), [form]);
  const dirty =
    isModalOpen &&
    baselineRef.current !== '' &&
    formSnapshot !== baselineRef.current;
  const { requestClose, dialog: unsavedDialog } = useDialogUnsavedGuard(dirty);

  const handleModalOpenChange = async (next: boolean) => {
    if (isSubmitting) return;
    if (!next) {
      const ok = await requestClose();
      if (ok) setIsModalOpen(false);
      return;
    }
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!isModalOpen) {
      setNameSuggestions([]);
      setNameSuggestLoading(false);
      return;
    }
    const q = form.name.trim();
    if (q.length < 2) {
      setNameSuggestions([]);
      setNameSuggestLoading(false);
      return;
    }
    const seq = ++nameSuggestSeq.current;
    setNameSuggestLoading(true);
    const timer = window.setTimeout(() => {
      locationService
        .suggestPropertyNames({
          q,
          excludeId: editing?.id || undefined,
          limit: 8,
        })
        .then((res) => {
          if (seq !== nameSuggestSeq.current) return;
          setNameSuggestions(res.items || []);
        })
        .catch(() => {
          if (seq !== nameSuggestSeq.current) return;
          setNameSuggestions([]);
        })
        .finally(() => {
          if (seq === nameSuggestSeq.current) setNameSuggestLoading(false);
        });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [form.name, isModalOpen, editing?.id]);

  const propertyNameApiError = (err: unknown, fallback: string) => {
    const e = err as {
      response?: { data?: { message?: unknown; error?: { message?: unknown } } };
      message?: string;
    };
    const nested = e?.response?.data;
    const fromError = nested?.error?.message;
    const msg = fromError ?? nested?.message;
    if (Array.isArray(msg)) return msg.filter(Boolean).join(', ');
    if (typeof msg === 'string' && msg.trim()) return msg;
    return e?.message || fallback;
  };

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [s, c, mm, locs, pns, pts] = await Promise.all([
        locationService.getStates(),
        locationService.getCities(),
        locationService.getMicroMarkets(),
        locationService.getLocations(),
        locationService.getPropertyNames(),
        listingConfigService
          .getPropertyTypeOptionsForProjectNames()
          .catch(() => listingConfigService.getPropertyTypes().catch(() => [])),
      ]);
      setStates(asList(s));
      setCities(asList(c));
      setMicroMarkets(asList(mm));
      setLocations(asList(locs));
      setPropertyNames(asList(pns).map(normalizePropertyName));
      setPropertyTypes(asList(pts));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const formCities = cities.filter(
    (c) => !form.state_id || c.state_id === form.state_id || c.state?.id === form.state_id,
  );
  const formMMs = microMarkets.filter((m) => m.city_id === form.city_id || m.city?.id === form.city_id);
  const formLocs = locations.filter(
    (l) =>
      isApproved(l.status) &&
      (l.micro_market_id === form.micro_market_id || l.micro_market?.id === form.micro_market_id),
  );
  const availableMMs = microMarkets.filter(
    (m) => !filterCityId || m.city_id === filterCityId || m.city?.id === filterCityId,
  );

  const resolveStateId = (cityId: string) => {
    const city = cities.find((c) => c.id === cityId);
    return city?.state_id || city?.state?.id || '';
  };

  const open = (item: any = null) => {
    setEditing(item);
    setFormError('');
    let nextForm;
    if (item) {
      const cityId = item.city_id || item.city?.id || '';
      nextForm = {
        name: item.name,
        state_id: resolveStateId(cityId),
        city_id: cityId,
        micro_market_id: item.micro_market_id || item.micro_market?.id || '',
        property_type_ids: Array.from(
          new Set(
            (item.propertyTypeIds?.length
              ? item.propertyTypeIds
              : [pickStr(item.property_type_id, item.property_type?.id, item.propertyType?.id)]
            )
              .map((id: string) =>
                canonicalPropertyTypeId(propertyTypes, id, item.property_type?.name || item.propertyType?.name),
              )
              .filter(Boolean),
          ),
        ) as string[],
        image_url: pickStr(item.image_url, item.imageUrl),
        location_ids: (item.locations || []).map((l: any) => l.id),
      };
    } else {
      const cityId = filterCityId;
      nextForm = {
        name: '',
        state_id: cityId ? resolveStateId(cityId) : '',
        city_id: cityId,
        micro_market_id: filterMmId,
        property_type_ids: [] as string[],
        image_url: '',
        location_ids: [] as string[],
      };
    }
    setForm(nextForm);
    baselineRef.current = JSON.stringify(nextForm);
    setIsModalOpen(true);
  };

  const toggleLocation = (id: string) => {
    setForm((f) => ({
      ...f,
      location_ids: f.location_ids.includes(id)
        ? f.location_ids.filter((l) => l !== id)
        : [...f.location_ids, id],
    }));
  };

  const save = async () => {
    if (!form.name || !form.city_id || !form.micro_market_id || !form.property_type_ids.length || !form.image_url.trim()) return;
    setIsSubmitting(true);
    setFormError('');
    try {
      const payload = {
        name: form.name.trim(),
        city_id: form.city_id,
        micro_market_id: form.micro_market_id,
        property_type_id: form.property_type_ids[0],
        propertyTypeIds: form.property_type_ids,
        image_url: form.image_url.trim(),
        location_ids: form.location_ids,
      };
      if (editing) await locationService.updatePropertyName(editing.id, payload);
      else await locationService.createPropertyName(payload);
      setIsModalOpen(false);
      fetchAll();
    } catch (e) {
      setFormError(
        propertyNameApiError(e, 'Failed to save. This property name may already exist.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const del = async (remark: string) => {
    setIsSubmitting(true);
    try {
      await locationService.deletePropertyName(editing.id, remark);
      setIsDeleteOpen(false);
      fetchAll();
    } catch (e) {
      alert('Cannot delete — may have dependent data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canWrite =
    permissions.has('property_names:create') ||
    permissions.has('property_names:update') ||
    permissions.has('ALL:ALL');
  const canDelete = permissions.has('property_names:delete') || permissions.has('ALL:ALL');

  const filtered = propertyNames.filter((p) => {
    if (!isApproved(p.status)) return false;
    const matchCity = !filterCityId || p.city_id === filterCityId || p.city?.id === filterCityId;
    const matchMM = !filterMmId || p.micro_market_id === filterMmId || p.micro_market?.id === filterMmId;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCity && matchMM && matchSearch;
  });

  const {
    page,
    limit,
    total,
    totalPages,
    pageRows,
    onPageChange,
    onPageSizeChange,
    resetPage,
  } = useClientPagedRows(filtered);

  useEffect(() => {
    resetPage();
  }, [search, filterCityId, filterMmId, resetPage]);

  const approvedNames = propertyNames.filter((p) => isApproved(p.status));
  const countByCity = (cityId: string) =>
    approvedNames.filter((p) => p.city_id === cityId || p.city?.id === cityId).length;
  const countByMm = (mmId: string) =>
    approvedNames.filter(
      (p) =>
        (p.micro_market_id === mmId || p.micro_market?.id === mmId) &&
        (!filterCityId || p.city_id === filterCityId || p.city?.id === filterCityId),
    ).length;
  const allCitiesCount = approvedNames.length;
  const allMmCount = filterCityId ? countByCity(filterCityId) : approvedNames.length;

  const selectedStateName = states.find((s) => s.id === form.state_id)?.name;
  const selectedCityName = cities.find((c) => c.id === form.city_id)?.name;
  const selectedMmName = microMarkets.find((m) => m.id === form.micro_market_id)?.name;
  const filterCityName = cities.find((c) => c.id === filterCityId)?.name;
  const filterMmName = microMarkets.find((m) => m.id === filterMmId)?.name;

  return (
    <PermissionGuard
      permission="property_names:read"
      fallback={<div className="p-12 text-center text-gray-500">You do not have permission to view Project Names.</div>}
    >
      <div className="space-y-6 pb-24">
        <Breadcrumb items={[{ label: 'Project Names' }]} />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Project Names</h1>
            <p className="text-gray-500 mt-1">Manage approved property / project names and linked locations.</p>
          </div>
          <AdminListToolbar
            onRefresh={() => void fetchAll()}
            refreshBusy={isLoading}
            onReset={() => {
              resetFilters();
              resetPage();
            }}
          >
            {canWrite ? (
              <Button
                type="button"
                size="sm"
                onClick={() => open()}
                className="bg-primary text-white hover:bg-primary/90"
              >
                <Plus className="mr-1.5 size-3.5" /> Add Property Name
              </Button>
            ) : null}
          </AdminListToolbar>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setFilters({ q: e.target.value })}
              placeholder="Search project names..."
              className="pl-9"
            />
          </div>
          <Select
            value={filterCityId}
            onValueChange={(v) => {
              setFilters({ cityId: v ?? '', mmId: '' });
            }}
          >
            <SelectTrigger className="w-44">
              <span>
                {filterCityName
                  ? withCount(filterCityName, countByCity(filterCityId))
                  : withCount('All Cities', allCitiesCount)}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{withCount('All Cities', allCitiesCount)}</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {withCount(c.name, countByCity(c.id))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filterMmId}
            onValueChange={(v) => setFilters({ mmId: v ?? '' })}
            disabled={!filterCityId}
          >
            <SelectTrigger className="w-52">
              <span>
                {filterMmName
                  ? withCount(filterMmName, countByMm(filterMmId))
                  : withCount('All Micro Markets', allMmCount)}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{withCount('All Micro Markets', allMmCount)}</SelectItem>
              {availableMMs.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {withCount(m.name, countByMm(m.id))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <AdminDataTable
          page={page}
          limit={limit}
          total={total}
          totalPages={totalPages}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          loading={isLoading}
          isEmpty={!filtered.length}
          emptyMessage="No property names found."
          syncKey={pageRows.length}
        >
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">Property Name</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Type</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Share image</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Micro Market</th>
                <th className="px-6 py-4 font-semibold text-gray-700">City</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Linked Locations</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageRows.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {(item.property_types || []).length ? (
                      <div className="flex flex-wrap gap-1">
                        {(item.property_types as any[]).map((t) => {
                          const match =
                            uniqueTypes.find((opt) => opt.id === t.id) ||
                            uniqueTypes.find(
                              (opt) =>
                                opt.isDirectBuilderFloor &&
                                typeNameKey(t.name) === 'builder floor',
                            );
                          return (
                            <Badge key={t.id || t.name} variant="outline" className="text-xs">
                              {propertyTypeOptionLabel(match || t)}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      (() => {
                        const raw = item.property_type;
                        const match =
                          uniqueTypes.find((opt) => opt.id === raw?.id) ||
                          uniqueTypes.find(
                            (opt) =>
                              opt.isDirectBuilderFloor &&
                              typeNameKey(raw?.name) === 'builder floor',
                          );
                        return propertyTypeOptionLabel(match || raw) || '—';
                      })()
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="h-10 w-16 object-cover rounded border bg-gray-50" />
                    ) : (
                      <span className="text-gray-400 text-xs italic">Uses type default</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{item.micro_market?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-500">{item.city?.name || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(item.locations || []).length === 0 ? (
                        <span className="text-gray-400 text-xs">None</span>
                      ) : (
                        (item.locations || []).slice(0, 2).map((l: any) => (
                          <Badge key={l.id} variant="outline" className="text-xs">{l.name}</Badge>
                        ))
                      )}
                      {(item.locations || []).length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{(item.locations || []).length - 2} more
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {isApproved(item.status) ? (
                      <Badge className="bg-green-100 text-green-700">Approved</Badge>
                    ) : item.status === 'pending_review' ? (
                      <Badge className="bg-orange-100 text-orange-700">Pending</Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-500">Rejected</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canWrite && (
                        <Button variant="ghost" size="sm" onClick={() => open(item)}>
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(item);
                            setIsDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminDataTable>

        <Dialog open={isModalOpen} onOpenChange={(next) => void handleModalOpenChange(next)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit' : 'Add'} Property Name</DialogTitle>
              <DialogDescription>Link property to state → city → micro market → locations.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Project / Property Name</label>
                <div className="relative">
                  <Input
                    value={form.name}
                    onChange={(e) => {
                      setFormError('');
                      setForm({ ...form, name: e.target.value });
                    }}
                    placeholder="e.g. DLF The Camellias"
                    autoComplete="off"
                    className={formError ? 'border-red-500 focus-visible:ring-red-500' : undefined}
                  />
                  {(nameSuggestLoading || nameSuggestions.length > 0) &&
                  form.name.trim().length >= 2 ? (
                    <div
                      className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border border-amber-200 bg-amber-50 shadow-md"
                      role="status"
                      aria-live="polite"
                    >
                      <p className="border-b border-amber-200/80 px-3 py-1.5 text-[11px] font-medium text-amber-800">
                        Existing names (for reference — not selectable)
                      </p>
                      {nameSuggestLoading && nameSuggestions.length === 0 ? (
                        <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-amber-700">
                          <Loader2 className="size-3.5 animate-spin" />
                          Checking…
                        </div>
                      ) : (
                        <ul className="max-h-40 overflow-y-auto py-1">
                          {nameSuggestions.map((item) => (
                            <li
                              key={item.id}
                              className="pointer-events-none select-none px-3 py-1.5 text-sm text-amber-950"
                            >
                              <div className="flex items-start gap-2">
                                {item.exactMatch ? (
                                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-red-500" />
                                ) : null}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-medium">{item.name}</p>
                                  <p className="truncate text-[11px] text-amber-700/80">
                                    {[item.cityName, item.status]
                                      .filter(Boolean)
                                      .join(' · ') || 'Catalog'}
                                    {item.exactMatch ? ' · exact match' : ''}
                                  </p>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </div>
                {nameSuggestions.some((s) => s.exactMatch) ? (
                  <p className="text-sm text-red-600">
                    This exact name already exists. Duplicates are not allowed.
                  </p>
                ) : formError ? (
                  <p className="text-sm text-red-600">{formError}</p>
                ) : (
                  <p className="text-[11px] text-gray-400">
                    Similar existing projects appear as you type so you can avoid duplicates.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Property types <span className="text-red-500">*</span>
                </label>
                <MultiSelect
                  options={uniqueTypes.map((t) => ({
                    value: t.id,
                    label: propertyTypeOptionLabel(t),
                  }))}
                  values={form.property_type_ids}
                  onChange={(ids) => setForm((f) => ({ ...f, property_type_ids: ids }))}
                  placeholder="Select Apartment, Direct builder floor…"
                  emptyText="Add property types under Agent Listing Attributes first."
                />
              </div>
              <ImageUrlOrUpload
                label="Share / WhatsApp image URL"
                value={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
                kind="property_name"
                required
                placeholder="https://…/crest-1200x630.jpg"
                hint="Required. Paste HTTPS URL or upload (~1200×630). Overrides the property-type default for this project."
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">State</label>
                <Select
                  value={form.state_id}
                  onValueChange={(v) => {
                    setForm({
                      ...form,
                      state_id: v ?? '',
                      city_id: '',
                      micro_market_id: '',
                      location_ids: [],
                    });
                  }}
                >
                  <SelectTrigger>
                    {selectedStateName ? <span>{selectedStateName}</span> : <SelectValue placeholder="Select State" />}
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <Select
                  value={form.city_id}
                  onValueChange={(v) => {
                    const mms = microMarkets.filter((m) => m.city_id === v || m.city?.id === v);
                    setForm({
                      ...form,
                      city_id: v ?? '',
                      micro_market_id: mms.length === 1 ? mms[0].id : '',
                      location_ids: [],
                    });
                  }}
                  disabled={!form.state_id}
                >
                  <SelectTrigger>
                    {selectedCityName ? (
                      <span>{selectedCityName}</span>
                    ) : (
                      <SelectValue placeholder={form.state_id ? 'Select City' : 'Select state first'} />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {formCities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Micro Market</label>
                <Select
                  value={form.micro_market_id}
                  onValueChange={(v) => setForm({ ...form, micro_market_id: v ?? '', location_ids: [] })}
                  disabled={!form.city_id}
                >
                  <SelectTrigger>
                    {selectedMmName ? (
                      <span>{selectedMmName}</span>
                    ) : (
                      <SelectValue placeholder={form.city_id ? 'Select Micro Market' : 'Select city first'} />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {formMMs.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.micro_market_id && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Linked Locations <span className="text-gray-400 font-normal">(select all that apply)</span>
                  </label>
                  {formLocs.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No approved locations in this micro market.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                      {formLocs.map((loc) => (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => toggleLocation(loc.id)}
                          className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                            form.location_ids.includes(loc.id)
                              ? 'bg-primary-light border-primary text-primary font-medium'
                              : 'border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {loc.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => void handleModalOpenChange(false)}>Cancel</Button>
              <Button
                onClick={save}
                disabled={
                  isSubmitting ||
                  !form.name ||
                  !form.city_id ||
                  !form.micro_market_id ||
                  !form.property_type_ids.length ||
                  !form.image_url.trim()
                }
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {unsavedDialog}

        <DeleteModal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={del}
          name={editing?.name}
          isSubmitting={isSubmitting}
        />
      </div>
    </PermissionGuard>
  );
}
