import { axiosClient } from '@/lib/axios-client';

export const moduleOptionsService = {
  getOptionsForModule: async (moduleId: string) => {
    const response = await axiosClient.get(`/admin/module-options/module/${moduleId}`);
    return response.data;
  },

  createOption: async (payload: any) => {
    const response = await axiosClient.post('/admin/module-options', payload);
    return response.data;
  },

  updateOption: async (id: string, payload: any) => {
    const response = await axiosClient.put(`/admin/module-options/${id}`, payload);
    return response.data;
  },

  deleteOption: async (id: string) => {
    const response = await axiosClient.delete(`/admin/module-options/${id}`);
    return response.data;
  }
};
