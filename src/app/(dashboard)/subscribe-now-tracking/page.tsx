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
  type TrackingRemark,
  type TrackingUserRow,
} from "@/services/subscription-tracking.service";
import { useDialogUnsavedGuard } from "@/hooks/use-unsaved-changes-guard";
import {
  ExternalLink,
  Eye,
  Loader2,
  MessageSquarePlus,
  X,
} from "lucide-react";
import {
  CALL_STATUS_OPTIONS,
  type CallStatus,
} from "@/services/admin-users.service";
import { newFirstCellClass, NewTag } from "@/components/common/new-row-marker";
import { useUrlFilters } from "@/hooks/use-url-filters";

type MainTab = "users" | "change-plan" | "converted" | "upcoming-renewals";
type FilterBy = "all" | "autopay" | "plan";

const TRACKING_FILTER_DEFAULTS = {
  tab: "users",
  q: "",
  startsFrom: "",
  startsTo: "",
  endsFrom: "",
  endsTo: "",
  filterBy: "all",
  autopay: "",
  planCode: "",
  uq: "",
  uAutopay: "",
  uPlanCode: "",
  cq: "",
  cPlanCode: "",
  vq: "",
  vPlanCode: "",
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

function profileHref(userId: string) {
  return `/user-analytics?userId=${encodeURIComponent(userId)}`;
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
    rawTab === "users" || rawTab === "upcoming-renewals"
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
  const filterBy = (
    filters.filterBy === "autopay" || filters.filterBy === "plan"
      ? filters.filterBy
      : "all"
  ) as FilterBy;
  const autopayFilter = (
    filters.autopay === "on" || filters.autopay === "off" ? filters.autopay : ""
  ) as "" | "on" | "off";
  const planCode = filters.planCode;
  const upcomingQ = filters.uq;
  const upcomingAutopay = (
    filters.uAutopay === "on" || filters.uAutopay === "off"
      ? filters.uAutopay
      : ""
  ) as "" | "on" | "off";
  const upcomingPlanCode = filters.uPlanCode;
  const changeQ = filters.cq;
  const changePlanCode = filters.cPlanCode;
  const convertedQ = filters.vq;
  const convertedPlanCode = filters.vPlanCode;

  // User Detail
  const [users, setUsers] = useState<TrackingUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [usersLimit, setUsersLimit] = useState(20);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [qDraft, setQDraft] = useState(q);
  const [usersFilterOptions, setUsersFilterOptions] =
    useState<TrackingFilterOptions | null>(null);

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

  // Dialogs
  const [remarkFor, setRemarkFor] = useState<ChangePlanRow | null>(null);
  const [remarkText, setRemarkText] = useState("");
  const [remarkBusy, setRemarkBusy] = useState(false);
  const [remarkError, setRemarkError] = useState("");
  const [remarkListFor, setRemarkListFor] = useState<ChangePlanRow | null>(null);
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
      const autopayEnabled =
        filterBy === "autopay" ? resolveAutopay(autopayFilter) : undefined;
      const selectedPlan =
        filterBy === "plan" && planCode ? planCode : undefined;
      const [result, facets] = await Promise.all([
        subscriptionTrackingService.listUsers({
          page: usersPage,
          limit: usersLimit,
          q: q || undefined,
          startsFrom: startsFrom || undefined,
          startsTo: startsTo || undefined,
          endsFrom: endsFrom || undefined,
          endsTo: endsTo || undefined,
          autopayEnabled,
          planCode: selectedPlan,
        }),
        subscriptionTrackingService.getUsersFilterOptions({
          q: q || undefined,
          startsFrom: startsFrom || undefined,
          startsTo: startsTo || undefined,
          endsFrom: endsFrom || undefined,
          endsTo: endsTo || undefined,
          autopayEnabled,
          planCode: selectedPlan,
        }),
      ]);
      setUsers(result.items);
      setUsersTotal(result.meta.total);
      setUsersTotalPages(result.meta.totalPages);
      setUsersFilterOptions(facets);
    } catch (err) {
      setUsersError(
        subscriptionTrackingApiError(err, "Failed to load users."),
      );
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
    filterBy,
    autopayFilter,
    planCode,
    usersPage,
    usersLimit,
  ]);

  const loadUpcoming = useCallback(async () => {
    if (!canReadUsers) return;
    setUpcomingLoading(true);
    setUpcomingError("");
    try {
      const autopayEnabled = resolveAutopay(upcomingAutopay);
      const [result, facets, counts] = await Promise.all([
        subscriptionTrackingService.listUpcomingRenewals({
          page: upcomingPage,
          limit: upcomingLimit,
          q: upcomingQ || undefined,
          autopayEnabled,
          planCode: upcomingPlanCode || undefined,
        }),
        subscriptionTrackingService.getUpcomingRenewalsFilterOptions({
          q: upcomingQ || undefined,
          autopayEnabled,
          planCode: upcomingPlanCode || undefined,
        }),
        subscriptionTrackingService.getUpcomingRenewalsCounts({
          q: upcomingQ || undefined,
          autopayEnabled,
          planCode: upcomingPlanCode || undefined,
        }),
      ]);
      setUpcoming(result.items);
      setUpcomingTotal(result.meta.total || counts.total);
      setUpcomingTotalPages(result.meta.totalPages);
      setUpcomingFilterOptions(facets);
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
  ]);

  const loadChangePlan = useCallback(async () => {
    if (!canReadChange) return;
    setChangeLoading(true);
    setChangeError("");
    try {
      const [result, counts, facets] = await Promise.all([
        subscriptionTrackingService.listChangePlan({
          page: changePage,
          limit: changeLimit,
          q: changeQ || undefined,
          planCode: changePlanCode || undefined,
        }),
        subscriptionTrackingService.getChangePlanCounts(),
        subscriptionTrackingService.getChangePlanFilterOptions({
          q: changeQ || undefined,
          planCode: changePlanCode || undefined,
        }),
      ]);
      setChangeItems(result.items);
      setChangeTotal(result.meta.total);
      setChangeTotalPages(result.meta.totalPages);
      setChangeCounts(counts);
      setChangeFilterOptions(facets);
    } catch (err) {
      setChangeError(
        subscriptionTrackingApiError(err, "Failed to load payment failed queue."),
      );
      setChangeItems([]);
      setChangeTotal(0);
      setChangeTotalPages(1);
    } finally {
      setChangeLoading(false);
    }
  }, [canReadChange, changePage, changeLimit, changeQ, changePlanCode]);

  const loadConverted = useCallback(async () => {
    if (!canReadChange) return;
    setConvertedLoading(true);
    setConvertedError("");
    try {
      const [result, counts, facets] = await Promise.all([
        subscriptionTrackingService.listConverted({
          page: convertedPage,
          limit: convertedLimit,
          q: convertedQ || undefined,
          planCode: convertedPlanCode || undefined,
        }),
        subscriptionTrackingService.getConvertedCounts(),
        subscriptionTrackingService.getConvertedFilterOptions({
          q: convertedQ || undefined,
          planCode: convertedPlanCode || undefined,
        }),
      ]);
      setConvertedItems(result.items);
      setConvertedTotal(result.meta.total);
      setConvertedTotalPages(result.meta.totalPages);
      setConvertedCounts(counts);
      setConvertedFilterOptions(facets);
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
  ]);

  useEffect(() => {
    if (mainTab === "users") void loadUsers();
  }, [mainTab, loadUsers]);

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
          updated.callStatusUpdatedByName ||
          remarkFor.callStatusUpdatedByName,
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

  const handleCallStatus = async (row: ChangePlanRow, callStatus: CallStatus) => {
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
        filterBy: "all",
        autopay: "",
        planCode: "",
      });
      setUsersPage(1);
    } else if (mainTab === "upcoming-renewals") {
      setUpcomingQDraft("");
      setFilters({
        uq: "",
        uAutopay: "",
        uPlanCode: "",
      });
      setUpcomingPage(1);
    } else if (mainTab === "change-plan") {
      setChangeQDraft("");
      setFilters({
        cq: "",
        cPlanCode: "",
      });
      setChangePage(1);
    } else {
      setConvertedQDraft("");
      setFilters({
        vq: "",
        vPlanCode: "",
      });
      setConvertedPage(1);
    }
  };

  const currentLoading =
    mainTab === "users"
      ? usersLoading
      : mainTab === "upcoming-renewals"
        ? upcomingLoading
        : mainTab === "change-plan"
          ? changeLoading
          : convertedLoading;

  const planOptionsFor = (facets: TrackingFilterOptions | null) =>
    facets?.plans?.length
      ? facets.plans
      : [
          { code: "NETWORK_PAID", label: "Network Paid", count: 0 },
          { code: "PRO", label: "Pro", count: 0 },
          { code: "ELITE", label: "Elite", count: 0 },
        ];

  const renderUserRows = (rows: TrackingUserRow[]) => (
    <table className="min-w-full text-left text-sm">
      <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
        <tr>
          <th className="min-w-[220px] px-4 py-3 font-medium">Name</th>
          <th className="px-4 py-3 font-medium">Contact</th>
          <th className="px-4 py-3 font-medium">Plan</th>
          <th className="px-4 py-3 font-medium">Plan started</th>
          <th className="px-4 py-3 font-medium">Period end</th>
          <th className="px-4 py-3 font-medium">Autopay</th>
          <th className="px-4 py-3 font-medium">Decline count</th>
          <th className="px-4 py-3 font-medium">Convert</th>
          <th className="px-4 py-3 font-medium">Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.userId} className="border-b border-gray-50 last:border-0">
            <td className="min-w-[220px] px-4 py-3">
              <p className="whitespace-nowrap font-medium text-gray-900">
                {row.name || "Unknown"}
              </p>
              {row.withoutReferral || row.userStatus === "without_referral" ? (
                <span className="mt-1 inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-800">
                  Without referral
                </span>
              ) : null}
            </td>
            <td className="px-4 py-3 text-gray-700">
              {row.contact || row.email || "—"}
            </td>
            <td className="px-4 py-3 text-gray-700">{labelize(row.planCode)}</td>
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
    opts: { showConvertBadge?: boolean } = {},
  ) => (
    <table className="min-w-full text-left text-sm">
      <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
        <tr>
          <th className="min-w-[220px] px-4 py-4 font-semibold text-gray-700">
            Name
          </th>
          <th className="px-4 py-4 font-semibold text-gray-700">Contact</th>
          <th className="px-4 py-4 font-semibold text-gray-700">
            Batch applied for
          </th>
          <th className="px-4 py-4 font-semibold text-gray-700">Occurred</th>
          <th className="px-4 py-4 font-semibold text-gray-700">Plan started</th>
          <th className="px-4 py-4 font-semibold text-gray-700">Attempts</th>
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
          const attempts = row.attempts || [];
          const attemptCount = row.attemptCount ?? attempts.length;
          const latest = row.latestRemark;
          const callStatus = (row.callStatus || "not_contacted") as CallStatus;
          const callLabel =
            CALL_STATUS_OPTIONS.find((o) => o.value === callStatus)?.label ||
            row.callStatusLabel ||
            "Not Contacted";
          const statusDisabled =
            !canUpdateChange || !(row.callStatusEditable ?? row.remarksCount > 0);
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
          const latestPlan =
            row.latestTargetPlan ||
            (row.targetPlans?.length
              ? row.targetPlans[row.targetPlans.length - 1]
              : null);
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
                {row.planCode ? (
                  <p className="text-[11px] font-medium text-gray-600">
                    {labelize(row.planCode)}
                  </p>
                ) : null}
                {tags.length ? (
                  <p className="text-[11px] text-orange-700">{tags.join(" · ")}</p>
                ) : null}
                {opts.showConvertBadge && row.convertLabel ? (
                  <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                    {row.convertLabel}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-4 text-gray-700">
                {row.contact || row.email || "—"}
              </td>
              <td className="px-4 py-4 font-medium text-gray-900">
                {latestPlan ? labelize(latestPlan) : "—"}
              </td>
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
                  {canUpdateChange ? (
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

  const renderUpcomingTable = (items: ChangePlanRow[]) => (
    <table className="min-w-full text-left text-sm">
      <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
        <tr>
          <th className="min-w-[220px] px-4 py-4 font-semibold text-gray-700">
            Name
          </th>
          <th className="px-4 py-4 font-semibold text-gray-700">Contact</th>
          <th className="px-4 py-4 font-semibold text-gray-700">Plan</th>
          <th className="px-4 py-4 font-semibold text-gray-700">Plan started</th>
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
            !canUpdateChange || !(row.callStatusEditable ?? row.remarksCount > 0);
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
                {row.contact || row.email || "—"}
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
                  {canUpdateChange ? (
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
          <TabsList className="h-auto min-h-9 overflow-visible bg-gray-100 py-1">
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
              <TabsTrigger value="change-plan" className="relative overflow-visible">
                <TrackingTabLabel
                  label="Payment failed"
                  total={changeCounts?.total ?? changeTotal}
                  neu={changeCounts?.new ?? 0}
                />
              </TabsTrigger>
            ) : null}
            {canReadChange ? (
              <TabsTrigger value="converted" className="relative overflow-visible">
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
                  <Select
                    value={filterBy}
                    onValueChange={(v) => {
                      const next: FilterBy =
                        v === "autopay" || v === "plan" ? v : "all";
                      setFilters({
                        filterBy: next,
                        autopay: "",
                        planCode: "",
                      });
                      setUsersPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 min-w-[140px] bg-white">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" label="All">
                        All
                      </SelectItem>
                      <SelectItem value="autopay" label="Autopay">
                        Autopay
                      </SelectItem>
                      <SelectItem value="plan" label="Plan">
                        Plan
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {filterBy === "autopay" ? (
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">
                      Autopay
                    </label>
                    <Select
                      value={autopayFilter || null}
                      onValueChange={(v) => {
                        setFilters({
                          autopay: v === "on" || v === "off" ? v : "",
                        });
                        setUsersPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 min-w-[110px] bg-white">
                        <SelectValue placeholder="On / Off" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="on" label="On">
                          On ({usersFilterOptions?.autopay.on ?? 0})
                        </SelectItem>
                        <SelectItem value="off" label="Off">
                          Off ({usersFilterOptions?.autopay.off ?? 0})
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                {filterBy === "plan" ? (
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">
                      Plan
                    </label>
                    <Select
                      value={planCode || null}
                      onValueChange={(v) => {
                        setFilters({ planCode: v || "" });
                        setUsersPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 min-w-[140px] bg-white">
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {planOptionsFor(usersFilterOptions).map((plan) => (
                          <SelectItem
                            key={plan.code}
                            value={plan.code}
                            label={plan.label}
                          >
                            {plan.label}
                            {plan.count ? ` (${plan.count})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
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
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Plan</label>
                  <Select
                    value={changePlanCode || "all"}
                    onValueChange={(v) => {
                      setFilters({ cPlanCode: !v || v === "all" ? "" : v });
                      setChangePage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 min-w-[140px] bg-white">
                      <SelectValue placeholder="All plans" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" label="All plans">
                        All plans
                      </SelectItem>
                      {planOptionsFor(changeFilterOptions).map((plan) => (
                        <SelectItem
                          key={plan.code}
                          value={plan.code}
                          label={plan.label}
                        >
                          {plan.label}
                          {plan.count ? ` (${plan.count})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                {renderQueueTable(changeItems)}
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
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Plan</label>
                  <Select
                    value={convertedPlanCode || "all"}
                    onValueChange={(v) => {
                      setFilters({ vPlanCode: !v || v === "all" ? "" : v });
                      setConvertedPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 min-w-[140px] bg-white">
                      <SelectValue placeholder="All plans" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" label="All plans">
                        All plans
                      </SelectItem>
                      {planOptionsFor(convertedFilterOptions).map((plan) => (
                        <SelectItem
                          key={plan.code}
                          value={plan.code}
                          label={plan.label}
                        >
                          {plan.label}
                          {plan.count ? ` (${plan.count})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  <Select
                    value={upcomingAutopay || "all"}
                    onValueChange={(v) => {
                      setFilters({
                        uAutopay: v === "on" || v === "off" ? v : "",
                      });
                      setUpcomingPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 min-w-[120px] bg-white">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" label="All">
                        All
                      </SelectItem>
                      <SelectItem value="on" label="On">
                        On ({upcomingFilterOptions?.autopay.on ?? 0})
                      </SelectItem>
                      <SelectItem value="off" label="Off">
                        Off ({upcomingFilterOptions?.autopay.off ?? 0})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Plan</label>
                  <Select
                    value={upcomingPlanCode || "all"}
                    onValueChange={(v) => {
                      setFilters({ uPlanCode: !v || v === "all" ? "" : v });
                      setUpcomingPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 min-w-[140px] bg-white">
                      <SelectValue placeholder="All plans" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" label="All plans">
                        All plans
                      </SelectItem>
                      {planOptionsFor(upcomingFilterOptions).map((plan) => (
                        <SelectItem
                          key={plan.code}
                          value={plan.code}
                          label={plan.label}
                        >
                          {plan.label}
                          {plan.count ? ` (${plan.count})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
