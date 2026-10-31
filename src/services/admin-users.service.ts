import { axiosClient } from '@/lib/axios-client';
import { deleteWithRemark } from '@/lib/delete-with-remark';

export type AppUserAudience = 'admin_panel' | 'app';
export type AppUserBucket = 'otp_issued' | 'otp_verified' | 'master' | 'rejected';
export type AppUserFilterType =
  | 'plan'
  | 'role'
  | 'documents'
  | 'kyc_documents'
  | 'referral'
  | 'status';

export type GetUsersParams = {
  audience?: AppUserAudience;
  includeInProgress?: boolean;
  bucket?: AppUserBucket;
  q?: string;
  stateId?: string;
  cityId?: string;
  createdFrom?: string;
  createdTo?: string;
  expiredFrom?: string;
  expiredTo?: string;
  filterType?: AppUserFilterType;
  filterValue?: string;
  role?: string;
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

export type UserDeviceLock = {
  userId: string;
  boundDeviceId: string | null;
  isDeviceLockExempt: boolean;
};

export type MasterAppRole = 'developer' | 'floor' | 'agent';
export type MasterListingTab = 'active' | 'inactive' | 'in_approval' | 'rejected' | 'expired';
export type MasterCategoryGroup = 'resale_rent' | 'buy_requirement';

export type MasterProfileUser = {
  id?: string;
  name?: string;
  status?: string;
  contact?: string;
  email?: string;
  companyName?: string;
  companyLogoUrl?: string;
  address?: string;
  city?: string;
  cityName?: string;
  roleName?: string;
  subscription?: string;
  subscriptionStatus?: string;
  planCode?: string;
  badge?: string;
  documentsStatus?: string;
  documentsStatusLabel?: string;
};

export type MasterCompany = {
  name?: string;
  gst?: string;
  companyRole?: string;
  prefix: string;
  logo?: string;
  websiteUrl?: string;
};

export type MasterDeveloperShowcaseItem = {
  listingId?: string;
  projectName: string;
  location: string;
  sortOrder?: number;
};

export type DeveloperProfileStatsMode = 'dynamic' | 'manual';

export type MasterProfileStats = {
  mode: DeveloperProfileStatsMode;
  manualTotalProjects?: number;
  manualTotalCities?: number;
  live?: { totalProjects?: number; totalCities?: number };
  display?: { totalProjects?: number; totalCities?: number };
};

export type MasterBuilderProfile = {
  name?: string;
  displayName?: string;
  about?: string;
  address?: string;
  photo?: string;
  banner?: string;
  experience?: string;
  years?: string | number;
  months?: string | number;
  projectCount?: number;
  cityCount?: number;
  citiesLabel?: string;
  banners: Array<{ kind: 'video' | 'image'; url: string }>;
  projects: { total?: number; delivered?: number; underDevelopment?: number };
  associatedDevelopers: Array<{ id: string; name: string }>;
  associatedDeveloperIds: string[];
};

export type MasterProfile = {
  user: MasterProfileUser;
  appRole: MasterAppRole | null;
  companyLogoEditable?: boolean;
  company?: MasterCompany | null;
  builderProfile?: MasterBuilderProfile | null;
  profileStats?: MasterProfileStats | null;
  developerShowcase?: MasterDeveloperShowcaseItem[];
  showcaseListingIds?: string[];
  groupChatEnabled?: boolean;
  sections: {
    company?: boolean;
    builderProfile?: boolean;
    salesTeam?: boolean;
    listings?: boolean;
    profileStats?: boolean;
    developerShowcase?: boolean;
  };
  listings: {
    defaultCategoryGroup: MasterCategoryGroup;
    defaultTab: MasterListingTab;
  };
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function str(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function asNum(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function normalizeMasterProfile(body: unknown, userId: string): MasterProfile {
  const outer = asRecord(body);
  const raw = asRecord(outer.data ?? outer.profile ?? outer);
  const user = asRecord(raw.user ?? raw);
  const companyRaw = raw.company == null ? null : asRecord(raw.company);
  const builderRaw = raw.builderProfile == null ? null : asRecord(raw.builderProfile);
  const sections = asRecord(raw.sections);
  const listings = asRecord(raw.listings);
  const roleRaw = String(raw.appRole || user.appRole || '').toLowerCase();
  const appRole: MasterAppRole | null =
    roleRaw === 'developer' || roleRaw === 'floor' || roleRaw === 'agent' ? roleRaw : null;

  const bannerMedia = asRecord(builderRaw?.bannerMedia ?? builderRaw?.banner_media);
  const mediaImages = Array.isArray(bannerMedia.images)
    ? bannerMedia.images.map((u) => str(u)).filter(Boolean)
    : [];
  const mediaVideos = Array.isArray(bannerMedia.videos)
    ? bannerMedia.videos.map((u) => str(u)).filter(Boolean)
    : [];
  let banners = Array.isArray(builderRaw?.banners)
    ? builderRaw.banners
        .map((item) => {
          const row = asRecord(item);
          const url = str(row.url);
          if (!url) return null;
          return { kind: row.kind === 'video' ? ('video' as const) : ('image' as const), url };
        })
        .filter((item): item is { kind: 'video' | 'image'; url: string } => !!item)
    : [];
  if (!banners.length && (mediaImages.length || mediaVideos.length)) {
    banners = [
      ...mediaImages.map((url) => ({ kind: 'image' as const, url: url! })),
      ...mediaVideos.map((url) => ({ kind: 'video' as const, url: url! })),
    ];
  }

  const associated = Array.isArray(builderRaw?.associatedDevelopers)
    ? builderRaw.associatedDevelopers
        .map((item, index) => {
          if (typeof item === 'string') return { id: item, name: item };
          const row = asRecord(item);
          const name = str(row.name);
          if (!name) return null;
          return { id: str(row.id) || String(index), name };
        })
        .filter((item): item is { id: string; name: string } => !!item)
    : [];

  const ids = Array.isArray(builderRaw?.associatedDeveloperIds)
    ? builderRaw.associatedDeveloperIds.map((id) => String(id)).filter(Boolean)
    : associated.map((row) => row.id);

  const projects = asRecord(builderRaw?.projects);
  const defaultGroup = listings.defaultCategoryGroup === 'buy_requirement' ? 'buy_requirement' : 'resale_rent';
  const tabRaw = String(listings.defaultTab || 'active');
  const defaultTab: MasterListingTab = (
    ['active', 'inactive', 'in_approval', 'rejected', 'expired'] as const
  ).includes(tabRaw as MasterListingTab)
    ? (tabRaw as MasterListingTab)
    : 'active';

  const statsRaw = asRecord(raw.profileStats ?? raw.profile_stats);
  const liveRaw = asRecord(statsRaw.live);
  const displayRaw = asRecord(statsRaw.display);
  const manualRaw = asRecord(statsRaw.manual);
  const statsModeRaw = str(
    raw.developerProfileStatsMode ??
      raw.developer_profile_stats_mode ??
      user.developerProfileStatsMode ??
      user.developer_profile_stats_mode ??
      statsRaw.mode,
  );
  const profileStatsMode: DeveloperProfileStatsMode =
    statsModeRaw === 'manual' ? 'manual' : 'dynamic';
  const profileStats: MasterProfileStats | null =
    appRole === 'developer'
      ? {
          mode: profileStatsMode,
          manualTotalProjects: asNum(
            raw.totalProjectCount ??
              user.totalProjectCount ??
              manualRaw.totalProjectCount ??
              manualRaw.totalProjects,
          ),
          manualTotalCities: asNum(
            raw.totalCities ?? user.totalCities ?? manualRaw.totalCities,
          ),
          live: {
            totalProjects: asNum(liveRaw.totalProjects ?? liveRaw.total_projects),
            totalCities: asNum(liveRaw.totalCities ?? liveRaw.total_cities),
          },
          display: {
            totalProjects: asNum(displayRaw.totalProjects ?? displayRaw.total_projects),
            totalCities: asNum(displayRaw.totalCities ?? displayRaw.total_cities),
          },
        }
      : null;

  const showcaseRaw = raw.developerShowcase ?? raw.developer_showcase;
  const showcaseObj =
    showcaseRaw && typeof showcaseRaw === 'object' && !Array.isArray(showcaseRaw)
      ? asRecord(showcaseRaw)
      : null;
  const showcaseItemsRaw = Array.isArray(showcaseRaw)
    ? showcaseRaw
    : Array.isArray(showcaseObj?.items)
      ? showcaseObj!.items
      : [];
  const showcaseListingIds: string[] =
    appRole === 'developer'
      ? (Array.isArray(showcaseObj?.listingIds)
          ? showcaseObj!.listingIds.map((id) => String(id)).filter(Boolean)
          : Array.isArray(showcaseObj?.listing_ids)
            ? showcaseObj!.listing_ids.map((id) => String(id)).filter(Boolean)
            : []
        ).slice(0, 3)
      : [];
  const developerShowcase: MasterDeveloperShowcaseItem[] =
    appRole === 'developer'
      ? showcaseItemsRaw
          .map((item, index): MasterDeveloperShowcaseItem | null => {
            const row = asRecord(item);
            const projectName =
              str(row.projectName ?? row.project_name ?? row.title ?? row.name) || '';
            const location =
              str(row.location ?? row.locationName ?? row.location_name ?? row.city) || '';
            if (!projectName && !location) return null;
            return {
              listingId: str(row.listingId ?? row.listing_id ?? row.id),
              projectName,
              location,
              sortOrder: asNum(row.sortOrder ?? row.sort_order) ?? index + 1,
            };
          })
          .filter((row): row is MasterDeveloperShowcaseItem => row !== null)
          .slice(0, 3)
      : [];
  const groupChatEnabled =
    raw.groupChatEnabled === true ||
    raw.group_chat_enabled === true;

  return {
    user: {
      id: str(user.id) || userId,
      name: str(user.name),
      status: str(user.status),
      contact: str(user.contact || user.phone),
      email: str(user.email),
      companyName: str(user.companyName),
      companyLogoUrl: str(user.companyLogoUrl),
      address: str(user.address),
      city: str(user.city),
      cityName: str(user.cityName),
      roleName: str(user.roleName),
      subscription: str(user.subscription),
      subscriptionStatus: str(user.subscriptionStatus),
      planCode: str(user.planCode),
      badge: str(user.badge),
      documentsStatus: str(user.documentsStatus),
      documentsStatusLabel: str(user.documentsStatusLabel),
    },
    appRole,
    companyLogoEditable: raw.companyLogoEditable === true,
    company: companyRaw
      ? {
          name:
            str(companyRaw.name ?? companyRaw.companyName ?? companyRaw.company_name) ||
            str(user.companyName),
          gst: str(companyRaw.gst ?? companyRaw.gstNumber ?? companyRaw.gst_number),
          companyRole:
            str(companyRaw.companyRole ?? companyRaw.company_role) ||
            (str(companyRaw.companyRoleLabel ?? companyRaw.company_role_label) ===
            'Owner'
              ? 'id_owner'
              : str(companyRaw.companyRoleLabel ?? companyRaw.company_role_label) ===
                  'Team Member'
                ? 'team_member'
                : ''),
          prefix:
            str(companyRaw.prefix ?? companyRaw.projectPrefix ?? companyRaw.project_prefix) || '',
          logo: str(
            companyRaw.logo ?? companyRaw.companyLogoUrl ?? companyRaw.company_logo_url,
          ),
          websiteUrl: str(companyRaw.websiteUrl ?? companyRaw.website_url),
        }
      : null,
    builderProfile: builderRaw
      ? {
          name: str(builderRaw.name),
          displayName: str(builderRaw.displayName ?? builderRaw.display_name),
          about: str(builderRaw.about ?? builderRaw.aboutBuilder),
          address: str(builderRaw.address),
          photo: str(builderRaw.photo ?? builderRaw.profilePhotoUrl ?? builderRaw.profile_photo_url),
          banner: str(builderRaw.banner ?? builderRaw.bannerUrl),
          experience: str(builderRaw.experience),
          years:
            (builderRaw.years as string | number | undefined) ??
            asNum(builderRaw.yearsOfExperience ?? builderRaw.years_of_experience),
          months:
            (builderRaw.months as string | number | undefined) ??
            asNum(builderRaw.experienceMonths ?? builderRaw.experience_months),
          projectCount:
            typeof builderRaw.projectCount === 'number'
              ? builderRaw.projectCount
              : asNum(builderRaw.totalProjects ?? builderRaw.total_projects),
          cityCount:
            typeof builderRaw.cityCount === 'number'
              ? builderRaw.cityCount
              : asNum(builderRaw.totalCities ?? builderRaw.total_cities),
          citiesLabel: str(builderRaw.citiesLabel ?? builderRaw.cities_label),
          banners,
          projects: {
            total:
              typeof projects.total === 'number'
                ? projects.total
                : asNum(builderRaw.totalProjects ?? builderRaw.total_projects),
            delivered:
              typeof projects.delivered === 'number'
                ? projects.delivered
                : asNum(builderRaw.deliveredProjects ?? builderRaw.delivered_projects),
            underDevelopment:
              typeof projects.underDevelopment === 'number'
                ? projects.underDevelopment
                : asNum(
                    builderRaw.underDevelopmentProjects ??
                      builderRaw.under_development_projects,
                  ),
          },
          associatedDevelopers: associated,
          associatedDeveloperIds: ids,
        }
      : null,
    profileStats,
    developerShowcase,
    showcaseListingIds,
    groupChatEnabled: appRole === 'developer' ? groupChatEnabled : undefined,
    sections: {
      company: sections.company === true || !!companyRaw,
      builderProfile: sections.builderProfile === true || !!builderRaw,
      salesTeam: sections.salesTeam === true || appRole === 'developer',
      listings: sections.listings !== false,
      profileStats: sections.profileStats !== false && appRole === 'developer',
      developerShowcase: sections.developerShowcase !== false && appRole === 'developer',
    },
    listings: {
      defaultCategoryGroup: defaultGroup,
      defaultTab,
    },
  };
}

function toDeviceLock(body: unknown, fallbackUserId: string): UserDeviceLock {
  const outer = (body ?? {}) as { data?: unknown };
  const raw = (outer.data && typeof outer.data === 'object' ? outer.data : outer) as Record<
    string,
    unknown
  >;
  const bound = raw.boundDeviceId;
  return {
    userId: String(raw.userId ?? fallbackUserId),
    boundDeviceId: typeof bound === 'string' && bound.trim() ? bound : null,
    isDeviceLockExempt: raw.isDeviceLockExempt === true,
  };
}

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
  if (audienceOrParams.expiredFrom) params.expiredFrom = audienceOrParams.expiredFrom;
  if (audienceOrParams.expiredTo) params.expiredTo = audienceOrParams.expiredTo;
  if (audienceOrParams.filterType) params.filterType = audienceOrParams.filterType;
  if (audienceOrParams.filterValue) params.filterValue = audienceOrParams.filterValue;
  if (audienceOrParams.role) params.role = audienceOrParams.role;
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

  getMasterProfile: async (id: string): Promise<MasterProfile> => {
    const response = await axiosClient.get(
      `/admin/users/${encodeURIComponent(id)}/master-profile`,
    );
    return normalizeMasterProfile(response.data, id);
  },

  patchDeveloperProfile: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<MasterProfile> => {
    const response = await axiosClient.patch(
      `/admin/user-analytics/users/${encodeURIComponent(id)}/developer-profile`,
      data,
    );
    return normalizeMasterProfile(response.data, id);
  },

  createUser: async (data: any) => {
    const response = await axiosClient.post('/admin/users', data);
    return response.data;
  },

  createOtpVerifiedUser: async (data: {
    name: string;
    contact: string;
    role_id: string;
    projectPrefix?: string;
    companyLogoUrl?: string;
    email?: string;
    companyName?: string;
    companyContact?: string;
    companyEmail?: string;
  }) => {
    const response = await axiosClient.post('/admin/users/otp-verified', data);
    return response.data;
  },

  updateUser: async (id: string, data: Record<string, unknown>) => {
    const response = await axiosClient.put(`/admin/users/${id}`, data);
    return response.data;
  },

  patchUser: async (
    id: string,
    data: {
      developerProfileStatsMode?: DeveloperProfileStatsMode;
      totalProjectCount?: number;
      totalCities?: number;
    },
  ) => {
    const response = await axiosClient.patch(`/admin/users/${encodeURIComponent(id)}`, data);
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

  getDeviceLock: async (id: string): Promise<UserDeviceLock> => {
    const response = await axiosClient.get(
      `/admin/users/${encodeURIComponent(id)}/device-lock`,
    );
    return toDeviceLock(response.data, id);
  },

  resetDevice: async (id: string): Promise<UserDeviceLock> => {
    const response = await axiosClient.patch(
      `/admin/users/${encodeURIComponent(id)}/reset-device`,
    );
    return toDeviceLock(response.data, id);
  },

  setDeviceExemption: async (id: string, isExempt: boolean): Promise<UserDeviceLock> => {
    const response = await axiosClient.patch(
      `/admin/users/${encodeURIComponent(id)}/device-exemption`,
      { isExempt: isExempt === true },
    );
    return toDeviceLock(response.data, id);
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
