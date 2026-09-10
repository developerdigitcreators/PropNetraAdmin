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
};

export type PlanFlags = {
  addonsEnabled: boolean;
  listingPriorityEnabled: boolean;
  listingBoostEnabled: boolean;
  builderContactsEnabled: boolean;
};

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
  flags: PlanFlags;
  limits: PlanLimits | null;
};

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
  isSubscribed: boolean;
  trialEndsAt: string | null;
  trialStartsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
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
  };
  addonCredits: {
    listingContactCredits: number;
    buyReqContactCredits: number;
    builderContactCredits?: number;
  };
  walletBalance: number;
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
  addonsEnabled?: boolean;
  listingPriorityEnabled?: boolean;
  listingBoostEnabled?: boolean;
  builderContactsEnabled?: boolean;
  entitlements?: Partial<PlanLimits>;
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
    flags: normalizeFlags(flagsRaw),
    limits: normalizeLimits(row.limits ?? row.entitlement),
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
    isSubscribed: asBool(row.isSubscribed, false),
    trialEndsAt: pickString(row.trialEndsAt) || null,
    trialStartsAt: pickString(row.trialStartsAt) || null,
    currentPeriodStart: pickString(row.currentPeriodStart) || null,
    currentPeriodEnd: pickString(row.currentPeriodEnd) || null,
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
    },
    addonCredits: {
      listingContactCredits: asNum(credits.listingContactCredits),
      buyReqContactCredits: asNum(credits.buyReqContactCredits),
      builderContactCredits: asNum(credits.builderContactCredits),
    },
    walletBalance: asNum(row.walletBalance),
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
  listPlans: async (): Promise<SubscriptionPlanItem[]> => {
    const response = await axiosClient.get('/admin/subscriptions/plans');
    return asArray(response.data)
      .map((row) => normalizePlan(row))
      .filter((row): row is SubscriptionPlanItem => !!row)
      .sort((a, b) => a.sortOrder - b.sortOrder);
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
