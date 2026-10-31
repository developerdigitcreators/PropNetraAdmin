import { axiosClient } from '@/lib/axios-client';

export type TrackingRemark = {
  id: string;
  text: string;
  createdById?: string | null;
  createdByName?: string | null;
  createdAt?: string | null;
};

export type TrackingUserRow = {
  userId: string;
  name?: string | null;
  contact?: string | null;
  email?: string | null;
  badge?: string | null;
  subscriptionStatus?: string | null;
  userStatus?: string | null;
  referIdUsed?: string | null;
  withoutReferral?: boolean;
  planCode?: string | null;
  status?: string | null;
  currentPeriodEnd?: string | null;
  planStartedAt?: string | null;
  autopayEnabled: boolean;
  billingState?: string | null;
  lastPaymentFailedAt?: string | null;
  lastPaymentFailureReason?: string | null;
  autopayCancelledAt?: string | null;
  openDeclineCount: number;
  statusGroup?: string | null;
  convertSource?: string | null;
  convertLabel?: string | null;
  currentPlan?: string | null;
  action?: string | null;
  appliedFor?: {
    kind?: string | null;
    label?: string | null;
    paymentMode?: string | null;
    planName?: string | null;
    renewal?: { outcome?: string | null; autopayEnabled?: boolean } | null;
  } | null;
  expiry?: { state?: string | null; expiring?: boolean; expired?: boolean } | null;
  remarksAddedBy?: string | null;
  latestRemark?: TrackingRemark | null;
  callStatus?: string | null;
  callStatusLabel?: string | null;
  callStatusUpdatedAt?: string | null;
  callStatusUpdatedByName?: string | null;
};

export type TrackingPaymentRow = {
  id: string;
  ref?: string;
  userId: string;
  name?: string | null;
  contact?: string | null;
  email?: string | null;
  role?: string | null;
  currentPlan?: string | null;
  planCode?: string | null;
  planStartedAt?: string | null;
  action?: string | null;
  status?: string | null;
  transactionAmount: number;
  source?: string | null;
  overview?: string | null;
  appliedFor?: TrackingUserRow['appliedFor'];
  autopayEnabled?: boolean;
  logType?: string | null;
  createdAt?: string | null;
  occurredAt?: string | null;
  remarks?: TrackingRemark[];
  remarksCount?: number;
  remarksAddedBy?: string | null;
  latestRemark?: TrackingRemark | null;
  attemptCount?: number;
  attempts?: ChangePlanAttempt[];
  callStatus?: string | null;
  callStatusLabel?: string | null;
  callStatusEditable?: boolean;
  callStatusUpdatedAt?: string | null;
  callStatusUpdatedByName?: string | null;
  isNew?: boolean;
};

export type TrackingFilterCounts = {
  roles?: { agent?: number; directBuilder?: number; developer?: number };
  plans?: Record<string, number>;
  appliedFor?: { renewal?: number; plan_change?: number; payment_mode?: number };
  remarkAuthors?: Array<{ id?: string; name?: string; count?: number }>;
  renewal?: OnOffCounts;
  autopay?: OnOffCounts;
  callStatuses?: Array<{ value?: string; label?: string; count?: number }>;
  badges?: { network_partner?: number; pro_partner?: number; elite_partner?: number };
  status?: { subscribed?: number; declined?: number; autopayOn?: number; autopayOff?: number };
  /** `filterTotals` from the same response: the faceted "All" count per dropdown. */
  totals?: TrackingFilterTotals;
};

export type TrackingFilterTotals = Partial<
  Record<
    | 'role'
    | 'plan'
    | 'appliedFor'
    | 'remarksAddedBy'
    | 'callStatus'
    | 'renewal'
    | 'status'
    | 'badge',
    number
  >
>;

export type OnOffCounts = { all?: number; on?: number; off?: number };

function parseFilterCounts(inner: Record<string, unknown>): TrackingFilterCounts | undefined {
  const counts = asRecord(inner.filterCounts);
  const totals = asRecord(inner.filterTotals);
  if (!counts && !totals) return undefined;
  return {
    ...((counts || {}) as TrackingFilterCounts),
    ...(totals ? { totals: totals as TrackingFilterTotals } : {}),
  };
}

export type TrackingHistoryItem = {
  id: string;
  kind: string;
  title: string;
  detail?: string | null;
  amountPaise?: number | null;
  status?: string | null;
  occurredAt: string;
  remarks: TrackingRemark[];
  meta?: Record<string, unknown> | null;
};

export type TrackingHistoryResult = {
  user: {
    id: string;
    name?: string | null;
    contact?: string | null;
    email?: string | null;
    badge?: string | null;
    subscriptionStatus?: string | null;
  };
  subscription: {
    planCode?: string | null;
    status?: string | null;
    currentPeriodEnd?: string | null;
    autopayEnabled?: boolean;
    billingState?: string | null;
    autopayCancelledAt?: string | null;
    lastPaymentFailedAt?: string | null;
    lastPaymentFailureReason?: string | null;
  } | null;
  items: TrackingHistoryItem[];
};

