import { axiosClient } from '@/lib/axios-client';

export type PlanLimits = {
  listingContactsDaily: number;
  listingContactsMonthly: number;
  activeResaleRentPosts: number;
  buyReqContactsDaily: number;
  buyReqContactsMonthly: number;
  activeBuyReqPosts: number;
  listingViewsDaily: number | null;
  listingViewsMonthly: number | null;
  monthlyCoinGrant: number;
  listingBoostHours: number;
  /** Separate daily caps when spending addon pack credits */
  addonListingContactsDaily: number;
  addonBuyReqContactsDaily: number;
  addonBuilderContactsDaily: number;
  /** Max pack purchases per calendar month; 0 = unlimited */
  addonResaleBundlesMonthly: number;
  addonBuyReqBundlesMonthly: number;
  addonBuilderBundlesMonthly: number;
  /** Direct Builder Floor post limits */
  dbfPostsDaily: number;
  dbfPostsMonthly: number;
  /** null = no active post cap */
  activeDbfPosts: number | null;
  /** Developer project features — null = unlimited */
  devCompareDaily: number | null;
  devCompareMonthly: number | null;
  devShareDaily: number | null;
  devShareMonthly: number | null;
  devBrochureDaily: number | null;
  devBrochureMonthly: number | null;
  devContactDaily: number | null;
  devContactMonthly: number | null;
  /** Agent plans: developer project page views — null = unlimited */
  devViewDaily: number | null;
  devViewMonthly: number | null;
  /** Developer / DBF owners: listing-viewer number reveals — null = unlimited */
  viewerRevealDaily: number | null;
  viewerRevealMonthly: number | null;
  /** Developer post limits */
  developerPostsDaily: number;
  developerPostsMonthly: number;
  activeDeveloperPosts: number | null;
  /** Developer: Launch Update cities included free with the plan */
  includedCities: number;
  developerGroupChatEnabled: boolean;
  launchReelsEnabled: boolean;
};

export type PlanAudience = 'agent' | 'dbf' | 'developer';

/** Which role track a Plan mode card controls. */
export type ModeTrack = 'dbf' | 'developer';

export type CityAddonPeriodPrices = {
  monthly: number;
  quarterly: number;
  half_yearly: number;
  yearly: number;
};

export type CityAddonPricingCity = {
  cityId: string;
  cityName: string;
  stateId?: string;
  stateName: string;
  prices: CityAddonPeriodPrices;
  overridden?: boolean;
};

export type CityAddonPricing = {
  secondPaise: number;
  thirdPaise: number;
  defaults: CityAddonPeriodPrices;
  durations?: string[];
  citiesCatalog?: CityAddonPricingCity[];
};

export type DbfModeHistoryEntry = {
  cycle: number;
  action: 'on' | 'off' | 'postpone';
  at: string;
  freeEndsOn: string | null;
  byUserId: string | null;
};

export type DbfModeState = {
  mode: 'free' | 'paid';
  cycle: number;
  paidEnabledAt: string | null;
  disabledAt: string | null;
  freeEndsAt: string | null;
  freeEndsOn: string | null;
  enabledByUserId: string | null;
  minFreeEndsOn: string;
  cutoffPassed: boolean;
  canPostpone: boolean;
  canDisable: boolean;
  history: DbfModeHistoryEntry[];
};

export type DbfModeImpact = {
  lockedListings: number;
  lockedListingOwners: number;
  lockedUsers: number;
  freeGraceUsers: number;
  paidSubscribers: number;
  autopaySubscribers: number;
};

export type DbfModeDisableResult = {
  unlockedListings: number;
  autopayStopped: number;
  autopayFailed: number;
};

export type PlanFlags = {
  addonsEnabled: boolean;
  listingPriorityEnabled: boolean;
  listingBoostEnabled: boolean;
  builderContactsEnabled: boolean;
};

/** Hidden quotas for revealing contacts on Realty Avenue (verified) listings. null = unlimited. */
export type VerifiedContactLimits = {
  verifiedResaleContactsDaily: number | null;
  verifiedResaleContactsMonthly: number | null;
  verifiedRentContactsDaily: number | null;
  verifiedRentContactsMonthly: number | null;
  verifiedBuyReqContactsDaily: number | null;
  verifiedBuyReqContactsMonthly: number | null;
};

