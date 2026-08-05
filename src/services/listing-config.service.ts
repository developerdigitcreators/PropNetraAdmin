import { axiosClient } from '@/lib/axios-client';

export const listingConfigService = {
  getCategories: async () => {
    const response = await axiosClient.get('/admin/listing-config/categories');
    return response.data;
  },

  getBuildingTypes: async () => {
    const response = await axiosClient.get('/admin/listing-config/building-types');
    return response.data;
  },

  getPropertyTypes: async () => {
    const response = await axiosClient.get('/admin/listing-config/property-types');
    return response.data;
  },

  getFormModules: async () => {
    const response = await axiosClient.get('/admin/listing-config/form-modules');
    return response.data;
  },

  getModuleConfigs: async (categoryId: string, buildingTypeId?: string, propertyTypeId?: string) => {
    let url = `/admin/module-configs?categoryId=${categoryId}`;
    if (buildingTypeId) url += `&buildingTypeId=${buildingTypeId}`;
    if (propertyTypeId) url += `&propertyTypeId=${propertyTypeId}`;
    
    const response = await axiosClient.get(url);
    return response.data;
  },

  upsertModuleConfig: async (payload: any) => {
    const response = await axiosClient.post('/admin/module-configs', payload);
    return response.data;
  }
};
