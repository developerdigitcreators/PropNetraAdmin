'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { listingConfigService } from '@/services/listing-config.service';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Edit2, Trash2, AlertTriangle, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { SortableTableBody } from '@/components/common/sortable-list';

export default function AttributesPage() {
  const { permissions } = useAuthStore();
  const [categories, setCategories] = useState<any[]>([]);
  const [buildingTypes, setBuildingTypes] = useState<any[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [filterCategoryBT, setFilterCategoryBT] = useState<string>('');
  const [filterCategoryPT, setFilterCategoryPT] = useState<string>('');
  const [filterBuildingTypePT, setFilterBuildingTypePT] = useState<string>('');

  // Modals state
  const [activeTab, setActiveTab] = useState('categories');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<any>({ name: '', sort_order: 1, is_active: true, category_id: '', building_type_id: '', icon_url: '' });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [cats, bTypes, pTypes] = await Promise.all([
        listingConfigService.getCategories(),
        listingConfigService.getBuildingTypes(),
        listingConfigService.getPropertyTypes()
      ]);
      setCategories(cats);
      setBuildingTypes(bTypes);
      setPropertyTypes(pTypes);

      if (cats.length > 0) {
        if (!filterCategoryBT) setFilterCategoryBT(cats[0].id);
        if (!filterCategoryPT) {
          setFilterCategoryPT(cats[0].id);
          const relatedBts = bTypes.filter((b: any) => b.category_id === cats[0].id || b.category?.id === cats[0].id);
          if (relatedBts.length > 0) setFilterBuildingTypePT(relatedBts[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (item: any = null) => {
    setEditingItem(item);
    if (item) {
      setFormData({ 
        name: item.name, 
        sort_order: item.sort_order || item.phase || 1, 
        is_active: item.is_active ?? true,
        category_id: item.category_id || item.category?.id || '',
        category_ids: item.category_id || item.category?.id ? [item.category_id || item.category?.id] : [],
        building_type_id: item.building_type_id || item.building_type?.id || '',
        building_type_ids: item.building_type_id || item.building_type?.id ? [item.building_type_id || item.building_type?.id] : [],
        icon_url: item.icon_url || ''
      });
    } else {
      let maxPhase = 0;
      if (activeTab === 'categories') maxPhase = Math.max(0, ...categories.map(c => c.phase || c.sort_order || 0));
      else if (activeTab === 'building_types') maxPhase = Math.max(0, ...buildingTypes.map(b => b.phase || b.sort_order || 0));
      else if (activeTab === 'property_types') maxPhase = Math.max(0, ...propertyTypes.map(p => p.phase || p.sort_order || 0));
      
      setFormData({ name: '', sort_order: maxPhase + 1, is_active: true, category_id: '', category_ids: [], building_type_id: '', building_type_ids: [], icon_url: '' });
    }
    setIsMultiSelectOpen(false);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (item: any) => {
    setEditingItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) return;
    setIsSubmitting(true);
    try {
      const payload: any = { name: formData.name, is_active: formData.is_active };
      
      if (activeTab === 'categories') payload.phase = Number(formData.sort_order);
      else payload.sort_order = Number(formData.sort_order);

      if (activeTab === 'building_types' && editingItem) {
        // We will handle category_id directly in the update logic below
      }
      if (activeTab === 'property_types') {
        payload.icon_url = formData.icon_url;
      }

      if (editingItem) {
        if (activeTab === 'categories') await listingConfigService.updateCategory(editingItem.id, payload);
        else if (activeTab === 'building_types') {
          const originalCatId = editingItem.category_id || editingItem.category?.id;
          const selectedCatIds = formData.category_ids || [];
          
          let idsToCreate: string[] = [];
          if (selectedCatIds.includes(originalCatId)) {
            await listingConfigService.updateBuildingType(editingItem.id, { ...payload, category_id: originalCatId });
            idsToCreate = selectedCatIds.filter((id: string) => id !== originalCatId);
          } else if (selectedCatIds.length > 0) {
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
          const originalBtId = editingItem.building_type_id || editingItem.building_type?.id;
          const selectedBtIds = formData.building_type_ids || [];
          
          let idsToCreate: string[] = [];
          if (selectedBtIds.includes(originalBtId)) {
            await listingConfigService.updatePropertyType(editingItem.id, { ...payload, building_type_id: originalBtId });
            idsToCreate = selectedBtIds.filter((id: string) => id !== originalBtId);
          } else if (selectedBtIds.length > 0) {
            await listingConfigService.updatePropertyType(editingItem.id, { ...payload, building_type_id: selectedBtIds[0] });
            idsToCreate = selectedBtIds.slice(1);
          }
          
          if (idsToCreate.length > 0) {
            await Promise.all(idsToCreate.map((bId: string) => 
              listingConfigService.createPropertyType({ ...payload, building_type_id: bId })
            ));
          }
        }
      } else {
        if (activeTab === 'categories') await listingConfigService.createCategory(payload);
        else if (activeTab === 'building_types') {
          if (formData.category_ids && formData.category_ids.length > 0) {
            await Promise.all(formData.category_ids.map((cId: string) => 
              listingConfigService.createBuildingType({ ...payload, category_id: cId })
            ));
          } else {
            await listingConfigService.createBuildingType({ ...payload, category_id: formData.category_id });
          }
        }
        else if (activeTab === 'property_types') {
          if (formData.building_type_ids && formData.building_type_ids.length > 0) {
            await Promise.all(formData.building_type_ids.map((bId: string) => 
              listingConfigService.createPropertyType({ ...payload, building_type_id: bId })
            ));
          } else {
            await listingConfigService.createPropertyType({ ...payload, building_type_id: formData.building_type_id });
          }
        }
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: any, newValue: boolean) => {
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
      console.error('Toggle status failed', err);
    }
  };

  const handleUpdateSortOrder = async (
    item: any,
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

  const handleReorder = async (type: string, ordered: Array<any & { sortOrder: number }>) => {
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
      console.error('Reorder failed', err);
      await fetchData();
      throw err;
    }
  };

  const sortByOrder = (data: any[]) =>
    [...data].sort(
      (a, b) =>
        (a.phase ?? a.sort_order ?? 0) - (b.phase ?? b.sort_order ?? 0) ||
        String(a.name || '').localeCompare(String(b.name || '')),
    );

  const handleDelete = async () => {
    if (!editingItem) return;
    setIsSubmitting(true);
    try {
      if (activeTab === 'categories') await listingConfigService.deleteCategory(editingItem.id);
      else if (activeTab === 'building_types') await listingConfigService.deleteBuildingType(editingItem.id);
      else if (activeTab === 'property_types') await listingConfigService.deletePropertyType(editingItem.id);
      
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete. Ensure it is not in use.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCreate = permissions.has(activeTab === 'categories' ? 'listing_categories:create' : activeTab === 'building_types' ? 'building_types:create' : 'property_types:create');
  const canUpdate = permissions.has(activeTab === 'categories' ? 'listing_categories:update' : activeTab === 'building_types' ? 'building_types:update' : 'property_types:update');
  const canDelete = permissions.has(activeTab === 'categories' ? 'listing_categories:delete' : activeTab === 'building_types' ? 'building_types:delete' : 'property_types:delete');

  const renderTable = (data: any[], type: string) => {
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
                  No records found.
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
        {canCreate && activeTab !== 'categories' && (
          <Button onClick={() => handleOpenModal()} className="bg-primary text-white hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> Add New
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border shadow-sm p-1">
          <TabsTrigger value="categories" className="data-[state=active]:bg-primary-light data-[state=active]:text-primary rounded-md px-6">Property Categories</TabsTrigger>
          <TabsTrigger value="building_types" className="data-[state=active]:bg-primary-light data-[state=active]:text-primary rounded-md px-6">Building Types</TabsTrigger>
          <TabsTrigger value="property_types" className="data-[state=active]:bg-primary-light data-[state=active]:text-primary rounded-md px-6">Property Types</TabsTrigger>
        </TabsList>
        <TabsContent value="categories">{renderTable(categories, 'categories')}</TabsContent>
        <TabsContent value="building_types">
          <div className="mt-4 flex items-center gap-3">
            <Select value={filterCategoryBT || undefined} onValueChange={setFilterCategoryBT}>
              <SelectTrigger className="w-64 bg-white">
                <SelectValue placeholder="Select Category">
                  {filterCategoryBT ? categories.find(c => c.id === filterCategoryBT)?.name : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {renderTable(filterCategoryBT ? buildingTypes.filter(b => b.category_id === filterCategoryBT || b.category?.id === filterCategoryBT) : [], 'building_types')}
        </TabsContent>
        <TabsContent value="property_types">
          <div className="mt-4 flex items-center gap-3">
            <Select value={filterCategoryPT || undefined} onValueChange={(v) => { 
                setFilterCategoryPT(v); 
                const bts = buildingTypes.filter(b => b.category_id === v || b.category?.id === v);
                setFilterBuildingTypePT(bts.length > 0 ? bts[0].id : '');
            }}>
              <SelectTrigger className="w-64 bg-white">
                <SelectValue placeholder="Select Category">
                  {filterCategoryPT ? categories.find(c => c.id === filterCategoryPT)?.name : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterBuildingTypePT || undefined} onValueChange={setFilterBuildingTypePT} disabled={!filterCategoryPT}>
              <SelectTrigger className="w-64 bg-white">
                <SelectValue placeholder="Select Building Type">
                  {filterBuildingTypePT ? buildingTypes.find(b => b.id === filterBuildingTypePT)?.name : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {buildingTypes.filter(b => b.category_id === filterCategoryPT || b.category?.id === filterCategoryPT).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
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
                <label className="text-sm font-medium">Parent Building Type (Select multiple)</label>
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setIsMultiSelectOpen(!isMultiSelectOpen)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    <span className="truncate flex-1 text-left pr-2">
                      {formData.building_type_ids?.length > 0 
                         ? buildingTypes.filter(b => formData.building_type_ids.includes(b.id)).map(b => b.name).join(', ')
                         : 'Select Building Types'}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 opacity-50 shrink-0"><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                  
                  {isMultiSelectOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsMultiSelectOpen(false)}></div>
                      <div className="absolute top-11 left-0 z-50 w-full overflow-hidden rounded-md border border-gray-200 bg-white text-gray-950 shadow-md">
                        <div className="max-h-60 overflow-y-auto p-1">
                          {buildingTypes.map(b => (
                            <div
                              key={b.id}
                              className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-3 pr-8 text-sm outline-none hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const ids = formData.building_type_ids || [];
                                if (ids.includes(b.id)) {
                                  setFormData({...formData, building_type_ids: ids.filter((id: string) => id !== b.id)});
                                } else {
                                  setFormData({...formData, building_type_ids: [...ids, b.id]});
                                }
                              }}
                            >
                              <span className="truncate">{b.name} <span className="text-gray-400">({b.category?.name})</span></span>
                              {formData.building_type_ids?.includes(b.id) && (
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

            {(activeTab === 'property_types' || activeTab === 'categories') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Icon URL</label>
                <Input value={formData.icon_url} onChange={e => setFormData({...formData, icon_url: e.target.value})} placeholder="https://link-to-icon.png" />
                <p className="text-xs text-gray-500">Provide an image URL for this icon.</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <label className="text-sm font-medium">Active Status</label>
              <Switch checked={formData.is_active} onCheckedChange={c => setFormData({...formData, is_active: c})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting || !formData.name}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader className="hidden">
            <DialogTitle>Delete</DialogTitle>
            <DialogDescription>Confirm</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center text-center pt-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete {editingItem?.name}?</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this item? This cannot be undone.</p>
            <div className="flex w-full gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
