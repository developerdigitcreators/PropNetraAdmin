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
  /** Days after earn until Referral NetraCoins expire */
  paidReferralCoinExpiryDays?: number;
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
  programSettings?: {
    renewResetsMilestones?: boolean;
    freeMilestonesEnabledForNewUsers?: boolean;
    paidMilestonesEnabledForNewUsers?: boolean;
  };
  rewardState?: {
    mode: string;
    cycleAnchorAt: string | null;
    milestoneDeadlineAt: string | null;
    onboardCountInCycle: number;
    paidQualifiedCountInCycle: number;
    baseTrialEndsAt: string | null;
    resetCount: number;
    milestoneOn?: boolean;
  } | null;
  benefitHistory?: Array<{
    track: string;
    requiredReferrals: number;
    rewardType: string;
    rewardValue: number;
    monthsGranted: number | null;
    coinsCredited: number | null;
    reason: string | null;
    triggerRefereeId?: string | null;
    meta?: Record<string, unknown> | null;
    inviteePlanAtBenefit?: string | null;
    referrerPlanAtBenefit?: string | null;
    rewardExpiresAt?: string | null;
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
  joinedViaReferral?: boolean;
  planStartedAt?: string | null;
  badge?: string | null;
};

export type ReferralInviteItem = {
  id: string;
  status: string;
  coinsCredited: number;
  monthsGranted: number;
  createdAt: string;
  pendingExpiresAt?: string | null;
  planActivatedAt?: string | null;
  rewardExpiresAt?: string | null;
  rewardKind?: 'free_extension' | 'coins' | string | null;
  inviteePlanAtBenefit?: string | null;
  referrerPlanAtBenefit?: string | null;
  referee: ReferralUserSummary;
};

export type ReferralByReferrerGroup = {
  referrer: ReferralUserSummary;
  invitedCount: number;
  lastActivityAt?: string;
  items: ReferralInviteItem[];
};

