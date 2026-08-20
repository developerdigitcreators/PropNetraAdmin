import { axiosClient } from '@/lib/axios-client';
import { deleteWithRemark } from '@/lib/delete-with-remark';

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const nested = (value as { data?: unknown }).data;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return value as Record<string, unknown>;
}

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export type ShareOgSettings = {
  client_list_share_image_url: string;
  og_fallback_image_url: string;
};

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

  getShareOg: async (): Promise<ShareOgSettings> => {
    const response = await axiosClient.get('/admin/listing-config/share-og');
    const row = asRecord(response.data);
    return {
      client_list_share_image_url: pickStr(
        row.client_list_share_image_url,
        row.clientListShareImageUrl,
      ),
      og_fallback_image_url: pickStr(row.og_fallback_image_url, row.ogFallbackImageUrl),
    };
  },

  updateShareOg: async (payload: {
    client_list_share_image_url?: string | null;
    og_fallback_image_url?: string | null;
  }): Promise<ShareOgSettings> => {
    const response = await axiosClient.put('/admin/listing-config/share-og', payload);
    const row = asRecord(response.data);
    return {
      client_list_share_image_url: pickStr(
        row.client_list_share_image_url,
        row.clientListShareImageUrl,
        payload.client_list_share_image_url,
      ),
      og_fallback_image_url: pickStr(
        row.og_fallback_image_url,
        row.ogFallbackImageUrl,
        payload.og_fallback_image_url,
      ),
    };
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
  },

  // Categories CRUD
  createCategory: async (payload: any) => {
    const response = await axiosClient.post('/admin/listing-config/categories', payload);
    return response.data;
  },
  updateCategory: async (id: string, payload: any) => {
    const response = await axiosClient.put(`/admin/listing-config/categories/${id}`, payload);
    return response.data;
  },
  deleteCategory: async (id: string, remark: string) => {
    const response = await deleteWithRemark(`/admin/listing-config/categories/${id}`, remark);
    return response.data;
  },

  // Building Types CRUD
  createBuildingType: async (payload: any) => {
    const response = await axiosClient.post('/admin/listing-config/building-types', payload);
    return response.data;
  },
  updateBuildingType: async (id: string, payload: any) => {
    const response = await axiosClient.put(`/admin/listing-config/building-types/${id}`, payload);
    return response.data;
  },
  deleteBuildingType: async (id: string, remark: string) => {
    const response = await deleteWithRemark(`/admin/listing-config/building-types/${id}`, remark);
    return response.data;
  },

  // Property Types CRUD
  createPropertyType: async (payload: any) => {
    const response = await axiosClient.post('/admin/listing-config/property-types', payload);
    return response.data;
  },
  updatePropertyType: async (id: string, payload: any) => {
    const response = await axiosClient.put(`/admin/listing-config/property-types/${id}`, payload);
    return response.data;
  },
  deletePropertyType: async (id: string, remark: string) => {
    const response = await deleteWithRemark(`/admin/listing-config/property-types/${id}`, remark);
    return response.data;
  },

  // Form Modules CRUD
  createFormModule: async (payload: any) => {
    const response = await axiosClient.post('/admin/listing-config/form-modules', payload);
    return response.data;
  },
  updateFormModule: async (id: string, payload: any) => {
    const response = await axiosClient.put(`/admin/listing-config/form-modules/${id}`, payload);
    return response.data;
  },
  deleteFormModule: async (id: string, remark: string) => {
    const response = await deleteWithRemark(`/admin/listing-config/form-modules/${id}`, remark);
    return response.data;
  },

  // Form Fields CRUD
  getFormFields: async (moduleId: string) => {
    const response = await axiosClient.get(`/admin/listing-config/form-modules/${moduleId}/fields`);
    return response.data;
  },
  createFormField: async (moduleId: string, payload: any) => {
    const response = await axiosClient.post(`/admin/listing-config/form-modules/${moduleId}/fields`, payload);
    return response.data;
  },
  updateFormField: async (id: string, payload: any) => {
    const response = await axiosClient.put(`/admin/listing-config/form-fields/${id}`, payload);
    return response.data;
  },
  deleteFormField: async (id: string, remark: string) => {
    const response = await deleteWithRemark(`/admin/listing-config/form-fields/${id}`, remark);
    return response.data;
  }
};