export type ChangePlanAttempt = {
  kind: string;
  occurredAt: string;
  detail?: string | null;
  meta?: {
    razorpay?: {
      paymentId?: string | null;
      orderId?: string | null;
      status?: string | null;
      methodDetail?: string | null;
      errorCode?: string | null;
      errorDescription?: string | null;
      errorSource?: string | null;
      errorStep?: string | null;
      errorReason?: string | null;
      description?: string | null;
      summary?: string | null;
      amountPaise?: number | null;
    } | null;
    planCode?: string | null;
    [key: string]: unknown;
  } | null;
};

export type ChangePlanRow = {
  ref: string;
  userId: string;
  kinds: string[];
  name?: string | null;
  contact?: string | null;
  email?: string | null;
  badge?: string | null;
  statusGroup: string;
  targetPlans: string[];
  latestTargetPlan?: string | null;
  occurredAt: string;
  remarks: TrackingRemark[];
  remarksCount: number;
  remarksAddedBy?: string | null;
  latestRemark?: TrackingRemark | null;
  attemptCount?: number;
  attempts?: ChangePlanAttempt[];
  planCode?: string | null;
  planStartedAt?: string | null;
  currentPeriodEnd?: string | null;
  billingState?: string | null;
  autopayEnabled: boolean;
  convertSource?: string | null;
  convertedByName?: string | null;
  convertedAt?: string | null;
  convertLabel?: string | null;
  callStatus?: string | null;
  callStatusLabel?: string | null;
  callStatusEditable?: boolean;
  callStatusUpdatedAt?: string | null;
  callStatusUpdatedByUserId?: string | null;
  callStatusUpdatedByName?: string | null;
  isNew?: boolean;
  currentPlan?: string | null;
  action?: string | null;
  appliedFor?: TrackingUserRow['appliedFor'];
  transactionAmount?: number | null;
  role?: string | null;
};

export type TabCount = { total: number; new: number };

export type TrackingFilterOptions = {
  plans: Array<{ code: string; label: string; count: number }>;
  autopay: { on: number; off: number };
};

export type ListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function parseAppliedFor(raw: unknown): TrackingUserRow['appliedFor'] {
  const af = asRecord(raw);
  if (!af) return null;
  const renewal = asRecord(af.renewal);
  return {
    kind: str(af.kind) || null,
    label: str(af.label) || null,
    paymentMode: str(af.paymentMode) || null,
    planName: str(af.planName) || null,
    renewal: renewal
      ? {
          outcome: str(renewal.outcome) || null,
          autopayEnabled: Boolean(renewal.autopayEnabled),
        }
      : null,
  };
}

function normalizeRemark(raw: unknown): TrackingRemark | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = str(row.id);
  const text = str(row.text).trim();
  if (!id || !text) return null;
  return {
    id,
    text,
    createdById: str(row.createdById || row.created_by_id) || null,
    createdByName: str(row.createdByName || row.created_by_name) || null,
    createdAt: str(row.createdAt || row.created_at) || null,
  };
}

export function subscriptionTrackingApiError(err: unknown, fallback: string) {
  const ax = err as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const msg = ax?.response?.data?.message;
  if (Array.isArray(msg) && msg[0]) return String(msg[0]);
  if (typeof msg === 'string' && msg.trim()) return msg;
  if (typeof ax?.message === 'string' && ax.message.trim()) return ax.message;
  return fallback;
}

function normalizeUserRow(raw: unknown): TrackingUserRow | null {
  const row = asRecord(raw);
  if (!row) return null;
  const userId = str(row.userId || row.user_id);
  if (!userId) return null;
  return {
    userId,
    name: str(row.name) || null,
    contact: str(row.contact) || null,
    email: str(row.email) || null,
    badge: str(row.badge) || null,
    subscriptionStatus: str(row.subscriptionStatus || row.subscription_status) || null,
    userStatus: str(row.userStatus || row.user_status) || null,
    referIdUsed: str(row.referIdUsed || row.refer_id_used) || null,
    withoutReferral: Boolean(
      row.withoutReferral ??
        row.without_referral ??
        !(row.referIdUsed || row.refer_id_used),
    ),
    planCode: str(row.planCode || row.plan_code) || null,
    status: str(row.status) || null,
    currentPeriodEnd: str(row.currentPeriodEnd || row.current_period_end) || null,
    planStartedAt: str(row.planStartedAt || row.plan_started_at) || null,
    autopayEnabled: Boolean(row.autopayEnabled ?? row.autopay_enabled),
    billingState: str(row.billingState || row.billing_state) || null,
    lastPaymentFailedAt:
      str(row.lastPaymentFailedAt || row.last_payment_failed_at) || null,
    lastPaymentFailureReason:
      str(row.lastPaymentFailureReason || row.last_payment_failure_reason) || null,
    autopayCancelledAt:
      str(row.autopayCancelledAt || row.autopay_cancelled_at) || null,
    openDeclineCount: Number(row.openDeclineCount ?? row.open_decline_count) || 0,
    statusGroup: str(row.statusGroup || row.status_group) || null,
    convertSource: str(row.convertSource || row.convert_source) || null,
    convertLabel: str(row.convertLabel || row.convert_label) || null,
    currentPlan: str(row.currentPlan || row.planCode || row.plan_code) || null,
    action: str(row.action) || null,
    appliedFor: parseAppliedFor(row.appliedFor),
    expiry: (() => {
      const ex = asRecord(row.expiry);
      if (!ex) return null;
      return {
        state: str(ex.state) || null,
        expiring: Boolean(ex.expiring),
        expired: Boolean(ex.expired),
      };
    })(),
    remarksAddedBy: str(row.remarksAddedBy || row.remarks_added_by) || null,
    latestRemark: (() => {
      const lr = asRecord(row.latestRemark ?? row.latest_remark);
      return lr ? normalizeRemark({ id: lr.id || `latest-${userId}`, ...lr }) : null;
    })(),
    callStatus: str(row.callStatus || row.call_status) || null,
    callStatusLabel: str(row.callStatusLabel || row.call_status_label) || null,
    callStatusUpdatedAt:
      str(row.callStatusUpdatedAt || row.call_status_updated_at) || null,
    callStatusUpdatedByName:
      str(row.callStatusUpdatedByName || row.call_status_updated_by_name) || null,
  };
}

