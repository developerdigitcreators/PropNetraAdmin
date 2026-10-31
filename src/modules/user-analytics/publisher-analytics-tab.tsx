"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { PaginationBar } from "@/components/common/pagination-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PUBLISHER_ANALYTICS_TABS,
  userAnalyticsApiError,
  userAnalyticsService,
  type GroupedTab,
  type PersonRow,
} from "@/services/user-analytics.service";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import {
  canReadUserAnalyticsFeatures,
  userAnalyticsReadPermissionHint,
} from "@/modules/app-users/app-users-access";

type TimelineRenderProps = {
  tab: GroupedTab<PersonRow>;
  groupBy: "day" | "month";
  empty: string;
  emptyDetail: string;
  showChannels?: boolean;
  showPlan?: boolean;
  showStatus?: boolean;
  showPublisherExtras?: boolean;
  showTeamMember?: boolean;
  onPreviewListing?: (listingId: string) => void;
};

type PublisherAnalyticsTabProps = {
  userId: string;
  appRole?: string | null;
  analyticsTab: string;
  onAnalyticsTabChange: (tab: string) => void;
  refreshKey: number;
  onPreviewListing: (listingId: string) => void;
  renderTimeline: (props: TimelineRenderProps) => ReactNode;
};

export function PublisherAnalyticsTab({
  userId,
  analyticsTab,
  onAnalyticsTabChange,
  refreshKey,
  onPreviewListing,
  renderTimeline,
}: PublisherAnalyticsTabProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canReadPublisher = canReadUserAnalyticsFeatures(hasPermission);

  const tab = PUBLISHER_ANALYTICS_TABS.includes(
    analyticsTab as (typeof PUBLISHER_ANALYTICS_TABS)[number],
  )
    ? analyticsTab
    : "listingViewers";

  const [viewersLoading, setViewersLoading] = useState(false);
  const [viewersError, setViewersError] = useState("");
  const [viewersGrouped, setViewersGrouped] = useState<GroupedTab<PersonRow>>({
    days: [],
    months: [],
    summary: [],
    total: 0,
  });
  const [viewersPage, setViewersPage] = useState(1);
  const [viewersLimit, setViewersLimit] = useState(20);
  const [viewersTotal, setViewersTotal] = useState(0);
  const [viewersTotalPages, setViewersTotalPages] = useState(1);
  const [viewersFake, setViewersFake] = useState({
    fakeViews: 0,
    listings: [] as Array<{ listingId: string; name: string; fakeViews: number }>,
  });

  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState("");
  const [leadsGrouped, setLeadsGrouped] = useState<GroupedTab<PersonRow>>({
    days: [],
    months: [],
    summary: [],
    total: 0,
  });
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsLimit, setLeadsLimit] = useState(20);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsTotalPages, setLeadsTotalPages] = useState(1);

  const loadViewers = useCallback(async () => {
    setViewersLoading(true);
    setViewersError("");
    try {
      const res = await userAnalyticsService.fetchPublisherListingViewers(userId, {
        status: "active",
        page: viewersPage,
        limit: viewersLimit,
      });
      setViewersGrouped(res.grouped);
      setViewersFake(res.listingViewersFake);
      setViewersTotal(res.total);
      setViewersTotalPages(res.totalPages);
    } catch (err) {
      setViewersGrouped({ days: [], months: [], summary: [], total: 0 });
      setViewersError(
        userAnalyticsApiError(err, "Failed to load listing viewers."),
      );
    } finally {
      setViewersLoading(false);
    }
  }, [userId, viewersPage, viewersLimit, refreshKey]);

  const loadLeads = useCallback(async () => {
    setLeadsLoading(true);
    setLeadsError("");
    try {
      const res = await userAnalyticsService.fetchPublisherLeads(userId, {
        page: leadsPage,
        limit: leadsLimit,
      });
      setLeadsGrouped(res.grouped);
      setLeadsTotal(res.total);
      setLeadsTotalPages(res.totalPages);
    } catch (err) {
      setLeadsGrouped({ days: [], months: [], summary: [], total: 0 });
      setLeadsError(userAnalyticsApiError(err, "Failed to load leads."));
    } finally {
      setLeadsLoading(false);
    }
  }, [userId, leadsPage, leadsLimit, refreshKey]);

  useEffect(() => {
    if (tab !== "listingViewers") return;
    void loadViewers();
  }, [tab, loadViewers]);

  useEffect(() => {
    if (tab !== "leads") return;
    void loadLeads();
  }, [tab, loadLeads]);

  const groupBy = useMemo((): "day" | "month" => {
    const days = viewersGrouped.days.length ? viewersGrouped.days : leadsGrouped.days;
    if (days.length < 2) return "day";
    const first = days[0]?.date?.slice(0, 7);
    const last = days[days.length - 1]?.date?.slice(0, 7);
    return first && last && first !== last ? "month" : "day";
  }, [viewersGrouped.days, leadsGrouped.days]);

  if (!canReadPublisher) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
        You need <code>{userAnalyticsReadPermissionHint()}</code> to view
        listing viewers and leads.
      </div>
    );
  }

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        if (
          value === "listingViewers" ||
          value === "leads"
        ) {
          onAnalyticsTabChange(value);
        }
      }}
    >
      <TabsList className="mb-4 h-auto flex-wrap border bg-white p-1 shadow-sm">
        <TabsTrigger value="listingViewers" className="rounded-md px-4">
          Listing viewers
        </TabsTrigger>
        <TabsTrigger value="leads" className="rounded-md px-4">
          Leads
        </TabsTrigger>
      </TabsList>

      <TabsContent value="listingViewers" className="space-y-4">
        {viewersError ? (
          <p className="text-sm text-red-600">{viewersError}</p>
        ) : null}
        {viewersLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {viewersFake.fakeViews || viewersFake.listings.length ? (
              <div className="rounded-xl border border-orange-100 bg-orange-50/50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                  Fake views: {viewersFake.fakeViews}
                </p>
                {viewersFake.listings.length ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {viewersFake.listings.map((l) => (
                      <li
                        key={l.listingId}
                        className="rounded-md bg-white px-2.5 py-1 text-xs text-gray-700 shadow-sm"
                      >
                        {l.name}:{" "}
                        <span className="font-semibold text-orange-700">
                          {l.fakeViews}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            {renderTimeline({
              tab: viewersGrouped,
              groupBy,
              empty: "No listing viewers yet.",
              emptyDetail: "No viewer details for this date.",
              showPlan: true,
              showStatus: true,
              onPreviewListing,
            })}
            <PaginationBar
              currentPage={viewersPage}
              totalItems={viewersTotal}
              pageSize={viewersLimit}
              totalPages={viewersTotalPages}
              onPageChange={setViewersPage}
              onPageSizeChange={(size) => {
                setViewersLimit(size);
                setViewersPage(1);
              }}
            />
          </>
        )}
      </TabsContent>

      <TabsContent value="leads" className="space-y-4">
        {leadsError ? (
          <p className="text-sm text-red-600">{leadsError}</p>
        ) : null}
        {leadsLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {renderTimeline({
              tab: leadsGrouped,
              groupBy,
              empty: "No agent interest or team contact leads yet.",
              emptyDetail: "No lead details for this date.",
              showChannels: true,
              showPublisherExtras: true,
              showTeamMember: true,
              onPreviewListing,
            })}
            <PaginationBar
              currentPage={leadsPage}
              totalItems={leadsTotal}
              pageSize={leadsLimit}
              totalPages={leadsTotalPages}
              onPageChange={setLeadsPage}
              onPageSizeChange={(size) => {
                setLeadsLimit(size);
                setLeadsPage(1);
              }}
            />
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}
