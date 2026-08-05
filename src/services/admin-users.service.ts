import { axiosClient } from '@/lib/axios-client';

export const adminUsersService = {
  getUsers: async () => {
    const response = await axiosClient.get('/admin/users');
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

  deleteUser: async (id: string) => {
    const response = await axiosClient.delete(`/admin/users/${id}`);
    return response.data;
  }
};