export type ReferralOverviewUserRow = {
  kind: 'referrer' | 'without_referral';
  user: ReferralUserSummary;
  invitedCount: number;
  lastActivityAt?: string | null;
  items: ReferralInviteItem[];
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
    paidReferralCoinExpiryDays?: number;
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

  async listOverviewUsers(params: {
    q?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const response = await axiosClient.get('/admin/referral/overview-users', {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 50,
        ...(params.q ? { q: params.q } : {}),
      },
    });
    return unwrap<{ items: ReferralOverviewUserRow[]; meta: ReferralListMeta }>(
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

  async getUserCoins(userId: string) {
    const response = await axiosClient.get(
      `/admin/referral/users/${encodeURIComponent(userId)}/coins`,
    );
    return unwrap<{
      referralCoinsBalance: number;
      lots: Array<{
        id: string;
        amountRemaining: number;
        amountGranted: number;
        grantedAt: string;
        expiresAt: string | null;
        expiredAt: string | null;
        sourceEventId?: string | null;
        meta?: Record<string, unknown> | null;
      }>;
      transactions: Array<{
        id: string;
        type: string;
        title: string;
        subtitle?: string | null;
        referralCoinsDelta: number;
        amountPaise?: number | null;
        expiresAt?: string | null;
        addonType?: string | null;
        paymentOrderId?: string | null;
        meta?: Record<string, unknown> | null;
        occurredAt: string;
      }>;
    }>(response);
  },

  async getReferralSaleMe(params: SalesPerformanceQuery = {}) {
    const response = await axiosClient.get('/admin/referral/sale/me', {
      params: salesQueryParams(params),
    });
    return normalizeSalesPerformance(unwrap<unknown>(response));
  },

  async getSalesPerformanceTeam() {
    const response = await axiosClient.get('/admin/referral/sales-performance/team');
    return normalizeSalesTeam(unwrap<unknown>(response));
  },

  async getSalesPerformance(params: SalesPerformanceQuery & { staffUserId: string }) {
    const response = await axiosClient.get('/admin/referral/sales-performance', {
      params: { staffUserId: params.staffUserId || 'all', ...salesQueryParams(params) },
    });
    return normalizeSalesPerformance(unwrap<unknown>(response));
  },
};

export type SalesPerformanceQuery = {
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  limit?: number;
};

export type SalesAllotteeType = 'paid' | 'free';

export type SalesSecondLevelInvitee = {
  id: string;
  name: string;
  planCode: string | null;
  allotteeType: SalesAllotteeType;
  currentlyPaid: boolean;
  planCostPaise: number | null;
  revenuePaise: number | null;
  eventStatus: string | null;
  joinedAt: string | null;
};

export type SalesInvitee = SalesSecondLevelInvitee & {
  contact: string | null;
  email: string | null;
  referralCode: string | null;
  joinedInRange: boolean;
  referredBy: { id: string; name: string } | null;
  secondLevelCount: number;
  secondLevel: SalesSecondLevelInvitee[];
};

export type SalesTotals = {
  totalInvites: number;
  directInvites: number;
  referralInvites: number;
  paidUsers: number;
  freeUsers: number;
  salesRevenuePaise: number;
};

export type SalesStaff = {
  id: string;
  name: string;
  referralCode: string | null;
  inviteUrl: string | null;
};

export type SalesPerformance = {
  staff: SalesStaff | null;
  referralCode: string | null;
  inviteUrl: string | null;
  shareMessage: string | null;
  range: { from: string | null; to: string | null };
  totals: SalesTotals;
  invitees: SalesInvitee[];
  meta: ReferralListMeta;
};

export type SalesTeamMember = {
  id: string;
  name: string;
  directCount: number;
};

/** @deprecated Use SalesPerformance. */
export type ReferralSaleMe = SalesPerformance;

function salesQueryParams(params: SalesPerformanceQuery) {
  return {
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    ...(params.from ? { from: params.from } : {}),
    ...(params.to ? { to: params.to } : {}),
    ...(params.q ? { q: params.q } : {}),
  };
}

type Raw = Record<string, unknown>;

const asRaw = (v: unknown): Raw => (v && typeof v === 'object' ? (v as Raw) : {});
const str = (v: unknown) => (typeof v === 'string' && v ? v : v != null && typeof v === 'number' ? String(v) : null);
const num = (v: unknown, fallback = 0) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
};
const numOrNull = (v: unknown) => (v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);

function normalizeSecondLevel(raw: unknown): SalesSecondLevelInvitee {
  const o = asRaw(raw);
  return {
    id: str(o.id) || '',
    name: str(o.name) || 'Unknown user',
    planCode: str(o.planCode),
    allotteeType: o.allotteeType === 'paid' ? 'paid' : 'free',
    currentlyPaid: o.currentlyPaid === true,
    planCostPaise: numOrNull(o.planCostPaise),
    revenuePaise: numOrNull(o.revenuePaise),
    eventStatus: str(o.eventStatus),
    joinedAt: str(o.joinedAt),
  };
}

function normalizeInvitee(raw: unknown): SalesInvitee {
  const o = asRaw(raw);
  const referredBy = asRaw(o.referredBy);
  const secondLevel = Array.isArray(o.secondLevel) ? o.secondLevel.map(normalizeSecondLevel) : [];
  return {
    ...normalizeSecondLevel(o),
    contact: str(o.contact),
    email: str(o.email),
    referralCode: str(o.referralCode),
    joinedInRange: o.joinedInRange !== false,
    referredBy: str(referredBy.id)
      ? { id: str(referredBy.id) as string, name: str(referredBy.name) || 'Unknown user' }
      : null,
    secondLevelCount: num(o.secondLevelCount, secondLevel.length),
    secondLevel,
  };
}

export function normalizeSalesPerformance(raw: unknown): SalesPerformance {
  const o = asRaw(raw);
  const totals = asRaw(o.totals);
  const range = asRaw(o.range);
  const meta = asRaw(o.meta);
  const staffRaw = o.staff ? asRaw(o.staff) : null;
  const staff: SalesStaff | null =
    staffRaw && str(staffRaw.id)
      ? {
          id: str(staffRaw.id) as string,
          name: str(staffRaw.name) || 'Unknown',
          referralCode: str(staffRaw.referralCode),
          inviteUrl: str(staffRaw.inviteUrl),
        }
      : null;
  const invitees = Array.isArray(o.invitees) ? o.invitees.map(normalizeInvitee) : [];
  const limit = num(meta.limit, 20) || 20;
  const total = num(meta.total, invitees.length);
  return {
    staff,
    referralCode: str(o.referralCode) ?? staff?.referralCode ?? null,
    inviteUrl: str(o.inviteUrl) ?? staff?.inviteUrl ?? null,
    shareMessage: str(o.shareMessage),
    range: { from: str(range.from), to: str(range.to) },
    totals: {
      totalInvites: num(totals.totalInvites),
      directInvites: num(totals.directInvites),
      referralInvites: num(totals.referralInvites),
      paidUsers: num(totals.paidUsers),
      freeUsers: num(totals.freeUsers),
      salesRevenuePaise: num(totals.salesRevenuePaise),
    },
    invitees,
    meta: {
      page: num(meta.page, 1) || 1,
      limit,
      total,
      totalPages: num(meta.totalPages, Math.max(1, Math.ceil(total / limit))),
    },
  };
}

function normalizeSalesTeam(raw: unknown): SalesTeamMember[] {
  const o = asRaw(raw);
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(o.items)
      ? o.items
      : Array.isArray(o.team)
        ? o.team
        : Array.isArray(o.staff)
          ? o.staff
          : [];
  return list
    .map((item) => {
      const m = asRaw(item);
      return {
        id: str(m.id) || str(m.userId) || '',
        name: str(m.name) || 'Unknown',
        directCount: num(m.directCount ?? m.directInvites ?? m.count),
      };
    })
    .filter((m) => !!m.id);
}
