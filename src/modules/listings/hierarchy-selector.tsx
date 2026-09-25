'use client';

import { useEffect, useMemo, useState } from 'react';
import { listingConfigService } from '@/services/listing-config.service';
import { useMatrixStore } from '@/store/use-matrix-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const isRowActive = (row: any) =>
  row?.is_active !== false && row?.isActive !== false;

export function HierarchySelector() {
  const { setHierarchy, categoryId, buildingTypeId, propertyTypeId } = useMatrixStore();

  const [categories, setCategories] = useState<any[]>([]);
  const [buildingTypes, setBuildingTypes] = useState<any[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);

  useEffect(() => {
    listingConfigService.getCategories().then(setCategories).catch(console.error);
    listingConfigService.getBuildingTypes().then(setBuildingTypes).catch(console.error);
    listingConfigService.getPropertyTypes().then(setPropertyTypes).catch(console.error);
  }, []);

  const activeCategories = useMemo(
    () => categories.filter(isRowActive),
    [categories],
  );

  // Only active building types for the selected category (inactive ones stay hidden).
  const availableBuildingTypes = useMemo(
    () =>
      buildingTypes.filter(
        (bt) =>
          isRowActive(bt) &&
          (bt.category_id === categoryId || bt.category?.id === categoryId),
      ),
    [buildingTypes, categoryId],
  );

  const availablePropertyTypes = useMemo(
    () =>
      propertyTypes.filter(
        (pt) =>
          isRowActive(pt) &&
          (pt.building_type_id === buildingTypeId ||
            pt.building_type?.id === buildingTypeId),
      ),
    [propertyTypes, buildingTypeId],
  );

  const selectedCategoryName = activeCategories.find((c) => c.id === categoryId)?.name;
  const selectedBuildingTypeName = availableBuildingTypes.find(
    (bt) => bt.id === buildingTypeId,
  )?.name;
  const selectedPropertyTypeName = availablePropertyTypes.find(
    (pt) => pt.id === propertyTypeId,
  )?.name;

  // Drop stale selections when category changes or a type was inactivated.
  useEffect(() => {
    if (!categoryId) return;
    if (buildingTypeId && !availableBuildingTypes.some((bt) => bt.id === buildingTypeId)) {
      setHierarchy(categoryId, null, null);
      return;
    }
    if (
      propertyTypeId &&
      buildingTypeId &&
      !availablePropertyTypes.some((pt) => pt.id === propertyTypeId)
    ) {
      setHierarchy(categoryId, buildingTypeId, null);
    }
  }, [
    categoryId,
    buildingTypeId,
    propertyTypeId,
    availableBuildingTypes,
    availablePropertyTypes,
    setHierarchy,
  ]);

  const handleCategoryChange = (val: string | null) => {
    if (val) setHierarchy(val, null, null);
  };

  const handleBuildingTypeChange = (val: string | null) => {
    if (val) setHierarchy(categoryId, val, null);
  };

  const handlePropertyTypeChange = (val: string | null) => {
    if (val) setHierarchy(categoryId, buildingTypeId, val);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end mb-6">
      <div className="w-full md:w-1/3">
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <Select value={categoryId || ''} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-full h-11 bg-gray-50 border-gray-200">
            {selectedCategoryName ? (
              <span>{selectedCategoryName}</span>
            ) : (
              <SelectValue placeholder="Select Category" />
            )}
          </SelectTrigger>
          <SelectContent>
            {activeCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
            {activeCategories.length === 0 && (
              <div className="p-2 text-sm text-gray-500">No categories found</div>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full md:w-1/3">
        <label className="block text-sm font-medium text-gray-700 mb-1">Building Type</label>
        <Select
          value={buildingTypeId || ''}
          onValueChange={handleBuildingTypeChange}
          disabled={!categoryId}
        >
          <SelectTrigger className="w-full h-11 bg-gray-50 border-gray-200 disabled:opacity-50">
            {selectedBuildingTypeName ? (
              <span>{selectedBuildingTypeName}</span>
            ) : (
              <SelectValue placeholder="Select Building Type" />
            )}
          </SelectTrigger>
          <SelectContent>
            {availableBuildingTypes.map((bt) => (
              <SelectItem key={bt.id} value={bt.id}>
                {bt.name}
              </SelectItem>
            ))}
            {categoryId && availableBuildingTypes.length === 0 && (
              <div className="p-2 text-sm text-gray-500">No active building types</div>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full md:w-1/3">
        <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
        <Select
          value={propertyTypeId || ''}
          onValueChange={handlePropertyTypeChange}
          disabled={!buildingTypeId}
        >
          <SelectTrigger className="w-full h-11 bg-gray-50 border-gray-200 disabled:opacity-50">
            {selectedPropertyTypeName ? (
              <span>{selectedPropertyTypeName}</span>
            ) : (
              <SelectValue placeholder="Select Property Type" />
            )}
          </SelectTrigger>
          <SelectContent>
            {availablePropertyTypes.map((pt) => (
              <SelectItem key={pt.id} value={pt.id}>
                {pt.name}
              </SelectItem>
            ))}
            {buildingTypeId && availablePropertyTypes.length === 0 && (
              <div className="p-2 text-sm text-gray-500">No active property types</div>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
