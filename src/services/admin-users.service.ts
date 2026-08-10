import { axiosClient } from '@/lib/axios-client';

export type AppUserAudience = 'admin_panel' | 'app';

export type GetUsersParams = {
  audience?: AppUserAudience;
  includeInProgress?: boolean;
};

export const adminUsersService = {
  getUsers: async (audienceOrParams?: AppUserAudience | GetUsersParams) => {
    const params: Record<string, string | boolean> = {};
    if (typeof audienceOrParams === 'string') {
      params.audience = audienceOrParams;
    } else if (audienceOrParams) {
      if (audienceOrParams.audience) params.audience = audienceOrParams.audience;
      if (audienceOrParams.includeInProgress !== undefined) {
        params.includeInProgress = audienceOrParams.includeInProgress;
      }
    }
    const response = await axiosClient.get('/admin/users', { params });
    return response.data;
  },

  getUserById: async (id: string) => {
    const response = await axiosClient.get(`/admin/users/${id}`);
    return response.data;
  },

  createUser: async (data: any) => {
    const response = await axiosClient.post('/admin/users', data);
    return response.data;
  },

  updateUser: async (id: string, data: any) => {
    const response = await axiosClient.put(`/admin/users/${id}`, data);
    return response.data;
  },

  /** Approve a registered app user (pending_approval → active). */
  approveUser: async (id: string) => {
    const response = await axiosClient.put(`/admin/users/${id}`, { status: 'active' });
    return response.data;
  },

  deleteUser: async (id: string) => {
    const response = await axiosClient.delete(`/admin/users/${id}`);
    return response.data;
  },
};