export const VERIFIED_CONTACT_LIMIT_KEYS: Array<keyof VerifiedContactLimits> = [
  'verifiedResaleContactsDaily',
  'verifiedResaleContactsMonthly',
  'verifiedRentContactsDaily',
  'verifiedRentContactsMonthly',
  'verifiedBuyReqContactsDaily',
  'verifiedBuyReqContactsMonthly',
];

function normalizeVerifiedContactLimits(raw: unknown): VerifiedContactLimits {
  const row = asRecord(raw) || {};
  return Object.fromEntries(
    VERIFIED_CONTACT_LIMIT_KEYS.map((key) => [key, asNumOrNull(row[key])]),
  ) as VerifiedContactLimits;
}

export type SubscriptionPlanItem = {
  id: string;
  code: string;
  displayName: string;
  sortOrder: number;
  isActive: boolean;
  showOnApp: boolean;
  trialDays: number | null;
  pricePaise: number | null;
  billingPeriod: string | null;
  promoPricePaise: number | null;
  promoWindowDays: number | null;
  dummyPricePaise: number | null;
  audience: PlanAudience;
  flags: PlanFlags;
  limits: PlanLimits | null;
  verifiedContactLimits: VerifiedContactLimits;
};

export function isDbfPlanCode(code: string): boolean {
  const key = String(code || '').toUpperCase();
  return key === 'DBF_FREE' || key === 'DBF_PAID';
}

export function isDeveloperPlanCode(code: string): boolean {
  return String(code || '').toUpperCase().startsWith('DEVELOPER_');
}

export function billingPeriodLabel(period: string | null | undefined): string {
  switch (String(period || '').toLowerCase()) {
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Quarterly';
    case 'half_yearly':
      return 'Half-Yearly';
    default:
      return 'Yearly';
  }
}

export function billingPeriodUnit(period: string | null | undefined): string {
  switch (String(period || '').toLowerCase()) {
    case 'monthly':
      return 'month';
    case 'quarterly':
      return 'quarter';
    case 'half_yearly':
      return 'half-year';
    default:
      return 'year';
  }
}

export type AddonCatalogItem = {
  id: string;
  type: string;
  displayName: string;
  coinCost: number;
  quantity: number;
  enabled: boolean;
  description: string | null;
};

export type UserEntitlements = {
  planCode: string;
  displayName: string;
  planLabel?: string | null;
  isSubscribed: boolean;
  trialEndsAt: string | null;
  trialStartsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  planStartedAt?: string | null;
  planExpiresAt?: string | null;
  showTrialEnds?: boolean;
  subscriptionStatus: string;
  badge: string | null;
  pendingPlanCode?: string | null;
  pendingPlanDisplayName?: string | null;
  limits: PlanLimits;
  flags: PlanFlags;
  usage: {
    periodDay: string;
    periodMonth: string;
    listingContactsDay: number;
    listingContactsMonth: number;
    buyReqContactsDay: number;
    buyReqContactsMonth: number;
    viewsDay: number;
    viewsMonth: number;
    activeResaleRentPostsUsed?: number;
    activeBuyReqPostsUsed?: number;
  };
  addonCredits: {
    listingContactCredits: number;
    buyReqContactCredits: number;
    builderContactCredits?: number;
  };
  walletBalance: number;
  referralCoinsBalance?: number;
  history?: Array<Record<string, unknown>>;
  paymentHistory?: Array<Record<string, unknown>>;
  creditLots?: Array<Record<string, unknown>>;
  autopayEnabled?: boolean;
  billingState?: string | null;
};

export type UpdatePlanPayload = {
  displayName?: string;
  sortOrder?: number;
  isActive?: boolean;
  showOnApp?: boolean;
  trialDays?: number | null;
  pricePaise?: number | null;
  billingPeriod?: string | null;
  promoPricePaise?: number | null;
  promoWindowDays?: number | null;
  dummyPricePaise?: number | null;
  addonsEnabled?: boolean;
  listingPriorityEnabled?: boolean;
  listingBoostEnabled?: boolean;
  builderContactsEnabled?: boolean;
  entitlements?: Partial<PlanLimits> & Partial<VerifiedContactLimits>;
};

