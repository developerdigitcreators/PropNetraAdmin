"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/format-date";
import { PermissionGuard } from "@/components/common/permission-guard";
import { Breadcrumb } from "@/components/common/breadcrumb";
import { SearchableSelect } from "@/components/common/searchable-select";
import { AdminListToolbar } from "@/components/common/admin-list-toolbar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  countTabItems,
  userAnalyticsApiError,
  userAnalyticsService,
  type AnalyticsPlace,
  type AnalyticsUser,
  type DayBucket,
  type GroupedTab,
  type PersonRow,
  type UserAnalyticsDetail,
} from "@/services/user-analytics.service";
import { adminUsersService } from "@/services/admin-users.service";
import {
  ticketApiError,
  supportTicketsService,
  type SupportTicketItem,
} from "@/services/support-tickets.service";
import { SubscriptionTab } from "@/modules/user-analytics/subscription-tab";
import { ReferralTab } from "@/modules/user-analytics/referral-tab";
import { UserListingsTab } from "@/modules/user-analytics/user-listings-tab";
import { VerificationDocsSection } from "@/modules/user-analytics/verification-docs-section";
import Link from "next/link";
import {
  BarChart3,
  CalendarRange,
  ChevronDown,
  Eye,
  Gift,
  Loader2,
  MapPin,
  Mail,
  MessageSquare,
  Phone,
  Sparkles,
  ArrowLeft,
  Building2,
  UserRound,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { USER_PROFILE_READ_PERMISSIONS } from "@/modules/app-users/app-users-access";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { planLabelFromCode, resolvePlanChip } from "@/lib/plan-labels";

type ProfileTab = "subscription" | "refer" | "analytics" | "write" | "listings";
type DetailTab = "views" | "contacted" | "leads";

type ProfileUser = AnalyticsUser & {
  status?: string;
  role?: string;
  state?: string;
};

type ProfileGridCell = {
  key: string;
  label: string;
  value: string;
  icon: LucideIcon;
};

function parseLocalDate(iso: string) {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDayLabel(iso: string) {
  const date = parseLocalDate(iso);
  if (!date) return iso || "—";
  return formatDisplayDate(date);
}

function formatMonthLabel(ym: string) {
  const match = ym.match(/^(\d{4})-(\d{2})/);
  if (!match) return ym;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  if (Number.isNaN(date.getTime())) return ym;
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDisplayDate(value);
  return formatDisplayDateTime(value);
}

function userLabel(user: Pick<AnalyticsUser, "name" | "contact" | "email">) {
  return [user.name || "Unnamed user", user.contact || user.email]
    .filter(Boolean)
    .join(" · ");
}

function dash(value?: string | null) {
  return value?.trim() || "—";
}

function pickRoleName(user: Record<string, unknown>): string {
  const direct = String(
    user.role || user.roleName || user.role_name || "",
  ).trim();
  if (direct) return direct;
  const roles = user.userRoles;
  if (Array.isArray(roles) && roles.length > 0) {
    const first = roles[0] as Record<string, unknown>;
    const nested = first?.role as Record<string, unknown> | undefined;
    const name = String(nested?.name || first?.name || "").trim();
    if (name) return name.replace(/_/g, " ");
  }
  return "";
}

function buildProfileGridCells(
  detailUser?: ProfileUser | null,
  selected?: ProfileUser | null,
): ProfileGridCell[] {
  const phone = detailUser?.contact || selected?.contact || "";
  const email = detailUser?.email || selected?.email || "";
  const company = detailUser?.companyName || selected?.companyName || "";
  const address = detailUser?.address || selected?.address || "";
  const city = detailUser?.city || selected?.city || "";
  const role = detailUser?.role || selected?.role || "";
  const status = detailUser?.status || selected?.status || "";
  const state = detailUser?.state || selected?.state || "";

  const cells: ProfileGridCell[] = [];
  const push = (
    key: string,
    label: string,
    value: string,
    icon: LucideIcon,
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    cells.push({ key, label, value: trimmed, icon });
  };

  push("phone", "Phone", phone, Phone);
  push("email", "Email", email, Mail);
  push("company", "Company", company, Building2);
  push("address", "Address", address, MapPin);
  push("city", "City", city, MapPin);
  push("state", "State", state, MapPin);
  push("role", "Role", role, UserRound);
  push("status", "Status", status.replace(/_/g, " "), Shield);

  return cells.slice(0, 9);
}

function EmptyState({ icon: Icon, text }: { icon: typeof Eye; text: string }) {
  return (
    <div className="px-6 py-16 text-center text-gray-500">
      <Icon className="mx-auto mb-3 h-8 w-8 text-gray-300" />
      {text}
    </div>
  );
}

function ChannelLogos({ channels }: { channels: string[] }) {
  if (!channels.length) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      {channels.includes("call") ? (
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-50 text-sky-700"
          title="Call"
        >
          <Phone className="h-3 w-3" />
        </span>
      ) : null}
      {channels.includes("whatsapp") ? (
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"
          title="WhatsApp"
        >
          <MessageSquare className="h-3 w-3" />
        </span>
      ) : null}
    </span>
  );
}

function PlanBadge({ planCode }: { planCode?: string | null }) {
  const chip = resolvePlanChip(null, planCode);
  if (!chip && !planCode) return null;
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
        chip?.className || "bg-slate-100 text-slate-700"
      }`}
    >
      {chip?.label ||
        planLabelFromCode(planCode) ||
        String(planCode).replace(/_/g, " ")}
    </span>
  );
}

function PeopleTable({
  items,
  showChannels,
  showPlan,
  empty,
}: {
  items: PersonRow[];
  showChannels?: boolean;
  showPlan?: boolean;
  empty?: string;
}) {
  if (!items.length) {
    return (
      <p className="px-4 py-6 text-sm text-gray-500">
        {empty || "No records for this date."}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100 bg-gray-50/60">
          <tr>
            <th className="px-4 py-2.5 font-semibold text-gray-700">Name</th>
            {showPlan ? (
              <th className="px-4 py-2.5 font-semibold text-gray-700">Plan</th>
            ) : null}
            <th className="px-4 py-2.5 font-semibold text-gray-700">
              Contact no
            </th>
            <th className="px-4 py-2.5 font-semibold text-gray-700">Project</th>
            <th className="px-4 py-2.5 font-semibold text-gray-700">BHK</th>
            <th className="px-4 py-2.5 font-semibold text-gray-700">City</th>
            <th className="px-4 py-2.5 font-semibold text-gray-700">
              Location
            </th>
            <th className="px-4 py-2.5 font-semibold text-gray-700">
              Date & time
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className="border-b border-gray-50 last:border-0">
              <td className="px-4 py-3">
                <span className="font-medium text-gray-900">
                  {dash(row.name)}
                </span>
              </td>
              {showPlan ? (
                <td className="px-4 py-3">
                  {row.actorPlanCodeAtEvent ? (
                    <PlanBadge planCode={row.actorPlanCodeAtEvent} />
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              ) : null}
              <td className="px-4 py-3 text-gray-600">
                <span className="inline-flex items-center gap-1.5">
                  {showChannels ? (
                    <ChannelLogos channels={row.channels} />
                  ) : null}
                  <span>{dash(row.contact)}</span>
                </span>
              </td>
              <td className="px-4 py-3 text-gray-900">{dash(row.project)}</td>
              <td className="px-4 py-3 text-gray-600">{dash(row.bhk)}</td>
              <td className="px-4 py-3 text-gray-600">{dash(row.city)}</td>
              <td className="px-4 py-3 text-gray-600">{dash(row.location)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                {formatDateTime(row.occurredAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CollapsibleDay({
  day,
  showChannels,
  showPlan,
  emptyDetail,
}: {
  day: DayBucket<PersonRow>;
  showChannels?: boolean;
  showPlan?: boolean;
  emptyDetail: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <button
        type="button"
        className="flex w-full items-center gap-2 bg-gray-50/80 px-4 py-2.5 text-left hover:bg-gray-50"
        onClick={() => setOpen((prev) => !prev)}
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition ${open ? "rotate-180" : ""}`}
        />
        <CalendarRange className="h-3.5 w-3.5 text-gray-400" />
        <h4 className="flex-1 text-sm font-semibold text-gray-800">
          {formatDayLabel(day.date)}
        </h4>
        <Badge variant="secondary" className="bg-primary-light text-primary">
          {day.total}
        </Badge>
      </button>
      {open ? (
        day.detailAvailable ? (
          <PeopleTable
            items={day.items}
            showChannels={showChannels}
            showPlan={showPlan}
            empty={emptyDetail}
          />
        ) : (
          <p className="px-4 py-6 text-sm text-gray-500">
            Detail expired for this date. The count above is kept forever.
          </p>
        )
      ) : null}
    </section>
  );
}

