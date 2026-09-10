"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/use-auth-store";
import { PermissionGuard } from "@/components/common/permission-guard";
import { Breadcrumb } from "@/components/common/breadcrumb";
import { DateRangePicker } from "@/components/common/date-range-picker";
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
  type ChangePlanTabCounts,
  type ConvertedTabCounts,
  type TrackingRemark,
  type TrackingUserRow,
} from "@/services/subscription-tracking.service";
import { subscriptionsService } from "@/services/subscriptions.service";
import {
  ExternalLink,
  Eye,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  CALL_STATUS_OPTIONS,
  type CallStatus,
} from "@/services/admin-users.service";
import { withTotalNew } from "@/lib/filter-label";
import { newFirstCellClass, NewTag } from "@/components/common/new-row-marker";

const STATUS_GROUPS = [
  { id: "unverified", label: "Unverified (Free)" },
  { id: "network", label: "Network Paid" },
  { id: "pro", label: "Pro" },
  { id: "elite", label: "Elite" },
] as const;

function StatusGroupTabs({
  value,
  onChange,
  counts,
}: {
  value: string;
  onChange: (id: string) => void;
  counts?: Record<string, { total: number; new: number }> | null;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_GROUPS.map((g) => {
        const c = counts?.[g.id];
        const selected = value === g.id;
        return (
          <Button
            key={g.id}
            type="button"
            size="sm"
            variant={selected ? "default" : "outline"}
            onClick={() => onChange(g.id)}
            className={cn(
              selected
                ? "border-amber-600 bg-amber-500 text-white hover:bg-amber-600 hover:text-white"
                : "border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100",
            )}
          >
            {withTotalNew(g.label, c?.total ?? 0, c?.new ?? 0)}
          </Button>
        );
      })}
    </div>
  );
}

const KIND_FILTERS = [
  { id: "all", label: "All" },
  { id: "plan_intent", label: "Plan intent" },
  { id: "payment_declined", label: "Payment declined" },
  { id: "autopay_stopped", label: "Autopay stopped" },
] as const;

type MainTab = "users" | "change-plan" | "converted";
type FilterBy = "all" | "autopay" | "plan";

