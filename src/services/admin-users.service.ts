import { axiosClient } from '@/lib/axios-client';
import { deleteWithRemark } from '@/lib/delete-with-remark';

export type AppUserAudience = 'admin_panel' | 'app';
export type AppUserBucket = 'otp_issued' | 'otp_verified' | 'master' | 'rejected';
export type AppUserFilterType = 'plan' | 'role' | 'documents' | 'status';

export type GetUsersParams = {
  audience?: AppUserAudience;
  includeInProgress?: boolean;
  bucket?: AppUserBucket;
  q?: string;
  stateId?: string;
  cityId?: string;
  createdFrom?: string;
  createdTo?: string;
  filterType?: AppUserFilterType;
  filterValue?: string;
};

export type SignupRemark = {
  id: string;
  text: string;
  createdAt: string;
  createdByUserId?: string | null;
  createdByName?: string | null;
  source?: 'admin' | 'system' | null;
  phase?: 'otp_issued' | 'otp_verified' | null;
};

export type SignupAttemptChangedField = 'name' | 'email' | 'contact';

export type AppUserRetryAttempt = {
  kind: 'retry';
  name: string;
  email: string;
  contact: string;
  changedFields?: SignupAttemptChangedField[];
  attemptedAt: string;
  otpStatus?: 'retry';
  callStatusEditable?: boolean;
  remarksEditable?: boolean;
  hideCallStatusActions?: boolean;
};

export type CallStatus =
  | 'not_contacted'
  | 'wrong_no'
  | 'not_interested'
  | 'in_discussion'
  | 'shifted_and_verified'
  | 'not_applicable'
  | 'added_by_admin';

export const CALL_STATUS_OPTIONS: { value: CallStatus; label: string }[] = [
  { value: 'not_contacted', label: 'Not Contacted' },
  { value: 'wrong_no', label: 'Wrong No.' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'in_discussion', label: 'In-discussion' },
  { value: 'shifted_and_verified', label: 'Shifted & Verified' },
  { value: 'not_applicable', label: 'Not Applicable' },
  { value: 'added_by_admin', label: 'New user added' },
];

export type RemarksPayload = {
  signupSessionId: string;
  remarks: SignupRemark[];
  issuedHistory?: SignupRemark[];
  verifiedHistory?: SignupRemark[];
  remarksCount?: number;
  latestRemarkPreview?: string | null;
  callStatusEditable?: boolean;
};

export type WithoutReferralApprovalSetting = {
  required: boolean;
};

function buildListParams(audienceOrParams?: AppUserAudience | GetUsersParams) {
  const params: Record<string, string | boolean> = {};
  if (typeof audienceOrParams === 'string') {
    params.audience = audienceOrParams;
    return params;
  }
  if (!audienceOrParams) return params;
  if (audienceOrParams.audience) params.audience = audienceOrParams.audience;
  if (audienceOrParams.includeInProgress !== undefined) {
    params.includeInProgress = audienceOrParams.includeInProgress;
  }
  if (audienceOrParams.bucket) params.bucket = audienceOrParams.bucket;
  if (audienceOrParams.q?.trim()) params.q = audienceOrParams.q.trim();
  if (audienceOrParams.stateId) params.stateId = audienceOrParams.stateId;
  if (audienceOrParams.cityId) params.cityId = audienceOrParams.cityId;
  if (audienceOrParams.createdFrom) params.createdFrom = audienceOrParams.createdFrom;
  if (audienceOrParams.createdTo) params.createdTo = audienceOrParams.createdTo;
  if (audienceOrParams.filterType) params.filterType = audienceOrParams.filterType;
  if (audienceOrParams.filterValue) params.filterValue = audienceOrParams.filterValue;
  return params;
}

export const adminUsersService = {
  list: async (audienceOrParams?: AppUserAudience | GetUsersParams) => {
    const params = buildListParams(audienceOrParams);
    const response = await axiosClient.get('/admin/users', { params });
    return response.data;
  },

  getUsers: async (audienceOrParams?: AppUserAudience | GetUsersParams) => {
    return adminUsersService.list(audienceOrParams);
  },

  getUserById: async (id: string) => {
    const response = await axiosClient.get(`/admin/users/${id}`);
    return response.data;
  },

  createUser: async (data: any) => {
    const response = await axiosClient.post('/admin/users', data);
    return response.data;
  },

  createOtpVerifiedUser: async (data: {
    name: string;
    contact: string;
    role_id: string;
    email?: string;
    companyName?: string;
    companyContact?: string;
    companyEmail?: string;
  }) => {
    const response = await axiosClient.post('/admin/users/otp-verified', data);
    return response.data;
  },

  updateUser: async (id: string, data: any) => {
    const response = await axiosClient.put(`/admin/users/${id}`, data);
    return response.data;
  },

  approveUser: async (id: string) => {
    const response = await axiosClient.post(`/admin/users/${id}/approve`);
    return response.data;
  },

  rejectUser: async (id: string, remark: string) => {
    const response = await axiosClient.post(`/admin/users/${id}/reject`, { remark });
    return response.data;
  },

  revokeRejection: async (id: string) => {
    const response = await axiosClient.post(`/admin/users/${id}/revoke-rejection`);
    return response.data;
  },

  getWithoutReferralApproval: async (): Promise<WithoutReferralApprovalSetting> => {
    const response = await axiosClient.get('/admin/settings/without-referral-approval');
    const raw = response.data || {};
    return { required: Boolean(raw.required) };
  },

  setWithoutReferralApproval: async (
    required: boolean,
  ): Promise<WithoutReferralApprovalSetting> => {
    const response = await axiosClient.put('/admin/settings/without-referral-approval', {
      required,
    });
    const raw = response.data || {};
    return { required: Boolean(raw.required ?? required) };
  },

  setUserActive: async (id: string, active: boolean) => {
    const response = await axiosClient.put(`/admin/users/${id}`, {
      status: active ? 'active' : 'suspended',
    });
    return response.data;
  },

  listRemarks: async (signupSessionId: string) => {
    const response = await axiosClient.get(`/admin/users/${signupSessionId}/remarks`);
    return response.data as RemarksPayload;
  },

  addRemark: async (signupSessionId: string, text: string) => {
    const response = await axiosClient.post(`/admin/users/${signupSessionId}/remarks`, { text });
    return response.data as RemarksPayload & { remark: SignupRemark };
  },

  updateCallStatus: async (signupSessionId: string, callStatus: CallStatus) => {
    const response = await axiosClient.put(`/admin/users/${signupSessionId}/call-status`, {
      callStatus,
    });
    return response.data;
  },

  deleteRemark: async (signupSessionId: string, remarkId: string) => {
    const response = await axiosClient.delete(
      `/admin/users/${signupSessionId}/remarks/${remarkId}`,
    );
    return response.data as { signupSessionId: string; remarks: SignupRemark[] };
  },

  deleteUser: async (id: string, remark: string) => {
    const response = await deleteWithRemark(`/admin/users/${id}`, remark);
    return response.data;
  },
};