export type UpdateAddonPayload = {
  displayName?: string;
  coinCost?: number;
  quantity?: number;
  enabled?: boolean;
  description?: string | null;
};

/** Display stored paise as INR (API still uses paise). */
export function formatInrFromPaise(paise: number | null | undefined): string {
  if (paise == null || !Number.isFinite(paise)) return '—';
  if (paise === 0) return 'Free';
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
  }).format(rupees);
}

export function paiseToRupeesInput(paise: number | null | undefined): string {
  if (paise == null || !Number.isFinite(paise)) return '';
  const rupees = paise / 100;
  return Number.isInteger(rupees) ? String(rupees) : rupees.toFixed(2);
}

export function rupeesInputToPaise(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function isPaidSubscriptionPlan(code: string): boolean {
  const key = String(code || '').toUpperCase();
  return key !== 'FREE_TRIAL' && key !== 'FREE_LIFETIME';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.toLowerCase().trim();
    if (['true', '1', 'yes', 'on'].includes(v)) return true;
    if (['false', '0', 'no', 'off'].includes(v)) return false;
  }
  return fallback;
}

function asNum(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asNumOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const obj = asRecord(data);
  if (!obj) return [];
  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.data)) return obj.data;
  return [];
}

export function subscriptionApiError(err: unknown, fallback: string): string {
  const e = err as {
    response?: { data?: { message?: unknown; error?: unknown } };
    message?: string;
  };
  const nested = e?.response?.data;
  const fromError =
    nested && typeof nested === 'object' && 'error' in nested
      ? (nested as { error?: { message?: unknown } }).error?.message
      : undefined;
  const msg = fromError ?? nested?.message ?? nested?.error;
  if (Array.isArray(msg)) return msg.filter(Boolean).join(', ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return e?.message || fallback;
}

function normalizeLimits(raw: unknown): PlanLimits | null {
  const row = asRecord(raw);
  if (!row) return null;
  return {
    listingContactsDaily: asNum(row.listingContactsDaily),
    listingContactsMonthly: asNum(row.listingContactsMonthly),
    activeResaleRentPosts: asNum(row.activeResaleRentPosts),
    buyReqContactsDaily: asNum(row.buyReqContactsDaily),
    buyReqContactsMonthly: asNum(row.buyReqContactsMonthly),
    activeBuyReqPosts: asNum(row.activeBuyReqPosts),
    listingViewsDaily: asNumOrNull(row.listingViewsDaily),
    listingViewsMonthly: asNumOrNull(row.listingViewsMonthly),
    monthlyCoinGrant: asNum(row.monthlyCoinGrant),
    listingBoostHours: asNum(row.listingBoostHours, 24),
    addonListingContactsDaily: asNum(row.addonListingContactsDaily, 0),
    addonBuyReqContactsDaily: asNum(row.addonBuyReqContactsDaily, 0),
    addonBuilderContactsDaily: asNum(row.addonBuilderContactsDaily, 0),
    addonResaleBundlesMonthly: asNum(row.addonResaleBundlesMonthly, 0),
    addonBuyReqBundlesMonthly: asNum(row.addonBuyReqBundlesMonthly, 0),
    addonBuilderBundlesMonthly: asNum(row.addonBuilderBundlesMonthly, 0),
    dbfPostsDaily: asNum(row.dbfPostsDaily, 0),
    dbfPostsMonthly: asNum(row.dbfPostsMonthly, 0),
    activeDbfPosts: asNumOrNull(row.activeDbfPosts),
    devCompareDaily: asNumOrNull(row.devCompareDaily),
    devCompareMonthly: asNumOrNull(row.devCompareMonthly),
    devShareDaily: asNumOrNull(row.devShareDaily),
    devShareMonthly: asNumOrNull(row.devShareMonthly),
    devBrochureDaily: asNumOrNull(row.devBrochureDaily),
    devBrochureMonthly: asNumOrNull(row.devBrochureMonthly),
    devContactDaily: asNumOrNull(row.devContactDaily),
    devContactMonthly: asNumOrNull(row.devContactMonthly),
    devViewDaily: asNumOrNull(row.devViewDaily),
    devViewMonthly: asNumOrNull(row.devViewMonthly),
    viewerRevealDaily: asNumOrNull(row.viewerRevealDaily),
    viewerRevealMonthly: asNumOrNull(row.viewerRevealMonthly),
    developerPostsDaily: asNum(row.developerPostsDaily, 0),
    developerPostsMonthly: asNum(row.developerPostsMonthly, 0),
    activeDeveloperPosts: asNumOrNull(row.activeDeveloperPosts),
    includedCities: Math.max(1, asNum(row.includedCities, 1)),
    developerGroupChatEnabled: asBool(row.developerGroupChatEnabled, false),
    launchReelsEnabled: asBool(row.launchReelsEnabled, false),
  };
}

function normalizeDbfMode(raw: unknown): DbfModeState {
  const row = asRecord(asRecord(raw)?.data ?? raw) || {};
  const history = Array.isArray(row.history) ? row.history : [];
  return {
    mode: row.mode === 'paid' ? 'paid' : 'free',
    cycle: asNum(row.cycle, 0),
    paidEnabledAt: pickString(row.paidEnabledAt) || null,
    disabledAt: pickString(row.disabledAt) || null,
    freeEndsAt: pickString(row.freeEndsAt) || null,
    freeEndsOn: pickString(row.freeEndsOn) || null,
    enabledByUserId: pickString(row.enabledByUserId) || null,
    minFreeEndsOn: pickString(row.minFreeEndsOn),
    cutoffPassed: asBool(row.cutoffPassed, false),
    canPostpone: asBool(row.canPostpone, false),
    canDisable: asBool(row.canDisable, row.mode === 'paid'),
    history: history
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        cycle: asNum(item.cycle, 0),
        action:
          item.action === 'off' ? 'off' : item.action === 'postpone' ? 'postpone' : 'on',
        at: pickString(item.at),
        freeEndsOn: pickString(item.freeEndsOn) || null,
        byUserId: pickString(item.byUserId) || null,
      })),
  };
}

