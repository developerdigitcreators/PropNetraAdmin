import { axiosClient } from '@/lib/axios-client';

export const rbacService = {
  getRoles: async () => {
    const response = await axiosClient.get('/rbac/roles');
    return response.data;
  },

  createRole: async (data: any) => {
    const response = await axiosClient.post('/rbac/roles', data);
    return response.data;
  },

  getUserRoles: async (userId: string) => {
    const response = await axiosClient.get(`/rbac/users/${userId}/roles`);
    return response.data;
  },

  assignRole: async (userId: string, roleId: string) => {
    const response = await axiosClient.post(`/rbac/users/${userId}/roles/${roleId}`);
    return response.data;
  },

  revokeRole: async (userId: string, roleId: string) => {
    const response = await axiosClient.delete(`/rbac/users/${userId}/roles/${roleId}`);
    return response.data;
  },
};
