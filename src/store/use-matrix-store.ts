import { create } from 'zustand';
import { listingConfigService } from '@/services/listing-config.service';

interface MatrixState {
  categoryId: string | null;
  buildingTypeId: string | null;
  propertyTypeId: string | null;
  configs: any[];
  unsavedChanges: Record<string, any>; // Keyed by module_id
  isFetching: boolean;
  isSaving: boolean;

  setHierarchy: (categoryId: string | null, buildingTypeId: string | null, propertyTypeId: string | null) => void;
  fetchConfigs: () => Promise<void>;
  updateConfig: (moduleId: string, field: string, value: any) => void;
  saveConfigs: () => Promise<void>;
  resetChanges: () => void;
}

export const useMatrixStore = create<MatrixState>((set, get) => ({
  categoryId: null,
  buildingTypeId: null,
  propertyTypeId: null,
  configs: [],
  unsavedChanges: {},
  isFetching: false,
  isSaving: false,

  setHierarchy: (categoryId, buildingTypeId, propertyTypeId) => {
    set({ categoryId, buildingTypeId, propertyTypeId, unsavedChanges: {}, configs: [] });
    if (categoryId) {
      get().fetchConfigs();
    }
  },

  fetchConfigs: async () => {
    const { categoryId, buildingTypeId, propertyTypeId } = get();
    if (!categoryId) return;
    
    set({ isFetching: true });
    try {
      const data = await listingConfigService.getModuleConfigs(categoryId, buildingTypeId || undefined, propertyTypeId || undefined);
      set({ configs: data, isFetching: false });
    } catch (error) {
      console.error('Failed to fetch configs', error);
      set({ isFetching: false, configs: [] }); // Fallback or mock integration fallback
    }
  },

  updateConfig: (moduleId, field, value) => {
    set((state) => {
      const existingChange = state.unsavedChanges[moduleId] || {};
      return {
        unsavedChanges: {
          ...state.unsavedChanges,
          [moduleId]: {
            ...existingChange,
            [field]: value,
          }
        }
      };
    });
  },

  saveConfigs: async () => {
    const { unsavedChanges, categoryId, buildingTypeId, propertyTypeId, fetchConfigs } = get();
    if (Object.keys(unsavedChanges).length === 0 || !categoryId) return;

    set({ isSaving: true });
    try {
      // Convert unsaved changes to batch payload array
      const payload = Object.entries(unsavedChanges).map(([moduleId, changes]) => ({
        category_id: categoryId,
        building_type_id: buildingTypeId,
        property_type_id: propertyTypeId,
        module_id: moduleId,
        ...changes
      }));

      // A real batch upsert would send `payload` array. 
      // The Swagger shows `POST /api/v1/admin/module-configs` takes one at a time or batch depending on implementation. 
      // We'll iterate or send as array (assuming array based on standard batch practices).
      await listingConfigService.upsertModuleConfig(payload);
      
      set({ unsavedChanges: {}, isSaving: false });
      await fetchConfigs(); // Refresh
    } catch (error) {
      console.error('Failed to save configs', error);
      set({ isSaving: false });
    }
  },

  resetChanges: () => {
    set({ unsavedChanges: {} });
  }
}));