function normalizeDbfImpact(raw: unknown): DbfModeImpact {
  const row = asRecord(asRecord(raw)?.data ?? raw) || {};
  return {
    lockedListings: asNum(row.lockedListings, 0),
    lockedListingOwners: asNum(row.lockedListingOwners, 0),
    lockedUsers: asNum(row.lockedUsers, 0),
    freeGraceUsers: asNum(row.freeGraceUsers, 0),
    paidSubscribers: asNum(row.paidSubscribers, 0),
    autopaySubscribers: asNum(row.autopaySubscribers, 0),
  };
}

function normalizeFlags(raw: unknown, fallback?: Partial<PlanFlags>): PlanFlags {
  const row = asRecord(raw) || {};
  return {
    addonsEnabled: asBool(row.addonsEnabled ?? fallback?.addonsEnabled, false),
    listingPriorityEnabled: asBool(
      row.listingPriorityEnabled ?? fallback?.listingPriorityEnabled,
      false,
    ),
    listingBoostEnabled: asBool(
      row.listingBoostEnabled ?? fallback?.listingBoostEnabled,
      false,
    ),
    builderContactsEnabled: asBool(
      row.builderContactsEnabled ?? fallback?.builderContactsEnabled,
      false,
    ),
  };
}

export function normalizePlan(raw: unknown): SubscriptionPlanItem | null {
  const row = asRecord(raw);
  if (!row) return null;
  const code = pickString(row.code);
  const id = pickString(row.id);
  if (!code || !id) return null;
  const flagsRaw = row.flags || {
    addonsEnabled: row.addonsEnabled,
    listingPriorityEnabled: row.listingPriorityEnabled,
    listingBoostEnabled: row.listingBoostEnabled,
    builderContactsEnabled: row.builderContactsEnabled,
  };
  return {
    id,
    code,
    displayName: pickString(row.displayName, row.display_name) || code,
    sortOrder: asNum(row.sortOrder ?? row.sort_order),
    isActive: asBool(row.isActive ?? row.is_active, true),
    showOnApp: asBool(row.showOnApp ?? row.show_on_app, true),
    trialDays: asNumOrNull(row.trialDays ?? row.trial_days),
    pricePaise: asNumOrNull(row.pricePaise ?? row.price_paise),
    billingPeriod: pickString(row.billingPeriod, row.billing_period) || null,
    promoPricePaise: asNumOrNull(row.promoPricePaise ?? row.promo_price_paise),
    promoWindowDays: asNumOrNull(row.promoWindowDays ?? row.promo_window_days),
    dummyPricePaise: asNumOrNull(row.dummyPricePaise ?? row.dummy_price_paise),
    audience:
      pickString(row.audience) === 'dbf' || isDbfPlanCode(code)
        ? 'dbf'
        : pickString(row.audience) === 'developer' || isDeveloperPlanCode(code)
          ? 'developer'
          : 'agent',
    flags: normalizeFlags(flagsRaw),
    limits: normalizeLimits(row.limits ?? row.entitlement),
    verifiedContactLimits: normalizeVerifiedContactLimits(
      row.verifiedContactLimits ?? row.limits ?? row.entitlement,
    ),
  };
}