function normalizeChangePlanRow(raw: unknown): ChangePlanRow | null {
  const row = asRecord(raw);
  if (!row) return null;
  const ref = str(row.ref);
  const userId = str(row.userId || row.user_id);
  if (!ref || !userId) return null;
  const remarks = Array.isArray(row.remarks)
    ? (row.remarks.map(normalizeRemark).filter(Boolean) as TrackingRemark[])
    : [];
  const targetPlans = Array.isArray(row.targetPlans)
    ? row.targetPlans.map((p) => str(p)).filter(Boolean)
    : Array.isArray(row.target_plans)
      ? (row.target_plans as unknown[]).map((p) => str(p)).filter(Boolean)
      : [];
  const attempts = Array.isArray(row.attempts)
    ? row.attempts
        .map((raw) => {
          const a = asRecord(raw);
          if (!a) return null;
          return {
            kind: str(a.kind),
            occurredAt: str(a.occurredAt || a.occurred_at),
            detail: str(a.detail) || null,
            meta: asRecord(a.meta),
          } satisfies ChangePlanAttempt;
        })
        .filter(Boolean) as ChangePlanAttempt[]
    : [];
  const latestTargetPlan =
    str(row.latestTargetPlan || row.latest_target_plan) ||
    (targetPlans.length ? targetPlans[targetPlans.length - 1] : null);
  const latestRemark =
    normalizeRemark(row.latestRemark || row.latest_remark) ||
    (remarks.length ? remarks[remarks.length - 1] : null);
  return {
    ref,
    userId,
    kinds: Array.isArray(row.kinds) ? row.kinds.map((k) => str(k)) : [],
    name: str(row.name) || null,
    contact: str(row.contact) || null,
    email: str(row.email) || null,
    badge: str(row.badge) || null,
    statusGroup: str(row.statusGroup || row.status_group) || 'unverified',
    targetPlans: latestTargetPlan ? [latestTargetPlan] : [],
    latestTargetPlan,
    occurredAt: str(row.occurredAt || row.occurred_at),
    remarks,
    remarksCount: Number(row.remarksCount ?? remarks.length) || remarks.length,
    remarksAddedBy: str(row.remarksAddedBy || row.remarks_added_by) || null,
    latestRemark,
    attemptCount: Number(row.attemptCount ?? attempts.length) || attempts.length,
    attempts,
    planCode: str(row.planCode || row.plan_code) || null,
    planStartedAt: str(row.planStartedAt || row.plan_started_at) || null,
    currentPeriodEnd:
      str(row.currentPeriodEnd || row.current_period_end) || null,
    billingState: str(row.billingState || row.billing_state) || null,
    autopayEnabled: Boolean(row.autopayEnabled ?? row.autopay_enabled),
    convertSource: str(row.convertSource || row.convert_source) || null,
    convertedByName: str(row.convertedByName || row.converted_by_name) || null,
    convertedAt: str(row.convertedAt || row.converted_at) || null,
    convertLabel: str(row.convertLabel || row.convert_label) || null,
    callStatus: str(row.callStatus || row.call_status) || 'not_contacted',
    callStatusLabel:
      str(row.callStatusLabel || row.call_status_label) || 'Not Contacted',
    callStatusEditable: Boolean(
      row.callStatusEditable ?? row.call_status_editable ?? remarks.length > 0,
    ),
    callStatusUpdatedAt:
      str(row.callStatusUpdatedAt || row.call_status_updated_at) || null,
    callStatusUpdatedByUserId:
      str(
        row.callStatusUpdatedByUserId || row.call_status_updated_by_user_id,
      ) || null,
    callStatusUpdatedByName:
      str(
        row.callStatusUpdatedByName || row.call_status_updated_by_name,
      ) || null,
    isNew: Boolean(row.isNew ?? row.is_new),
    currentPlan: str(row.currentPlan || row.current_plan) || null,
    action: str(row.action) || null,
    appliedFor: parseAppliedFor(row.appliedFor),
    transactionAmount:
      row.transactionAmount == null ? null : Number(row.transactionAmount),
    role: str(row.role) || null,
  };
}

