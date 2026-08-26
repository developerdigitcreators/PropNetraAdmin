'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { listingConfigApiError, listingConfigService } from '@/services/listing-config.service';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Edit2, Trash2, Check } from 'lucide-react';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { SortableTableBody } from '@/components/common/sortable-list';
import { withCount } from '@/lib/filter-label';
import { DeleteRemarkDialog } from '@/components/common/delete-remark-dialog';
import { ImageUrlOrUpload } from '@/components/image-url-or-upload';

type AttributeRef = {
  id: string;
  name: string;
};

type ListingAttribute = {
  id: string;
  name: string;
  phase?: number;
  sort_order?: number;
  is_active: boolean;
  icon_url?: string | null;
  share_image_url?: string | null;
  category_id?: string | null;
  category?: AttributeRef | null;
  building_type_id?: string | null;
  building_type?: (AttributeRef & { category?: AttributeRef | null }) | null;
};

type AttributeFormData = {
  name: string;
  sort_order: number;
  is_active: boolean;
  category_id: string;
  category_ids: string[];
  building_type_id: string;
  building_type_ids: string[];
  building_type_names: string[];
  icon_url: string;
  share_image_url: string;
};

type AttributeWritePayload = {
  name: string;
  is_active: boolean;
  phase?: number;
  sort_order?: number;
  icon_url?: string;
  share_image_url?: string | null;
  category_id?: string | null;
  building_type_id?: string | null;
};

type AttributeTab = 'categories' | 'building_types' | 'property_types';

const EMPTY_FORM: AttributeFormData = {
  name: '',
  sort_order: 1,
  is_active: true,
  category_id: '',
  category_ids: [],
  building_type_id: '',
  building_type_ids: [],
  building_type_names: [],
  icon_url: '',
  share_image_url: '',
};

const SHARE_BUILDING_TYPE_NAMES = ['Residential', 'Commercial', 'Pre-Leased'];

function typeNameKey(name?: string | null) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function uniqueShareBuildingTypes(rows: ListingAttribute[]) {
  const byKey = new Map<string, ListingAttribute>();
  for (const row of rows) {
    const key = typeNameKey(row?.name);
    if (!key) continue;
    const canon = SHARE_BUILDING_TYPE_NAMES.find((n) => typeNameKey(n) === key);
    if (!canon) continue;
    if (!byKey.has(key)) byKey.set(key, { ...row, name: canon });
  }
  return SHARE_BUILDING_TYPE_NAMES.map((n) => byKey.get(typeNameKey(n))).filter(
    (row): row is ListingAttribute => Boolean(row),
  );
}

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function asAttributeList(data: unknown): ListingAttribute[] {
  let rows: unknown[] = [];
  if (Array.isArray(data)) rows = data;
  else if (data && typeof data === 'object') {
    const nested =
      (data as { data?: unknown; items?: unknown }).data ??
      (data as { items?: unknown }).items;
    if (Array.isArray(nested)) rows = nested;
  }
  return rows.map((raw) => {
    const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const category = (row.category && typeof row.category === 'object'
      ? row.category
      : null) as AttributeRef | null;
    const buildingType = (row.building_type || row.buildingType) as
      | (AttributeRef & { category?: AttributeRef | null })
      | null
      | undefined;
    return {
      ...(row as unknown as ListingAttribute),
      id: String(row.id ?? ''),
      name: String(row.name ?? ''),
      is_active: row.is_active !== false && row.isActive !== false,
      icon_url: pickStr(row.icon_url, row.iconUrl) || null,
      share_image_url: pickStr(row.share_image_url, row.shareImageUrl) || null,
      category_id: pickStr(row.category_id, row.categoryId, category?.id) || null,
      category,
      building_type_id: pickStr(row.building_type_id, row.buildingTypeId, buildingType?.id) || null,
      building_type: buildingType || null,
    };
  });
}

function isAttributeTab(value: string | number | null): value is AttributeTab {
  return value === 'categories' || value === 'building_types' || value === 'property_types';
}

