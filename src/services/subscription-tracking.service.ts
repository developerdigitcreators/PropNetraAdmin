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
};

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
  occurredAt: string;
  remarks: TrackingRemark[];
  remarksCount: number;
  remarksAddedBy?: string | null;
  latestRemark?: TrackingRemark | null;
  attemptCount?: number;
  attempts?: ChangePlanAttempt[];
  planCode?: string | null;
  planStartedAt?: string | null;
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
};

export type TabCount = { total: number; new: number };

export type ChangePlanTabCounts = {
  statusGroups: Record<string, TabCount>;
  kinds: Record<string, TabCount>;
};

export type ConvertedTabCounts = {
  statusGroups: Record<string, TabCount>;
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
    targetPlans,
    occurredAt: str(row.occurredAt || row.occurred_at),
    remarks,
    remarksCount: Number(row.remarksCount ?? remarks.length) || remarks.length,
    remarksAddedBy: str(row.remarksAddedBy || row.remarks_added_by) || null,
    latestRemark,
    attemptCount: Number(row.attemptCount ?? attempts.length) || attempts.length,
    attempts,
    planCode: str(row.planCode || row.plan_code) || null,
    planStartedAt: str(row.planStartedAt || row.plan_started_at) || null,
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
    page?: number;
    limit?: number;
  } = {}): Promise<{ items: TrackingUserRow[]; meta: ListMeta }> => {
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
      },
    });
    const data = asRecord(response.data) || {};
    const meta = asRecord(data.meta) || {};
    const items = Array.isArray(data.items)
      ? (data.items.map(normalizeUserRow).filter(Boolean) as TrackingUserRow[])
      : [];
    return {
      items,
      meta: {
        page: Number(meta.page) || page,
        limit: Number(meta.limit) || limit,
        total: Number(meta.total) || items.length,
        totalPages: Number(meta.totalPages) || 1,
      },
    };
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
    statusGroup?: string;
    kind?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ items: ChangePlanRow[]; meta: ListMeta }> => {
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
    const response = await axiosClient.get(
      '/admin/subscription-tracking/change-plan',
      {
        params: {
          page,
          limit,
          ...(params.statusGroup ? { statusGroup: params.statusGroup } : {}),
          ...(params.kind ? { kind: params.kind } : {}),
        },
      },
    );
    const data = asRecord(response.data) || {};
    const meta = asRecord(data.meta) || {};
    const items = Array.isArray(data.items)
      ? (data.items
          .map(normalizeChangePlanRow)
          .filter(Boolean) as ChangePlanRow[])
      : [];
    return {
      items,
      meta: {
        page: Number(meta.page) || page,
        limit: Number(meta.limit) || limit,
        total: Number(meta.total) || items.length,
        totalPages: Number(meta.totalPages) || 1,
      },
    };
  },

  listConverted: async (params: {
    statusGroup?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ items: ChangePlanRow[]; meta: ListMeta }> => {
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
    const response = await axiosClient.get(
      '/admin/subscription-tracking/converted',
      {
        params: {
          page,
          limit,
          ...(params.statusGroup ? { statusGroup: params.statusGroup } : {}),
        },
      },
    );
    const data = asRecord(response.data) || {};
    const meta = asRecord(data.meta) || {};
    const items = Array.isArray(data.items)
      ? (data.items
          .map(normalizeChangePlanRow)
          .filter(Boolean) as ChangePlanRow[])
      : [];
    return {
      items,
      meta: {
        page: Number(meta.page) || page,
        limit: Number(meta.limit) || limit,
        total: Number(meta.total) || items.length,
        totalPages: Number(meta.totalPages) || 1,
      },
    };
  },

  getChangePlanCounts: async (
    statusGroup?: string,
  ): Promise<ChangePlanTabCounts> => {
    const response = await axiosClient.get(
      '/admin/subscription-tracking/change-plan/counts',
      { params: statusGroup ? { statusGroup } : undefined },
    );
    const data = asRecord(response.data) || {};
    const empty = (): TabCount => ({ total: 0, new: 0 });
    const readGroup = (raw: unknown): TabCount => {
      const row = asRecord(raw);
      if (!row) return empty();
      return {
        total: Number(row.total) || 0,
        new: Number(row.new) || 0,
      };
    };
    const statusGroupsRaw = asRecord(data.statusGroups) || {};
    const kindsRaw = asRecord(data.kinds) || {};
    return {
      statusGroups: {
        unverified: readGroup(statusGroupsRaw.unverified),
        network: readGroup(statusGroupsRaw.network),
        pro: readGroup(statusGroupsRaw.pro),
        elite: readGroup(statusGroupsRaw.elite),
      },
      kinds: {
        all: readGroup(kindsRaw.all),
        plan_intent: readGroup(kindsRaw.plan_intent),
        payment_declined: readGroup(kindsRaw.payment_declined),
        autopay_stopped: readGroup(kindsRaw.autopay_stopped),
      },
    };
  },

  getConvertedCounts: async (): Promise<ConvertedTabCounts> => {
    const response = await axiosClient.get(
      '/admin/subscription-tracking/converted/counts',
    );
    const data = asRecord(response.data) || {};
    const empty = (): TabCount => ({ total: 0, new: 0 });
    const readGroup = (raw: unknown): TabCount => {
      const row = asRecord(raw);
      if (!row) return empty();
      return {
        total: Number(row.total) || 0,
        new: Number(row.new) || 0,
      };
    };
    const statusGroupsRaw = asRecord(data.statusGroups) || {};
    return {
      statusGroups: {
        unverified: readGroup(statusGroupsRaw.unverified),
        network: readGroup(statusGroupsRaw.network),
        pro: readGroup(statusGroupsRaw.pro),
        elite: readGroup(statusGroupsRaw.elite),
      },
    };
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