export function normalizeAddon(raw: unknown): AddonCatalogItem | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = pickString(row.id);
  const type = pickString(row.type);
  if (!id || !type) return null;
  return {
    id,
    type,
    displayName: pickString(row.displayName, row.display_name) || type,
    coinCost: asNum(row.coinCost ?? row.coin_cost),
    quantity: asNum(row.quantity),
    enabled: asBool(row.enabled, false),
    description: pickString(row.description) || null,
  };
}

export function normalizeUserEntitlements(raw: unknown): UserEntitlements | null {
  const row = asRecord(raw);
  if (!row) return null;
  const limits = normalizeLimits(row.limits);
  if (!limits) return null;
  const usage = asRecord(row.usage) || {};
  const credits = asRecord(row.addonCredits) || {};
  return {
    planCode: pickString(row.planCode),
    displayName: pickString(row.displayName),
    planLabel: pickString(row.planLabel, row.plan_label) || null,
    isSubscribed: asBool(row.isSubscribed, false),
    trialEndsAt: pickString(row.trialEndsAt) || null,
    trialStartsAt: pickString(row.trialStartsAt) || null,
    currentPeriodStart: pickString(row.currentPeriodStart) || null,
    currentPeriodEnd: pickString(row.currentPeriodEnd) || null,
    planStartedAt: pickString(row.planStartedAt, row.plan_started_at) || null,
    planExpiresAt: pickString(row.planExpiresAt, row.plan_expires_at) || null,
    showTrialEnds:
      row.showTrialEnds == null && row.show_trial_ends == null
        ? undefined
        : asBool(row.showTrialEnds ?? row.show_trial_ends, false),
    subscriptionStatus: pickString(row.subscriptionStatus),
    badge: pickString(row.badge) || null,
    pendingPlanCode: pickString(row.pendingPlanCode) || null,
    pendingPlanDisplayName: pickString(row.pendingPlanDisplayName) || null,
    limits,
    flags: normalizeFlags(row.flags),
    usage: {
      periodDay: pickString(usage.periodDay),
      periodMonth: pickString(usage.periodMonth),
      listingContactsDay: asNum(usage.listingContactsDay),
      listingContactsMonth: asNum(usage.listingContactsMonth),
      buyReqContactsDay: asNum(usage.buyReqContactsDay),
      buyReqContactsMonth: asNum(usage.buyReqContactsMonth),
      viewsDay: asNum(usage.viewsDay),
      viewsMonth: asNum(usage.viewsMonth),
      activeResaleRentPostsUsed: asNum(usage.activeResaleRentPostsUsed),
      activeBuyReqPostsUsed: asNum(usage.activeBuyReqPostsUsed),
    },
    addonCredits: {
      listingContactCredits: asNum(credits.listingContactCredits),
      buyReqContactCredits: asNum(credits.buyReqContactCredits),
      builderContactCredits: asNum(credits.builderContactCredits),
    },
    walletBalance: asNum(row.walletBalance),
    referralCoinsBalance: asNum(
      row.referralCoinsBalance ?? row.referral_coins_balance,
    ),
    history: Array.isArray(row.history) ? row.history : [],
    paymentHistory: Array.isArray(row.paymentHistory)
      ? row.paymentHistory
      : Array.isArray(row.history)
        ? row.history
        : [],
    creditLots: Array.isArray(row.creditLots) ? row.creditLots : [],
    autopayEnabled:
      row.autopayEnabled == null && row.autopay_enabled == null
        ? undefined
        : asBool(row.autopayEnabled ?? row.autopay_enabled, false),
    billingState: pickString(row.billingState, row.billing_state) || null,
  };
}