function normalizeFilterOptions(raw: unknown): TrackingFilterOptions {
  const data = asRecord(raw) || {};
  const autopay = asRecord(data.autopay) || {};
  const plans = Array.isArray(data.plans)
    ? data.plans
        .map((p) => {
          const row = asRecord(p);
          if (!row) return null;
          const code = str(row.code);
          if (!code) return null;
          return {
            code,
            label: str(row.label) || code.replace(/_/g, ' '),
            count: Number(row.count) || 0,
          };
        })
        .filter(Boolean) as TrackingFilterOptions['plans']
    : [];
  return {
    plans,
    autopay: {
      on: Number(autopay.on) || 0,
      off: Number(autopay.off) || 0,
    },
  };
}

type TxnDateParams = {
  txnFrom?: string;
  txnTo?: string;
  startsFrom?: string;
  startsTo?: string;
  endsFrom?: string;
  endsTo?: string;
};

type RenewalDateParams = {
  startsFrom?: string;
  startsTo?: string;
  endsFrom?: string;
  endsTo?: string;
};

const DATE_PARAM_KEYS = [
  'txnFrom',
  'txnTo',
  'startsFrom',
  'startsTo',
  'endsFrom',
  'endsTo',
] as const;

function dateRangeParams(
  params: Partial<Record<(typeof DATE_PARAM_KEYS)[number], string>>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of DATE_PARAM_KEYS) {
    const value = params[key];
    if (value) out[key] = value;
  }
  return out;
}

function normalizeTabCount(raw: unknown): TabCount {
  const row = asRecord(raw);
  if (!row) return { total: 0, new: 0 };
  return {
    total: Number(row.total) || 0,
    new: Number(row.new) || 0,
  };
}

