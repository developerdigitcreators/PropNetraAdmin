"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/use-auth-store";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/format-date";
import { Badge } from "@/components/ui/badge";
import {
  subscriptionApiError,
  subscriptionsService,
  type UserEntitlements,
} from "@/services/subscriptions.service";
import { referralService } from "@/services/referral.service";
import {
  isPaidPlanCode,
  planLabelFromCode,
  resolvePlanChip,
} from "@/lib/plan-labels";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import {
  AddonCreditsHistoryPanel,
  type AddonCreditsKind,
} from "@/modules/user-analytics/addon-credits-history-panel";

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
    } | null;
    renewalPricePaise?: number | null;
    introApplied?: boolean;
    failureReason?: string | null;
    razorpayPaymentId?: string | null;
    razorpayOrderId?: string | null;
    autopay?: boolean;
    paymentCharged?: boolean;
    note?: string | null;
    description?: string | null;
    gst?: {
      enabled?: boolean;
      ratePercent?: number;
      taxablePaise?: number;
      gstPaise?: number;
      totalPaise?: number;
      sacCode?: string;
    } | null;
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
  topupOrderId?: string | null;
  active?: boolean;
  expiredAt?: string | null;
};

type ProfilePayload = Omit<
  UserEntitlements,
  "history" | "paymentHistory" | "creditLots"
> & {
  history?: HistoryItem[];
  paymentHistory?: HistoryItem[];
  creditLots?: CreditLot[];
  billingState?: string | null;
  autopayEnabled?: boolean;
};

type AddonDrillKind = AddonCreditsKind;

