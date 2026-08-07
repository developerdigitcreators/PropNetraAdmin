import { axiosClient } from '@/lib/axios-client';

export const moderationService = {
  // Locations
  getPendingLocations: async () => {
    const response = await axiosClient.get('/admin/locations/pending');
    return response.data;
  },

  approveLocation: async (id: string) => {
    const response = await axiosClient.post(`/admin/locations/${id}/approve`);
    return response.data;
  },

  rejectLocation: async (id: string) => {
    const response = await axiosClient.delete(`/admin/locations/${id}/reject`);
    return response.data;
  },

  // Property Names
  getPendingPropertyNames: async () => {
    const response = await axiosClient.get('/admin/property-names/pending');
    return response.data;
  },

  approvePropertyName: async (id: string) => {
    const response = await axiosClient.post(`/admin/property-names/${id}/approve`);
    return response.data;
  },

  rejectPropertyName: async (id: string) => {
    const response = await axiosClient.delete(`/admin/property-names/${id}/reject`);
    return response.data;
  },

  // Custom Options
  getPendingOptions: async () => {
    const response = await axiosClient.get('/admin/module-options/pending');
    return response.data;
  },

  approveOption: async (id: string) => {
    const response = await axiosClient.post(`/admin/module-options/${id}/approve`);
    return response.data;
  },

  rejectOption: async (id: string) => {
    const response = await axiosClient.delete(`/admin/module-options/${id}/reject`);
    return response.data;
  }
};