async function syncPropertyTypeShareImage(args: {
  name: string;
  payload: AttributeWritePayload;
  selectedNames: string[];
  buildingTypes: ListingAttribute[];
  propertyTypes: ListingAttribute[];
  editingId?: string;
  fallbackBuildingTypeId?: string | null;
}) {
  const nameKey = typeNameKey(args.name);
  const matchingBuildingTypes = args.buildingTypes.filter((b) =>
    args.selectedNames.some((n) => typeNameKey(n) === typeNameKey(b.name)),
  );
  const sameNameTypes = args.propertyTypes.filter((p) => typeNameKey(p.name) === nameKey);

  if (matchingBuildingTypes.length === 0) {
    if (args.editingId) {
      await listingConfigService.updatePropertyType(args.editingId, {
        ...args.payload,
        building_type_id: args.fallbackBuildingTypeId || null,
      });
      return;
    }
    await listingConfigService.createPropertyType({
      ...args.payload,
      building_type_id: args.fallbackBuildingTypeId || null,
    });
    return;
  }

  const seenBtIds = new Set<string>();
  for (const bt of matchingBuildingTypes) {
    if (!bt.id || seenBtIds.has(bt.id)) continue;
    seenBtIds.add(bt.id);
    const existingForThisBt = sameNameTypes.filter((p) => p.building_type_id === bt.id);
    if (existingForThisBt.length > 0) {
      await Promise.all(
        existingForThisBt.map((row) =>
          listingConfigService.updatePropertyType(row.id, {
            ...args.payload,
            building_type_id: bt.id,
          }),
        ),
      );
    } else {
      await listingConfigService.createPropertyType({
        ...args.payload,
        building_type_id: bt.id,
      });
    }
  }
}