export const subscriptionTrackingService = {
  listUsers: async (params: {
    startsFrom?: string;
    startsTo?: string;
    endsFrom?: string;
    endsTo?: string;
    billingState?: string;
    subscribedOnly?: boolean;
    declinedOnly?: boolean;
    autopayEnabled?: boolean;
    planCode?: string;
    q?: string;
    role?: string;
    appliedFor?: string;
    remarksAddedBy?: string;
    callStatus?: string;
    badge?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ items: TrackingUserRow[]; meta: ListMeta; filterCounts?: TrackingFilterCounts }> => {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const response = await axiosClient.get('/admin/subscription-tracking/users', {
      params: {
        page,
        limit,
        ...(params.startsFrom ? { startsFrom: params.startsFrom } : {}),
        ...(params.startsTo ? { startsTo: params.startsTo } : {}),
        ...(params.endsFrom ? { endsFrom: params.endsFrom } : {}),
        ...(params.endsTo ? { endsTo: params.endsTo } : {}),
        ...(params.billingState ? { billingState: params.billingState } : {}),
        ...(params.subscribedOnly ? { subscribedOnly: 'true' } : {}),
        ...(params.declinedOnly ? { declinedOnly: 'true' } : {}),
        ...(params.autopayEnabled === true ? { autopayEnabled: 'true' } : {}),
        ...(params.autopayEnabled === false ? { autopayEnabled: 'false' } : {}),
        ...(params.planCode ? { planCode: params.planCode } : {}),
        ...(params.q ? { q: params.q } : {}),
        ...(params.role ? { role: params.role } : {}),
        ...(params.appliedFor ? { appliedFor: params.appliedFor } : {}),
        ...(params.remarksAddedBy ? { remarksAddedBy: params.remarksAddedBy } : {}),
        ...(params.callStatus ? { callStatus: params.callStatus } : {}),
        ...(params.badge ? { badge: params.badge } : {}),
      },
    });
    const data = asRecord(response.data) || {};
    const inner = asRecord(data.data) || data;
    const meta = asRecord(inner.meta) || {};
    const items = Array.isArray(inner.items)
      ? (inner.items.map(normalizeUserRow).filter(Boolean) as TrackingUserRow[])
      : [];
    return {
      items,
      meta: {
        page: Number(meta.page) || page,
        limit: Number(meta.limit) || limit,
        total: Number(meta.total) || items.length,
        totalPages: Number(meta.totalPages) || 1,
      },
      filterCounts: parseFilterCounts(inner),
    };
  },

  listPayments: async (params: {
    status?: string;
    source?: string;
    overview?: string;
    kind?: string;
    role?: string;
    planCode?: string;
    appliedFor?: string;
    q?: string;
    page?: number;
    limit?: number;
  } & TxnDateParams = {}): Promise<{
    items: TrackingPaymentRow[];
    headings?: { addon?: string; sources?: string[] };
    overviewCounts?: Record<string, number>;
    filterCounts?: TrackingFilterCounts;
    meta: ListMeta;
  }> => {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const response = await axiosClient.get('/admin/subscription-tracking/payments', {
      params: {
        page,
        limit,
        status: params.status || "success",
        ...(params.source ? { source: params.source } : {}),
        ...(params.kind ? { kind: params.kind } : {}),
        ...(params.role ? { role: params.role } : {}),
        ...(params.planCode ? { planCode: params.planCode } : {}),
        ...(params.appliedFor ? { appliedFor: params.appliedFor } : {}),
        ...(params.q ? { q: params.q } : {}),
        ...dateRangeParams(params),
      },
    });
    const data = asRecord(response.data) || {};
    const inner = asRecord(data.data) || data;
    const meta = asRecord(inner.meta) || {};
    const headings = asRecord(inner.headings);
    const items = Array.isArray(inner.items)
      ? inner.items.map((raw) => {
          const row = asRecord(raw);
          if (!row) return null;
          const remarks = Array.isArray(row.remarks)
            ? (row.remarks.map(normalizeRemark).filter(Boolean) as TrackingRemark[])
            : [];
          const attempts = Array.isArray(row.attempts)
            ? row.attempts
                .map((raw) => {
                  const a = asRecord(raw);
                  if (!a) return null;
                  return {
                    kind: str(a.kind),
                    occurredAt: str(a.occurredAt || a.occurred_at),
                    detail: str(a.detail) || null,
                    meta: asRecord(a.meta),
                  } satisfies ChangePlanAttempt;
                })
                .filter(Boolean) as ChangePlanAttempt[]
            : [];
          const latestRemark =
            normalizeRemark(row.latestRemark || row.latest_remark) ||
            (remarks.length ? remarks[remarks.length - 1] : null);
          return {
            id: str(row.id),
            ref: str(row.ref) || `order:${str(row.id)}`,
            userId: str(row.userId),
            name: str(row.name) || null,
            contact: str(row.contact) || null,
            email: str(row.email) || null,
            role: str(row.role) || null,
            currentPlan: str(row.currentPlan) || null,
            planCode: str(row.planCode || row.plan_code) || null,
            planStartedAt: str(row.planStartedAt || row.plan_started_at) || null,
            currentPeriodEnd:
              str(row.currentPeriodEnd || row.current_period_end) || null,
            action: str(row.action) || null,
            status: str(row.status) || null,
            transactionAmount: Number(row.transactionAmount) || 0,
            source: str(row.source) || null,
            overview: str(row.overview) || null,
            appliedFor: parseAppliedFor(row.appliedFor),
            autopayEnabled: Boolean(row.autopayEnabled),
            logType: str(row.logType) || null,
            createdAt: str(row.createdAt || row.occurredAt) || null,
            occurredAt: str(row.occurredAt || row.createdAt) || null,
            remarks,
            remarksCount: Number(row.remarksCount ?? remarks.length) || remarks.length,
            remarksAddedBy: str(row.remarksAddedBy || row.remarks_added_by) || null,
            latestRemark,
            attemptCount: Number(row.attemptCount ?? attempts.length) || attempts.length,
            attempts,
            callStatus: str(row.callStatus || row.call_status) || 'not_contacted',
            callStatusLabel:
              str(row.callStatusLabel || row.call_status_label) || 'Not Contacted',
            callStatusEditable: Boolean(
              row.callStatusEditable ?? row.call_status_editable ?? remarks.length > 0,
            ),
            callStatusUpdatedAt:
              str(row.callStatusUpdatedAt || row.call_status_updated_at) || null,
            callStatusUpdatedByName:
              str(row.callStatusUpdatedByName || row.call_status_updated_by_name) || null,
            isNew: Boolean(row.isNew ?? row.is_new),
          } satisfies TrackingPaymentRow;
        }).filter(Boolean) as TrackingPaymentRow[]
      : [];
    return {
      items,
      headings: headings
        ? {
            addon: str(headings.addon) || 'Direct Builder Flock',
            sources: Array.isArray(headings.sources)
              ? headings.sources.map((s) => str(s))
              : ['all', 'direct', 'netra_coin', 'both'],
          }
        : undefined,
      overviewCounts: asRecord(inner.overviewCounts) as Record<string, number> | undefined,
      filterCounts: parseFilterCounts(inner),
      meta: {
        page: Number(meta.page) || page,
        limit: Number(meta.limit) || limit,
        total: Number(meta.total) || items.length,
        totalPages: Number(meta.totalPages) || 1,
      },
    };
  },

  getUsersFilterOptions: async (params: {
    startsFrom?: string;
    startsTo?: string;
    endsFrom?: string;
    endsTo?: string;
    billingState?: string;
    subscribedOnly?: boolean;
    declinedOnly?: boolean;
    autopayEnabled?: boolean;
    planCode?: string;
    q?: string;
  } = {}): Promise<TrackingFilterOptions> => {
    const response = await axiosClient.get(
      '/admin/subscription-tracking/users/filter-options',
      {
        params: {
          ...(params.startsFrom ? { startsFrom: params.startsFrom } : {}),
          ...(params.startsTo ? { startsTo: params.startsTo } : {}),
          ...(params.endsFrom ? { endsFrom: params.endsFrom } : {}),
          ...(params.endsTo ? { endsTo: params.endsTo } : {}),
          ...(params.billingState ? { billingState: params.billingState } : {}),
          ...(params.subscribedOnly ? { subscribedOnly: 'true' } : {}),
          ...(params.declinedOnly ? { declinedOnly: 'true' } : {}),
          ...(params.autopayEnabled === true ? { autopayEnabled: 'true' } : {}),
          ...(params.autopayEnabled === false
            ? { autopayEnabled: 'false' }
            : {}),
          ...(params.planCode ? { planCode: params.planCode } : {}),
          ...(params.q ? { q: params.q } : {}),
        },
      },
    );
    return normalizeFilterOptions(response.data);
  },

  listUpcomingRenewals: async (params: {
    autopayEnabled?: boolean;
    planCode?: string;
    q?: string;
    role?: string;
    page?: number;
    limit?: number;
  } & RenewalDateParams = {}): Promise<{ items: ChangePlanRow[]; meta: ListMeta; filterCounts?: TrackingFilterCounts }> => {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const response = await axiosClient.get(
      '/admin/subscription-tracking/upcoming-renewals',
      {
        params: {
          page,
          limit,
          ...(params.autopayEnabled === true ? { autopayEnabled: 'true' } : {}),
          ...(params.autopayEnabled === false
            ? { autopayEnabled: 'false' }
            : {}),
          ...(params.planCode ? { planCode: params.planCode } : {}),
          ...(params.q ? { q: params.q } : {}),
          ...(params.role ? { role: params.role } : {}),
          ...dateRangeParams(params),
        },
      },
    );
    const data = asRecord(response.data) || {};
    const inner = asRecord(data.data) || data;
    const meta = asRecord(inner.meta) || asRecord(data.meta) || {};
    const items = Array.isArray(inner.items)
      ? (inner.items
          .map(normalizeChangePlanRow)
          .filter(Boolean) as ChangePlanRow[])
      : Array.isArray(data.items)
        ? (data.items
            .map(normalizeChangePlanRow)
            .filter(Boolean) as ChangePlanRow[])
        : [];
    return {
      items,
      filterCounts: asRecord(inner.filterCounts || data.filterCounts) as
        | TrackingFilterCounts
        | undefined,
      meta: {
        page: Number(meta.page) || page,
        limit: Number(meta.limit) || limit,
        total: Number(meta.total) || items.length,
        totalPages: Number(meta.totalPages) || 1,
      },
    };
  },

  getUpcomingRenewalsCounts: async (params: {
    autopayEnabled?: boolean;
    planCode?: string;
    q?: string;
  } & RenewalDateParams = {}): Promise<{ total: number }> => {
    const response = await axiosClient.get(
      '/admin/subscription-tracking/upcoming-renewals/counts',
      {
        params: {
          ...(params.autopayEnabled === true ? { autopayEnabled: 'true' } : {}),
          ...(params.autopayEnabled === false
            ? { autopayEnabled: 'false' }
            : {}),
          ...(params.planCode ? { planCode: params.planCode } : {}),
          ...(params.q ? { q: params.q } : {}),
          ...dateRangeParams(params),
        },
      },
    );
    const data = asRecord(response.data) || {};
    return { total: Number(data.total) || 0 };
  },

  getUpcomingRenewalsFilterOptions: async (params: {
    autopayEnabled?: boolean;
    planCode?: string;
    q?: string;
  } & RenewalDateParams = {}): Promise<TrackingFilterOptions> => {
    const response = await axiosClient.get(
      '/admin/subscription-tracking/upcoming-renewals/filter-options',
      {
        params: {
          ...(params.autopayEnabled === true ? { autopayEnabled: 'true' } : {}),
          ...(params.autopayEnabled === false
            ? { autopayEnabled: 'false' }
            : {}),
          ...(params.planCode ? { planCode: params.planCode } : {}),
          ...(params.q ? { q: params.q } : {}),
          ...dateRangeParams(params),
        },
      },
    );
    return normalizeFilterOptions(response.data);
  },

  getHistory: async (userId: string): Promise<TrackingHistoryResult> => {
    const response = await axiosClient.get(
      `/admin/subscription-tracking/users/${userId}/history`,
    );
    const data = asRecord(response.data) || {};
    const user = asRecord(data.user) || {};
    const sub = asRecord(data.subscription);
    const items = Array.isArray(data.items)
      ? data.items
          .map((raw) => {
            const row = asRecord(raw);
            if (!row) return null;
            const id = str(row.id);
            if (!id) return null;
            const remarks = Array.isArray(row.remarks)
              ? (row.remarks.map(normalizeRemark).filter(Boolean) as TrackingRemark[])
              : [];
            return {
              id,
              kind: str(row.kind),
              title: str(row.title),
              detail: str(row.detail) || null,
              amountPaise:
                row.amountPaise == null && row.amount_paise == null
                  ? null
                  : Number(row.amountPaise ?? row.amount_paise),
              status: str(row.status) || null,
              occurredAt: str(row.occurredAt || row.occurred_at),
              remarks,
              meta: asRecord(row.meta),
            } satisfies TrackingHistoryItem;
          })
          .filter(Boolean) as TrackingHistoryItem[]
      : [];
    return {
      user: {
        id: str(user.id),
        name: str(user.name) || null,
        contact: str(user.contact) || null,
        email: str(user.email) || null,
        badge: str(user.badge) || null,
        subscriptionStatus:
          str(user.subscriptionStatus || user.subscription_status) || null,
      },
      subscription: sub
        ? {
            planCode: str(sub.planCode || sub.plan_code) || null,
            status: str(sub.status) || null,
            currentPeriodEnd:
              str(sub.currentPeriodEnd || sub.current_period_end) || null,
            autopayEnabled: Boolean(sub.autopayEnabled ?? sub.autopay_enabled),
            billingState: str(sub.billingState || sub.billing_state) || null,
            autopayCancelledAt:
              str(sub.autopayCancelledAt || sub.autopay_cancelled_at) || null,
            lastPaymentFailedAt:
              str(sub.lastPaymentFailedAt || sub.last_payment_failed_at) || null,
            lastPaymentFailureReason:
              str(
                sub.lastPaymentFailureReason || sub.last_payment_failure_reason,
              ) || null,
          }
        : null,
      items,
    };
  },

  listChangePlan: async (params: {
    planCode?: string;
    q?: string;
    role?: string;
    appliedFor?: string;
    remarksAddedBy?: string;
    callStatus?: string;
    renewal?: boolean;
    page?: number;
    limit?: number;
  } & TxnDateParams = {}): Promise<{ items: ChangePlanRow[]; meta: ListMeta; filterCounts?: TrackingFilterCounts }> => {
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
    const response = await axiosClient.get(
      '/admin/subscription-tracking/change-plan',
      {
        params: {
          page,
          limit,
          ...(params.planCode ? { planCode: params.planCode } : {}),
          ...(params.q ? { q: params.q } : {}),
          ...(params.role ? { role: params.role } : {}),
          ...(params.appliedFor ? { appliedFor: params.appliedFor } : {}),
          ...(params.remarksAddedBy ? { remarksAddedBy: params.remarksAddedBy } : {}),
          ...(params.callStatus ? { callStatus: params.callStatus } : {}),
          ...(params.renewal === true ? { renewal: 'true' } : {}),
          ...(params.renewal === false ? { renewal: 'false' } : {}),
          ...dateRangeParams(params),
        },
      },
    );
    const data = asRecord(response.data) || {};
    const inner = asRecord(data.data) || data;
    const meta = asRecord(inner.meta) || asRecord(data.meta) || {};
    const items = Array.isArray(inner.items)
      ? (inner.items
          .map(normalizeChangePlanRow)
          .filter(Boolean) as ChangePlanRow[])
      : [];
    return {
      items,
      filterCounts: parseFilterCounts(inner),
      meta: {
        page: Number(meta.page) || page,
        limit: Number(meta.limit) || limit,
        total: Number(meta.total) || items.length,
        totalPages: Number(meta.totalPages) || 1,
      },
    };
  },

  listConverted: async (params: {
    planCode?: string;
    q?: string;
    role?: string;
    appliedFor?: string;
    remarksAddedBy?: string;
    callStatus?: string;
    page?: number;
    limit?: number;
  } & TxnDateParams = {}): Promise<{ items: ChangePlanRow[]; meta: ListMeta; filterCounts?: TrackingFilterCounts }> => {
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
    const response = await axiosClient.get(
      '/admin/subscription-tracking/converted',
      {
        params: {
          page,
          limit,
          ...(params.planCode ? { planCode: params.planCode } : {}),
          ...(params.q ? { q: params.q } : {}),
          ...(params.role ? { role: params.role } : {}),
          ...(params.appliedFor ? { appliedFor: params.appliedFor } : {}),
          ...(params.remarksAddedBy ? { remarksAddedBy: params.remarksAddedBy } : {}),
          ...(params.callStatus ? { callStatus: params.callStatus } : {}),
          ...dateRangeParams(params),
        },
      },
    );
    const data = asRecord(response.data) || {};
    const inner = asRecord(data.data) || data;
    const meta = asRecord(inner.meta) || asRecord(data.meta) || {};
    const items = Array.isArray(inner.items)
      ? (inner.items
          .map(normalizeChangePlanRow)
          .filter(Boolean) as ChangePlanRow[])
      : [];
    return {
      items,
      filterCounts: parseFilterCounts(inner),
      meta: {
        page: Number(meta.page) || page,
        limit: Number(meta.limit) || limit,
        total: Number(meta.total) || items.length,
        totalPages: Number(meta.totalPages) || 1,
      },
    };
  },

  getChangePlanCounts: async (): Promise<TabCount> => {
    const response = await axiosClient.get(
      '/admin/subscription-tracking/change-plan/counts',
    );
    return normalizeTabCount(response.data);
  },

  getSuccessPaymentsCounts: async (): Promise<TabCount> => {
    const response = await axiosClient.get(
      '/admin/subscription-tracking/payments/counts',
    );
    return normalizeTabCount(response.data);
  },

  getConvertedCounts: async (): Promise<TabCount> => {
    const response = await axiosClient.get(
      '/admin/subscription-tracking/converted/counts',
    );
    return normalizeTabCount(response.data);
  },

  getChangePlanFilterOptions: async (params: {
    planCode?: string;
    q?: string;
  } & TxnDateParams = {}): Promise<TrackingFilterOptions> => {
    const response = await axiosClient.get(
      '/admin/subscription-tracking/change-plan/filter-options',
      {
        params: {
          ...(params.planCode ? { planCode: params.planCode } : {}),
          ...(params.q ? { q: params.q } : {}),
          ...dateRangeParams(params),
        },
      },
    );
    return normalizeFilterOptions(response.data);
  },

  getConvertedFilterOptions: async (params: {
    planCode?: string;
    q?: string;
  } & TxnDateParams = {}): Promise<TrackingFilterOptions> => {
    const response = await axiosClient.get(
      '/admin/subscription-tracking/converted/filter-options',
      {
        params: {
          ...(params.planCode ? { planCode: params.planCode } : {}),
          ...(params.q ? { q: params.q } : {}),
          ...dateRangeParams(params),
        },
      },
    );
    return normalizeFilterOptions(response.data);
  },

  addChangePlanRemark: async (
    ref: string,
    text: string,
  ): Promise<{
    ref: string;
    remarks: TrackingRemark[];
    remarksCount: number;
    remarksAddedBy?: string | null;
    callStatus?: string | null;
    callStatusLabel?: string | null;
    callStatusEditable?: boolean;
    callStatusUpdatedAt?: string | null;
    callStatusUpdatedByName?: string | null;
  }> => {
    const response = await axiosClient.post(
      `/admin/subscription-tracking/change-plan/remarks`,
      { ref, text },
    );
    const data = asRecord(response.data) || {};
    const remarks = Array.isArray(data.remarks)
      ? (data.remarks.map(normalizeRemark).filter(Boolean) as TrackingRemark[])
      : [];
    return {
      ref: str(data.ref) || ref,
      remarks,
      remarksCount: Number(data.remarksCount ?? remarks.length) || remarks.length,
      remarksAddedBy: str(data.remarksAddedBy || data.remarks_added_by) || null,
      callStatus: str(data.callStatus || data.call_status) || null,
      callStatusLabel:
        str(data.callStatusLabel || data.call_status_label) || null,
      callStatusEditable: Boolean(
        data.callStatusEditable ?? data.call_status_editable ?? remarks.length > 0,
      ),
      callStatusUpdatedAt:
        str(data.callStatusUpdatedAt || data.call_status_updated_at) || null,
      callStatusUpdatedByName:
        str(
          data.callStatusUpdatedByName || data.call_status_updated_by_name,
        ) || null,
    };
  },

  updateChangePlanCallStatus: async (
    ref: string,
    callStatus: string,
  ): Promise<{
    ref: string;
    callStatus: string;
    callStatusLabel: string;
    callStatusEditable: boolean;
    callStatusUpdatedAt?: string | null;
    callStatusUpdatedByName?: string | null;
    remarks: TrackingRemark[];
  }> => {
    const response = await axiosClient.post(
      `/admin/subscription-tracking/change-plan/call-status`,
      { ref, callStatus },
    );
    const data = asRecord(response.data) || {};
    const remarks = Array.isArray(data.remarks)
      ? (data.remarks.map(normalizeRemark).filter(Boolean) as TrackingRemark[])
      : [];
    return {
      ref: str(data.ref) || ref,
      callStatus: str(data.callStatus || data.call_status) || callStatus,
      callStatusLabel:
        str(data.callStatusLabel || data.call_status_label) || callStatus,
      callStatusEditable: Boolean(
        data.callStatusEditable ?? data.call_status_editable ?? true,
      ),
      callStatusUpdatedAt:
        str(data.callStatusUpdatedAt || data.call_status_updated_at) || null,
      callStatusUpdatedByName:
        str(
          data.callStatusUpdatedByName || data.call_status_updated_by_name,
        ) || null,
      remarks,
    };
  },
};
