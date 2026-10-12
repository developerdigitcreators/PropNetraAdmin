"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/use-auth-store";
import { formatDisplayDateTime } from "@/lib/format-date";
import { PermissionGuard } from "@/components/common/permission-guard";
import { Breadcrumb } from "@/components/common/breadcrumb";
import { DateRangePicker } from "@/components/common/date-range-picker";
import { AdminDataTable } from "@/components/common/admin-data-table";
import { AdminListToolbar } from "@/components/common/admin-list-toolbar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  subscriptionTrackingApiError,
  subscriptionTrackingService,
  type ChangePlanAttempt,
  type ChangePlanRow,
  type TabCount,
  type TrackingFilterOptions,
  type TrackingPaymentRow,
  type TrackingRemark,
  type TrackingUserRow,
  type TrackingFilterCounts,
  type OnOffCounts,
} from "@/services/subscription-tracking.service";
import { useDialogUnsavedGuard } from "@/hooks/use-unsaved-changes-guard";
import { ExternalLink, Eye, Loader2, MessageSquarePlus, X } from "lucide-react";
import {
  CALL_STATUS_OPTIONS,
  type CallStatus,
} from "@/services/admin-users.service";
import { newFirstCellClass, NewTag } from "@/components/common/new-row-marker";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { MaskedContact } from "@/components/contact/masked-contact";

function ContactCell({
  contact,
  email,
  revealKey,
}: {
  contact?: string | null;
  email?: string | null;
  revealKey: string;
}) {
  if (!contact && !email) return <>—</>;
  return (
    <div className="space-y-0.5">
      {contact ? <MaskedContact value={contact} revealKey={revealKey} /> : null}
      {email ? <p className="break-all text-xs text-gray-500">{email}</p> : null}
    </div>
  );
}

type MainTab =
  "users" | "change-plan" | "payments" | "converted" | "upcoming-renewals";

type CountedOption = { value: string; label: string; count?: number };

/** User Detail "Filter" dropdown → list query params. */
const USER_STATUS_OPTIONS = [
  { value: "subscribed", label: "Subscribed", countKey: "subscribed" },
  { value: "declined", label: "Declined", countKey: "declined" },
  { value: "autopay_on", label: "Autopay on", countKey: "autopayOn" },
  { value: "autopay_off", label: "Autopay off", countKey: "autopayOff" },
] as const;

const BADGE_OPTIONS = [
  { value: "network", label: "Network Partner", countKey: "network_partner" },
  { value: "pro", label: "Pro Partner", countKey: "pro_partner" },
  { value: "elite", label: "Elite Partner", countKey: "elite_partner" },
] as const;

function userStatusParams(status: string) {
  return {
    subscribedOnly: status === "subscribed" || undefined,
    declinedOnly: status === "declined" || undefined,
    autopayEnabled:
      status === "autopay_on" ? true : status === "autopay_off" ? false : undefined,
  };
}

function withRemarkAuthors(
  names: Record<string, string>,
  counts?: TrackingFilterCounts | null,
) {
  const authors = (counts?.remarkAuthors || []).filter(
    (a) => a.id && a.name && names[String(a.id)] !== a.name,
  );
  if (!authors.length) return names;
  const next = { ...names };
  for (const a of authors) next[String(a.id)] = String(a.name);
  return next;
}

function countedText(o: CountedOption) {
  return o.count === undefined ? o.label : `${o.label} (${o.count})`;
}

function onOffOptions(counts: OnOffCounts | undefined, allTotal?: number): CountedOption[] {
  return [
    { value: "all", label: "All", count: allTotal ?? counts?.all ?? 0 },
    { value: "on", label: "Autopay on", count: counts?.on ?? 0 },
    { value: "off", label: "Autopay off", count: counts?.off ?? 0 },
  ];
}