function CollapsibleTimeline({
  tab,
  groupBy,
  empty,
  emptyDetail,
  showChannels,
  showPlan,
}: {
  tab: GroupedTab<PersonRow>;
  groupBy: "day" | "month";
  empty: string;
  emptyDetail: string;
  showChannels?: boolean;
  showPlan?: boolean;
}) {
  const days =
    groupBy === "day" ? tab.days : tab.months.flatMap((month) => month.days);
  const months = groupBy === "month" ? tab.months : [];

  if (!days.length && !months.length) {
    return <EmptyState icon={CalendarRange} text={empty} />;
  }

  if (groupBy === "month") {
    return (
      <div className="space-y-6">
        {months.map((month) => (
          <section key={month.month} className="space-y-3">
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
                {formatMonthLabel(month.month)}
              </span>
              <Badge
                variant="outline"
                className="border-gray-200 text-gray-600"
              >
                {month.total}
              </Badge>
            </div>
            <div className="space-y-2">
              {month.days.map((day) => (
                <CollapsibleDay
                  key={day.date}
                  day={day}
                  showChannels={showChannels}
                  showPlan={showPlan}
                  emptyDetail={emptyDetail}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {days.map((day) => (
        <CollapsibleDay
          key={day.date}
          day={day}
          showChannels={showChannels}
          showPlan={showPlan}
          emptyDetail={emptyDetail}
        />
      ))}
    </div>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-gray-500">
      <Sparkles className="mx-auto mb-3 h-8 w-8 text-gray-300" />
      <p className="text-base font-medium text-gray-700">{title}</p>
      <p className="mt-1 text-sm">Coming soon</p>
    </div>
  );
}

function WriteToUsTab({ userId }: { userId: string }) {
  const [items, setItems] = useState<SupportTicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    supportTicketsService
      .list(undefined, "", userId)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setItems([]);
          setError(ticketApiError(err, "Failed to load support tickets."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
        {error}
      </div>
    );
  }
  if (!items.length) {
    return (
      <EmptyState
        icon={MessageSquare}
        text="No support tickets from this user."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((row) => (
        <Link
          key={row.id}
          href="/support-tickets"
          className="block rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-primary/30 hover:bg-gray-50/50"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                #{row.ticketNo} · {row.issueType || "Support ticket"}
              </p>
              <p className="mt-1 text-xs capitalize text-gray-500">
                Status: {row.status}
              </p>
            </div>
            <Badge variant="secondary" className="bg-gray-100 text-gray-700">
              {row.remarksCount} remark{row.remarksCount === 1 ? "" : "s"}
            </Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
            <span>{formatDateTime(row.createdAt)}</span>
            {row.reissueCount > 0 ? (
              <span>Reissued {row.reissueCount}×</span>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}

export function UserAnalyticsPanel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { filters, setFilters, resetFilters } = useUrlFilters({
    from: "",
    to: "",
    stateId: "",
    cityId: "",
    tab: "subscription",
    aTab: "views",
  });

  const from = filters.from;
  const to = filters.to;
  const stateId = filters.stateId;
  const cityId = filters.cityId;
  const profileTab = (
    ["subscription", "refer", "analytics", "write", "listings"].includes(
      filters.tab,
    )
      ? filters.tab
      : "subscription"
  ) as ProfileTab;
  const analyticsTab = (
    ["views", "contacted", "leads"].includes(filters.aTab)
      ? filters.aTab
      : "views"
  ) as DetailTab;

  const setFrom = (value: string) => setFilters({ from: value });
  const setTo = (value: string) => setFilters({ to: value });
  const setStateId = (value: string) => setFilters({ stateId: value });
  const setCityId = (value: string) => setFilters({ cityId: value });
  const setProfileTab = (value: ProfileTab) => setFilters({ tab: value });
  const setAnalyticsTab = (value: DetailTab) => setFilters({ aTab: value });

  // URL is the source of truth for deep-links (Property listing → analytics, etc.).
  const userId = String(searchParams.get("userId") || "").trim();
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [refreshBusy, setRefreshBusy] = useState(false);

  const [states, setStates] = useState<AnalyticsPlace[]>([]);
  const [cities, setCities] = useState<AnalyticsPlace[]>([]);
  const [users, setUsers] = useState<AnalyticsUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ProfileUser | null>(null);

  const [statesLoading, setStatesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [error, setError] = useState("");
  const [detail, setDetail] = useState<UserAnalyticsDetail | null>(null);

  const replaceAnalyticsQuery = useCallback(
    (params: URLSearchParams) => {
      const qs = params.toString();
      const href = qs ? `/user-analytics?${qs}` : "/user-analytics";
      if (typeof window !== "undefined") {
        const currentQs = window.location.search.startsWith("?")
          ? window.location.search.slice(1)
          : window.location.search;
        if (window.location.pathname === "/user-analytics" && currentQs === qs) {
          return;
        }
      }
      router.replace(href, { scroll: false });
    },
    [router],
  );

  const clearUserFromUrl = useCallback(() => {
    if (!userId) return;
    const params = new URLSearchParams(
      typeof window !== "undefined"
        ? window.location.search
        : searchParams.toString(),
    );
    params.delete("userId");
    replaceAnalyticsQuery(params);
    setSelectedUser(null);
    setDetail(null);
  }, [replaceAnalyticsQuery, searchParams, userId]);

  useEffect(() => {
    if (!userId) {
      setSelectedUser(null);
      setDetail(null);
      return;
    }

    // Deep-link: ensure date range exists so search chrome stays valid if user goes back.
    setFilters((prev) => {
      if (prev.from && prev.to) return prev;
      const today = new Date();
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      const toYmd = (d: Date) => d.toISOString().slice(0, 10);
      return {
        ...prev,
        from: prev.from || toYmd(start),
        to: prev.to || toYmd(today),
      };
    });

    let cancelled = false;
    adminUsersService
      .getUserById(userId)
      .then((raw) => {
        if (cancelled) return;
        const user = (raw?.data ?? raw?.user ?? raw) as Record<string, unknown>;
        if (!user || typeof user !== "object") {
          setSelectedUser({
            id: userId,
            name: "User",
            contact: "",
            email: "",
          });
          return;
        }
        const id = String(user.id || userId);
        setSelectedUser({
          id,
          name: String(user.name || ""),
          contact: String(user.contact || user.phone || ""),
          email: String(user.email || ""),
          city: String(user.city || "") || undefined,
          companyName:
            String(user.companyName || user.company_name || "") || undefined,
          address: String(user.address || "") || undefined,
          status: String(user.status || "") || undefined,
          role: pickRoleName(user) || undefined,
          state:
            String(
              user.state ||
                (user.stateObj as { name?: string } | undefined)?.name ||
                (typeof user.stateName === "string" ? user.stateName : "") ||
                "",
            ) || undefined,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedUser({
            id: userId,
            name: "User",
            contact: "",
            email: "",
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const rangeReady = !!from && !!to && from <= to;
  const rangeError =
    !!from && !!to && from > to
      ? "End date must be on or after the start date."
      : "";
  const canPickState = rangeReady;
  const canPickCity = rangeReady && !!stateId;
  const canPickUser = rangeReady;

  const stateName = states.find((row) => row.id === stateId)?.name;
  const cityName = cities.find((row) => row.id === cityId)?.name;

  const userOptions = useMemo(
    () => users.map((user) => ({ value: user.id, label: userLabel(user) })),
    [users],
  );

  useEffect(() => {
    if (!rangeReady) {
      setStates([]);
      if (stateId) setStateId("");
      return;
    }
    let cancelled = false;
    setStatesLoading(true);
    userAnalyticsService
      .getStates()
      .then((items) => {
        if (!cancelled) setStates(items);
      })
      .catch((err) => {
        if (!cancelled) {
          setStates([]);
          setError(userAnalyticsApiError(err, "Failed to load states."));
        }
      })
      .finally(() => {
        if (!cancelled) setStatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rangeReady]);

  useEffect(() => {
    if (!canPickCity) {
      setCities([]);
      if (cityId) setCityId("");
      return;
    }
    let cancelled = false;
    setCitiesLoading(true);
    userAnalyticsService
      .getCities(stateId)
      .then((items) => {
        if (!cancelled) setCities(items);
      })
      .catch((err) => {
        if (!cancelled) {
          setCities([]);
          setError(userAnalyticsApiError(err, "Failed to load cities."));
        }
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canPickCity, stateId]);

  const loadUsers = useCallback(
    (search = "") => {
      if (!canPickUser) {
        setUsers([]);
        return;
      }
      setUsersLoading(true);
      const q = search.trim();
      const direct = q.length >= 2;
      userAnalyticsService
        .searchUsers({
          // Direct name/phone/email search must not be limited by city/listings filters.
          stateId: direct ? undefined : stateId || undefined,
          cityId: direct ? undefined : cityId || undefined,
          from,
          to,
          search: q,
        })
        .then(setUsers)
        .catch((err) => {
          setUsers([]);
          setError(userAnalyticsApiError(err, "Failed to search users."));
        })
        .finally(() => setUsersLoading(false));
    },
    [canPickUser, cityId, from, stateId, to],
  );

  useEffect(() => {
    if (!canPickUser) {
      setUsers([]);
      return;
    }
    loadUsers("");
  }, [canPickUser, loadUsers]);

  useEffect(() => {
    if (!userId) {
      setDetail(null);
      return;
    }
    const analyticsFrom = "2020-01-01";
    const analyticsTo = new Date().toISOString().slice(0, 10);
    let cancelled = false;
    setDetailLoading(true);
    setError("");
    userAnalyticsService
      .getUserAnalytics({
        userId,
        from: analyticsFrom,
        to: analyticsTo,
        stateId,
        cityId,
        fallbackUser: selectedUser,
      })
      .then((next) => {
        if (!cancelled) setDetail(next);
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail(null);
          setError(
            userAnalyticsApiError(
              err,
              "Failed to load user profile analytics.",
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cityId, refreshNonce, selectedUser?.id, stateId, userId]);

  const pickUser = (id: string) => {
    if (!id) {
      clearUserFromUrl();
      return;
    }
    if (id === userId) return;
    const match = users.find((user) => user.id === id) || null;
    setSelectedUser(match as ProfileUser | null);
    setProfileTab("analytics");
    setAnalyticsTab("views");
    const params = new URLSearchParams(
      typeof window !== "undefined"
        ? window.location.search
        : searchParams.toString(),
    );
    params.set("userId", id);
    // Ensure dates exist so returning to search still works.
    if (!params.get("from") || !params.get("to")) {
      const today = new Date();
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      const toYmd = (d: Date) => d.toISOString().slice(0, 10);
      if (!params.get("from")) params.set("from", from || toYmd(start));
      if (!params.get("to")) params.set("to", to || toYmd(today));
    }
    replaceAnalyticsQuery(params);
  };

  const handleRefresh = () => {
    if (!userId) return;
    setRefreshBusy(true);
    setRefreshNonce((n) => n + 1);
    void adminUsersService
      .getUserById(userId)
      .then((raw) => {
        const user = (raw?.data ?? raw?.user ?? raw) as Record<string, unknown>;
        if (!user || typeof user !== "object") return;
        setSelectedUser({
          id: String(user.id || userId),
          name: String(user.name || ""),
          contact: String(user.contact || user.phone || ""),
          email: String(user.email || ""),
          city: String(user.city || "") || undefined,
          companyName:
            String(user.companyName || user.company_name || "") || undefined,
          address: String(user.address || "") || undefined,
          status: String(user.status || "") || undefined,
          role: pickRoleName(user) || undefined,
          state:
            String(
              user.state ||
                (user.stateObj as { name?: string } | undefined)?.name ||
                (typeof user.stateName === "string" ? user.stateName : "") ||
                "",
            ) || undefined,
        });
      })
      .catch(() => undefined)
      .finally(() => {
        window.setTimeout(() => setRefreshBusy(false), 400);
      });
  };

  const handleResetFilters = () => {
    resetFilters();
    if (!userId) {
      setSelectedUser(null);
      setDetail(null);
    }
  };

  const groupBy =
    detail?.range.groupBy ||
    (from && to && from.slice(0, 7) !== to.slice(0, 7) ? "month" : "day");
  const viewsCount = detail ? countTabItems(detail.views) : 0;
  const contactedCount = detail ? countTabItems(detail.contacted) : 0;
  const leadsCount = detail ? countTabItems(detail.interested) : 0;
  const usage = detail?.usage;
  const profileGridCells = useMemo(
    () =>
      buildProfileGridCells(
        detail?.user as ProfileUser | undefined,
        selectedUser,
      ),
    [detail?.user, selectedUser],
  );

  return (
    <PermissionGuard
      permission={[...USER_PROFILE_READ_PERMISSIONS]}
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view User Profile.
        </div>
      }
    >
      <div className="max-w-7xl space-y-6 pb-16">
        <Breadcrumb
          items={
            userId
              ? [
                  {
                    label: "User Profile master data",
                    href: "/user-analytics",
                  },
                  { label: selectedUser?.name || "Profile" },
                ]
              : [{ label: "User Profile master data" }]
          }
        />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {userId ? (
              <Link
                href="/user-analytics"
                className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to User Profile master data
              </Link>
            ) : null}
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              User Profile
            </h1>
            <p className="mt-1 text-gray-500">
              {userId
                ? "Subscription, referral, analytics, and support for this user."
                : "Search any user by name, phone, or email. Date range is required; state and city are optional."}
            </p>
          </div>
          {userId ? (
            <AdminListToolbar
              onRefresh={handleRefresh}
              refreshBusy={refreshBusy || detailLoading}
              onReset={handleResetFilters}
            />
          ) : null}
        </div>

        {!userId ? (
          <div className="relative z-20 overflow-visible rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  From
                </span>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setSelectedUser(null);
                    setDetail(null);
                  }}
                  className="h-9 bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  To
                </span>
                <Input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setSelectedUser(null);
                    setDetail(null);
                  }}
                  className="h-9 bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  State
                </span>
                <Select
                  value={stateId || null}
                  onValueChange={(value) => {
                    setStateId(value ?? "");
                    setCityId("");
                    setSelectedUser(null);
                    setDetail(null);
                  }}
                  disabled={!canPickState}
                >
                  <SelectTrigger className="h-9 w-full bg-white">
                    <span className={!stateName ? "text-muted-foreground" : ""}>
                      {statesLoading
                        ? "Loading…"
                        : stateName ||
                          (canPickState
                            ? "Select state"
                            : "Select dates first")}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state.id} value={state.id}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  City
                </span>
                <Select
                  value={cityId || null}
                  onValueChange={(value) => {
                    setCityId(value ?? "");
                    setSelectedUser(null);
                    setDetail(null);
                  }}
                  disabled={!canPickCity}
                >
                  <SelectTrigger className="h-9 w-full bg-white">
                    <span className={!cityName ? "text-muted-foreground" : ""}>
                      {citiesLoading
                        ? "Loading…"
                        : cityName ||
                          (canPickCity ? "Select city" : "Select state first")}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                        {city.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <div className="relative z-30 sm:col-span-2">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Direct user search
                </span>
                <SearchableSelect
                  options={userOptions}
                  value={userId}
                  onValueChange={pickUser}
                  onSearch={canPickUser ? loadUsers : undefined}
                  loading={usersLoading}
                  disabled={!canPickUser}
                  placeholder={
                    canPickUser
                      ? "Search name, phone, or email"
                      : "Select dates first"
                  }
                  searchPlaceholder="Search name, phone, or email"
                  emptyText="No users found. Try a name, phone, or email."
                  selectedLabel={
                    selectedUser ? userLabel(selectedUser) : undefined
                  }
                />
              </div>
            </div>
            {rangeError && (
              <p className="mt-3 text-sm text-red-600">{rangeError}</p>
            )}
          </div>
        ) : null}

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!userId ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-gray-500">
            <BarChart3 className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            Select a user to open their profile.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="w-full min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Selected user
                </p>
                <h2 className="mt-1 truncate text-lg font-semibold text-gray-900">
                  {selectedUser?.name || detail?.user.name || "User"}
                </h2>
                {(selectedUser as { status?: string } | null)?.status ===
                  "without_referral" ||
                (detail?.user as { status?: string } | undefined)?.status ===
                  "without_referral" ? (
                  <span className="mt-2 inline-flex rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-800">
                    Without referral
                  </span>
                ) : null}
                {profileGridCells.length > 0 ? (
                  <div className="mt-3 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {profileGridCells.map((cell) => {
                      const Icon = cell.icon;
                      return (
                        <div
                          key={cell.key}
                          className="flex min-w-0 items-start gap-2 rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5"
                        >
                          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                              {cell.label}
                            </p>
                            <p className="break-words text-sm text-gray-700">
                              {cell.value}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                {usage ? (
                  <p className="mt-2 text-xs text-gray-500">
                    This month ({usage.period || "—"}): card views used{" "}
                    {usage.viewsUsed ?? 0}
                    {usage.unlimitedViews
                      ? " / unlimited"
                      : ` / ${usage.viewsLimit ?? 150}`}
                    <span className="ml-1 text-gray-400">
                      (quota for this user — card views they opened this month)
                    </span>
                  </p>
                ) : null}
              </div>
            </div>

            <Tabs
              value={profileTab}
              onValueChange={(value) => {
                if (value === profileTab) return;
                if (
                  value === "subscription" ||
                  value === "refer" ||
                  value === "analytics" ||
                  value === "write" ||
                  value === "listings"
                ) {
                  setProfileTab(value);
                }
              }}
              className="w-full"
            >
              <TabsList className="mb-4 h-auto flex-wrap border bg-white p-1 shadow-sm">
                <TabsTrigger
                  value="subscription"
                  className="gap-1.5 rounded-md px-4"
                >
                  <Sparkles className="h-4 w-4" />
                  Subscription
                </TabsTrigger>
                <TabsTrigger value="refer" className="gap-1.5 rounded-md px-4">
                  <Gift className="h-4 w-4" />
                  Refer and Earn
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="gap-1.5 rounded-md px-4"
                >
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="write" className="gap-1.5 rounded-md px-4">
                  <MessageSquare className="h-4 w-4" />
                  Write to Us
                </TabsTrigger>
                <TabsTrigger
                  value="listings"
                  className="gap-1.5 rounded-md px-4"
                >
                  <Building2 className="h-4 w-4" />
                  Listings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="subscription" className="space-y-4">
                {userId ? (
                  <VerificationDocsSection
                    key={`docs-${refreshNonce}`}
                    userId={userId}
                  />
                ) : null}
                <SubscriptionTab key={`sub-${refreshNonce}`} userId={userId} />
              </TabsContent>
              <TabsContent value="refer">
                <ReferralTab key={`ref-${refreshNonce}`} userId={userId} />
              </TabsContent>
              <TabsContent value="write">
                <WriteToUsTab key={`write-${refreshNonce}`} userId={userId} />
              </TabsContent>
              <TabsContent value="listings">
                <UserListingsTab key={`list-${refreshNonce}`} userId={userId} />
              </TabsContent>
              <TabsContent value="analytics" className="space-y-4">
                {detailLoading && !detail ? (
                  <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Tabs
                    value={analyticsTab}
                    onValueChange={(value) => {
                      if (value === analyticsTab) return;
                      if (
                        value === "views" ||
                        value === "contacted" ||
                        value === "leads"
                      ) {
                        setAnalyticsTab(value);
                      }
                    }}
                  >
                    <TabsList className="mb-4 h-auto border bg-white p-1 shadow-sm">
                      <TabsTrigger
                        value="views"
                        className="gap-1.5 rounded-md px-5"
                      >
                        <Eye className="h-4 w-4" />
                        Views
                        <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {viewsCount}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="contacted"
                        className="gap-1.5 rounded-md px-5"
                      >
                        <Phone className="h-4 w-4" />
                        Listing contacts
                        <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {contactedCount}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="leads"
                        className="gap-1.5 rounded-md px-5"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Leads
                        <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {leadsCount}
                        </span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="views">
                      <CollapsibleTimeline
                        tab={
                          detail?.views || {
                            days: [],
                            months: [],
                            summary: [],
                            total: 0,
                          }
                        }
                        groupBy={groupBy}
                        empty="This user did not view any listings in this range."
                        emptyDetail="No view details on this date."
                      />
                    </TabsContent>
                    <TabsContent value="contacted">
                      <CollapsibleTimeline
                        tab={
                          detail?.contacted || {
                            days: [],
                            months: [],
                            summary: [],
                            total: 0,
                          }
                        }
                        groupBy={groupBy}
                        empty="This user did not contact any listings in this range."
                        emptyDetail="No contact details on this date."
                        showChannels
                        showPlan
                      />
                    </TabsContent>
                    <TabsContent value="leads">
                      <CollapsibleTimeline
                        tab={
                          detail?.interested || {
                            days: [],
                            months: [],
                            summary: [],
                            total: 0,
                          }
                        }
                        groupBy={groupBy}
                        empty="No leads for this user’s listings in this range."
                        emptyDetail="No lead details on this date."
                        showChannels
                        showPlan
                      />
                    </TabsContent>
                  </Tabs>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
