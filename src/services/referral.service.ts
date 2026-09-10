import { axiosClient } from '@/lib/axios-client';

export type ReferralSettings = {
  id: string;
  enabled: boolean;
  coinsPerRupee: string | number;
  shareMessageTemplate: string | null;
  importantInfo: Array<{ title: string; body: string }> | null;
  freeMilestoneWindowDays: number;
  freeStandardGraceDays?: number;
  freeStandardMonthsPerReferral: number;
  paidMilestoneWindowDays: number;
  paidStandardPercent: string | number;
  paidStandardCoins?: number | null;
  paidMilestoneResetDays: number;
  paidPendingExpiryDays: number;
  freeMilestonesEnabledForNewUsers?: boolean;
  paidMilestonesEnabledForNewUsers?: boolean;
  /** @deprecated Prefer free/paid specific toggles */
  milestonesEnabledForNewUsers?: boolean;
  renewResetsMilestones?: boolean;
};

export type ReferralTier = {
  id?: string;
  track: 'FREE_REFERRER' | 'PAID_REFERRER';
  requiredReferrals: number;
  rewardType: 'FREE_MONTHS' | 'NETRA_PERCENT';
  rewardValue: string | number;
  rewardCoins?: number | null;
  sortOrder: number;
  isActive: boolean;
};

export type ReferralGraph = {
  user: Record<string, unknown>;
  isPaidReferrer?: boolean;
  referrer: Record<string, unknown> | null;
  invited: Array<Record<string, unknown>>;
  successfulReferrals: number;
  rewardState?: {
    mode: string;
    cycleAnchorAt: string | null;
    milestoneDeadlineAt: string | null;
    onboardCountInCycle: number;
    paidQualifiedCountInCycle: number;
    baseTrialEndsAt: string | null;
    resetCount: number;
  } | null;
  benefitHistory?: Array<{
    track: string;
    requiredReferrals: number;
    rewardType: string;
    rewardValue: number;
    monthsGranted: number | null;
    coinsCredited: number | null;
    reason: string | null;
    createdAt: string;
  }>;
};

export type ReferralUserSummary = {
  id: string;
  name?: string;
  email?: string;
  contact?: string;
  status?: string;
  referralCode?: string | null;
  subscriptionStatus?: string | null;
  createdAt?: string;
  planCode?: string | null;
  isPaidReferrer?: boolean;
  referrerTierLabel?: 'Paid' | 'Free';
  referIdUsed?: string | null;
  withoutReferral?: boolean;
  badge?: string | null;
};

export type ReferralOverviewEvent = {
  id: string;
  cycleId?: string | null;
  chainStarter: ReferralUserSummary;
  chainLevel: number;
  referrer: ReferralUserSummary;
  referee: ReferralUserSummary;
  status: string;
  coinsCredited: number;
  monthsGranted: number;
  countsTowardPaidMilestone?: boolean;
  createdAt: string;
};

export type ReferralByReferrerGroup = {
  referrer: ReferralUserSummary;
  invitedCount: number;
  lastActivityAt?: string;
  items: Array<{
    id: string;
    status: string;
    coinsCredited: number;
    monthsGranted: number;
    createdAt: string;
    referee: ReferralUserSummary;
  }>;
};

export type ReferralListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ReferralOverviewChainGroup = {
  chainStarter: ReferralUserSummary;
  totalInView: number;
  maxLevel: number;
  lastActivityAt: string;
  referrals: ReferralOverviewEvent[];
};

export type ReferralOverview = {
  stats: {
    totalInView: number;
    uniqueChains: number;
    pendingSubscriptions: number;
    rewardedCount: number;
  };
  chainGroups: ReferralOverviewChainGroup[];
  recentEvents: ReferralOverviewEvent[];
  topReferrers: Array<ReferralUserSummary & { successfulReferrals: number }>;
};
export type ReferralChainNode = {
  id: string;
  name: string;
  status: string;
  referralCode: string | null;
  depth: number;
  children: ReferralChainNode[];
};

function unwrap<T>(response: { data?: { data?: T; success?: boolean } | T }): T {
  const body = response.data as { data?: T; success?: boolean } | T;
  if (body && typeof body === 'object' && 'data' in body && (body as { data?: T }).data !== undefined) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export function referralApiError(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
  return e?.response?.data?.error?.message || e?.response?.data?.message || fallback;
}

export const referralService = {
  async getSettings() {
    const response = await axiosClient.get('/admin/referral/settings');
    return unwrap<ReferralSettings>(response);
  },

  async updateSettings(payload: {
    enabled?: boolean;
    coinsPerRupee?: number;
    shareMessageTemplate?: string | null;
    importantInfo?: Array<{ title: string; body: string }> | null;
    freeMilestoneWindowDays?: number;
    freeStandardGraceDays?: number;
    freeStandardMonthsPerReferral?: number;
    paidMilestoneWindowDays?: number;
    paidStandardPercent?: number;
    paidStandardCoins?: number | null;
    paidMilestoneResetDays?: number;
    paidPendingExpiryDays?: number;
    freeMilestonesEnabledForNewUsers?: boolean;
    paidMilestonesEnabledForNewUsers?: boolean;
    renewResetsMilestones?: boolean;
  }) {
    const response = await axiosClient.patch('/admin/referral/settings', payload);
    return unwrap<ReferralSettings>(response);
  },

  async listTiers() {
    const response = await axiosClient.get('/admin/referral/tiers');
    return unwrap<ReferralTier[]>(response);
  },

  async replaceTiers(tiers: Array<{
    track: string;
    requiredReferrals: number;
    rewardType: string;
    rewardValue: number;
    rewardCoins?: number | null;
    sortOrder?: number;
    isActive?: boolean;
  }>) {
    const response = await axiosClient.put('/admin/referral/tiers', { tiers });
    return unwrap<ReferralTier[]>(response);
  },

  async overview(limit = 50) {
    const response = await axiosClient.get('/admin/referral/overview', {
      params: { limit },
    });
    return unwrap<ReferralOverview>(response);
  },

  async listByReferrer(params: { q?: string; page?: number; limit?: number } = {}) {
    const response = await axiosClient.get('/admin/referral/by-referrer', {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        ...(params.q ? { q: params.q } : {}),
      },
    });
    return unwrap<{ items: ReferralByReferrerGroup[]; meta: ReferralListMeta }>(
      response,
    );
  },

  async listWithoutReferral(params: {
    q?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const response = await axiosClient.get('/admin/referral/without-referral', {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        ...(params.q ? { q: params.q } : {}),
      },
    });
    return unwrap<{ items: ReferralUserSummary[]; meta: ReferralListMeta }>(
      response,
    );
  },

  async getGraph(userId: string) {
    const response = await axiosClient.get(
      `/admin/referral/users/${encodeURIComponent(userId)}/graph`,
    );
    return unwrap<ReferralGraph>(response);
  },

  async getChain(userId: string, depth = 10) {
    const response = await axiosClient.get(
      `/admin/referral/users/${encodeURIComponent(userId)}/chain`,
      { params: { depth } },
    );
    return unwrap<{ root: ReferralChainNode | null; maxDepth: number }>(response);
  },
};
