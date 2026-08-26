import { axiosClient } from '@/lib/axios-client';
import { deleteWithRemark } from '@/lib/delete-with-remark';

export function listingConfigApiError(err: unknown, fallback: string): string {
  const e = err as {
    code?: string;
    response?: { data?: { message?: unknown; error?: unknown } };
    message?: string;
  };
  if (!e?.response && (e?.code === 'ERR_NETWORK' || e?.message === 'Network Error')) {
    return 'Unable to reach the server. Check your connection and try again.';
  }
  const nested = e?.response?.data;
  const fromError =
    nested && typeof nested === 'object' && 'error' in nested
      ? (nested as { error?: { message?: unknown } }).error?.message
      : undefined;
  const msg = fromError ?? nested?.message ?? nested?.error;
  if (Array.isArray(msg)) return msg.filter(Boolean).join(', ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return e?.message || fallback;
}

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
