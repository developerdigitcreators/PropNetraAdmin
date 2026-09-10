'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { Badge } from '@/components/ui/badge';
import {
  subscriptionApiError,
  subscriptionsService,
  type UserEntitlements,
} from '@/services/subscriptions.service';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

type SubscriptionTabProps = {
  userId: string | null;
};

type HistoryItem = {
  id: string;
  kind: string;
  title: string;
  detail?: string | null;
  amountPaise?: number | null;
  status?: string | null;
  occurredAt: string;
  meta?: {
    upgradeAdjustment?: {
      breakdown?: Array<{ label: string; value: string }>;
      creditPaise?: number;
      payablePaise?: number;
      daysRemaining?: number;
      totalDays?: number;
      currentPlanCode?: string;
      targetPlanCode?: string;
    } | null;
    renewalPricePaise?: number | null;
    introApplied?: boolean;
    failureReason?: string | null;
    razorpayPaymentId?: string | null;
    razorpayOrderId?: string | null;
    autopay?: boolean;
    paymentCharged?: boolean;
    note?: string | null;
    previousAutopay?: {
      planCode?: string | null;
      razorpaySubscriptionId?: string | null;
      renewalPricePaise?: number | null;
    } | null;
    newAutopay?: {
      planCode?: string | null;
      razorpaySubscriptionId?: string | null;
      renewalPricePaise?: number | null;
    } | null;
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
      bank?: string | null;
      amountPaise?: number | null;
    } | null;
  } | null;
};

type CreditLot = {
  id: string;
  kind: string;
  amountRemaining: number;
  amountGranted: number;
  grantedAt: string;
  expiresAt: string;
  source: string;
  walletCoinsSpent?: number | null;
  active?: boolean;
};

type ProfilePayload = UserEntitlements & {
  history?: HistoryItem[];
  paymentHistory?: HistoryItem[];
  creditLots?: CreditLot[];
  billingState?: string | null;
  autopayEnabled?: boolean;
};