export default function AttributesPage() {
  const { permissions } = useAuthStore();
  const [categories, setCategories] = useState<ListingAttribute[]>([]);
  const [buildingTypes, setBuildingTypes] = useState<ListingAttribute[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<ListingAttribute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');

  // Filters
  const [filterCategoryBT, setFilterCategoryBT] = useState<string>('');
  const [filterCategoryPT, setFilterCategoryPT] = useState<string>('');
  const [filterBuildingTypePT, setFilterBuildingTypePT] = useState<string>('');

  // Modals state
  const [activeTab, setActiveTab] = useState<AttributeTab>('categories');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ListingAttribute | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState(false);

  const [formData, setFormData] = useState<AttributeFormData>(EMPTY_FORM);

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [cats, bTypes, pTypes] = await Promise.all([
        listingConfigService.getCategories(),
        listingConfigService.getBuildingTypes(),
        listingConfigService.getPropertyTypes(),
      ]);
      const nextCats = asAttributeList(cats);
      const nextBuildingTypes = asAttributeList(bTypes);
      const nextPropertyTypes = asAttributeList(pTypes);
      setCategories(nextCats);
      setBuildingTypes(nextBuildingTypes);
      setPropertyTypes(nextPropertyTypes);

      if (nextCats.length > 0) {
        const btCatValid = nextCats.some((c) => c.id === filterCategoryBT);
        const nextBtCat = btCatValid ? filterCategoryBT : nextCats[0].id;
        if (nextBtCat !== filterCategoryBT) setFilterCategoryBT(nextBtCat);

        const ptCatValid = nextCats.some((c) => c.id === filterCategoryPT);
        const nextPtCat = ptCatValid ? filterCategoryPT : nextCats[0].id;
        if (nextPtCat !== filterCategoryPT) setFilterCategoryPT(nextPtCat);

        const relatedBts = nextBuildingTypes.filter(
          (b) => b.category_id === nextPtCat || b.category?.id === nextPtCat,
        );
        const btValid = relatedBts.some((b) => b.id === filterBuildingTypePT);
        const nextBt = btValid ? filterBuildingTypePT : relatedBts[0]?.id || '';
        if (nextBt !== filterBuildingTypePT) setFilterBuildingTypePT(nextBt);
      } else {
        setFilterCategoryBT('');
        setFilterCategoryPT('');
        setFilterBuildingTypePT('');
      }
    } catch (err) {
      setCategories([]);
      setBuildingTypes([]);
      setPropertyTypes([]);
      setError(listingConfigApiError(err, 'Failed to load listing attributes.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchData();
    };
    init();
  }, []);

  const handleOpenModal = (item: ListingAttribute | null = null) => {
    setEditingItem(item);
    setSaveError('');
    if (item) {
      const categoryId = item.category_id || item.category?.id || '';
      const buildingTypeId = item.building_type_id || item.building_type?.id || '';
      setFormData({ 
        name: item.name, 
        sort_order: item.sort_order || item.phase || 1, 
        is_active: item.is_active ?? true,
        category_id: categoryId,
        category_ids: categoryId ? [categoryId] : [],
        building_type_id: buildingTypeId,
        building_type_ids: buildingTypeId ? [buildingTypeId] : [],
        building_type_names: (() => {
          const raw = item.building_type?.name || '';
          const canon = SHARE_BUILDING_TYPE_NAMES.find(
            (n) => typeNameKey(n) === typeNameKey(raw),
          );
          return canon ? [canon] : [];
        })(),
        icon_url: item.icon_url || '',
        share_image_url: item.share_image_url || '',
      });
    } else {
      let maxPhase = 0;
      if (activeTab === 'categories') maxPhase = Math.max(0, ...categories.map(c => c.phase || c.sort_order || 0));
      else if (activeTab === 'building_types') maxPhase = Math.max(0, ...buildingTypes.map(b => b.phase || b.sort_order || 0));
      else if (activeTab === 'property_types') maxPhase = Math.max(0, ...propertyTypes.map(p => p.phase || p.sort_order || 0));
      
      setFormData({ ...EMPTY_FORM, sort_order: maxPhase + 1 });
    }
    setIsMultiSelectOpen(false);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (item: ListingAttribute) => {
    setEditingItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) return;
    setIsSubmitting(true);
    setSaveError('');
    try {
      const payload: AttributeWritePayload = { name: formData.name, is_active: formData.is_active };
      
      if (activeTab === 'categories') payload.phase = Number(formData.sort_order);
      else payload.sort_order = Number(formData.sort_order);

      if (activeTab === 'building_types' && editingItem) {
        // We will handle category_id directly in the update logic below
      }
      if (activeTab === 'property_types' || activeTab === 'categories') {
        payload.icon_url = formData.icon_url;
      }
      if (activeTab === 'property_types') {
        payload.share_image_url = formData.share_image_url.trim() || null;
      }

      if (editingItem) {
        if (activeTab === 'categories') await listingConfigService.updateCategory(editingItem.id, payload);
        else if (activeTab === 'building_types') {
          const originalCatId = editingItem.category_id || editingItem.category?.id || '';
          const selectedCatIds = formData.category_ids || [];
          
          let idsToCreate: string[] = [];
          if (selectedCatIds.length === 0) {
            await listingConfigService.updateBuildingType(editingItem.id, {
              ...payload,
              category_id: null,
            });
          } else if (originalCatId && selectedCatIds.includes(originalCatId)) {
            await listingConfigService.updateBuildingType(editingItem.id, { ...payload, category_id: originalCatId });
            idsToCreate = selectedCatIds.filter((id: string) => id !== originalCatId);
          } else {
            await listingConfigService.updateBuildingType(editingItem.id, { ...payload, category_id: selectedCatIds[0] });
            idsToCreate = selectedCatIds.slice(1);
          }
          
          if (idsToCreate.length > 0) {
            await Promise.all(idsToCreate.map((cId: string) => 
              listingConfigService.createBuildingType({ ...payload, category_id: cId })
            ));
          }
        }
        else if (activeTab === 'property_types') {
          await syncPropertyTypeShareImage({
            name: formData.name,
            payload,
            selectedNames: formData.building_type_names || [],
            buildingTypes,
            propertyTypes,
            editingId: editingItem.id,
            fallbackBuildingTypeId:
              editingItem.building_type_id || formData.building_type_id || null,
          });
        }
      } else {
        if (activeTab === 'categories') await listingConfigService.createCategory(payload);
        else if (activeTab === 'building_types') {
          const categoryIds = (formData.category_ids || []).filter(Boolean);
          if (categoryIds.length > 0) {
            await Promise.all(categoryIds.map((cId: string) => 
              listingConfigService.createBuildingType({ ...payload, category_id: cId })
            ));
          } else {
            await listingConfigService.createBuildingType({
              ...payload,
              category_id: formData.category_id || null,
            });
          }
        }
        else if (activeTab === 'property_types') {
          await syncPropertyTypeShareImage({
            name: formData.name,
            payload,
            selectedNames: formData.building_type_names || [],
            buildingTypes,
            propertyTypes,
            fallbackBuildingTypeId: formData.building_type_id || null,
          });
        }
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setSaveError(listingConfigApiError(err, 'Failed to save. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: ListingAttribute, newValue: boolean) => {
    try {
      if (activeTab === 'categories') {
        await listingConfigService.updateCategory(item.id, { is_active: newValue });
      } else if (activeTab === 'building_types') {
        await listingConfigService.updateBuildingType(item.id, { is_active: newValue });
      } else if (activeTab === 'property_types') {
        await listingConfigService.updatePropertyType(item.id, { is_active: newValue });
      }
      fetchData();
    } catch (err) {
      setError(listingConfigApiError(err, 'Failed to update status.'));
    }
  };

  const handleUpdateSortOrder = async (
    item: ListingAttribute,
    newSortOrder: number,
    type: string = activeTab,
  ) => {
    try {
      // Send only sortable fields — spreading the full item (relations, dates, etc.) causes 500.
      if (type === 'categories') {
        await listingConfigService.updateCategory(item.id, { phase: newSortOrder });
      } else if (type === 'building_types') {
        await listingConfigService.updateBuildingType(item.id, {
          sort_order: newSortOrder,
        });
      } else if (type === 'property_types') {
        await listingConfigService.updatePropertyType(item.id, {
          sort_order: newSortOrder,
        });
      }
    } catch (err) {
      console.error('Update sort order failed', err);
      throw err;
    }
  };

  const handleReorder = async (
    type: string,
    ordered: Array<ListingAttribute & { sortOrder: number }>,
  ) => {
    const source =
      type === 'categories'
        ? categories
        : type === 'building_types'
          ? buildingTypes
          : propertyTypes;

    const updates = ordered.filter((item) => {
      const prev = source.find((x) => x.id === item.id);
      const prevOrder = prev?.phase ?? prev?.sort_order ?? 0;
      return prevOrder !== item.sortOrder;
    });

    // Optimistic local update
    if (type === 'categories') {
      setCategories(
        ordered.map((item) => ({ ...item, phase: item.sortOrder, sort_order: item.sortOrder })),
      );
    } else if (type === 'building_types') {
      setBuildingTypes(ordered.map((item) => ({ ...item, sort_order: item.sortOrder })));
    } else if (type === 'property_types') {
      setPropertyTypes(ordered.map((item) => ({ ...item, sort_order: item.sortOrder })));
    }

    try {
      await Promise.all(
        updates.map((item) => handleUpdateSortOrder(item, item.sortOrder, type)),
      );
    } catch (err) {
      setError(listingConfigApiError(err, 'Failed to reorder. Reloading…'));
      await fetchData();
      throw err;
    }
  };

  const sortByOrder = (data: ListingAttribute[]) =>
    [...data].sort(
      (a, b) =>
        (a.phase ?? a.sort_order ?? 0) - (b.phase ?? b.sort_order ?? 0) ||
        String(a.name || '').localeCompare(String(b.name || '')),
    );

  const handleDelete = async (remark: string) => {
    if (!editingItem) return;
    setIsSubmitting(true);
    try {
      if (activeTab === 'categories') await listingConfigService.deleteCategory(editingItem.id, remark);
      else if (activeTab === 'building_types') await listingConfigService.deleteBuildingType(editingItem.id, remark);
      else if (activeTab === 'property_types') await listingConfigService.deletePropertyType(editingItem.id, remark);
      
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (err) {
      setError(
        listingConfigApiError(err, 'Failed to delete. Ensure it is not in use.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCreate = permissions.has(activeTab === 'categories' ? 'listing_categories:create' : activeTab === 'building_types' ? 'building_types:create' : 'property_types:create');
  const canUpdate = permissions.has(activeTab === 'categories' ? 'listing_categories:update' : activeTab === 'building_types' ? 'building_types:update' : 'property_types:update');
  const canDelete = permissions.has(activeTab === 'categories' ? 'listing_categories:delete' : activeTab === 'building_types' ? 'building_types:delete' : 'property_types:delete');

  const renderTable = (data: ListingAttribute[], type: string) => {
    const sorted = sortByOrder(data);
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-700">Name</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Sort Order</th>
              {type === 'categories' && <th className="px-6 py-4 font-semibold text-gray-700">Icon</th>}
              {type === 'building_types' && <th className="px-6 py-4 font-semibold text-gray-700">Property Category</th>}
              {type === 'property_types' && (
                <>
                  <th className="px-6 py-4 font-semibold text-gray-700">Building Type</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Icon</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Share image</th>
                </>
              )}
              <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
              <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
            </tr>
          </thead>
          {isLoading ? (
            <tbody>
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </td>
              </tr>
            </tbody>
          ) : sorted.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  {error ? 'Could not load records.' : 'No records found.'}
                </td>
              </tr>
            </tbody>
          ) : (
            <SortableTableBody
              items={sorted}
              disabled={!canUpdate}
              onReorder={(ordered) => handleReorder(type, ordered)}
              renderRow={(item, { dragHandle }) => (
                <>
                  <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4">{dragHandle}</td>
                  {type === 'categories' && (
                    <td className="px-6 py-4">
                      {item.icon_url ? (
                        <img
                          src={item.icon_url}
                          alt={item.name}
                          className="w-8 h-8 object-contain bg-gray-50 rounded border"
                        />
                      ) : (
                        <span className="text-gray-400 text-xs italic">No Icon</span>
                      )}
                    </td>
                  )}
                  {type === 'building_types' && (
                    <td className="px-6 py-4 text-gray-500">{item.category?.name || 'N/A'}</td>
                  )}
                  {type === 'property_types' && (
                    <>
                      <td className="px-6 py-4 text-gray-500">
                        {item.building_type?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        {item.icon_url ? (
                          <img
                            src={item.icon_url}
                            alt={item.name}
                            className="w-8 h-8 object-contain bg-gray-50 rounded border"
                          />
                        ) : (
                          <span className="text-gray-400 text-xs italic">No Icon</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {item.share_image_url ? (
                          <img
                            src={item.share_image_url}
                            alt={`${item.name} share`}
                            className="h-10 w-16 object-cover bg-gray-50 rounded border"
                          />
                        ) : (
                          <span className="text-gray-400 text-xs italic">Default missing</span>
                        )}
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={(v) => handleToggleStatus(item, v)}
                      disabled={!canUpdate}
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(item)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete && type !== 'categories' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDelete(item)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
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
    );
  };

  return (
    <div className="space-y-6 pb-24">
      <Breadcrumb items={[{ label: 'Agent Listing Attributes' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Agent Listing Attributes</h1>
          <p className="text-gray-500 mt-1">Manage core hierarchy data (Property Categories, Building Types, Property Types).</p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && activeTab !== 'categories' && (
            <Button onClick={() => handleOpenModal()} className="bg-primary text-white hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" /> Add New
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          <p>{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchData()}
            disabled={isLoading}
            className="bg-white"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Retry
          </Button>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          if (isAttributeTab(v)) setActiveTab(v);
        }}
        className="w-full"
      >
        <TabsList className="bg-white border shadow-sm p-1">
          <TabsTrigger value="categories" className="data-[state=active]:bg-primary-light data-[state=active]:text-primary rounded-md px-6">Property Categories</TabsTrigger>
          <TabsTrigger value="building_types" className="data-[state=active]:bg-primary-light data-[state=active]:text-primary rounded-md px-6">Building Types</TabsTrigger>
          <TabsTrigger value="property_types" className="data-[state=active]:bg-primary-light data-[state=active]:text-primary rounded-md px-6">Property Types</TabsTrigger>
        </TabsList>
        <TabsContent value="categories">{renderTable(categories, 'categories')}</TabsContent>
        <TabsContent value="building_types">
          <div className="mt-4 flex items-center gap-3">
            <Select value={filterCategoryBT || undefined} onValueChange={(v) => setFilterCategoryBT(v ?? '')}>
              <SelectTrigger className="w-72 bg-white">
                <SelectValue placeholder="Select Category">
                  {filterCategoryBT
                    ? withCount(
                        categories.find((c) => c.id === filterCategoryBT)?.name || 'Category',
                        buildingTypes.filter(
                          (b) =>
                            b.category_id === filterCategoryBT ||
                            b.category?.id === filterCategoryBT,
                        ).length,
                      )
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {withCount(
                      c.name,
                      buildingTypes.filter(
                        (b) => b.category_id === c.id || b.category?.id === c.id,
                      ).length,
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {renderTable(filterCategoryBT ? buildingTypes.filter(b => b.category_id === filterCategoryBT || b.category?.id === filterCategoryBT) : [], 'building_types')}
        </TabsContent>
        <TabsContent value="property_types">
          <div className="mt-4 flex items-center gap-3">
            <Select value={filterCategoryPT || undefined} onValueChange={(v) => {
                const next = v ?? '';
                setFilterCategoryPT(next);
                const bts = buildingTypes.filter(b => b.category_id === next || b.category?.id === next);
                setFilterBuildingTypePT(bts.length > 0 ? bts[0].id : '');
            }}>
              <SelectTrigger className="w-72 bg-white">
                <SelectValue placeholder="Select Category">
                  {filterCategoryPT
                    ? withCount(
                        categories.find((c) => c.id === filterCategoryPT)?.name || 'Category',
                        buildingTypes.filter(
                          (b) =>
                            b.category_id === filterCategoryPT ||
                            b.category?.id === filterCategoryPT,
                        ).length,
                      )
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {withCount(
                      c.name,
                      buildingTypes.filter(
                        (b) => b.category_id === c.id || b.category?.id === c.id,
                      ).length,
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterBuildingTypePT || undefined} onValueChange={(v) => setFilterBuildingTypePT(v ?? '')} disabled={!filterCategoryPT}>
              <SelectTrigger className="w-72 bg-white">
                <SelectValue placeholder="Select Building Type">
                  {filterBuildingTypePT
                    ? withCount(
                        buildingTypes.find((b) => b.id === filterBuildingTypePT)?.name ||
                          'Building Type',
                        propertyTypes.filter(
                          (p) =>
                            (p.building_type_id || p.building_type?.id) === filterBuildingTypePT,
                        ).length,
                      )
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {buildingTypes
                  .filter(
                    (b) =>
                      b.category_id === filterCategoryPT || b.category?.id === filterCategoryPT,
                  )
                  .map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {withCount(
                        b.name,
                        propertyTypes.filter(
                          (p) => (p.building_type_id || p.building_type?.id) === b.id,
                        ).length,
                      )}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {renderTable(propertyTypes.filter(p => {
             const btId = p.building_type_id || p.building_type?.id;
             return btId === filterBuildingTypePT;
          }), 'property_types')}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit' : 'Add'} {activeTab.replace('_', ' ')}</DialogTitle>
            <DialogDescription>Fill out the details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Residential" />
            </div>
            
            {activeTab === 'building_types' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Property Category (Select multiple)</label>
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setIsMultiSelectOpen(!isMultiSelectOpen)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    <span className="truncate flex-1 text-left pr-2">
                      {formData.category_ids?.length > 0 
                         ? categories.filter(c => formData.category_ids.includes(c.id)).map(c => c.name).join(', ')
                         : 'Select Property Categories'}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 opacity-50 shrink-0"><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                  
                  {isMultiSelectOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsMultiSelectOpen(false)}></div>
                      <div className="absolute top-11 left-0 z-50 w-full overflow-hidden rounded-md border border-gray-200 bg-white text-gray-950 shadow-md">
                        <div className="max-h-60 overflow-y-auto p-1">
                          {categories.map(c => (
                            <div
                              key={c.id}
                              className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-3 pr-8 text-sm outline-none hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const ids = formData.category_ids || [];
                                if (ids.includes(c.id)) {
                                  setFormData({...formData, category_ids: ids.filter((id: string) => id !== c.id)});
                                } else {
                                  setFormData({...formData, category_ids: [...ids, c.id]});
                                }
                              }}
                            >
                              <span className="truncate">{c.name}</span>
                              {formData.category_ids?.includes(c.id) && (
                                <span className="absolute right-3 flex h-4 w-4 items-center justify-center text-gray-900">
                                  <Check className="h-4 w-4" />
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'property_types' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  WhatsApp preview group <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500">
                  Only Residential, Commercial and Pre-Leased. The share image applies across
                  Resale, Rent/Lease and Buy Requirement — it will not create extra Apartment rows.
                </p>
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setIsMultiSelectOpen(!isMultiSelectOpen)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    <span className="truncate flex-1 text-left pr-2">
                      {formData.building_type_names?.length > 0 
                         ? formData.building_type_names.join(', ')
                         : 'Select Residential, Commercial or Pre-Leased'}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 opacity-50 shrink-0"><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                  
                  {isMultiSelectOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsMultiSelectOpen(false)}></div>
                      <div className="absolute top-11 left-0 z-50 w-full overflow-hidden rounded-md border border-gray-200 bg-white text-gray-950 shadow-md">
                        <div className="max-h-60 overflow-y-auto p-1">
                          {uniqueShareBuildingTypes(buildingTypes).length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              Add Residential, Commercial or Pre-Leased building types first.
                            </div>
                          ) : (
                            uniqueShareBuildingTypes(buildingTypes).map((b) => (
                            <div
                              key={b.name}
                              className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-3 pr-8 text-sm outline-none hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const names = formData.building_type_names || [];
                                const already = names.some((n) => typeNameKey(n) === typeNameKey(b.name));
                                setFormData({
                                  ...formData,
                                  building_type_names: already
                                    ? names.filter((n) => typeNameKey(n) !== typeNameKey(b.name))
                                    : [...names, b.name],
                                });
                              }}
                            >
                              <span className="truncate">{b.name}</span>
                              {formData.building_type_names?.some((n) => typeNameKey(n) === typeNameKey(b.name)) && (
                                <span className="absolute right-3 flex h-4 w-4 items-center justify-center text-gray-900">
                                  <Check className="h-4 w-4" />
                                </span>
                              )}
                            </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {(activeTab === 'property_types' || activeTab === 'categories') && (
              <ImageUrlOrUpload
                label="Icon URL"
                value={formData.icon_url}
                onChange={(url) => setFormData({ ...formData, icon_url: url })}
                kind="icon"
                placeholder="https://link-to-icon.png"
                hint="Paste a public HTTPS URL, or upload an image."
              />
            )}

            {activeTab === 'property_types' && (
              <ImageUrlOrUpload
                label="WhatsApp / share image URL (1200×630)"
                value={formData.share_image_url}
                onChange={(url) => setFormData({ ...formData, share_image_url: url })}
                kind="property_type"
                placeholder="https://…/apartment-share.jpg"
                hint="Default card for every listing of this type. Property-name images override this. Paste URL or upload."
              />
            )}

            <div className="flex items-center justify-between pt-2">
              <label className="text-sm font-medium">Active Status</label>
              <Switch checked={formData.is_active} onCheckedChange={c => setFormData({...formData, is_active: c})} />
            </div>
            {saveError && (
              <p className="text-sm text-red-600">{saveError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={
                isSubmitting ||
                !formData.name ||
                (activeTab === 'property_types' && !(formData.building_type_names || []).length)
              }
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteRemarkDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title={editingItem?.name ? `Delete ${editingItem.name}?` : 'Delete item?'}
        itemName={editingItem?.name}
        submitting={isSubmitting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