const FALLBACK_PLANS = [
  { code: "network", displayName: "Network" },
  { code: "pro", displayName: "Pro" },
  { code: "elite", displayName: "Elite" },
];

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function labelize(value?: string | null) {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

function profileHref(userId: string) {
  return `/user-analytics?userId=${encodeURIComponent(userId)}`;
}

export default function SubscriptionTrackingPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canReadUsers = hasPermission("subscriptions", "read");
  const canReadChange = hasPermission("subscribe_now_tracking", "read");
  const canUpdateChange = hasPermission("subscribe_now_tracking", "update");

  const [mainTab, setMainTab] = useState<MainTab>(
    canReadUsers ? "users" : "change-plan",
  );

  // User Detail
  const [users, setUsers] = useState<TrackingUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [qDraft, setQDraft] = useState("");
  const [q, setQ] = useState("");
  const [startsFrom, setStartsFrom] = useState("");
  const [startsTo, setStartsTo] = useState("");
  const [endsFrom, setEndsFrom] = useState("");
  const [endsTo, setEndsTo] = useState("");
  const [filterBy, setFilterBy] = useState<FilterBy>("all");
  const [autopayFilter, setAutopayFilter] = useState<"" | "on" | "off">("");
  const [planCode, setPlanCode] = useState("");
  const [plans, setPlans] = useState<{ code: string; displayName: string }[]>(
    FALLBACK_PLANS,
  );

  // Change plan / Converted shared filters
  const [statusGroup, setStatusGroup] = useState<string>("unverified");
  const [kind, setKind] = useState<string>("all");

  // Want to Change Plan
  const [changeItems, setChangeItems] = useState<ChangePlanRow[]>([]);
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeError, setChangeError] = useState("");
  const [changeTotal, setChangeTotal] = useState(0);

  // Converted Users
  const [convertedItems, setConvertedItems] = useState<ChangePlanRow[]>([]);
  const [convertedLoading, setConvertedLoading] = useState(false);
  const [convertedError, setConvertedError] = useState("");
  const [convertedTotal, setConvertedTotal] = useState(0);
  const [changeCounts, setChangeCounts] = useState<ChangePlanTabCounts | null>(
    null,
  );
  const [convertedCounts, setConvertedCounts] =
    useState<ConvertedTabCounts | null>(null);

  // Dialogs
  const [remarkFor, setRemarkFor] = useState<ChangePlanRow | null>(null);
  const [remarkText, setRemarkText] = useState("");
  const [remarkBusy, setRemarkBusy] = useState(false);
  const [remarkError, setRemarkError] = useState("");
  const [remarkListFor, setRemarkListFor] = useState<ChangePlanRow | null>(null);
  const [attemptsFor, setAttemptsFor] = useState<ChangePlanRow | null>(null);

  const loadUsers = useCallback(async () => {
    if (!canReadUsers) return;
    setUsersLoading(true);
    setUsersError("");
    try {
      const result = await subscriptionTrackingService.listUsers({
        page: 1,
        limit: 50,
        q: q || undefined,
        startsFrom: startsFrom || undefined,
        startsTo: startsTo || undefined,
        endsFrom: endsFrom || undefined,
        endsTo: endsTo || undefined,
        autopayEnabled:
          filterBy === "autopay" && autopayFilter === "on"
            ? true
            : filterBy === "autopay" && autopayFilter === "off"
              ? false
              : undefined,
        planCode:
          filterBy === "plan" && planCode ? planCode : undefined,
      });
      setUsers(result.items);
    } catch (err) {
      setUsersError(
        subscriptionTrackingApiError(err, "Failed to load users."),
      );
      setUsers([]);
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
  ]);

  const loadChangePlan = useCallback(async () => {
    if (!canReadChange) return;
    setChangeLoading(true);
    setChangeError("");
    try {
      const result = await subscriptionTrackingService.listChangePlan({
        statusGroup,
        kind,
        page: 1,
        limit: 100,
      });
      setChangeItems(result.items);
      setChangeTotal(result.meta.total);
    } catch (err) {
      setChangeError(
        subscriptionTrackingApiError(err, "Failed to load change-plan queue."),
      );
      setChangeItems([]);
      setChangeTotal(0);
    } finally {
      setChangeLoading(false);
    }
  }, [canReadChange, statusGroup, kind]);

  const loadConverted = useCallback(async () => {
    if (!canReadChange) return;
    setConvertedLoading(true);
    setConvertedError("");
    try {
      const result = await subscriptionTrackingService.listConverted({
        statusGroup,
        page: 1,
        limit: 100,
      });
      setConvertedItems(result.items);
      setConvertedTotal(result.meta.total);
    } catch (err) {
      setConvertedError(
        subscriptionTrackingApiError(err, "Failed to load converted users."),
      );
      setConvertedItems([]);
      setConvertedTotal(0);
    } finally {
      setConvertedLoading(false);
    }
  }, [canReadChange, statusGroup]);

  const loadTabCounts = useCallback(async () => {
    if (!canReadChange) return;
    try {
      const [change, converted] = await Promise.all([
        subscriptionTrackingService.getChangePlanCounts(
          mainTab === "change-plan" ? statusGroup : undefined,
        ),
        subscriptionTrackingService.getConvertedCounts(),
      ]);
      setChangeCounts(change);
      setConvertedCounts(converted);
    } catch {
      /* keep previous counts */
    }
  }, [canReadChange, mainTab, statusGroup]);

  useEffect(() => {
    if (mainTab === "users") void loadUsers();
  }, [mainTab, loadUsers]);

  useEffect(() => {
    if (!canReadUsers) return;
    let cancelled = false;
    void subscriptionsService
      .listPlans()
      .then((rows) => {
        if (cancelled) return;
        const next = rows
          .filter((p) => p.isActive)
          .map((p) => ({ code: p.code, displayName: p.displayName }));
        setPlans(next.length ? next : FALLBACK_PLANS);
      })
      .catch(() => {
        if (!cancelled) setPlans(FALLBACK_PLANS);
      });
    return () => {
      cancelled = true;
    };
  }, [canReadUsers]);

  useEffect(() => {
    if (mainTab === "change-plan") void loadChangePlan();
  }, [mainTab, loadChangePlan]);

  useEffect(() => {
    if (mainTab === "converted") void loadConverted();
  }, [mainTab, loadConverted]);

  useEffect(() => {
    void loadTabCounts();
  }, [loadTabCounts]);

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
      patchQueueRow(remarkFor, {
        ref: updated.ref,
        remarks: updated.remarks,
        remarksCount: updated.remarksCount,
        remarksAddedBy: updated.remarksAddedBy || null,
        latestRemark,
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
      patchQueueRow(row, {
        ref: updated.ref,
        callStatus: updated.callStatus,
        callStatusLabel: updated.callStatusLabel,
        callStatusEditable: updated.callStatusEditable,
        callStatusUpdatedAt: updated.callStatusUpdatedAt || null,
        callStatusUpdatedByName: updated.callStatusUpdatedByName || null,
        remarks: updated.remarks.length ? updated.remarks : row.remarks,
        remarksCount: updated.remarks.length || row.remarksCount,
      });
    } catch (err) {
      window.alert(
        subscriptionTrackingApiError(err, "Failed to update call status."),
      );
    }
  };

  const refreshCurrent = () => {
    if (mainTab === "users") void loadUsers();
    else if (mainTab === "change-plan") void loadChangePlan();
    else void loadConverted();
    void loadTabCounts();
  };

  const currentLoading =
    mainTab === "users"
      ? usersLoading
      : mainTab === "change-plan"
        ? changeLoading
        : convertedLoading;

  const renderQueueTable = (
    items: ChangePlanRow[],
    opts: { showConvertBadge?: boolean } = {},
  ) => (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="min-w-[240px] px-5 py-4 font-semibold text-gray-700">
              Name
            </th>
            <th className="px-4 py-4 font-semibold text-gray-700">Contact</th>
            <th className="px-4 py-4 font-semibold text-gray-700">
              Batch applied for
            </th>
            <th className="px-4 py-4 font-semibold text-gray-700">
              Date / time
            </th>
            <th className="px-4 py-4 font-semibold text-gray-700">
              Plan started
            </th>
            <th className="px-4 py-4 font-semibold text-gray-700">Attempted</th>
            <th className="px-4 py-4 font-semibold text-gray-700">
              Call Status
            </th>
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
            const callStatus = (row.callStatus ||
              "not_contacted") as CallStatus;
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
              <tr
                key={row.ref}
                className="border-b border-gray-50 last:border-0"
              >
                <td
                  className={newFirstCellClass(
                    !!row.isNew,
                    "min-w-[240px] px-5 py-4",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-medium text-gray-900">
                      {row.name || "Unknown"}
                    </p>
                    <NewTag show={!!row.isNew} />
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {(row.kinds || []).map(labelize).join(" · ") || "—"}
                  </p>
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
                  {row.targetPlans.length
                    ? row.targetPlans.join(", ")
                    : labelize(row.planCode)}
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
                  <div className="min-w-[140px] max-w-[200px] space-y-1">
                    {row.remarksCount ? (
                      <>
                        <Badge
                          variant="outline"
                          className="border-gray-200 bg-gray-50 text-gray-700"
                        >
                          {row.remarksCount} remark
                          {row.remarksCount === 1 ? "" : "s"}
                        </Badge>
                        {latest?.text ? (
                          <p className="line-clamp-2 text-[11px] leading-snug text-gray-500">
                            {latest.text}
                          </p>
                        ) : null}
                      </>
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
    </div>
  );

  return (
    <PermissionGuard
      permission={[
        "subscriptions:read",
        "subscribe_now_tracking:read",
      ]}
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
              User plan detail, change-plan follow-ups, and converted users.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refreshCurrent}
            disabled={currentLoading}
          >
            <RefreshCw className="mr-1.5 size-3.5" />
            Refresh
          </Button>
        </div>

        <Tabs
          value={mainTab}
          onValueChange={(v) => setMainTab(v as MainTab)}
        >
          <TabsList className="bg-gray-100">
            {canReadUsers ? (
              <TabsTrigger value="users">User Detail</TabsTrigger>
            ) : null}
            {canReadChange ? (
              <TabsTrigger value="change-plan">
                {withTotalNew(
                  "Want to Change Plan Users",
                  changeCounts
                    ? Object.values(changeCounts.statusGroups).reduce(
                        (sum, c) => sum + (c?.total || 0),
                        0,
                      )
                    : changeTotal,
                  changeCounts
                    ? Object.values(changeCounts.statusGroups).reduce(
                        (sum, c) => sum + (c?.new || 0),
                        0,
                      )
                    : 0,
                )}
              </TabsTrigger>
            ) : null}
            {canReadChange ? (
              <TabsTrigger value="converted">
                {withTotalNew(
                  "Converted Users",
                  convertedCounts
                    ? Object.values(convertedCounts.statusGroups).reduce(
                        (sum, c) => sum + (c?.total || 0),
                        0,
                      )
                    : convertedTotal,
                  convertedCounts
                    ? Object.values(convertedCounts.statusGroups).reduce(
                        (sum, c) => sum + (c?.new || 0),
                        0,
                      )
                    : 0,
                )}
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
                        if (e.key === "Enter") setQ(qDraft.trim());
                      }}
                    />
                    {qDraft || q ? (
                      <button
                        type="button"
                        aria-label="Clear search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        onClick={() => {
                          setQDraft("");
                          setQ("");
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
                    setStartsFrom(from);
                    setStartsTo(to);
                  }}
                />
                <DateRangePicker
                  label="Ends to"
                  from={endsFrom}
                  to={endsTo}
                  onChange={(from, to) => {
                    setEndsFrom(from);
                    setEndsTo(to);
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
                      setFilterBy(next);
                      setAutopayFilter("");
                      setPlanCode("");
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
                        setAutopayFilter(v === "on" || v === "off" ? v : "");
                      }}
                    >
                      <SelectTrigger className="h-8 min-w-[110px] bg-white">
                        <SelectValue placeholder="On / Off" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="on" label="On">
                          On
                        </SelectItem>
                        <SelectItem value="off" label="Off">
                          Off
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
                      onValueChange={(v) => setPlanCode(v || "")}
                    >
                      <SelectTrigger className="h-8 min-w-[140px] bg-white">
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem
                            key={plan.code}
                            value={plan.code}
                            label={plan.displayName}
                          >
                            {plan.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setQ(qDraft.trim())}
                >
                  Search
                </Button>
              </div>

              {usersLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
                  <Loader2 className="size-4 animate-spin" />
                  Loading…
                </div>
              ) : usersError ? (
                <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                  {usersError}
                </p>
              ) : !users.length ? (
                <p className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                  No subscription users match these filters.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Name</th>
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
                      {users.map((row) => (
                        <tr
                          key={row.userId}
                          className="border-b border-gray-50 last:border-0"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">
                              {row.name || "Unknown"}
                            </p>
                            {row.withoutReferral ||
                            row.userStatus === "without_referral" ? (
                              <span className="mt-1 inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-800">
                                Without referral
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {row.contact || row.email || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {labelize(row.planCode)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {formatDateTime(row.planStartedAt)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {formatDateTime(row.currentPeriodEnd)}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {row.autopayEnabled ? "On" : "Off"}
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
                              className={cn(
                                buttonVariants({
                                  variant: "outline",
                                  size: "sm",
                                }),
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
                </div>
              )}
            </TabsContent>
          ) : null}

          {canReadChange ? (
            <TabsContent value="change-plan" className="mt-4 space-y-4">
              <StatusGroupTabs
                value={statusGroup}
                onChange={setStatusGroup}
                counts={changeCounts?.statusGroups}
              />

              <div className="flex flex-wrap gap-2">
                {KIND_FILTERS.map((f) => {
                  const c = changeCounts?.kinds?.[f.id];
                  return (
                    <Button
                      key={f.id}
                      type="button"
                      size="sm"
                      variant={kind === f.id ? "default" : "outline"}
                      onClick={() => setKind(f.id)}
                    >
                      {withTotalNew(f.label, c?.total ?? 0, c?.new ?? 0)}
                    </Button>
                  );
                })}
                <span className="self-center text-xs text-gray-500">
                  {changeTotal} user{changeTotal === 1 ? "" : "s"} in view
                </span>
              </div>

              {changeLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
                  <Loader2 className="size-4 animate-spin" />
                  Loading…
                </div>
              ) : changeError ? (
                <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                  {changeError}
                </p>
              ) : !changeItems.length ? (
                <p className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                  No open follow-ups in this group.
                </p>
              ) : (
                renderQueueTable(changeItems)
              )}
            </TabsContent>
          ) : null}

          {canReadChange ? (
            <TabsContent value="converted" className="mt-4 space-y-4">
              <StatusGroupTabs
                value={statusGroup}
                onChange={setStatusGroup}
                counts={convertedCounts?.statusGroups}
              />

              <div className="flex flex-wrap gap-2">
                <span className="self-center text-xs text-gray-500">
                  {convertedTotal} user{convertedTotal === 1 ? "" : "s"} in view
                </span>
              </div>

              {convertedLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
                  <Loader2 className="size-4 animate-spin" />
                  Loading…
                </div>
              ) : convertedError ? (
                <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                  {convertedError}
                </p>
              ) : !convertedItems.length ? (
                <p className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                  No converted users in this group.
                </p>
              ) : (
                renderQueueTable(convertedItems, {
                  showConvertBadge: true,
                })
              )}
            </TabsContent>
          ) : null}
        </Tabs>
      </div>

      <Dialog
        open={!!remarkFor}
        onOpenChange={(open) => {
          if (!open) setRemarkFor(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add remark</DialogTitle>
            <DialogDescription>
              Note for {remarkFor?.name || "this user"}
              {remarkFor?.targetPlans?.length
                ? ` · ${remarkFor.targetPlans.join(", ")}`
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
              onClick={() => setRemarkFor(null)}
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
        <DialogContent className="max-h-[80vh] overflow-y-auto">
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
                    <dl className="mt-2 space-y-0.5 text-[11px] text-slate-600">
                      {rz.status ? (
                        <div>
                          <span className="font-medium text-slate-700">Status: </span>
                          {labelize(rz.status)}
                        </div>
                      ) : null}
                      {rz.errorDescription || rz.errorReason ? (
                        <div>
                          <span className="font-medium text-slate-700">Error: </span>
                          {rz.errorDescription ||
                            String(rz.errorReason || '').replace(/_/g, ' ')}
                          {rz.errorSource ? ` (${rz.errorSource})` : ''}
                          {rz.errorStep ? ` · ${rz.errorStep}` : ''}
                        </div>
                      ) : null}
                      {rz.methodDetail ? (
                        <div>
                          <span className="font-medium text-slate-700">Method: </span>
                          {rz.methodDetail}
                        </div>
                      ) : null}
                      {rz.paymentId ? (
                        <div>
                          <span className="font-medium text-slate-700">Payment ID: </span>
                          {rz.paymentId}
                        </div>
                      ) : null}
                      {rz.orderId ? (
                        <div>
                          <span className="font-medium text-slate-700">Order ID: </span>
                          {rz.orderId}
                        </div>
                      ) : null}
                      {rz.description ? (
                        <div>
                          <span className="font-medium text-slate-700">Description: </span>
                          {rz.description}
                        </div>
                      ) : null}
                    </dl>
                  ) : attempt.detail ? (
                    <p className="mt-1 text-sm text-gray-700">{attempt.detail}</p>
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