export function SubscriptionTab({ userId }: SubscriptionTabProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canRead = hasPermission("subscriptions", "read");
  const router = useRouter();
  const searchParams = useSearchParams();
  const creditsParam = String(searchParams.get("credits") || "").trim();
  const creditsKind: AddonDrillKind | null =
    creditsParam === "listing" ||
    creditsParam === "buy_req" ||
    creditsParam === "builder"
      ? creditsParam
      : null;

  const [data, setData] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [section, setSection] = useState<"overview" | "payments">(
    "overview",
  );

  const [coinsLoading, setCoinsLoading] = useState(false);
  const [coinsError, setCoinsError] = useState("");
  const [coinsData, setCoinsData] = useState<Awaited<
    ReturnType<typeof referralService.getUserCoins>
  > | null>(null);

  const load = useCallback(async () => {
    if (!userId || !canRead) {
      setData(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const next = (await subscriptionsService.getUser(
        userId,
      )) as unknown as ProfilePayload | null;
      setData(next);
    } catch (err) {
      setData(null);
      setError(subscriptionApiError(err, "Failed to load user subscription."));
    } finally {
      setLoading(false);
    }
  }, [userId, canRead]);

  const loadCoins = useCallback(async () => {
    if (!userId) return;
    setCoinsLoading(true);
    setCoinsError("");
    try {
      const next = await referralService.getUserCoins(userId);
      setCoinsData(next);
    } catch (err) {
      setCoinsError(
        subscriptionApiError(err, "Failed to load referral coins breakdown."),
      );
    } finally {
      setCoinsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (creditsKind) {
      void loadCoins();
    }
  }, [creditsKind, loadCoins]);

  const openAddonDrill = (kind: AddonDrillKind) => {
    if (!userId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("userId", userId);
    params.set("credits", kind);
    router.push(`/user-analytics?${params.toString()}`);
  };

  const closeCreditsPage = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("credits");
    if (userId) params.set("userId", userId);
    const qs = params.toString();
    router.push(qs ? `/user-analytics?${qs}` : "/user-analytics");
  };

  const refreshCreditsPage = async () => {
    await Promise.all([load(), loadCoins()]);
  };

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
  // Include paid upgrades (`plan_upgrade_adjustment`) and no-charge autopay switches.
  // Avoid matching only the word "payment" inside "no payment" alone — keep switches via kind.
  const payments = history.filter((h) =>
    /purchase|renewal|topup|declin|upgrade|adjustment|addon|autopay_switched|order/i.test(
      `${h.kind} ${h.title}`,
    ),
  );
  const lots = data?.creditLots || [];
  const paid = isPaidPlanCode(data?.planCode);
  const planLabel =
    data?.planLabel ||
    planLabelFromCode(data?.planCode) ||
    data?.displayName ||
    "—";
  const planChip = resolvePlanChip(planLabel, data?.planCode);
  const showTrialEnds = data?.showTrialEnds === true;
  const accountActive = /^(active|trialing|past_due)$/i.test(
    String(data?.subscriptionStatus || ""),
  );

  const listingAddon = creditUsedTotal(lots, "listing");
  const buyReqAddon = creditUsedTotal(lots, "buy_req");
  const builderAddon = creditUsedTotal(lots, "builder");

  if (creditsKind) {
    return (
      <AddonCreditsHistoryPanel
        kind={creditsKind}
        lots={lots}
        transactions={coinsData?.transactions || []}
        loading={coinsLoading || (loading && !data)}
        error={coinsError || null}
        onBack={closeCreditsPage}
        onRefresh={() => void refreshCreditsPage()}
      />
    );
  }

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
                ["overview", "Plan & usage"],
                ["payments", "Payment transactions"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  section === id
                    ? "bg-primary text-white"
                    : "border border-gray-200 bg-white text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {section === "overview" ? (
            <>
              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {planChip ? (
                    <Badge variant="outline" className={planChip.className}>
                      {planChip.label}
                    </Badge>
                  ) : (
                    <Badge variant="outline">{planLabel}</Badge>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      accountActive
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {accountActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <Info
                    label="Plan started"
                    value={fmtDate(
                      data.planStartedAt || data.currentPeriodStart,
                    )}
                  />
                  {paid ? (
                    <Info
                      label="Plan expires"
                      value={fmtDate(
                        data.planExpiresAt || data.currentPeriodEnd,
                      )}
                    />
                  ) : null}
                  {showTrialEnds ? (
                    <Info
                      label="Trial ends"
                      value={fmtDate(data.trialEndsAt)}
                    />
                  ) : null}
                  {paid ? (
                    <Info
                      label="Autopay"
                      value={
                        data.autopayEnabled == null
                          ? "—"
                          : data.autopayEnabled
                            ? "On"
                            : "Off"
                      }
                    />
                  ) : null}
                  <Info
                    label="Referral NetraCoins"
                    value={String(data.referralCoinsBalance ?? 0)}
                  />
                  {paid ? (
                    <>
                      <Info
                        label="Resale / Rent contact credits"
                        value={String(
                          data.addonCredits.listingContactCredits || 0,
                        )}
                      />
                      <Info
                        label="Builder contact credits"
                        value={String(
                          data.addonCredits.builderContactCredits || 0,
                        )}
                      />
                    </>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                <UsageCard
                  title="Listing contacts"
                  usedToday={data.usage.listingContactsDay}
                  usedMonth={data.usage.listingContactsMonth}
                  limitDay={data.limits.listingContactsDaily}
                  limitMonth={data.limits.listingContactsMonthly}
                  addon={
                    paid
                      ? {
                          used: listingAddon.used,
                          total: listingAddon.total,
                          remaining: data.addonCredits.listingContactCredits,
                        }
                      : null
                  }
                  onAddonClick={
                    paid ? () => openAddonDrill("listing") : undefined
                  }
                  hint="Click addon credits to see how each pack was paid and expiry."
                />
                <UsageCard
                  title="Buy-req contacts"
                  usedToday={data.usage.buyReqContactsDay}
                  usedMonth={data.usage.buyReqContactsMonth}
                  limitDay={data.limits.buyReqContactsDaily}
                  limitMonth={data.limits.buyReqContactsMonthly}
                  addon={
                    paid
                      ? {
                          used: buyReqAddon.used,
                          total: buyReqAddon.total,
                          remaining: data.addonCredits.buyReqContactCredits,
                        }
                      : null
                  }
                  onAddonClick={
                    paid ? () => openAddonDrill("buy_req") : undefined
                  }
                  hint="Click addon credits for payment source + expiry."
                />
                {paid ? (
                  <UsageCard
                    title="Builder / Direct builder floor"
                    usedToday={null}
                    usedMonth={null}
                    limitDay={null}
                    limitMonth={null}
                    addon={{
                      used: builderAddon.used,
                      total: builderAddon.total,
                      remaining: data.addonCredits.builderContactCredits || 0,
                    }}
                    onAddonClick={() => openAddonDrill("builder")}
                    hint="Click addon credits for payment source + expiry."
                  />
                ) : null}
                <PostLimitCard
                  title="Listing posts"
                  used={data.usage.activeResaleRentPostsUsed ?? 0}
                  limit={data.limits.activeResaleRentPosts}
                  hint="Active published resale/rent posts vs plan cap."
                />
                <PostLimitCard
                  title="Buy-req posts"
                  used={data.usage.activeBuyReqPostsUsed ?? 0}
                  limit={data.limits.activeBuyReqPosts}
                  hint="Active published buy-requirement posts vs plan cap."
                />
                <UsageCard
                  title="Listing views"
                  usedToday={data.usage.viewsDay}
                  usedMonth={data.usage.viewsMonth}
                  limitDay={data.limits.listingViewsDaily}
                  limitMonth={data.limits.listingViewsMonthly}
                  addon={null}
                  unlimitedLabel={
                    data.limits.listingViewsMonthly == null ? "Unlimited" : undefined
                  }
                  hint={
                    data.limits.listingViewsMonthly == null
                      ? "Unlimited views on this plan."
                      : "View limits from the active plan only."
                  }
                />
              </div>
            </>
          ) : null}

          {section === "payments" ? (
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h4 className="font-semibold text-gray-900">
                Payment transactions
              </h4>
              <p className="mt-1 text-xs text-gray-500">
                Successful and declined subscription / top-up orders from
                Razorpay records in PropNetra, plus no-charge autopay switches.
              </p>
              {!payments.length ? (
                <p className="mt-4 text-sm text-gray-500">
                  No payment history yet.
                </p>
              ) : (
                <PaymentHistoryTable items={payments} />
              )}
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

function creditUsedTotal(lots: CreditLot[], kind: string) {
  const matched = lots.filter(
    (lot) => String(lot.kind || "").toLowerCase() === kind.toLowerCase(),
  );
  const total = matched.reduce(
    (sum, lot) => sum + Number(lot.amountGranted || 0),
    0,
  );
  const remaining = matched.reduce(
    (sum, lot) => sum + Number(lot.amountRemaining || 0),
    0,
  );
  return { used: Math.max(0, total - remaining), total, remaining };
}

function paymentStatusClass(status?: string | null) {
  const s = (status || "").toLowerCase();
  if (/paid|captured|success|authorized/.test(s))
    return "bg-emerald-50 text-emerald-800";
  if (/no_charge|switched|no charge/.test(s)) return "bg-sky-50 text-sky-800";
  if (/fail|declin|cancel|refund/.test(s)) return "bg-red-50 text-red-700";
  if (/pending|created/.test(s)) return "bg-amber-50 text-amber-800";
  return "bg-gray-100 text-gray-700";
}

function isFollowUpStatus(status?: string | null) {
  return /^(resolved|open|pending|closed)$/i.test((status || "").trim());
}

function paymentOutcomeStatus(item: HistoryItem) {
  if (item.kind === "autopay_switched" || item.meta?.paymentCharged === false) {
    return item.status || "no_charge";
  }
  const rz = item.meta?.razorpay?.status?.trim();
  const rzLower = (rz || "").toLowerCase();
  if (
    rzLower === "failed" ||
    rzLower === "cancelled" ||
    rzLower === "refunded"
  ) {
    return rz as string;
  }
  if (item.status && !isFollowUpStatus(item.status)) return item.status;
  if (rz) return rz as string;
  if (/declin|fail/i.test(`${item.kind} ${item.title}`)) return "failed";
  return item.status || "—";
}

function razorpayError(item: HistoryItem) {
  const rz = item.meta?.razorpay;
  if (!rz) return "";
  const parts = [
    rz.errorDescription ||
      (rz.errorReason ? String(rz.errorReason).replace(/_/g, " ") : ""),
    rz.errorSource ? `(${rz.errorSource})` : "",
    rz.errorStep,
    rz.errorCode,
  ].filter(Boolean);
  return parts.join(" · ");
}

function paymentDetailRows(item: HistoryItem) {
  const rz = item.meta?.razorpay;
  const rows: { label: string; value: string; wide?: boolean }[] = [];

  if (item.kind === "autopay_switched" || item.meta?.paymentCharged === false) {
    rows.push({
      label: "Payment",
      value: "No payment — only autopay subscription changed",
      wide: true,
    });
    const prev = item.meta?.previousAutopay;
    const next = item.meta?.newAutopay;
    if (prev?.planCode) {
      rows.push({
        label: "Previous plan",
        value: planLabelFromCode(prev.planCode) || labelize(prev.planCode),
      });
    }
    if (prev?.renewalPricePaise != null) {
      rows.push({
        label: "Previous autopay price",
        value: fmtMoney(prev.renewalPricePaise),
      });
    }
    if (prev?.razorpaySubscriptionId) {
      rows.push({
        label: "Previous Razorpay sub ID",
        value: String(prev.razorpaySubscriptionId),
        wide: true,
      });
    }
    if (next?.planCode) {
      rows.push({
        label: "New plan",
        value: planLabelFromCode(next.planCode) || labelize(next.planCode),
      });
    }
    if (next?.renewalPricePaise != null) {
      rows.push({
        label: "New autopay price",
        value: fmtMoney(next.renewalPricePaise),
      });
    }
    if (next?.razorpaySubscriptionId) {
      rows.push({
        label: "New Razorpay sub ID",
        value: String(next.razorpaySubscriptionId),
        wide: true,
      });
    }
    if (item.detail) {
      rows.push({ label: "Detail", value: item.detail, wide: true });
    }
    return rows;
  }

  if (item.meta?.autopay) rows.push({ label: "Autopay", value: "Yes" });
  if (typeof item.meta?.description === "string" && item.meta.description) {
    rows.push({
      label: "Description",
      value: item.meta.description,
      wide: true,
    });
  }
  const gst = item.meta?.gst;
  if (gst && (gst.gstPaise || 0) > 0) {
    rows.push({
      label: "Base (exclusive)",
      value: fmtMoney(gst.taxablePaise ?? null),
    });
    rows.push({
      label: `GST (${gst.ratePercent ?? 18}%)`,
      value: fmtMoney(gst.gstPaise ?? null),
    });
    rows.push({
      label: "Total (incl. GST)",
      value: fmtMoney(gst.totalPaise ?? item.amountPaise ?? null),
    });
    if (gst.sacCode) rows.push({ label: "SAC", value: String(gst.sacCode) });
  }
  if (rz?.status)
    rows.push({ label: "Gateway status", value: labelize(rz.status) });
  if (item.status && isFollowUpStatus(item.status)) {
    rows.push({ label: "Follow-up", value: labelize(item.status) });
  }
  if (rz?.methodDetail) rows.push({ label: "Method", value: rz.methodDetail });
  if (rz?.paymentId) rows.push({ label: "Payment ID", value: rz.paymentId });
  if (rz?.orderId) rows.push({ label: "Order ID", value: rz.orderId });
  if (rz?.bank) rows.push({ label: "Bank", value: rz.bank });
  if (rz?.description) {
    rows.push({ label: "Description", value: rz.description, wide: true });
  } else if (item.detail && !rz) {
    rows.push({ label: "Detail", value: item.detail, wide: true });
  }
  const error = razorpayError(item) || item.meta?.failureReason || "";
  if (error) rows.push({ label: "Error", value: error, wide: true });
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
            <th className="px-3 py-3 font-medium">Base</th>
            <th className="px-3 py-3 font-medium">GST</th>
            <th className="px-3 py-3 font-medium">Total</th>
            <th className="px-3 py-3 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const rz = item.meta?.razorpay;
            const gst = item.meta?.gst;
            const expanded = !!expandedIds[item.id];
            const details = expanded ? paymentDetailRows(item) : [];
            const outcome = paymentOutcomeStatus(item);
            const noCharge =
              item.kind === "autopay_switched" ||
              item.meta?.paymentCharged === false;
            const totalPaise = item.amountPaise ?? rz?.amountPaise ?? null;
            const basePaise = noCharge
              ? 0
              : (gst?.taxablePaise ??
                (gst?.gstPaise ? null : totalPaise));
            const gstPaise = noCharge ? 0 : (gst?.gstPaise ?? null);
            return (
              <Fragment key={item.id}>
                <tr
                  className={`cursor-pointer border-b border-gray-100 ${
                    expanded ? "bg-gray-50/70" : "hover:bg-gray-50/50"
                  }`}
                  onClick={() => toggle(item.id)}
                >
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      aria-label={
                        expanded ? "Collapse details" : "Expand details"
                      }
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
                    {item.kind === "autopay_switched" ||
                    item.meta?.paymentCharged === false ? (
                      <p className="text-[11px] text-sky-600">
                        No payment · autopay switch
                      </p>
                    ) : item.meta?.autopay ? (
                      <p className="text-[11px] text-gray-400">Autopay</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {labelize(item.kind)}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${paymentStatusClass(
                        outcome,
                      )}`}
                    >
                      {labelize(outcome)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    {noCharge ? "—" : fmtMoney(basePaise)}
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    {noCharge ? "—" : gstPaise != null ? fmtMoney(gstPaise) : "—"}
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {noCharge ? "₹0" : fmtMoney(totalPaise)}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {fmtDateTime(item.occurredAt)}
                  </td>
                </tr>
                {expanded ? (
                  <tr className="border-b border-gray-100 bg-slate-50/80">
                    <td colSpan={8} className="px-4 py-3">
                      {details.length ? (
                        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                          {details.map((row) => (
                            <div
                              key={`${item.id}-${row.label}`}
                              className={`min-w-0 text-sm ${row.wide ? "sm:col-span-2" : ""}`}
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
  addon,
  onAddonClick,
  hint,
  unlimitedLabel,
}: {
  title: string;
  usedToday: number | null;
  usedMonth: number | null;
  limitDay: number | null;
  limitMonth: number | null;
  addon: { used: number; total: number; remaining: number } | null;
  onAddonClick?: () => void;
  hint: string;
  /** When limits are null, show this instead of monthly total (e.g. Unlimited). */
  unlimitedLabel?: string;
}) {
  const hasMonthlyLimit = limitMonth != null && Number.isFinite(limitMonth);
  const hasDailyLimit = limitDay != null && Number.isFinite(limitDay);

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-gray-900">{title}</h4>
          <p className="mt-1 text-xs text-gray-500">{hint}</p>
        </div>
        {hasMonthlyLimit ? (
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
              Monthly total
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {usedMonth ?? 0}
              <span className="text-sm font-medium text-gray-500">
                {" "}
                / {limitMonth}
              </span>
            </p>
          </div>
        ) : unlimitedLabel ? (
          <div className="shrink-0 text-right">
            <p className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              {unlimitedLabel}
            </p>
          </div>
        ) : null}
      </div>
      <div className="mt-3 space-y-2 text-sm text-gray-800">
        {usedToday != null ? (
          <p>
            Used today:{" "}
            <span className="font-semibold">
              {usedToday}
              {hasDailyLimit ? ` / ${limitDay}` : ""}
            </span>
          </p>
        ) : null}
        {hasMonthlyLimit ? (
          <p>
            Monthly total:{" "}
            <span className="font-semibold">
              {usedMonth ?? 0} / {limitMonth}
            </span>
          </p>
        ) : null}
        {addon ? (
          <button
            type="button"
            onClick={onAddonClick}
            className={`text-left ${
              onAddonClick
                ? "text-primary underline-offset-2 hover:underline"
                : ""
            }`}
          >
            Addon credits:{" "}
            <span className="font-semibold">
              {addon.used}/{addon.total || addon.remaining}
            </span>
            <span className="text-xs text-gray-500">
              {" "}
              ({addon.remaining} left)
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

function PostLimitCard({
  title,
  used,
  limit,
  hint,
}: {
  title: string;
  used: number;
  limit: number;
  hint: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-gray-900">{title}</h4>
          <p className="mt-1 text-xs text-gray-500">{hint}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
            Active / limit
          </p>
          <p className="text-lg font-semibold text-gray-900">
            {used}
            <span className="text-sm font-medium text-gray-500">
              {" "}
              / {limit}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value || "—"}</p>
    </div>
  );
}

function fmtDate(value: string | null | undefined): string {
  return formatDisplayDate(value);
}

function fmtDateTime(value?: string | null): string {
  return formatDisplayDateTime(value);
}

function fmtMoney(paise?: number | null) {
  if (paise == null || Number.isNaN(Number(paise))) return "—";
  return `₹${(Number(paise) / 100).toFixed(2)}`;
}

function labelize(value?: string | null) {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}