export const subscriptionsService = {
  listPlans: async (audience?: PlanAudience): Promise<SubscriptionPlanItem[]> => {
    const response = await axiosClient.get('/admin/subscriptions/plans', {
      params: audience ? { audience } : undefined,
    });
    return asArray(response.data)
      .map((row) => normalizePlan(row))
      .filter((row): row is SubscriptionPlanItem => !!row)
      .filter((row) => !audience || row.audience === audience)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  getDbfMode: async (track: ModeTrack = 'dbf'): Promise<DbfModeState> => {
    const response = await axiosClient.get(`/admin/subscriptions/${track}-mode`);
    return normalizeDbfMode(response.data);
  },

  /** Enables Paid mode (starts a new cycle), or postpones the free-end date before it passes. */
  enableDbfPaidMode: async (
    freeEndsOn: string,
    track: ModeTrack = 'dbf',
  ): Promise<DbfModeState> => {
    const response = await axiosClient.put(`/admin/subscriptions/${track}-mode`, {
      freeEndsOn,
    });
    return normalizeDbfMode(response.data);
  },

  disableDbfPaidMode: async (
    notifyUsers: boolean,
    track: ModeTrack = 'dbf',
  ): Promise<{ mode: DbfModeState; result: DbfModeDisableResult }> => {
    const response = await axiosClient.put(`/admin/subscriptions/${track}-mode/disable`, {
      notifyUsers,
    });
    const body = asRecord(asRecord(response.data)?.data ?? response.data) || {};
    const result = asRecord(body.result) || {};
    return {
      mode: normalizeDbfMode(body),
      result: {
        unlockedListings: asNum(result.unlockedListings, 0),
        autopayStopped: asNum(result.autopayStopped, 0),
        autopayFailed: Array.isArray(result.autopayFailed)
          ? result.autopayFailed.length
          : asNum(result.autopayFailed, 0),
      },
    };
  },

  getDbfModeImpact: async (track: ModeTrack = 'dbf'): Promise<DbfModeImpact> => {
    const response = await axiosClient.get(`/admin/subscriptions/${track}-mode/impact`);
    return normalizeDbfImpact(response.data);
  },

  getCityAddonPricing: async (): Promise<CityAddonPricing> => {
    const response = await axiosClient.get('/admin/subscriptions/developer/city-addon-pricing');
    const row = asRecord(asRecord(response.data)?.data ?? response.data) || {};
    const defaultsRow = asRecord(row.defaults) || {};
    const defaults: CityAddonPeriodPrices = {
      monthly: asNum(defaultsRow.monthly, 9900),
      quarterly: asNum(defaultsRow.quarterly, 24900),
      half_yearly: asNum(defaultsRow.half_yearly, 49900),
      yearly: asNum(defaultsRow.yearly, 99900),
    };
    const catalog = asArray(row.citiesCatalog).map((item) => {
      const rec = asRecord(item) || {};
      const prices = asRecord(rec.prices) || {};
      return {
        cityId: String(rec.cityId || rec.id || ''),
        cityName: String(rec.cityName || rec.name || ''),
        stateId: rec.stateId ? String(rec.stateId) : undefined,
        stateName: String(rec.stateName || ''),
        overridden: Boolean(rec.overridden),
        prices: {
          monthly: asNum(prices.monthly, defaults.monthly),
          quarterly: asNum(prices.quarterly, defaults.quarterly),
          half_yearly: asNum(prices.half_yearly, defaults.half_yearly),
          yearly: asNum(prices.yearly, defaults.yearly),
        },
      };
    });
    return {
      secondPaise: asNum(row.secondPaise, 117900),
      thirdPaise: asNum(row.thirdPaise, 189900),
      defaults,
      durations: Array.isArray(row.durations) ? row.durations.map(String) : undefined,
      citiesCatalog: catalog,
    };
  },

  setCityAddonPricing: async (pricing: {
    defaults?: Partial<CityAddonPeriodPrices>;
    cities?: Array<{ cityId: string } & Partial<CityAddonPeriodPrices>>;
    secondPaise?: number;
    thirdPaise?: number;
  }): Promise<CityAddonPricing> => {
    const response = await axiosClient.put(
      '/admin/subscriptions/developer/city-addon-pricing',
      pricing,
    );
    return subscriptionsService.getCityAddonPricing().then((fresh) => fresh).catch(() => {
      const row = asRecord(asRecord(response.data)?.data ?? response.data) || {};
      return {
        secondPaise: asNum(row.secondPaise, pricing.secondPaise || 0),
        thirdPaise: asNum(row.thirdPaise, pricing.thirdPaise || 0),
        defaults: {
          monthly: asNum((asRecord(row.defaults) || {}).monthly, 9900),
          quarterly: asNum((asRecord(row.defaults) || {}).quarterly, 24900),
          half_yearly: asNum((asRecord(row.defaults) || {}).half_yearly, 49900),
          yearly: asNum((asRecord(row.defaults) || {}).yearly, 99900),
        },
      };
    });
  },

  updatePlan: async (
    code: string,
    payload: UpdatePlanPayload,
  ): Promise<SubscriptionPlanItem | null> => {
    const response = await axiosClient.patch(
      `/admin/subscriptions/plans/${encodeURIComponent(code)}`,
      payload,
    );
    return normalizePlan(response.data);
  },

  /** Recreate Razorpay yearly plans so amounts include GST. */
  resyncYearlyRazorpayPlans: async (): Promise<SubscriptionPlanItem[]> => {
    const response = await axiosClient.post(
      '/admin/subscriptions/razorpay/resync-yearly-plans',
    );
    return asArray(response.data)
      .map((row) => normalizePlan(row))
      .filter((row): row is SubscriptionPlanItem => !!row)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  getPlanPopupBanner: async (): Promise<{ imageUrl: string | null }> => {
    const response = await axiosClient.get('/admin/settings/plan-popup-banner');
    const data = response.data?.data ?? response.data ?? {};
    const imageUrl =
      typeof data.imageUrl === 'string' && data.imageUrl.trim()
        ? data.imageUrl.trim()
        : null;
    return { imageUrl };
  },

  setPlanPopupBanner: async (
    imageUrl: string | null,
  ): Promise<{ imageUrl: string | null }> => {
    const response = await axiosClient.put('/admin/settings/plan-popup-banner', {
      imageUrl,
    });
    const data = response.data?.data ?? response.data ?? {};
    const next =
      typeof data.imageUrl === 'string' && data.imageUrl.trim()
        ? data.imageUrl.trim()
        : null;
    return { imageUrl: next };
  },

  listAddons: async (): Promise<AddonCatalogItem[]> => {
    const response = await axiosClient.get('/admin/subscriptions/addons');
    return asArray(response.data)
      .map((row) => normalizeAddon(row))
      .filter((row): row is AddonCatalogItem => !!row);
  },

  updateAddon: async (
    type: string,
    payload: UpdateAddonPayload,
  ): Promise<AddonCatalogItem | null> => {
    const response = await axiosClient.patch(
      `/admin/subscriptions/addons/${encodeURIComponent(type)}`,
      payload,
    );
    return normalizeAddon(response.data);
  },

  getUser: async (userId: string): Promise<UserEntitlements | null> => {
    const response = await axiosClient.get(
      `/admin/subscriptions/users/${encodeURIComponent(userId)}`,
    );
    return normalizeUserEntitlements(response.data);
  },

  activateUser: async (
    userId: string,
    payload: { planCode: string; periodDays?: number },
  ) => {
    const response = await axiosClient.post(
      `/admin/subscriptions/users/${encodeURIComponent(userId)}/activate`,
      payload,
    );
    return response.data;
  },

  expireUser: async (userId: string) => {
    const response = await axiosClient.post(
      `/admin/subscriptions/users/${encodeURIComponent(userId)}/expire`,
    );
    return response.data;
  },

  adjustCoins: async (userId: string, payload: { amount: number; note?: string }) => {
    const response = await axiosClient.post(
      `/admin/subscriptions/users/${encodeURIComponent(userId)}/coins`,
      payload,
    );
    return response.data;
  },
};
