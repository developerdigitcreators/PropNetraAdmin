import { axiosClient } from '@/lib/axios-client';
import { deleteWithRemark } from '@/lib/delete-with-remark';

export const moduleOptionsService = {
  getOptionsForField: async (fieldId: string) => {
    const response = await axiosClient.get(`/admin/module-options/field/${fieldId}`);
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

  deleteOption: async (id: string, remark: string) => {
    const response = await deleteWithRemark(`/admin/module-options/${id}`, remark);
    return response.data;
  }
};
