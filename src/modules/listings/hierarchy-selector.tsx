'use client';

import { useEffect, useState } from 'react';
import { listingConfigService } from '@/services/listing-config.service';
import { useMatrixStore } from '@/store/use-matrix-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function HierarchySelector() {
  const { setHierarchy, categoryId, buildingTypeId, propertyTypeId } = useMatrixStore();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [buildingTypes, setBuildingTypes] = useState<any[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);

  useEffect(() => {
    // Fetch all reference data (usually these are small lists, or we can fetch sequentially)
    listingConfigService.getCategories().then(setCategories).catch(console.error);
    listingConfigService.getBuildingTypes().then(setBuildingTypes).catch(console.error);
    listingConfigService.getPropertyTypes().then(setPropertyTypes).catch(console.error);
  }, []);

  // Derived state for dependent dropdowns
  const availableBuildingTypes = buildingTypes.filter(bt => bt.category_id === categoryId);
  const availablePropertyTypes = propertyTypes.filter(pt => pt.building_type_id === buildingTypeId);

  const handleCategoryChange = (val: string) => {
    setHierarchy(val, null, null);
  };

  const handleBuildingTypeChange = (val: string) => {
    setHierarchy(categoryId, val, null);
  };

  const handlePropertyTypeChange = (val: string) => {
    setHierarchy(categoryId, buildingTypeId, val);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end mb-6">
      <div className="w-full md:w-1/3">
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <Select value={categoryId || ''} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-full h-11 bg-gray-50 border-gray-200">
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
            {categories.length === 0 && <div className="p-2 text-sm text-gray-500">No categories found</div>}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full md:w-1/3">
        <label className="block text-sm font-medium text-gray-700 mb-1">Building Type (Optional)</label>
        <Select value={buildingTypeId || ''} onValueChange={handleBuildingTypeChange} disabled={!categoryId}>
          <SelectTrigger className="w-full h-11 bg-gray-50 border-gray-200 disabled:opacity-50">
            <SelectValue placeholder="Select Building Type" />
          </SelectTrigger>
          <SelectContent>
            {availableBuildingTypes.map(bt => (
              <SelectItem key={bt.id} value={bt.id}>{bt.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full md:w-1/3">
        <label className="block text-sm font-medium text-gray-700 mb-1">Property Type (Optional)</label>
        <Select value={propertyTypeId || ''} onValueChange={handlePropertyTypeChange} disabled={!buildingTypeId}>
          <SelectTrigger className="w-full h-11 bg-gray-50 border-gray-200 disabled:opacity-50">
            <SelectValue placeholder="Select Property Type" />
          </SelectTrigger>
          <SelectContent>
            {availablePropertyTypes.map(pt => (
              <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