/** Every option stays visible and selectable; zero-count options are greyed out. */
function CountedSelect({
  value,
  options,
  onValueChange,
  className,
}: {
  value: string;
  options: CountedOption[];
  onValueChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v ?? "all")}>
      <SelectTrigger className={cn("h-8 min-w-[150px] bg-white", className)}>
        <SelectValue>
          {(v: string) => {
            const opt = options.find((o) => o.value === v);
            return opt ? countedText(opt) : "All";
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem
            key={o.value}
            value={o.value}
            label={o.label}
            className={o.count === 0 ? "text-gray-400" : undefined}
          >
            {countedText(o)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const TRACKING_FILTER_DEFAULTS = {
  tab: "users",
  q: "",
  startsFrom: "",
  startsTo: "",
  endsFrom: "",
  endsTo: "",
  status: "",
  planCode: "",
  role: "",
  appliedFor: "",
  remarkBy: "",
  callStatus: "",
  badge: "",
  payStatus: "success",
  payOverview: "",
  payKind: "",
  pRole: "",
  pPlanCode: "",
  pAppliedFor: "",
  pq: "",
  pTxnFrom: "",
  pTxnTo: "",
  pStartFrom: "",
  pStartTo: "",
  uq: "",
  uAutopay: "",
  uPlanCode: "",
  uRole: "",
  uStartFrom: "",
  uStartTo: "",
  uEndFrom: "",
  uEndTo: "",
  cq: "",
  cPlanCode: "",
  cRole: "",
  cAppliedFor: "",
  cRemarkBy: "",
  cCallStatus: "",
  cRenewal: "",
  cTxnFrom: "",
  cTxnTo: "",
  cStartFrom: "",
  cStartTo: "",
  vq: "",
  vPlanCode: "",
  vRole: "",
  vAppliedFor: "",
  vRemarkBy: "",
  vCallStatus: "",
  vTxnFrom: "",
  vTxnTo: "",
  vStartFrom: "",
  vStartTo: "",
};

function formatDateTime(value?: string | null) {
  return formatDisplayDateTime(value);
}

function labelize(value?: string | null) {
  if (!value) return "—";
  if (value === "payment_failed" || value === "payment_declined") {
    return "Payment failed";
  }
  return value.replace(/_/g, " ");
}

function appliedForKindLabel(
  af?: {
    kind?: string | null;
    label?: string | null;
  } | null,
) {
  if (!af) return null;
  if (af.kind === "payment_mode") return "Payment mode";
  if (af.kind === "plan_change") return "Plan change";
  if (af.kind === "renewal") return "Renewal";
  if (af.kind) return labelize(af.kind);
  return af.label || null;
}

function formatAppliedFor(
  af?: {
    kind?: string | null;
    label?: string | null;
    paymentMode?: string | null;
    planName?: string | null;
    renewal?: { outcome?: string | null; autopayEnabled?: boolean } | null;
  } | null,
) {
  return appliedForKindLabel(af) || "—";
}

function AppliedForUnderName({ af }: { af?: TrackingUserRow["appliedFor"] }) {
  if (!af?.kind) return null;
  const label =
    af.kind === "renewal"
      ? `Renewal Autopay ${af.renewal?.autopayEnabled ? "on" : "off"}`
      : af.kind === "plan_change"
        ? af.planName
          ? `Applied ${labelize(af.planName)}`
          : "Applied"
        : af.kind === "payment_mode"
          ? af.paymentMode
            ? `Applied ${labelize(af.paymentMode)}`
            : "Applied"
          : appliedForKindLabel(af);
  if (!label) return null;
  return (
    <div className="mt-1 space-y-0.5 text-[11px] leading-snug text-gray-600">
      <p className="inline-block w-fit rounded-lg bg-gray-100 px-2 py-1">
        <span className="text-gray-400">{label}</span>
      </p>
    </div>
  );
}

const PLANS_BY_ROLE: Record<string, { code: string; label: string }[]> = {
  agent: [
    { code: "FREE_TRIAL", label: "Free Trial" },
    { code: "FREE_LIFETIME", label: "Free Lifetime" },
    { code: "NETWORK_PAID", label: "Network Paid" },
    { code: "PRO", label: "Pro" },
    { code: "ELITE", label: "Elite" },
  ],
  direct_builder: [
    { code: "DBF_FREE", label: "Dbf Free" },
    { code: "DBF_PAID", label: "Dbf Paid" },
  ],
  developer: [
    { code: "DEVELOPER_FREE", label: "Developer Free" },
    { code: "DEVELOPER_MONTHLY", label: "Developer Monthly" },
    { code: "DEVELOPER_QUARTERLY", label: "Developer Quarterly" },
    { code: "DEVELOPER_HALF_YEARLY", label: "Developer Half Yearly" },
    { code: "DEVELOPER_PAID", label: "Developer Paid" },
  ],
};

function profileHref(userId: string) {
  return `/user-analytics?userId=${encodeURIComponent(userId)}`;
}

function paymentToQueueRow(row: TrackingPaymentRow): ChangePlanRow {
  const remarks = row.remarks || [];
  return {
    ref: row.ref || `order:${row.id}`,
    userId: row.userId,
    kinds: [],
    name: row.name,
    contact: row.contact,
    email: row.email,
    badge: null,
    statusGroup: "unverified",
    targetPlans: [],
    occurredAt: row.occurredAt || row.createdAt || "",
    remarks,
    remarksCount: row.remarksCount ?? remarks.length,
    remarksAddedBy: row.remarksAddedBy || null,
    latestRemark:
      row.latestRemark || (remarks.length ? remarks[remarks.length - 1] : null),
    attemptCount: row.attemptCount ?? row.attempts?.length ?? 0,
    attempts: row.attempts || [],
    autopayEnabled: Boolean(row.autopayEnabled),
    currentPlan: row.currentPlan || row.planCode,
    planCode: row.planCode || row.currentPlan,
    planStartedAt: row.planStartedAt,
    action: row.action,
    appliedFor: row.appliedFor,
    transactionAmount: row.transactionAmount,
    role: row.role,
    callStatus: row.callStatus,
    callStatusLabel: row.callStatusLabel,
    callStatusEditable: row.callStatusEditable,
    callStatusUpdatedAt: row.callStatusUpdatedAt,
    callStatusUpdatedByName: row.callStatusUpdatedByName,
    isNew: false,
  };
}

function kindTags(kinds: string[] | undefined) {
  return (kinds || [])
    .filter((k) => k === "payment_failed" || k === "payment_declined")
    .map(labelize);
}

/** Total in parentheses; NEW count as yellow corner badge. */
function TrackingTabLabel({
  label,
  total,
  neu = 0,
}: {
  label: string;
  total: number;
  neu?: number;
}) {
  return (
    <span className="relative inline-flex items-center pr-2.5">
      <span>
        {label} ({total})
      </span>
      {neu > 0 ? (
        <span className="absolute -right-1 -top-2.5 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-amber-100 px-1.5 text-[10px] font-bold leading-none text-amber-700">
          {neu}
        </span>
      ) : null}
    </span>
  );
}

export default function SubscriptionTrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <SubscriptionTrackingPageInner />
    </Suspense>
  );
}

function SubscriptionTrackingPageInner() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canReadUsers = hasPermission("subscriptions", "read");
  const canReadChange = hasPermission("subscribe_now_tracking", "read");
  const canUpdateChange = hasPermission("subscribe_now_tracking", "update");

  const { filters, setFilters } = useUrlFilters({
    ...TRACKING_FILTER_DEFAULTS,
    tab: canReadUsers ? "users" : "change-plan",
  });

  const rawTab = filters.tab as MainTab;
  const mainTab: MainTab =
    rawTab === "users" ||
    rawTab === "upcoming-renewals" ||
    rawTab === "payments"
      ? canReadUsers
        ? rawTab
        : canReadChange
          ? "change-plan"
          : "users"
      : rawTab === "change-plan" || rawTab === "converted"
        ? canReadChange
          ? rawTab
          : canReadUsers
            ? "users"
            : "change-plan"
        : canReadUsers
          ? "users"
          : "change-plan";

  const setMainTab = (tab: MainTab) => setFilters({ tab });

  const q = filters.q;
  const startsFrom = filters.startsFrom;
  const startsTo = filters.startsTo;
  const endsFrom = filters.endsFrom;
  const endsTo = filters.endsTo;
  const userStatus = USER_STATUS_OPTIONS.some((o) => o.value === filters.status)
    ? filters.status
    : "";
  const planCode = filters.planCode;
  const roleFilter = filters.role;
  const appliedForFilter = filters.appliedFor;
  const usersRemarkBy = filters.remarkBy;
  const usersCallStatus = filters.callStatus;
  const changeCallStatus = filters.cCallStatus;
  const convertedCallStatus = filters.vCallStatus;
  const badgeFilter = filters.badge;
  const payKind = filters.payKind || "";
  const payRole = filters.pRole;
  const payPlanCode = filters.pPlanCode;
  const payAppliedFor = filters.pAppliedFor;
  const payQ = filters.pq;
  const upcomingQ = filters.uq;
  const upcomingAutopay = (
    filters.uAutopay === "on" || filters.uAutopay === "off"
      ? filters.uAutopay
      : ""
  ) as "" | "on" | "off";
  const upcomingPlanCode = filters.uPlanCode;
  const upcomingRole = filters.uRole;
  const changeQ = filters.cq;
  const changePlanCode = filters.cPlanCode;
  const changeRole = filters.cRole;
  const changeAppliedFor = filters.cAppliedFor;
  const changeRemarkBy = filters.cRemarkBy;
  const changeRenewal = (
    filters.cRenewal === "on" || filters.cRenewal === "off"
      ? filters.cRenewal
      : ""
  ) as "" | "on" | "off";
  const convertedQ = filters.vq;
  const convertedPlanCode = filters.vPlanCode;
  const convertedRole = filters.vRole;
  const convertedAppliedFor = filters.vAppliedFor;
  const convertedRemarkBy = filters.vRemarkBy;
  const payTxnFrom = filters.pTxnFrom;
  const payTxnTo = filters.pTxnTo;
  const payStartFrom = filters.pStartFrom;
  const payStartTo = filters.pStartTo;
  const upcomingStartFrom = filters.uStartFrom;
  const upcomingStartTo = filters.uStartTo;
  const upcomingEndFrom = filters.uEndFrom;
  const upcomingEndTo = filters.uEndTo;
  const changeTxnFrom = filters.cTxnFrom;
  const changeTxnTo = filters.cTxnTo;
  const changeStartFrom = filters.cStartFrom;
  const changeStartTo = filters.cStartTo;
  const convertedTxnFrom = filters.vTxnFrom;
  const convertedTxnTo = filters.vTxnTo;
  const convertedStartFrom = filters.vStartFrom;
  const convertedStartTo = filters.vStartTo;

  // User Detail
  const [users, setUsers] = useState<TrackingUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [usersLimit, setUsersLimit] = useState(20);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [qDraft, setQDraft] = useState(q);
  const [filterCounts, setFilterCounts] = useState<TrackingFilterCounts | null>(
    null,
  );
  const [payments, setPayments] = useState<TrackingPaymentRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsLimit, setPaymentsLimit] = useState(20);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [paymentsTotalPages, setPaymentsTotalPages] = useState(1);
  const [paymentsFilterCounts, setPaymentsFilterCounts] =
    useState<TrackingFilterCounts | null>(null);
  const [paymentsCounts, setPaymentsCounts] = useState<TabCount | null>(null);
  const [payQDraft, setPayQDraft] = useState(payQ);

  // Upcoming renewals
  const [upcoming, setUpcoming] = useState<ChangePlanRow[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [upcomingError, setUpcomingError] = useState("");
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [upcomingLimit, setUpcomingLimit] = useState(20);
  const [upcomingTotal, setUpcomingTotal] = useState(0);
  const [upcomingTotalPages, setUpcomingTotalPages] = useState(1);
  const [upcomingQDraft, setUpcomingQDraft] = useState(upcomingQ);
  const [upcomingFilterOptions, setUpcomingFilterOptions] =
    useState<TrackingFilterOptions | null>(null);
  const [upcomingFilterCounts, setUpcomingFilterCounts] =
    useState<TrackingFilterCounts | null>(null);

  // Payment failed
  const [changeItems, setChangeItems] = useState<ChangePlanRow[]>([]);
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeError, setChangeError] = useState("");
  const [changePage, setChangePage] = useState(1);
  const [changeLimit, setChangeLimit] = useState(20);
  const [changeTotal, setChangeTotal] = useState(0);
  const [changeTotalPages, setChangeTotalPages] = useState(1);
  const [changeCounts, setChangeCounts] = useState<TabCount | null>(null);
  const [changeQDraft, setChangeQDraft] = useState(changeQ);
  const [changeFilterOptions, setChangeFilterOptions] =
    useState<TrackingFilterOptions | null>(null);
  const [changeFilterCounts, setChangeFilterCounts] =
    useState<TrackingFilterCounts | null>(null);

  // Converted
  const [convertedItems, setConvertedItems] = useState<ChangePlanRow[]>([]);
  const [convertedLoading, setConvertedLoading] = useState(false);
  const [convertedError, setConvertedError] = useState("");
  const [convertedPage, setConvertedPage] = useState(1);
  const [convertedLimit, setConvertedLimit] = useState(20);
  const [convertedTotal, setConvertedTotal] = useState(0);
  const [convertedTotalPages, setConvertedTotalPages] = useState(1);
  const [convertedCounts, setConvertedCounts] = useState<TabCount | null>(null);
  const [convertedQDraft, setConvertedQDraft] = useState(convertedQ);
  const [convertedFilterOptions, setConvertedFilterOptions] =
    useState<TrackingFilterOptions | null>(null);
  const [convertedFilterCounts, setConvertedFilterCounts] =
    useState<TrackingFilterCounts | null>(null);
  /** id → name of authors seen in earlier responses, for a selected author missing from the latest list. */
  const [remarkAuthorNames, setRemarkAuthorNames] = useState<Record<string, string>>({});

  // Dialogs
  const [remarkFor, setRemarkFor] = useState<ChangePlanRow | null>(null);
  const [remarkText, setRemarkText] = useState("");
  const [remarkBusy, setRemarkBusy] = useState(false);
  const [remarkError, setRemarkError] = useState("");
  const [remarkListFor, setRemarkListFor] = useState<ChangePlanRow | null>(
    null,
  );
  const [attemptsFor, setAttemptsFor] = useState<ChangePlanRow | null>(null);
  const { requestClose: requestRemarkClose, dialog: remarkUnsavedDialog } =
    useDialogUnsavedGuard(Boolean(remarkFor) && remarkText.trim().length > 0);

  const closeRemarkDialog = async () => {
    const ok = await requestRemarkClose();
    if (!ok) return;
    setRemarkFor(null);
    setRemarkText("");
    setRemarkError("");
  };

  const resolveAutopay = (v: "" | "on" | "off") =>
    v === "on" ? true : v === "off" ? false : undefined;

  const loadUsers = useCallback(async () => {
    if (!canReadUsers) return;
    setUsersLoading(true);
    setUsersError("");
    try {
      const result = await subscriptionTrackingService.listUsers({
        page: usersPage,
        limit: usersLimit,
        q: q || undefined,
        startsFrom: startsFrom || undefined,
        startsTo: startsTo || undefined,
        endsFrom: endsFrom || undefined,
        endsTo: endsTo || undefined,
        ...userStatusParams(userStatus),
        planCode: roleFilter ? planCode || undefined : undefined,
        role: roleFilter || undefined,
        appliedFor: appliedForFilter || undefined,
        remarksAddedBy: usersRemarkBy || undefined,
        callStatus: usersCallStatus || undefined,
        badge: badgeFilter || undefined,
      });
      setUsers(result.items);
      setUsersTotal(result.meta.total);
      setUsersTotalPages(result.meta.totalPages);
      setRemarkAuthorNames((prev) => withRemarkAuthors(prev, result.filterCounts));
      setFilterCounts(result.filterCounts || null);
    } catch (err) {
      setUsersError(subscriptionTrackingApiError(err, "Failed to load users."));
      setUsers([]);
      setUsersTotal(0);
      setUsersTotalPages(1);
    } finally {
      setUsersLoading(false);
    }
  }, [
    canReadUsers,
    q,
    startsFrom,
    startsTo,
    endsFrom,
    endsTo,
    userStatus,
    planCode,
    roleFilter,
    appliedForFilter,
    usersRemarkBy,
    usersCallStatus,
    badgeFilter,
    usersPage,
    usersLimit,
  ]);

  const loadPayments = useCallback(async () => {
    if (!canReadUsers) return;
    setPaymentsLoading(true);
    setPaymentsError("");
    try {
      const [result, counts] = await Promise.all([
        subscriptionTrackingService.listPayments({
          page: paymentsPage,
          limit: paymentsLimit,
          status: "success",
          kind: payKind || undefined,
          role: payRole || undefined,
          planCode: payRole ? payPlanCode || undefined : undefined,
          appliedFor: payAppliedFor || undefined,
          q: payQ || undefined,
          txnFrom: payTxnFrom || undefined,
          txnTo: payTxnTo || undefined,
          startsFrom: payStartFrom || undefined,
          startsTo: payStartTo || undefined,
        }),
        subscriptionTrackingService
          .getSuccessPaymentsCounts()
          .catch(() => null),
      ]);
      if (counts) setPaymentsCounts(counts);
      setPayments(
        [...result.items].sort((a, b) =>
          String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
        ),
      );
      setPaymentsTotal(result.meta.total);
      setPaymentsTotalPages(result.meta.totalPages);
      setPaymentsFilterCounts(result.filterCounts || null);
    } catch (err) {
      setPaymentsError(
        subscriptionTrackingApiError(err, "Failed to load payments."),
      );
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, [
    canReadUsers,
    paymentsPage,
    paymentsLimit,
    payKind,
    payRole,
    payPlanCode,
    payAppliedFor,
    payQ,
    payTxnFrom,
    payTxnTo,
    payStartFrom,
    payStartTo,
  ]);

  const loadUpcoming = useCallback(async () => {
    if (!canReadUsers) return;
    setUpcomingLoading(true);
    setUpcomingError("");
    try {
      const autopayEnabled = resolveAutopay(upcomingAutopay);
      const dates = {
        startsFrom: upcomingStartFrom || undefined,
        startsTo: upcomingStartTo || undefined,
        endsFrom: upcomingEndFrom || undefined,
        endsTo: upcomingEndTo || undefined,
      };
      const [result, facets, counts] = await Promise.all([
        subscriptionTrackingService.listUpcomingRenewals({
          page: upcomingPage,
          limit: upcomingLimit,
          q: upcomingQ || undefined,
          autopayEnabled,
          planCode: upcomingRole ? upcomingPlanCode || undefined : undefined,
          role: upcomingRole || undefined,
          ...dates,
        }),
        subscriptionTrackingService.getUpcomingRenewalsFilterOptions({
          q: upcomingQ || undefined,
          autopayEnabled,
          planCode: upcomingPlanCode || undefined,
          ...dates,
        }),
        subscriptionTrackingService.getUpcomingRenewalsCounts({
          q: upcomingQ || undefined,
          autopayEnabled,
          planCode: upcomingPlanCode || undefined,
          ...dates,
        }),
      ]);
      setUpcoming(result.items);
      setUpcomingTotal(result.meta.total || counts.total);
      setUpcomingTotalPages(result.meta.totalPages);
      setUpcomingFilterOptions(facets);
      setUpcomingFilterCounts(result.filterCounts || null);
    } catch (err) {
      setUpcomingError(
        subscriptionTrackingApiError(err, "Failed to load upcoming renewals."),
      );
      setUpcoming([]);
      setUpcomingTotal(0);
      setUpcomingTotalPages(1);
    } finally {
      setUpcomingLoading(false);
    }
  }, [
    canReadUsers,
    upcomingPage,
    upcomingLimit,
    upcomingQ,
    upcomingAutopay,
    upcomingPlanCode,
    upcomingRole,
    upcomingStartFrom,
    upcomingStartTo,
    upcomingEndFrom,
    upcomingEndTo,
  ]);

  const loadChangePlan = useCallback(async () => {
    if (!canReadChange) return;
    setChangeLoading(true);
    setChangeError("");
    try {
      const dates = {
        txnFrom: changeTxnFrom || undefined,
        txnTo: changeTxnTo || undefined,
        startsFrom: changeStartFrom || undefined,
        startsTo: changeStartTo || undefined,
      };
      const [result, counts, facets] = await Promise.all([
        subscriptionTrackingService.listChangePlan({
          ...dates,
          page: changePage,
          limit: changeLimit,
          q: changeQ || undefined,
          planCode: changeRole ? changePlanCode || undefined : undefined,
          role: changeRole || undefined,
          appliedFor: changeAppliedFor || undefined,
          remarksAddedBy: changeRemarkBy || undefined,
          callStatus: changeCallStatus || undefined,
          renewal:
            changeRenewal === "on"
              ? true
              : changeRenewal === "off"
                ? false
                : undefined,
        }),
        subscriptionTrackingService.getChangePlanCounts(),
        subscriptionTrackingService.getChangePlanFilterOptions({
          q: changeQ || undefined,
          planCode: changePlanCode || undefined,
          ...dates,
        }),
      ]);
      setChangeItems(result.items);
      setChangeTotal(result.meta.total);
      setChangeTotalPages(result.meta.totalPages);
      setChangeCounts(counts);
      setChangeFilterOptions(facets);
      setRemarkAuthorNames((prev) => withRemarkAuthors(prev, result.filterCounts));
      setChangeFilterCounts(result.filterCounts || null);
    } catch (err) {
      setChangeError(
        subscriptionTrackingApiError(
          err,
          "Failed to load payment failed queue.",
        ),
      );
      setChangeItems([]);
      setChangeTotal(0);
      setChangeTotalPages(1);
    } finally {
      setChangeLoading(false);
    }
  }, [
    canReadChange,
    changePage,
    changeLimit,
    changeQ,
    changePlanCode,
    changeRole,
    changeAppliedFor,
    changeRemarkBy,
    changeCallStatus,
    changeRenewal,
    changeTxnFrom,
    changeTxnTo,
    changeStartFrom,
    changeStartTo,
  ]);

  const loadConverted = useCallback(async () => {
    if (!canReadChange) return;
    setConvertedLoading(true);
    setConvertedError("");
    try {
      const dates = {
        txnFrom: convertedTxnFrom || undefined,
        txnTo: convertedTxnTo || undefined,
        startsFrom: convertedStartFrom || undefined,
        startsTo: convertedStartTo || undefined,
      };
      const [result, counts, facets] = await Promise.all([
        subscriptionTrackingService.listConverted({
          ...dates,
          page: convertedPage,
          limit: convertedLimit,
          q: convertedQ || undefined,
          planCode: convertedRole ? convertedPlanCode || undefined : undefined,
          role: convertedRole || undefined,
          appliedFor: convertedAppliedFor || undefined,
          remarksAddedBy: convertedRemarkBy || undefined,
          callStatus: convertedCallStatus || undefined,
        }),
        subscriptionTrackingService.getConvertedCounts(),
        subscriptionTrackingService.getConvertedFilterOptions({
          q: convertedQ || undefined,
          planCode: convertedPlanCode || undefined,
          ...dates,
        }),
      ]);
      setConvertedItems(result.items);
      setConvertedTotal(result.meta.total);
      setConvertedTotalPages(result.meta.totalPages);
      setConvertedCounts(counts);
      setConvertedFilterOptions(facets);
      setRemarkAuthorNames((prev) => withRemarkAuthors(prev, result.filterCounts));
      setConvertedFilterCounts(result.filterCounts || null);
    } catch (err) {
      setConvertedError(
        subscriptionTrackingApiError(err, "Failed to load converted users."),
      );
      setConvertedItems([]);
      setConvertedTotal(0);
      setConvertedTotalPages(1);
    } finally {
      setConvertedLoading(false);
    }
  }, [
    canReadChange,
    convertedPage,
    convertedLimit,
    convertedQ,
    convertedPlanCode,
    convertedRole,
    convertedAppliedFor,
    convertedRemarkBy,
    convertedCallStatus,
    convertedTxnFrom,
    convertedTxnTo,
    convertedStartFrom,
    convertedStartTo,
  ]);

  useEffect(() => {
    if (mainTab === "users") void loadUsers();
  }, [mainTab, loadUsers]);

  useEffect(() => {
    if (mainTab === "payments") void loadPayments();
  }, [mainTab, loadPayments]);

  useEffect(() => {
    if (mainTab === "upcoming-renewals") void loadUpcoming();
  }, [mainTab, loadUpcoming]);

  useEffect(() => {
    if (mainTab === "change-plan") void loadChangePlan();
  }, [mainTab, loadChangePlan]);

  useEffect(() => {
    if (mainTab === "converted") void loadConverted();
  }, [mainTab, loadConverted]);

  useEffect(() => {
    if (!canReadChange) return;
    void Promise.all([
      subscriptionTrackingService.getChangePlanCounts(),
      subscriptionTrackingService.getConvertedCounts(),
    ])
      .then(([change, converted]) => {
        setChangeCounts(change);
        setConvertedCounts(converted);
      })
      .catch(() => undefined);
  }, [canReadChange]);

  useEffect(() => {
    if (!canReadUsers) return;
    void subscriptionTrackingService
      .getUpcomingRenewalsCounts()
      .then((c) => setUpcomingTotal((prev) => (prev ? prev : c.total)))
      .catch(() => undefined);
    void subscriptionTrackingService
      .getSuccessPaymentsCounts()
      .then(setPaymentsCounts)
      .catch(() => undefined);
  }, [canReadUsers]);

  const patchQueueRow = (
    matcher: ChangePlanRow,
    patch: Partial<ChangePlanRow>,
  ) => {
    const apply = (prev: ChangePlanRow[]) =>
      prev.map((row) =>
        row.ref === matcher.ref || row.userId === matcher.userId
          ? { ...row, ...patch }
          : row,
      );
    setChangeItems(apply);
    setConvertedItems(apply);
    setUpcoming(apply);
    setPayments((prev) =>
      prev.map((row) => {
        const rowRef = row.ref || `order:${row.id}`;
        if (rowRef !== matcher.ref && `order:${row.id}` !== matcher.ref)
          return row;
        return {
          ...row,
          ref: patch.ref || row.ref,
          remarks: patch.remarks ?? row.remarks,
          remarksCount: patch.remarksCount ?? row.remarksCount,
          remarksAddedBy: patch.remarksAddedBy ?? row.remarksAddedBy,
          latestRemark: patch.latestRemark ?? row.latestRemark,
          callStatus: patch.callStatus ?? row.callStatus,
          callStatusLabel: patch.callStatusLabel ?? row.callStatusLabel,
          callStatusEditable:
            patch.callStatusEditable ?? row.callStatusEditable,
          callStatusUpdatedAt:
            patch.callStatusUpdatedAt ?? row.callStatusUpdatedAt,
          callStatusUpdatedByName:
            patch.callStatusUpdatedByName ?? row.callStatusUpdatedByName,
          isNew: patch.isNew ?? row.isNew,
        };
      }),
    );
    setRemarkListFor((cur) =>
      cur && (cur.ref === matcher.ref || cur.userId === matcher.userId)
        ? { ...cur, ...patch }
        : cur,
    );
  };

  const submitRemark = async () => {
    if (!remarkFor || !remarkText.trim() || remarkBusy) return;
    setRemarkBusy(true);
    setRemarkError("");
    try {
      const updated = await subscriptionTrackingService.addChangePlanRemark(
        remarkFor.ref,
        remarkText.trim(),
      );
      const latestRemark: TrackingRemark | null =
        updated.remarks.length > 0
          ? updated.remarks[updated.remarks.length - 1]
          : null;
      const wasNew = !!remarkFor.isNew;
      patchQueueRow(remarkFor, {
        ref: updated.ref,
        remarks: updated.remarks,
        remarksCount: updated.remarksCount,
        remarksAddedBy: updated.remarksAddedBy || null,
        latestRemark,
        isNew: false,
        callStatus: updated.callStatus || remarkFor.callStatus,
        callStatusLabel: updated.callStatusLabel || remarkFor.callStatusLabel,
        callStatusEditable:
          updated.callStatusEditable ??
          updated.remarks.some((r) => !!r.createdById),
        callStatusUpdatedAt:
          updated.callStatusUpdatedAt || remarkFor.callStatusUpdatedAt,
        callStatusUpdatedByName:
          updated.callStatusUpdatedByName || remarkFor.callStatusUpdatedByName,
      });
      if (wasNew && remarkFor.ref.startsWith("order:")) {
        void subscriptionTrackingService
          .getSuccessPaymentsCounts()
          .then(setPaymentsCounts)
          .catch(() => undefined);
      }
      if (wasNew) {
        void Promise.all([
          subscriptionTrackingService.getChangePlanCounts(),
          subscriptionTrackingService.getConvertedCounts(),
        ])
          .then(([change, converted]) => {
            setChangeCounts(change);
            setConvertedCounts(converted);
          })
          .catch(() => undefined);
      }
      setRemarkFor(null);
      setRemarkText("");
    } catch (err) {
      setRemarkError(
        subscriptionTrackingApiError(err, "Failed to add remark."),
      );
    } finally {
      setRemarkBusy(false);
    }
  };

  const handleCallStatus = async (
    row: ChangePlanRow,
    callStatus: CallStatus,
  ) => {
    try {
      const updated =
        await subscriptionTrackingService.updateChangePlanCallStatus(
          row.ref,
          callStatus,
        );
      const wasNew = !!row.isNew;
      patchQueueRow(row, {
        ref: updated.ref,
        callStatus: updated.callStatus,
        callStatusLabel: updated.callStatusLabel,
        callStatusEditable: updated.callStatusEditable,
        callStatusUpdatedAt: updated.callStatusUpdatedAt || null,
        callStatusUpdatedByName: updated.callStatusUpdatedByName || null,
        remarks: updated.remarks.length ? updated.remarks : row.remarks,
        remarksCount: updated.remarks.length || row.remarksCount,
        isNew: false,
      });
      if (wasNew) {
        void Promise.all([
          subscriptionTrackingService.getChangePlanCounts(),
          subscriptionTrackingService.getConvertedCounts(),
        ])
          .then(([change, converted]) => {
            setChangeCounts(change);
            setConvertedCounts(converted);
          })
          .catch(() => undefined);
      }
    } catch (err) {
      window.alert(
        subscriptionTrackingApiError(err, "Failed to update call status."),
      );
    }
  };

  const refreshCurrent = () => {
    if (mainTab === "users") void loadUsers();
    else if (mainTab === "payments") void loadPayments();
    else if (mainTab === "upcoming-renewals") void loadUpcoming();
    else if (mainTab === "change-plan") void loadChangePlan();
    else void loadConverted();
  };

  const resetCurrent = () => {
    if (mainTab === "users") {
      setQDraft("");
      setFilters({
        q: "",
        startsFrom: "",
        startsTo: "",
        endsFrom: "",
        endsTo: "",
        status: "",
        planCode: "",
        role: "",
        appliedFor: "",
        remarkBy: "",
        callStatus: "",
        badge: "",
      });
      setUsersPage(1);
    } else if (mainTab === "payments") {
      setPayQDraft("");
      setFilters({
        payStatus: "success",
        payOverview: "",
        payKind: "",
        pRole: "",
        pPlanCode: "",
        pAppliedFor: "",
        pq: "",
        pTxnFrom: "",
        pTxnTo: "",
        pStartFrom: "",
        pStartTo: "",
      });
      setPaymentsPage(1);
    } else if (mainTab === "upcoming-renewals") {
      setUpcomingQDraft("");
      setFilters({
        uq: "",
        uAutopay: "",
        uPlanCode: "",
        uRole: "",
        uStartFrom: "",
        uStartTo: "",
        uEndFrom: "",
        uEndTo: "",
      });
      setUpcomingPage(1);
    } else if (mainTab === "change-plan") {
      setChangeQDraft("");
      setFilters({
        cq: "",
        cPlanCode: "",
        cRole: "",
        cAppliedFor: "",
        cRemarkBy: "",
        cCallStatus: "",
        cRenewal: "",
        cTxnFrom: "",
        cTxnTo: "",
        cStartFrom: "",
        cStartTo: "",
      });
      setChangePage(1);
    } else {
      setConvertedQDraft("");
      setFilters({
        vq: "",
        vPlanCode: "",
        vRole: "",
        vAppliedFor: "",
        vRemarkBy: "",
        vCallStatus: "",
        vTxnFrom: "",
        vTxnTo: "",
        vStartFrom: "",
        vStartTo: "",
      });
      setConvertedPage(1);
    }
  };

  const currentLoading =
    mainTab === "users"
      ? usersLoading
      : mainTab === "payments"
        ? paymentsLoading
        : mainTab === "upcoming-renewals"
          ? upcomingLoading
          : mainTab === "change-plan"
            ? changeLoading
            : convertedLoading;

  const renderCascade = ({
    role,
    planCode: selectedPlan,
    appliedFor,
    counts,
    onRole,
    onPlan,
    onApplied,
    showApplied = true,
    onPageReset,
  }: {
    role: string;
    planCode: string;
    appliedFor?: string;
    counts: TrackingFilterCounts | null;
    onRole: (v: string) => void;
    onPlan: (v: string) => void;
    onApplied?: (v: string) => void;
    showApplied?: boolean;
    onPageReset: () => void;
  }) => {
    const totals = counts?.totals;
    const rolePlans = role ? PLANS_BY_ROLE[role] || [] : [];
    const extraPlans = Object.keys(counts?.plans || {})
      .filter((code) => role && !rolePlans.some((p) => p.code === code))
      .map((code) => ({ code, label: labelize(code) }));
    const plans = [...rolePlans, ...extraPlans];
    return (
      <>
        <div>
          <label className="mb-1 block text-xs text-gray-500">User Role</label>
          <CountedSelect
            value={role || "all"}
            options={[
              { value: "all", label: "All", count: totals?.role },
              { value: "agent", label: "Agent", count: counts?.roles?.agent ?? 0 },
              {
                value: "direct_builder",
                label: "Direct Builder",
                count: counts?.roles?.directBuilder ?? 0,
              },
              {
                value: "developer",
                label: "Developer",
                count: counts?.roles?.developer ?? 0,
              },
            ]}
            onValueChange={(v) => {
              onRole(v === "all" ? "" : v);
              onPlan("");
              onApplied?.("");
              onPageReset();
            }}
          />
        </div>
        {role ? (
          <div>
            <label className="mb-1 block text-xs text-gray-500">Plan</label>
            <CountedSelect
              value={selectedPlan || "all"}
              className="min-w-[160px]"
              options={[
                { value: "all", label: "All plans", count: totals?.plan },
                ...plans.map((plan) => ({
                  value: plan.code,
                  label: plan.label,
                  count: counts?.plans?.[plan.code] ?? 0,
                })),
              ]}
              onValueChange={(v) => {
                onPlan(v === "all" ? "" : v);
                onPageReset();
              }}
            />
          </div>
        ) : null}
        {showApplied ? (
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Applied For
            </label>
            <CountedSelect
              value={appliedFor || "all"}
              className="min-w-[160px]"
              options={[
                { value: "all", label: "All", count: totals?.appliedFor },
                {
                  value: "renewal",
                  label: "Renewal",
                  count: counts?.appliedFor?.renewal ?? 0,
                },
                {
                  value: "plan_change",
                  label: "Plan Change",
                  count: counts?.appliedFor?.plan_change ?? 0,
                },
                {
                  value: "payment_mode",
                  label: "Payment Mode",
                  count: counts?.appliedFor?.payment_mode ?? 0,
                },
              ]}
              onValueChange={(v) => {
                onApplied?.(v === "all" ? "" : v);
                onPageReset();
              }}
            />
          </div>
        ) : null}
      </>
    );
  };

  const renderCallStatusFilter = (
    value: string,
    onChange: (v: string) => void,
    counts: TrackingFilterCounts | null,
  ) => {
    const statuses = (counts?.callStatuses || [])
      .map((s) => ({
        value: String(s.value || ""),
        label: String(s.label || s.value || ""),
        count: Number(s.count) || 0,
      }))
      .filter((s) => s.value);
    const options: CountedOption[] = [
      { value: "all", label: "All", count: counts?.totals?.callStatus },
      ...statuses,
    ];
    if (value && !statuses.some((s) => s.value === value)) {
      options.push({ value, label: labelize(value), count: 0 });
    }
    return (
      <div>
        <label className="mb-1 block text-xs text-gray-500">Call status</label>
        <CountedSelect
          value={value || "all"}
          className="min-w-[170px]"
          options={options}
          onValueChange={(v) => onChange(v === "all" ? "" : v)}
        />
      </div>
    );
  };

  const renderRemarkAuthorFilter = (
    value: string,
    onChange: (v: string) => void,
    counts: TrackingFilterCounts | null,
    total: number,
  ) => {
    const authors = (counts?.remarkAuthors || [])
      .map((a) => ({
        value: String(a.id || ""),
        label: String(a.name || "Unknown"),
        count: Number(a.count) || 0,
      }))
      .filter((a) => a.value);
    const options: CountedOption[] = [
      {
        value: "all",
        label: "All",
        count: counts?.totals?.remarksAddedBy ?? (value ? undefined : total),
      },
      ...authors,
    ];
    if (value && !authors.some((a) => a.value === value)) {
      options.push({
        value,
        label: remarkAuthorNames[value] || "Selected author",
        count: 0,
      });
    }
    return (
      <div>
        <label className="mb-1 block text-xs text-gray-500">Remarks added by</label>
        <CountedSelect
          value={value || "all"}
          className="min-w-[180px]"
          options={options}
          onValueChange={(v) => onChange(v === "all" ? "" : v)}
        />
        {counts && !authors.length ? (
          <p className="mt-1 text-[11px] text-gray-400">No remarks added yet</p>
        ) : null}
      </div>
    );
  };

  const renderUserRows = (rows: TrackingUserRow[]) => (
    <table className="min-w-full text-left text-sm">
      <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
        <tr>
          <th className="min-w-[220px] px-4 py-3 font-medium">Name</th>
          <th className="px-4 py-3 font-medium">Contact</th>
          <th className="px-4 py-3 font-medium">Plan</th>
          <th className="px-4 py-3 font-medium">badge</th>
          <th className="px-4 py-3 font-medium">Action</th>
          <th className="px-4 py-3 font-medium">Applied For</th>
          <th className="px-4 py-3 font-medium">Expiry</th>
          <th className="px-4 py-3 font-medium">Plan started</th>
          <th className="px-4 py-3 font-medium">Period end</th>
          <th className="px-4 py-3 font-medium">Autopay</th>
          <th className="px-4 py-3 font-medium">Decline count</th>
          <th className="px-4 py-3 font-medium">Convert</th>
          <th className="px-4 py-3 font-medium">Call status</th>
          <th className="min-w-[200px] px-4 py-3 font-medium">Remarks</th>
          <th className="px-4 py-3 font-medium">Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.userId}
            className="border-b border-gray-50 last:border-0"
          >
            <td className="min-w-[220px] px-4 py-3">
              <p className="whitespace-nowrap font-medium text-gray-900">
                {row.name || "Unknown"}
              </p>
              {row.currentPlan || row.planCode ? (
                <p className="text-[11px] font-medium text-gray-600">
                  {labelize(row.currentPlan || row.planCode)}
                </p>
              ) : null}
              {row.withoutReferral || row.userStatus === "without_referral" ? (
                <span className="mt-1 inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-800">
                  Without referral
                </span>
              ) : null}
              <AppliedForUnderName af={row.appliedFor} />
            </td>
            <td className="px-4 py-3 text-gray-700">
              <ContactCell contact={row.contact} email={row.email} revealKey={`subscribe-now:users:${row.userId}`} />
            </td>
            <td className="px-4 py-3 text-gray-700">
              {labelize(row.currentPlan || row.planCode)}
            </td>
            <td className="px-4 py-3 text-gray-700">{labelize(row.badge)}</td>
            <td className="px-4 py-3 text-gray-700">{labelize(row.action)}</td>
            <td className="px-4 py-3 text-gray-700">
              {formatAppliedFor(row.appliedFor)}
            </td>
            <td className="px-4 py-3 text-gray-700">
              {row.expiry?.expired
                ? "Expired"
                : row.expiry?.expiring
                  ? "Expiring"
                  : "—"}
            </td>
            <td className="px-4 py-3 text-gray-600">
              {formatDateTime(row.planStartedAt)}
            </td>
            <td className="px-4 py-3 text-gray-600">
              {formatDateTime(row.currentPeriodEnd)}
            </td>
            <td className="px-4 py-3 text-gray-700">
              {row.autopayEnabled ? (
                "On"
              ) : (
                <span className="inline-flex flex-col gap-0.5">
                  <span>Off</span>
                  {row.billingState === "autopay_cancelled" ? (
                    <span className="text-[10px] text-amber-700">
                      Renew Autopay not linked
                    </span>
                  ) : null}
                </span>
              )}
            </td>
            <td className="px-4 py-3 text-gray-700">
              {row.openDeclineCount || 0}
            </td>
            <td className="px-4 py-3">
              {row.convertLabel ? (
                <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                  {row.convertLabel}
                </span>
              ) : (
                "—"
              )}
            </td>
            <td className="px-4 py-3 text-gray-700">
              {row.callStatusLabel || row.callStatus ? (
                <span
                  className="whitespace-nowrap"
                  title={
                    [
                      row.callStatusUpdatedByName
                        ? `Updated by ${row.callStatusUpdatedByName}`
                        : "",
                      row.callStatusUpdatedAt
                        ? formatDateTime(row.callStatusUpdatedAt)
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" · ") || undefined
                  }
                >
                  {row.callStatusLabel || labelize(row.callStatus)}
                </span>
              ) : (
                "—"
              )}
            </td>
            <td className="min-w-[200px] max-w-[280px] px-4 py-3">
              {row.latestRemark ? (
                <>
                  <p className="line-clamp-2 text-gray-800" title={row.latestRemark.text}>
                    {row.latestRemark.text}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {[
                      row.latestRemark.createdByName || row.remarksAddedBy,
                      row.latestRemark.createdAt
                        ? formatDateTime(row.latestRemark.createdAt)
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </td>
            <td className="px-4 py-3">
              <Link
                href={profileHref(row.userId)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                <ExternalLink className="mr-1.5 size-3.5" />
                Open profile
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderQueueTable = (
    items: ChangePlanRow[],
    opts: {
      showConvertBadge?: boolean;
      failedLayout?: boolean;
      hideRemarkAdd?: boolean;
      hideFollowUp?: boolean;
    } = {},
  ) => (
    <table className="min-w-full text-left text-sm">
      <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
        <tr>
          <th className="min-w-[220px] px-4 py-4 font-semibold text-gray-700">
            Name
          </th>
          <th className="px-4 py-4 font-semibold text-gray-700">Contact</th>
          <th className="px-4 py-4 font-semibold text-gray-700">Applied For</th>
          {opts.failedLayout ? (
            <th className="px-4 py-4 font-semibold text-gray-700">
              Transaction Amount
            </th>
          ) : null}
          <th className="px-4 py-4 font-semibold text-gray-700">
            Transaction date
          </th>
          <th className="px-4 py-4 font-semibold text-gray-700">
            Plan started
          </th>
          <th className="px-4 py-4 font-semibold text-gray-700">Attempts</th>
          {opts.hideFollowUp ? null : (
            <>
              <th className="px-4 py-4 font-semibold text-gray-700">
                Call status
              </th>
              <th className="px-4 py-4 font-semibold text-gray-700">Remarks</th>
              <th className="px-4 py-4 font-semibold text-gray-700">
                Remarks added by
              </th>
            </>
          )}
          <th className="w-[88px] px-3 py-4 text-right font-semibold text-gray-700">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {items.map((row) => {
          const attempts = row.attempts || [];
          const attemptCount = row.attemptCount ?? attempts.length;
          const latest = row.latestRemark;
          const callStatus = (row.callStatus || "not_contacted") as CallStatus;
          const callLabel =
            CALL_STATUS_OPTIONS.find((o) => o.value === callStatus)?.label ||
            row.callStatusLabel ||
            "Not Contacted";
          const statusDisabled =
            !canUpdateChange ||
            !(row.callStatusEditable ?? row.remarksCount > 0);
          const addedBy =
            row.remarksAddedBy ||
            latest?.createdByName ||
            row.remarks[row.remarks.length - 1]?.createdByName ||
            null;
          const addedAt =
            latest?.createdAt ||
            row.remarks[row.remarks.length - 1]?.createdAt ||
            null;
          const tags = kindTags(row.kinds);
          return (
            <tr key={row.ref} className="border-b border-gray-50 last:border-0">
              <td
                className={newFirstCellClass(
                  !!row.isNew,
                  "min-w-[220px] px-4 py-4",
                )}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="whitespace-nowrap font-medium text-gray-900">
                    {row.name || "Unknown"}
                  </p>
                  <NewTag show={!!row.isNew} />
                </div>
                {row.currentPlan || row.planCode ? (
                  <p className="text-[11px] font-medium text-gray-600">
                    {labelize(row.currentPlan || row.planCode)}
                  </p>
                ) : null}
                {row.action ? (
                  <p className="text-[11px] text-orange-700">
                    {labelize(row.action)}
                  </p>
                ) : tags.length ? (
                  <p className="text-[11px] text-orange-700">
                    {tags.join(" · ")}
                  </p>
                ) : null}
                <AppliedForUnderName af={row.appliedFor} />
                {opts.showConvertBadge && row.convertLabel ? (
                  <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                    {row.convertLabel}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-4 text-gray-700">
                <ContactCell contact={row.contact} email={row.email} revealKey={`subscribe-now:requests:${row.ref}`} />
              </td>
              <td className="px-4 py-4 font-medium text-gray-900">
                {formatAppliedFor(row.appliedFor)}
              </td>
              {opts.failedLayout ? (
                <td className="px-4 py-4 text-gray-700">
                  {row.transactionAmount == null ? "—" : row.transactionAmount}
                </td>
              ) : null}
              <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-600">
                {formatDateTime(row.occurredAt)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-600">
                {formatDateTime(row.planStartedAt)}
              </td>
              <td className="px-4 py-4">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!attemptCount}
                  onClick={() => setAttemptsFor(row)}
                >
                  {attemptCount}
                </Button>
              </td>
              {opts.hideFollowUp ? null : (
                <>
                  <td className="px-4 py-4">
                    <div className="min-w-[160px] space-y-1">
                      <Select
                        value={callStatus}
                        disabled={statusDisabled}
                        onValueChange={(v) => {
                          if (v) void handleCallStatus(row, v as CallStatus);
                        }}
                      >
                        <SelectTrigger
                          className="h-8 w-[168px] bg-white text-xs"
                          title={
                            statusDisabled
                              ? "Add at least one remark before updating Call Status"
                              : "Call Status"
                          }
                        >
                          <SelectValue>{callLabel}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {CALL_STATUS_OPTIONS.filter(
                            (o) =>
                              o.value !== "shifted_and_verified" &&
                              o.value !== "not_applicable" &&
                              o.value !== "added_by_admin",
                          ).map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {row.callStatusUpdatedByName ? (
                        <p className="text-[10px] text-gray-400">
                          By {row.callStatusUpdatedByName}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="min-w-[140px] max-w-[220px] space-y-1">
                      {latest?.text ? (
                        <p className="line-clamp-2 text-sm leading-snug text-gray-700">
                          {latest.text}
                        </p>
                      ) : row.remarksCount ? (
                        <p className="line-clamp-2 text-sm leading-snug text-gray-700">
                          {row.remarks[row.remarks.length - 1]?.text || "—"}
                        </p>
                      ) : (
                        <span className="text-xs text-gray-400">
                          No remarks
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {addedBy ? (
                      <div className="space-y-0.5">
                        <p className="text-sm text-gray-800">{addedBy}</p>
                        <p className="text-[11px] text-gray-500">
                          {formatDateTime(addedAt)}
                        </p>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </>
              )}
              <td className="w-[88px] px-3 py-4 text-right">
                <div className="flex items-center justify-end gap-0.5">
                  {canUpdateChange && !opts.hideRemarkAdd ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-primary hover:bg-primary-light hover:text-primary"
                      title="Add remark"
                      onClick={() => {
                        setRemarkFor(row);
                        setRemarkText("");
                        setRemarkError("");
                      }}
                    >
                      <MessageSquarePlus className="size-4" />
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-gray-500 hover:text-gray-700"
                    title="View remarks"
                    disabled={!row.remarksCount}
                    onClick={() => setRemarkListFor(row)}
                  >
                    <Eye className="size-4" />
                  </Button>
                  <Link
                    href={profileHref(row.userId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "text-gray-500 hover:text-gray-700",
                    )}
                    title="Open profile"
                  >
                    <ExternalLink className="size-4" />
                  </Link>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const renderUpcomingTable = (
    items: ChangePlanRow[],
    opts: { hideRemarkAdd?: boolean } = {},
  ) => (
    <table className="min-w-full text-left text-sm">
      <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
        <tr>
          <th className="min-w-[220px] px-4 py-4 font-semibold text-gray-700">
            Name
          </th>
          <th className="px-4 py-4 font-semibold text-gray-700">Contact</th>
          <th className="px-4 py-4 font-semibold text-gray-700">Plan</th>
          <th className="px-4 py-4 font-semibold text-gray-700">
            Plan started
          </th>
          <th className="px-4 py-4 font-semibold text-gray-700">Period end</th>
          <th className="px-4 py-4 font-semibold text-gray-700">Autopay</th>
          <th className="px-4 py-4 font-semibold text-gray-700">Call status</th>
          <th className="px-4 py-4 font-semibold text-gray-700">Remarks</th>
          <th className="px-4 py-4 font-semibold text-gray-700">
            Remarks added by
          </th>
          <th className="w-[88px] px-3 py-4 text-right font-semibold text-gray-700">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {items.map((row) => {
          const latest = row.latestRemark;
          const callStatus = (row.callStatus || "not_contacted") as CallStatus;
          const callLabel =
            CALL_STATUS_OPTIONS.find((o) => o.value === callStatus)?.label ||
            row.callStatusLabel ||
            "Not Contacted";
          const statusDisabled =
            !canUpdateChange ||
            !(row.callStatusEditable ?? row.remarksCount > 0);
          const addedBy =
            row.remarksAddedBy ||
            latest?.createdByName ||
            row.remarks[row.remarks.length - 1]?.createdByName ||
            null;
          const addedAt =
            latest?.createdAt ||
            row.remarks[row.remarks.length - 1]?.createdAt ||
            null;
          return (
            <tr key={row.ref} className="border-b border-gray-50 last:border-0">
              <td className="min-w-[220px] px-4 py-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="whitespace-nowrap font-medium text-gray-900">
                    {row.name || "Unknown"}
                  </p>
                </div>
                {row.convertLabel ? (
                  <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                    {row.convertLabel}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-4 text-gray-700">
                <ContactCell contact={row.contact} email={row.email} revealKey={`subscribe-now:payments:${row.ref}`} />
              </td>
              <td className="px-4 py-4 text-gray-700">
                {labelize(row.planCode)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-600">
                {formatDateTime(row.planStartedAt)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-600">
                {formatDateTime(row.currentPeriodEnd || row.occurredAt)}
              </td>
              <td className="px-4 py-4 text-gray-700">
                {row.autopayEnabled ? (
                  "On"
                ) : (
                  <span className="inline-flex flex-col gap-0.5">
                    <span>Off</span>
                    {row.billingState === "autopay_cancelled" ? (
                      <span className="text-[10px] text-amber-700">
                        Renew Autopay not linked
                      </span>
                    ) : null}
                  </span>
                )}
              </td>
              <td className="px-4 py-4">
                <div className="min-w-[160px] space-y-1">
                  <Select
                    value={callStatus}
                    disabled={statusDisabled}
                    onValueChange={(v) => {
                      if (v) void handleCallStatus(row, v as CallStatus);
                    }}
                  >
                    <SelectTrigger
                      className="h-8 w-[168px] bg-white text-xs"
                      title={
                        statusDisabled
                          ? "Add at least one remark before updating Call Status"
                          : "Call Status"
                      }
                    >
                      <SelectValue>{callLabel}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CALL_STATUS_OPTIONS.filter(
                        (o) =>
                          o.value !== "shifted_and_verified" &&
                          o.value !== "not_applicable" &&
                          o.value !== "added_by_admin",
                      ).map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {row.callStatusUpdatedByName ? (
                    <p className="text-[10px] text-gray-400">
                      By {row.callStatusUpdatedByName}
                    </p>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="min-w-[140px] max-w-[220px] space-y-1">
                  {latest?.text ? (
                    <p className="line-clamp-2 text-sm leading-snug text-gray-700">
                      {latest.text}
                    </p>
                  ) : row.remarksCount ? (
                    <p className="line-clamp-2 text-sm leading-snug text-gray-700">
                      {row.remarks[row.remarks.length - 1]?.text || "—"}
                    </p>
                  ) : (
                    <span className="text-xs text-gray-400">No remarks</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-4 text-gray-600">
                {addedBy ? (
                  <div className="space-y-0.5">
                    <p className="text-sm text-gray-800">{addedBy}</p>
                    <p className="text-[11px] text-gray-500">
                      {formatDateTime(addedAt)}
                    </p>
                  </div>
                ) : (
                  "—"
                )}
              </td>
              <td className="w-[88px] px-3 py-4 text-right">
                <div className="flex items-center justify-end gap-0.5">
                  {canUpdateChange && !opts.hideRemarkAdd ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-primary hover:bg-primary-light hover:text-primary"
                      title="Add remark"
                      onClick={() => {
                        setRemarkFor(row);
                        setRemarkText("");
                        setRemarkError("");
                      }}
                    >
                      <MessageSquarePlus className="size-4" />
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-gray-500 hover:text-gray-700"
                    title="View remarks"
                    disabled={!row.remarksCount}
                    onClick={() => setRemarkListFor(row)}
                  >
                    <Eye className="size-4" />
                  </Button>
                  <Link
                    href={profileHref(row.userId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "text-gray-500 hover:text-gray-700",
                    )}
                    title="Open profile"
                  >
                    <ExternalLink className="size-4" />
                  </Link>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <PermissionGuard
      permission={["subscriptions:read", "subscribe_now_tracking:read"]}
    >
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Breadcrumb
              items={[
                { label: "Dashboard", href: "/" },
                { label: "Subscription Tracking" },
              ]}
            />
            <h1 className="mt-2 text-2xl font-semibold text-gray-900">
              Subscription Tracking
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              User plan detail, payment failures, upcoming renewals, and
              converted users.
            </p>
          </div>
          <AdminListToolbar
            onRefresh={refreshCurrent}
            refreshBusy={currentLoading}
            onReset={resetCurrent}
          />
        </div>

        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTab)}>
          <TabsList className="h-auto min-h-9 w-full justify-start overflow-visible bg-gray-100 py-1 [&_[data-slot=tabs-trigger]]:flex-none">
            {canReadUsers ? (
              <TabsTrigger value="users">User Detail</TabsTrigger>
            ) : null}
            {canReadUsers ? (
              <TabsTrigger
                value="upcoming-renewals"
                className="relative overflow-visible"
              >
                <TrackingTabLabel
                  label="Upcoming renewals"
                  total={upcomingTotal}
                />
              </TabsTrigger>
            ) : null}
            {canReadChange ? (
              <TabsTrigger
                value="change-plan"
                className="relative overflow-visible"
              >
                <TrackingTabLabel
                  label="Payment failed"
                  total={changeCounts?.total ?? changeTotal}
                  neu={changeCounts?.new ?? 0}
                />
              </TabsTrigger>
            ) : null}
            {canReadUsers ? (
              <TabsTrigger
                value="payments"
                className="relative overflow-visible"
              >
                <TrackingTabLabel
                  label="Success payments"
                  total={paymentsCounts?.total ?? paymentsTotal}
                />
              </TabsTrigger>
            ) : null}
            {canReadChange ? (
              <TabsTrigger
                value="converted"
                className="relative ml-auto overflow-visible"
              >
                <TrackingTabLabel
                  label="Team Converted Users"
                  total={convertedCounts?.total ?? convertedTotal}
                  neu={convertedCounts?.new ?? 0}
                />
              </TabsTrigger>
            ) : null}
          </TabsList>

          {canReadUsers ? (
            <TabsContent value="users" className="mt-4 space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[180px] flex-1">
                  <label className="mb-1 block text-xs text-gray-500">
                    Search
                  </label>
                  <div className="relative">
                    <Input
                      value={qDraft}
                      onChange={(e) => setQDraft(e.target.value)}
                      placeholder="Name, phone"
                      className={qDraft || q ? "pr-8" : undefined}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setUsersPage(1);
                          setFilters({ q: qDraft.trim() });
                        }
                      }}
                    />
                    {qDraft || q ? (
                      <button
                        type="button"
                        aria-label="Clear search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        onClick={() => {
                          setQDraft("");
                          setFilters({ q: "" });
                          setUsersPage(1);
                        }}
                      >
                        <X className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <DateRangePicker
                  label="Plan started"
                  from={startsFrom}
                  to={startsTo}
                  onChange={(from, to) => {
                    setFilters({ startsFrom: from, startsTo: to });
                    setUsersPage(1);
                  }}
                />
                <DateRangePicker
                  label="Ends to"
                  from={endsFrom}
                  to={endsTo}
                  onChange={(from, to) => {
                    setFilters({ endsFrom: from, endsTo: to });
                    setUsersPage(1);
                  }}
                />
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Filter
                  </label>
                  <CountedSelect
                    value={userStatus || "all"}
                    options={[
                      { value: "all", label: "All", count: filterCounts?.totals?.status },
                      ...USER_STATUS_OPTIONS.map((o) => ({
                        value: o.value,
                        label: o.label,
                        count: filterCounts?.status?.[o.countKey] ?? 0,
                      })),
                    ]}
                    onValueChange={(v) => {
                      setFilters({ status: v === "all" ? "" : v });
                      setUsersPage(1);
                    }}
                  />
                </div>
                {renderCascade({
                  role: roleFilter,
                  planCode,
                  appliedFor: appliedForFilter,
                  counts: filterCounts,
                  onRole: (v) =>
                    setFilters({ role: v, planCode: "", appliedFor: "" }),
                  onPlan: (v) => setFilters({ planCode: v }),
                  onApplied: (v) => setFilters({ appliedFor: v }),
                  onPageReset: () => setUsersPage(1),
                })}
                {renderRemarkAuthorFilter(
                  usersRemarkBy,
                  (v) => {
                    setFilters({ remarkBy: v });
                    setUsersPage(1);
                  },
                  filterCounts,
                  usersTotal,
                )}
                {renderCallStatusFilter(
                  usersCallStatus,
                  (v) => {
                    setFilters({ callStatus: v });
                    setUsersPage(1);
                  },
                  filterCounts,
                )}
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Badge
                  </label>
                  <CountedSelect
                    value={badgeFilter || "all"}
                    className="min-w-[170px]"
                    options={[
                      { value: "all", label: "All", count: filterCounts?.totals?.badge },
                      ...BADGE_OPTIONS.map((o) => ({
                        value: o.value,
                        label: o.label,
                        count: filterCounts?.badges?.[o.countKey] ?? 0,
                      })),
                    ]}
                    onValueChange={(v) => {
                      setFilters({ badge: v === "all" ? "" : v });
                      setUsersPage(1);
                    }}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setUsersPage(1);
                    setFilters({ q: qDraft.trim() });
                  }}
                >
                  Search
                </Button>
              </div>

              <AdminDataTable
                page={usersPage}
                limit={usersLimit}
                total={usersTotal}
                totalPages={usersTotalPages}
                onPageChange={setUsersPage}
                onPageSizeChange={(n) => {
                  setUsersLimit(n);
                  setUsersPage(1);
                }}
                loading={usersLoading}
                error={usersError}
                isEmpty={!users.length}
                emptyMessage="No subscription users match these filters."
                syncKey={users.length}
              >
                {renderUserRows(users)}
              </AdminDataTable>
            </TabsContent>
          ) : null}

          {canReadUsers ? (
            <TabsContent value="payments" className="mt-4 space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[180px] flex-1">
                  <label className="mb-1 block text-xs text-gray-500">
                    Search
                  </label>
                  <Input
                    value={payQDraft}
                    onChange={(e) => setPayQDraft(e.target.value)}
                    placeholder="Name, phone"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setPaymentsPage(1);
                        setFilters({ pq: payQDraft.trim() });
                      }
                    }}
                  />
                </div>
                {renderCascade({
                  role: payRole,
                  planCode: payPlanCode,
                  appliedFor: payAppliedFor,
                  counts: paymentsFilterCounts,
                  onRole: (v) =>
                    setFilters({ pRole: v, pPlanCode: "", pAppliedFor: "" }),
                  onPlan: (v) => setFilters({ pPlanCode: v }),
                  onApplied: (v) => setFilters({ pAppliedFor: v }),
                  onPageReset: () => setPaymentsPage(1),
                })}
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Type
                  </label>
                  <Select
                    value={payKind || "all"}
                    onValueChange={(v) => {
                      setFilters({ payKind: v === "all" ? "" : v });
                      setPaymentsPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 min-w-[180px] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="upgrade">Upgrade</SelectItem>
                      <SelectItem value="autopay">
                        Autopay subscription
                      </SelectItem>
                      <SelectItem value="payment_mode">
                        Payment mode (duration)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DateRangePicker
                  label="Transaction date"
                  from={payTxnFrom}
                  to={payTxnTo}
                  onChange={(from, to) => {
                    setFilters({ pTxnFrom: from, pTxnTo: to });
                    setPaymentsPage(1);
                  }}
                />
                <DateRangePicker
                  label="Plan started"
                  from={payStartFrom}
                  to={payStartTo}
                  onChange={(from, to) => {
                    setFilters({ pStartFrom: from, pStartTo: to });
                    setPaymentsPage(1);
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setPaymentsPage(1);
                    setFilters({ pq: payQDraft.trim() });
                  }}
                >
                  Search
                </Button>
              </div>
              <AdminDataTable
                page={paymentsPage}
                limit={paymentsLimit}
                total={paymentsTotal}
                totalPages={paymentsTotalPages}
                onPageChange={setPaymentsPage}
                onPageSizeChange={(n) => {
                  setPaymentsLimit(n);
                  setPaymentsPage(1);
                }}
                loading={paymentsLoading}
                error={paymentsError}
                isEmpty={!payments.length}
                emptyMessage="No success payments match these filters."
                syncKey={payments.length}
              >
                {renderQueueTable(payments.map(paymentToQueueRow), {
                  failedLayout: true,
                  hideFollowUp: true,
                  hideRemarkAdd: true,
                })}
              </AdminDataTable>
            </TabsContent>
          ) : null}

          {canReadChange ? (
            <TabsContent value="change-plan" className="mt-4 space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[180px] flex-1">
                  <label className="mb-1 block text-xs text-gray-500">
                    Search
                  </label>
                  <Input
                    value={changeQDraft}
                    onChange={(e) => setChangeQDraft(e.target.value)}
                    placeholder="Name, phone"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setChangePage(1);
                        setFilters({ cq: changeQDraft.trim() });
                      }
                    }}
                  />
                </div>
                {renderCascade({
                  role: changeRole,
                  planCode: changePlanCode,
                  appliedFor: changeAppliedFor,
                  counts: changeFilterCounts,
                  onRole: (v) =>
                    setFilters({ cRole: v, cPlanCode: "", cAppliedFor: "" }),
                  onPlan: (v) => setFilters({ cPlanCode: v }),
                  onApplied: (v) => setFilters({ cAppliedFor: v }),
                  onPageReset: () => setChangePage(1),
                })}
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Renewal
                  </label>
                  <CountedSelect
                    value={changeRenewal || "all"}
                    options={onOffOptions(
                      changeFilterCounts?.renewal,
                      changeFilterCounts?.totals?.renewal,
                    )}
                    onValueChange={(v) => {
                      setFilters({
                        cRenewal: v === "on" || v === "off" ? v : "",
                      });
                      setChangePage(1);
                    }}
                  />
                </div>
                {renderRemarkAuthorFilter(
                  changeRemarkBy,
                  (v) => {
                    setFilters({ cRemarkBy: v });
                    setChangePage(1);
                  },
                  changeFilterCounts,
                  changeTotal,
                )}
                {renderCallStatusFilter(
                  changeCallStatus,
                  (v) => {
                    setFilters({ cCallStatus: v });
                    setChangePage(1);
                  },
                  changeFilterCounts,
                )}
                <DateRangePicker
                  label="Transaction date"
                  from={changeTxnFrom}
                  to={changeTxnTo}
                  onChange={(from, to) => {
                    setFilters({ cTxnFrom: from, cTxnTo: to });
                    setChangePage(1);
                  }}
                />
                <DateRangePicker
                  label="Plan started"
                  from={changeStartFrom}
                  to={changeStartTo}
                  onChange={(from, to) => {
                    setFilters({ cStartFrom: from, cStartTo: to });
                    setChangePage(1);
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setChangePage(1);
                    setFilters({ cq: changeQDraft.trim() });
                  }}
                >
                  Search
                </Button>
              </div>

              <AdminDataTable
                page={changePage}
                limit={changeLimit}
                total={changeTotal}
                totalPages={changeTotalPages}
                onPageChange={setChangePage}
                onPageSizeChange={(n) => {
                  setChangeLimit(n);
                  setChangePage(1);
                }}
                loading={changeLoading}
                error={changeError}
                isEmpty={!changeItems.length}
                emptyMessage="No payment failures in this list."
                syncKey={changeItems.length}
              >
                {renderQueueTable(changeItems, { failedLayout: true })}
              </AdminDataTable>
            </TabsContent>
          ) : null}

          {canReadChange ? (
            <TabsContent value="converted" className="mt-4 space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[180px] flex-1">
                  <label className="mb-1 block text-xs text-gray-500">
                    Search
                  </label>
                  <Input
                    value={convertedQDraft}
                    onChange={(e) => setConvertedQDraft(e.target.value)}
                    placeholder="Name, phone"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setConvertedPage(1);
                        setFilters({ vq: convertedQDraft.trim() });
                      }
                    }}
                  />
                </div>
                {renderCascade({
                  role: convertedRole,
                  planCode: convertedPlanCode,
                  appliedFor: convertedAppliedFor,
                  counts: convertedFilterCounts,
                  onRole: (v) =>
                    setFilters({ vRole: v, vPlanCode: "", vAppliedFor: "" }),
                  onPlan: (v) => setFilters({ vPlanCode: v }),
                  onApplied: (v) => setFilters({ vAppliedFor: v }),
                  onPageReset: () => setConvertedPage(1),
                })}
                {renderRemarkAuthorFilter(
                  convertedRemarkBy,
                  (v) => {
                    setFilters({ vRemarkBy: v });
                    setConvertedPage(1);
                  },
                  convertedFilterCounts,
                  convertedTotal,
                )}
                {renderCallStatusFilter(
                  convertedCallStatus,
                  (v) => {
                    setFilters({ vCallStatus: v });
                    setConvertedPage(1);
                  },
                  convertedFilterCounts,
                )}
                <DateRangePicker
                  label="Transaction date"
                  from={convertedTxnFrom}
                  to={convertedTxnTo}
                  onChange={(from, to) => {
                    setFilters({ vTxnFrom: from, vTxnTo: to });
                    setConvertedPage(1);
                  }}
                />
                <DateRangePicker
                  label="Plan started"
                  from={convertedStartFrom}
                  to={convertedStartTo}
                  onChange={(from, to) => {
                    setFilters({ vStartFrom: from, vStartTo: to });
                    setConvertedPage(1);
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setConvertedPage(1);
                    setFilters({ vq: convertedQDraft.trim() });
                  }}
                >
                  Search
                </Button>
              </div>

              <AdminDataTable
                page={convertedPage}
                limit={convertedLimit}
                total={convertedTotal}
                totalPages={convertedTotalPages}
                onPageChange={setConvertedPage}
                onPageSizeChange={(n) => {
                  setConvertedLimit(n);
                  setConvertedPage(1);
                }}
                loading={convertedLoading}
                error={convertedError}
                isEmpty={!convertedItems.length}
                emptyMessage="No converted users yet."
                syncKey={convertedItems.length}
              >
                {renderQueueTable(convertedItems, { showConvertBadge: true })}
              </AdminDataTable>
            </TabsContent>
          ) : null}

          {canReadUsers ? (
            <TabsContent value="upcoming-renewals" className="mt-4 space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[180px] flex-1">
                  <label className="mb-1 block text-xs text-gray-500">
                    Search
                  </label>
                  <Input
                    value={upcomingQDraft}
                    onChange={(e) => setUpcomingQDraft(e.target.value)}
                    placeholder="Name, phone"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setUpcomingPage(1);
                        setFilters({ uq: upcomingQDraft.trim() });
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Autopay
                  </label>
                  <CountedSelect
                    value={upcomingAutopay || "all"}
                    options={onOffOptions(upcomingFilterCounts?.autopay)}
                    onValueChange={(v) => {
                      setFilters({
                        uAutopay: v === "on" || v === "off" ? v : "",
                      });
                      setUpcomingPage(1);
                    }}
                  />
                </div>
                {renderCascade({
                  role: upcomingRole,
                  planCode: upcomingPlanCode,
                  counts: upcomingFilterCounts,
                  onRole: (v) => setFilters({ uRole: v, uPlanCode: "" }),
                  onPlan: (v) => setFilters({ uPlanCode: v }),
                  showApplied: false,
                  onPageReset: () => setUpcomingPage(1),
                })}
                <DateRangePicker
                  label="Plan started"
                  from={upcomingStartFrom}
                  to={upcomingStartTo}
                  onChange={(from, to) => {
                    setFilters({ uStartFrom: from, uStartTo: to });
                    setUpcomingPage(1);
                  }}
                />
                <DateRangePicker
                  label="Expiry"
                  from={upcomingEndFrom}
                  to={upcomingEndTo}
                  onChange={(from, to) => {
                    setFilters({ uEndFrom: from, uEndTo: to });
                    setUpcomingPage(1);
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setUpcomingPage(1);
                    setFilters({ uq: upcomingQDraft.trim() });
                  }}
                >
                  Search
                </Button>
              </div>

              <AdminDataTable
                page={upcomingPage}
                limit={upcomingLimit}
                total={upcomingTotal}
                totalPages={upcomingTotalPages}
                onPageChange={setUpcomingPage}
                onPageSizeChange={(n) => {
                  setUpcomingLimit(n);
                  setUpcomingPage(1);
                }}
                loading={upcomingLoading}
                error={upcomingError}
                isEmpty={!upcoming.length}
                emptyMessage="No subscriptions ending within 15 days."
                syncKey={upcoming.length}
              >
                {renderUpcomingTable(upcoming)}
              </AdminDataTable>
            </TabsContent>
          ) : null}
        </Tabs>
      </div>

      <Dialog
        open={!!remarkFor}
        onOpenChange={(open) => {
          if (open) return;
          void closeRemarkDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add remark</DialogTitle>
            <DialogDescription>
              Note for {remarkFor?.name || "this user"}
              {remarkFor?.latestTargetPlan
                ? ` · ${labelize(remarkFor.latestTargetPlan)}`
                : remarkFor?.targetPlans?.length
                  ? ` · ${labelize(remarkFor.targetPlans[0])}`
                  : ""}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={remarkText}
            onChange={(e) => setRemarkText(e.target.value)}
            placeholder="Called user / waiting on payment…"
            maxLength={2000}
          />
          {remarkError ? (
            <p className="text-xs text-red-600">{remarkError}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => void closeRemarkDialog()}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void submitRemark()}
              disabled={remarkBusy || !remarkText.trim()}
              className="bg-primary text-white hover:bg-primary/90"
            >
              {remarkBusy ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Save remark
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {remarkUnsavedDialog}

      <Dialog
        open={!!remarkListFor}
        onOpenChange={(open) => {
          if (!open) setRemarkListFor(null);
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Remarks</DialogTitle>
            <DialogDescription>
              {remarkListFor?.name || "User"}
              {remarkListFor?.remarksCount
                ? ` · ${remarkListFor.remarksCount} remark${
                    remarkListFor.remarksCount === 1 ? "" : "s"
                  }`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {!remarkListFor?.remarks?.length ? (
            <p className="text-sm text-gray-500">No remarks yet.</p>
          ) : (
            <div className="space-y-2">
              {[...remarkListFor.remarks].reverse().map((remark) => (
                <div
                  key={remark.id}
                  className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                >
                  <p className="text-sm text-gray-800">{remark.text}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {remark.createdByName || "Admin"}
                    {remark.createdAt
                      ? ` · ${formatDateTime(remark.createdAt)}`
                      : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!attemptsFor}
        onOpenChange={(open) => {
          if (!open) setAttemptsFor(null);
        }}
      >
        <DialogContent className="max-h-[80vh] w-full overflow-y-auto overflow-x-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Attempts</DialogTitle>
            <DialogDescription>
              {attemptsFor?.name || "User"}
              {attemptsFor
                ? ` · ${attemptsFor.attemptCount ?? attemptsFor.attempts?.length ?? 0} attempt${
                    (attemptsFor.attemptCount ??
                      attemptsFor.attempts?.length ??
                      0) === 1
                      ? ""
                      : "s"
                  }`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {!attemptsFor?.attempts?.length ? (
            <p className="text-sm text-gray-500">No attempts recorded.</p>
          ) : (
            <div className="space-y-2">
              {attemptsFor.attempts.map((attempt: ChangePlanAttempt, idx) => {
                const rz = attempt.meta?.razorpay;
                return (
                  <div
                    key={`${attempt.kind}-${attempt.occurredAt}-${idx}`}
                    className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {labelize(attempt.kind)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(attempt.occurredAt)}
                    </p>
                    {rz ? (
                      <dl className="mt-2 space-y-0.5 break-words text-[11px] text-slate-600">
                        {rz.status ? (
                          <div>
                            <span className="font-medium text-slate-700">
                              Status:{" "}
                            </span>
                            {labelize(rz.status)}
                          </div>
                        ) : null}
                        {rz.errorDescription || rz.errorReason ? (
                          <div className="whitespace-pre-wrap break-all">
                            <span className="font-medium text-slate-700">
                              Error:{" "}
                            </span>
                            {rz.errorDescription ||
                              String(rz.errorReason || "").replace(/_/g, " ")}
                            {rz.errorSource ? ` (${rz.errorSource})` : ""}
                            {rz.errorStep ? ` · ${rz.errorStep}` : ""}
                          </div>
                        ) : null}
                        {rz.methodDetail ? (
                          <div>
                            <span className="font-medium text-slate-700">
                              Method:{" "}
                            </span>
                            {rz.methodDetail}
                          </div>
                        ) : null}
                        {rz.paymentId ? (
                          <div>
                            <span className="font-medium text-slate-700">
                              Payment ID:{" "}
                            </span>
                            {rz.paymentId}
                          </div>
                        ) : null}
                        {rz.orderId ? (
                          <div>
                            <span className="font-medium text-slate-700">
                              Order ID:{" "}
                            </span>
                            {rz.orderId}
                          </div>
                        ) : null}
                        {rz.description ? (
                          <div className="break-words">
                            <span className="font-medium text-slate-700">
                              Description:{" "}
                            </span>
                            {rz.description}
                          </div>
                        ) : null}
                      </dl>
                    ) : attempt.detail ? (
                      <p className="mt-1 text-sm text-gray-700">
                        {attempt.detail}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PermissionGuard>
  );
}