export function SubscriptionTab({ userId }: SubscriptionTabProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canRead = hasPermission('subscriptions', 'read');

  const [data, setData] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [section, setSection] = useState<
    'overview' | 'payments' | 'credits'
  >('overview');

  const load = useCallback(async () => {
    if (!userId || !canRead) {
      setData(null);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const next = (await subscriptionsService.getUser(userId)) as ProfilePayload | null;
      setData(next);
    } catch (err) {
      setData(null);
      setError(subscriptionApiError(err, 'Failed to load user subscription.'));
    } finally {
      setLoading(false);
    }
  }, [userId, canRead]);

  useEffect(() => {
    load();
  }, [load]);

  if (!userId) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
        Select a user to view subscription details.
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
        You need <code>subscriptions:read</code> to view this tab.
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const history = data?.paymentHistory || data?.history || [];
  const payments = history.filter((h) =>
    /purchase|renewal|topup|declin|payment|order/i.test(`${h.kind} ${h.title}`),
  );
  const topups = history.filter((h) =>
    /top.?up|coin|contact pack|addon_purchase|builder|resale/i.test(
      `${h.kind} ${h.title}`,
    ),
  );
  const lots = data?.creditLots || [];

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {data ? (
        <>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['overview', 'Plan & usage'],
                ['payments', 'Payment transactions'],
                ['credits', 'Credits & top-ups'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  section === id
                    ? 'bg-primary text-white'
                    : 'border border-gray-200 bg-white text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {section === 'overview' ? (
            <>
              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900">
                  {data.displayName}
                </h3>
                <p className="mt-1 font-mono text-xs text-gray-500">{data.planCode}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant={data.isSubscribed ? 'default' : 'outline'}>
                    {data.isSubscribed ? 'Subscribed' : 'Not subscribed'}
                  </Badge>
                  <Badge variant="secondary">
                    {data.subscriptionStatus || '—'}
                  </Badge>
                  {data.badge ? <Badge variant="outline">{data.badge}</Badge> : null}
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <Info label="Plan started" value={fmtDate(data.currentPeriodStart)} />
                  <Info label="Plan expires" value={fmtDate(data.currentPeriodEnd)} />
                  <Info label="Trial ends" value={fmtDate(data.trialEndsAt)} />
                  <Info
                    label="Autopay"
                    value={
                      data.autopayEnabled == null
                        ? '—'
                        : data.autopayEnabled
                          ? 'On'
                          : 'Off'
                    }
                  />
                  <Info label="Wallet balance" value={String(data.walletBalance)} />
                  <Info
                    label="Referral NetraCoins"
                    value={String((data as any).referralCoinsBalance ?? 0)}
                  />
                  <Info
                    label="Resale / Rent contact credits"
                    value={String(data.addonCredits.listingContactCredits || 0)}
                  />
                  <Info
                    label="Builder contact credits"
                    value={String(data.addonCredits.builderContactCredits || 0)}
                  />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <UsageCard
                  title="Listing contacts"
                  usedToday={data.usage.listingContactsDay}
                  usedMonth={data.usage.listingContactsMonth}
                  limitDay={data.limits.listingContactsDaily}
                  limitMonth={data.limits.listingContactsMonthly}
                  addonCredits={data.addonCredits.listingContactCredits}
                  hint="Plan daily/monthly allowance first, then Resale/Rent contact credits."
                />
                <UsageCard
                  title="Buy-req contacts"
                  usedToday={data.usage.buyReqContactsDay}
                  usedMonth={data.usage.buyReqContactsMonth}
                  limitDay={data.limits.buyReqContactsDaily}
                  limitMonth={data.limits.buyReqContactsMonthly}
                  addonCredits={data.addonCredits.buyReqContactCredits}
                  hint="Plan allowance, then buy-req addon credits."
                />
                <UsageCard
                  title="Listing views"
                  usedToday={data.usage.viewsDay}
                  usedMonth={data.usage.viewsMonth}
                  limitDay={data.limits.listingViewsDaily}
                  limitMonth={data.limits.listingViewsMonthly}
                  addonCredits={null}
                  hint="View limits from the active plan only."
                />
              </div>
            </>
          ) : null}

          {section === 'payments' ? (
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h4 className="font-semibold text-gray-900">
                Payment transactions
              </h4>
              <p className="mt-1 text-xs text-gray-500">
                Successful and declined subscription / top-up orders from Razorpay
                records in PropNetra, plus no-charge autopay switches.
              </p>
              {!payments.length ? (
                <p className="mt-4 text-sm text-gray-500">No payment history yet.</p>
              ) : (
                <PaymentHistoryTable items={payments} />
              )}
            </div>
          ) : null}

          {section === 'credits' ? (
            <div className="space-y-4">
              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <h4 className="font-semibold text-gray-900">
                  Purchases & top-ups
                </h4>
                {!topups.length ? (
                  <p className="mt-3 text-sm text-gray-500">No top-up history.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-gray-100">
                    {topups.map((item) => (
                      <li key={item.id} className="py-3 text-sm">
                        <p className="font-medium text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-500">
                          {fmtMoney(item.amountPaise)} · {fmtDateTime(item.occurredAt)}
                          {item.detail ? ` · ${item.detail}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <h4 className="font-semibold text-gray-900">
                  Credit lots (30-day expiry)
                </h4>
                {!lots.length ? (
                  <p className="mt-3 text-sm text-gray-500">No credit lots.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-xs uppercase text-gray-500">
                        <tr>
                          <th className="py-2 pr-3">Kind</th>
                          <th className="py-2 pr-3">Remaining</th>
                          <th className="py-2 pr-3">Granted</th>
                          <th className="py-2 pr-3">Expires</th>
                          <th className="py-2 pr-3">Pack cost</th>
                          <th className="py-2">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lots.map((lot) => (
                          <tr key={lot.id} className="border-t border-gray-100">
                            <td className="py-2 pr-3">{labelize(lot.kind)}</td>
                            <td className="py-2 pr-3">
                              {lot.amountRemaining}/{lot.amountGranted}
                            </td>
                            <td className="py-2 pr-3">{fmtDateTime(lot.grantedAt)}</td>
                            <td className="py-2 pr-3">{fmtDateTime(lot.expiresAt)}</td>
                            <td className="py-2 pr-3">
                              {lot.walletCoinsSpent ?? '—'}
                            </td>
                            <td className="py-2">{labelize(lot.source)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        !loading && (
          <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
            No subscription data for this user.
          </div>
        )
      )}
    </div>
  );
}

function paymentStatusClass(status?: string | null) {
  const s = (status || '').toLowerCase();
  if (/paid|captured|success|authorized/.test(s)) return 'bg-emerald-50 text-emerald-800';
  if (/no_charge|switched|no charge/.test(s)) return 'bg-sky-50 text-sky-800';
  if (/fail|declin|cancel|refund/.test(s)) return 'bg-red-50 text-red-700';
  if (/pending|created/.test(s)) return 'bg-amber-50 text-amber-800';
  return 'bg-gray-100 text-gray-700';
}

function isFollowUpStatus(status?: string | null) {
  return /^(resolved|open|pending|closed)$/i.test((status || '').trim());
}

function paymentOutcomeStatus(item: HistoryItem) {
  if (item.kind === 'autopay_switched' || item.meta?.paymentCharged === false) {
    return item.status || 'no_charge';
  }
  const rz = item.meta?.razorpay?.status?.trim();
  const rzLower = (rz || '').toLowerCase();
  if (rzLower === 'failed' || rzLower === 'cancelled' || rzLower === 'refunded') {
    return rz as string;
  }
  if (item.status && !isFollowUpStatus(item.status)) return item.status;
  if (rz) return rz as string;
  if (/declin|fail/i.test(`${item.kind} ${item.title}`)) return 'failed';
  return item.status || '—';
}

function razorpayError(item: HistoryItem) {
  const rz = item.meta?.razorpay;
  if (!rz) return '';
  const parts = [
    rz.errorDescription ||
      (rz.errorReason ? String(rz.errorReason).replace(/_/g, ' ') : ''),
    rz.errorSource ? `(${rz.errorSource})` : '',
    rz.errorStep,
    rz.errorCode,
  ].filter(Boolean);
  return parts.join(' · ');
}

function paymentDetailRows(item: HistoryItem) {
  const rz = item.meta?.razorpay;
  const rows: { label: string; value: string; wide?: boolean }[] = [];

  if (item.kind === 'autopay_switched' || item.meta?.paymentCharged === false) {
    rows.push({
      label: 'Payment',
      value: 'No payment — only autopay subscription changed',
      wide: true,
    });
    const prev = item.meta?.previousAutopay;
    const next = item.meta?.newAutopay;
    if (prev?.planCode) {
      rows.push({ label: 'Previous plan', value: labelize(prev.planCode) });
    }
    if (prev?.renewalPricePaise != null) {
      rows.push({
        label: 'Previous autopay price',
        value: fmtMoney(prev.renewalPricePaise),
      });
    }
    if (prev?.razorpaySubscriptionId) {
      rows.push({
        label: 'Previous Razorpay sub ID',
        value: String(prev.razorpaySubscriptionId),
        wide: true,
      });
    }
    if (next?.planCode) {
      rows.push({ label: 'New plan', value: labelize(next.planCode) });
    }
    if (next?.renewalPricePaise != null) {
      rows.push({
        label: 'New autopay price',
        value: fmtMoney(next.renewalPricePaise),
      });
    }
    if (next?.razorpaySubscriptionId) {
      rows.push({
        label: 'New Razorpay sub ID',
        value: String(next.razorpaySubscriptionId),
        wide: true,
      });
    }
    if (item.detail) {
      rows.push({ label: 'Detail', value: item.detail, wide: true });
    }
    return rows;
  }

  if (item.meta?.autopay) rows.push({ label: 'Autopay', value: 'Yes' });
  if (rz?.status) rows.push({ label: 'Gateway status', value: labelize(rz.status) });
  if (item.status && isFollowUpStatus(item.status)) {
    rows.push({ label: 'Follow-up', value: labelize(item.status) });
  }
  if (rz?.methodDetail) rows.push({ label: 'Method', value: rz.methodDetail });
  if (rz?.paymentId) rows.push({ label: 'Payment ID', value: rz.paymentId });
  if (rz?.orderId) rows.push({ label: 'Order ID', value: rz.orderId });
  if (rz?.bank) rows.push({ label: 'Bank', value: rz.bank });
  if (rz?.description) {
    rows.push({ label: 'Description', value: rz.description, wide: true });
  } else if (item.detail && !rz) {
    rows.push({ label: 'Detail', value: item.detail, wide: true });
  }
  const error = razorpayError(item) || item.meta?.failureReason || '';
  if (error) rows.push({ label: 'Error', value: error, wide: true });
  for (const row of item.meta?.upgradeAdjustment?.breakdown || []) {
    rows.push({ label: row.label, value: row.value });
  }
  return rows;
}

function PaymentHistoryTable({ items }: { items: HistoryItem[] }) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-gray-100">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="w-10 px-2 py-3" />
            <th className="px-3 py-3 font-medium">Transaction</th>
            <th className="px-3 py-3 font-medium">Type</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Amount</th>
            <th className="px-3 py-3 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const rz = item.meta?.razorpay;
            const expanded = !!expandedIds[item.id];
            const details = expanded ? paymentDetailRows(item) : [];
            const outcome = paymentOutcomeStatus(item);
            return (
              <Fragment key={item.id}>
                <tr
                  className={`cursor-pointer border-b border-gray-100 ${
                    expanded ? 'bg-gray-50/70' : 'hover:bg-gray-50/50'
                  }`}
                  onClick={() => toggle(item.id)}
                >
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      aria-label={expanded ? 'Collapse details' : 'Expand details'}
                      aria-expanded={expanded}
                      className="inline-flex size-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(item.id);
                      }}
                    >
                      {expanded ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    {item.kind === 'autopay_switched' ||
                    item.meta?.paymentCharged === false ? (
                      <p className="text-[11px] text-sky-600">
                        No payment · autopay switch
                      </p>
                    ) : item.meta?.autopay ? (
                      <p className="text-[11px] text-gray-400">Autopay</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{labelize(item.kind)}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${paymentStatusClass(
                        outcome,
                      )}`}
                    >
                      {labelize(outcome)}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {item.kind === 'autopay_switched' ||
                    item.meta?.paymentCharged === false
                      ? '₹0'
                      : fmtMoney(item.amountPaise ?? rz?.amountPaise ?? null)}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {fmtDateTime(item.occurredAt)}
                  </td>
                </tr>
                {expanded ? (
                  <tr className="border-b border-gray-100 bg-slate-50/80">
                    <td colSpan={6} className="px-4 py-3">
                      {details.length ? (
                        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                          {details.map((row) => (
                            <div
                              key={`${item.id}-${row.label}`}
                              className={`min-w-0 text-sm ${row.wide ? 'sm:col-span-2' : ''}`}
                            >
                              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                                {row.label}
                              </p>
                              <p className="wrap-break-word text-gray-800">
                                {row.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">
                          No extra details for this transaction.
                        </p>
                      )}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UsageCard({
  title,
  usedToday,
  usedMonth,
  limitDay,
  limitMonth,
  addonCredits,
  hint,
}: {
  title: string;
  usedToday: number;
  usedMonth: number;
  limitDay: number | null;
  limitMonth: number | null;
  addonCredits: number | null;
  hint: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h4 className="font-semibold text-gray-900">{title}</h4>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
      <div className="mt-3 space-y-2 text-sm text-gray-800">
        <p>
          Used today:{' '}
          <span className="font-semibold">
            {usedToday}
            {limitDay != null ? ` / ${limitDay}` : ''}
          </span>
        </p>
        <p>
          Used this month:{' '}
          <span className="font-semibold">
            {usedMonth}
            {limitMonth != null ? ` / ${limitMonth}` : ''}
          </span>
        </p>
        {addonCredits != null ? (
          <p>
            Addon credits left:{' '}
            <span className="font-semibold">{addonCredits}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value || '—'}</p>
    </div>
  );
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtMoney(paise?: number | null) {
  if (paise == null || Number.isNaN(Number(paise))) return '—';
  return `₹${(Number(paise) / 100).toFixed(0)}`;
}

function labelize(value?: string | null) {
  if (!value) return '—';
  return value.replace(/_/g, ' ');
}
