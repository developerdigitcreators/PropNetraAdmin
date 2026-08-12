import { axiosClient } from '@/lib/axios-client';

export type AppUserAudience = 'admin_panel' | 'app';
export type AppUserBucket = 'otp_issued' | 'otp_verified' | 'master';

export type GetUsersParams = {
  audience?: AppUserAudience;
  includeInProgress?: boolean;
  bucket?: AppUserBucket;
};

export type SignupRemark = {
  id: string;
  text: string;
  createdAt: string;
  createdByUserId?: string | null;
  createdByName?: string | null;
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
      if (audienceOrParams.bucket) params.bucket = audienceOrParams.bucket;
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

  approveUser: async (id: string) => {
    const response = await axiosClient.put(`/admin/users/${id}`, { status: 'active' });
    return response.data;
  },

  setUserActive: async (id: string, active: boolean) => {
    const response = await axiosClient.put(`/admin/users/${id}`, {
      status: active ? 'active' : 'suspended',
    });
    return response.data;
  },

  listRemarks: async (signupSessionId: string) => {
    const response = await axiosClient.get(`/admin/users/${signupSessionId}/remarks`);
    return response.data as { signupSessionId: string; remarks: SignupRemark[] };
  },

  addRemark: async (signupSessionId: string, text: string) => {
    const response = await axiosClient.post(`/admin/users/${signupSessionId}/remarks`, { text });
    return response.data as {
      signupSessionId: string;
      remark: SignupRemark;
      remarks: SignupRemark[];
    };
  },

  deleteRemark: async (signupSessionId: string, remarkId: string) => {
    const response = await axiosClient.delete(
      `/admin/users/${signupSessionId}/remarks/${remarkId}`,
    );
    return response.data as { signupSessionId: string; remarks: SignupRemark[] };
  },

  deleteUser: async (id: string) => {
    const response = await axiosClient.delete(`/admin/users/${id}`);
    return response.data;
  },
};
