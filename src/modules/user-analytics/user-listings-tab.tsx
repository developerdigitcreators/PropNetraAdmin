"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { MaskedContact } from "@/components/contact/masked-contact";
import { useAuthStore } from "@/store/use-auth-store";
import {
  getListingDetailRows,
  listingsService,
  type ListingReviewItem,
  type MyListingDetail,
} from "@/services/listings.service";
import { subscriptionApiError } from "@/services/subscriptions.service";
import {
  isPublisherAppRole,
  publisherTrackFromAppRole,
  userAnalyticsService,
  type PublisherListingRow,
  type PublisherMetricKey,
} from "@/services/user-analytics.service";
import {
  PublisherListingEventsDialog,
  PublisherListingMetricChips,
  publisherRowFromCounts,
} from "@/modules/user-analytics/publisher-listing-metrics-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDisplayDateTime } from "@/lib/format-date";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  canReadUserAnalyticsFeatures,
  canDeleteUserAnalyticsListing,
  canUpdateDeveloperUserListings,
  canCreateDeveloperUserListings,
  userAnalyticsReadPermissionHint,
  userAnalyticsDeletePermissionHint,
} from "@/modules/app-users/app-users-access";
import { MyListingAnalyticsConfigPanel } from "@/modules/user-analytics/my-listing-analytics-config-panel";
import { DeveloperUserListingEditDialog } from "@/modules/developer-user/developer-user-listing-edit-dialog";

type UserListingsTabProps = {
  userId: string | null;
  appRole?: string | null;
  refreshKey?: number;
  /** Developer User hub: show Edit on active/inactive developer listings. */
  enableDeveloperListingEdit?: boolean;
  /** Navigate to full-page editor instead of modal. */
  onEditListing?: (listingId: string) => void;
};

type CategoryGroupKey = "resale_rent" | "buy_requirement" | "developer";

type ListingTabKey =
  | "active"
  | "inactive"
  | "in_approval"
  | "rejected"
  | "expired";

const CATEGORY_GROUPS: Array<{ id: CategoryGroupKey; label: string }> = [
  { id: "resale_rent", label: "Resale / Rental" },
  { id: "buy_requirement", label: "Buy Requirement" },
];

const LISTING_TABS: Array<{ id: ListingTabKey; label: string }> = [
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
  { id: "in_approval", label: "In approval" },
  { id: "rejected", label: "Rejected" },
  { id: "expired", label: "Expired" },
];

function DetailField({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || "—"}</p>
    </div>
  );
}

function fmtDateTime(value?: string | null): string {
  return formatDisplayDateTime(value);
}

function expiryForTab(
  tab: ListingTabKey,
  item: Record<string, unknown>,
): string {
  if (tab === "active" || tab === "inactive" || tab === "expired") {
    return fmtDateTime(
      String(item.expiresAt || item.expires_at || "") || null,
    );
  }
  return fmtDateTime(
    String(item.draftExpiresAt || item.draft_expires_at || "") || null,
  );
}

function hardDeleteAt(item: Record<string, unknown>): string {
  return fmtDateTime(
    String(item.autoDeleteAt || item.auto_delete_at || "") || null,
  );
}

export function UserListingsTab({ userId, appRole, refreshKey = 0, enableDeveloperListingEdit = false, onEditListing }: UserListingsTabProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canRead = canReadUserAnalyticsFeatures(hasPermission);
  const canDeleteListing = canDeleteUserAnalyticsListing(hasPermission);
  const appRoleKey = String(appRole || "")
    .trim()
    .toLowerCase();
  const isDeveloperRole = appRoleKey === "developer";
  const canEditDeveloperListing =
    enableDeveloperListingEdit && canUpdateDeveloperUserListings(hasPermission);
  const canCreateDeveloperListing =
    enableDeveloperListingEdit &&
    canCreateDeveloperUserListings(hasPermission) &&
    isDeveloperRole;
  const isPublisherListings = isPublisherAppRole(appRole);
  const publisherTrack = publisherTrackFromAppRole(appRole);
  const isFloorRole = appRoleKey === "floor";
  const isAgentRole = appRoleKey === "agent";
  const showListingMetrics = isPublisherListings || isAgentRole;

  const [categoryGroup, setCategoryGroup] = useState<CategoryGroupKey>(
    "resale_rent",
  );
  const [listingTab, setListingTab] = useState<ListingTabKey>("active");
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState("");
  const [listingsPayload, setListingsPayload] = useState<{
    items: Array<Record<string, unknown>>;
    tabs: Record<ListingTabKey, number>;
  } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [listingDetail, setListingDetail] = useState<MyListingDetail | null>(
    null,
  );

  const [hardDeleteId, setHardDeleteId] = useState<string | null>(null);
  const [hardDeleteBusy, setHardDeleteBusy] = useState(false);
  const [hardDeleteError, setHardDeleteError] = useState("");
  const [editListingId, setEditListingId] = useState<string | null>(null);

  const [metricsByListingId, setMetricsByListingId] = useState<
    Map<string, PublisherListingRow["counts"]>
  >(new Map());
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [eventsListingId, setEventsListingId] = useState("");
  const [eventsMetric, setEventsMetric] = useState<PublisherMetricKey>("views");
  const [eventsTitle, setEventsTitle] = useState("");

  const listingsCategoryGroup = useMemo((): CategoryGroupKey | "dbf" => {
    if (isPublisherListings) {
      return isFloorRole ? "dbf" : "developer";
    }
    return categoryGroup;
  }, [isPublisherListings, isFloorRole, categoryGroup]);

  const metricsTabActive =
    listingTab === "active" || listingTab === "inactive";
  const metricSet = isDeveloperRole ? "full" : "contact_funnel";
  const listingEventsApi = isAgentRole ? "agent" : "publisher";
  const agentMetricsCategoryGroup =
    categoryGroup === "buy_requirement" ? "buy_requirement" : "resale_rent";

  useEffect(() => {
    if (!userId || !canRead) {
      setListingsPayload(null);
      return;
    }
    let cancelled = false;
    setListingsLoading(true);
    setListingsError("");
    listingsService
      .getAdminUserListings(userId, {
        tab: listingTab,
        categoryGroup: listingsCategoryGroup,
        page: 1,
        limit: 50,
      })
      .then((res) => {
        if (cancelled) return;
        setListingsPayload({
          items: Array.isArray(res.items) ? res.items : [],
          tabs: {
            active: Number(res.tabs?.active || 0),
            inactive: Number(res.tabs?.inactive || 0),
            in_approval: Number(res.tabs?.in_approval || 0),
            rejected: Number(res.tabs?.rejected || 0),
            expired: Number(res.tabs?.expired || 0),
          },
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setListingsPayload(null);
        setListingsError(
          subscriptionApiError(err, "Failed to load user listings."),
        );
      })
      .finally(() => {
        if (!cancelled) setListingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, canRead, listingTab, listingsCategoryGroup, reloadKey]);

  useEffect(() => {
    if (!userId || !canRead || !showListingMetrics || !metricsTabActive) {
      setMetricsByListingId(new Map());
      return;
    }
    let cancelled = false;
    setMetricsLoading(true);
    const status = listingTab as "active" | "inactive";
    const loadMetrics = isAgentRole
      ? userAnalyticsService.fetchAgentListings(userId, {
          status,
          categoryGroup: agentMetricsCategoryGroup,
          page: 1,
          limit: 100,
        })
      : userAnalyticsService.fetchPublisherListings(
          userId,
          { status, page: 1, limit: 100 },
          appRole,
        );
    loadMetrics
      .then((res) => {
        if (cancelled) return;
        const map = new Map<string, PublisherListingRow["counts"]>();
        for (const row of res.items) {
          map.set(row.listingId, row.counts);
        }
        setMetricsByListingId(map);
      })
      .catch(() => {
        if (!cancelled) setMetricsByListingId(new Map());
      })
      .finally(() => {
        if (!cancelled) setMetricsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    userId,
    canRead,
    showListingMetrics,
    metricsTabActive,
    isAgentRole,
    listingTab,
    appRole,
    agentMetricsCategoryGroup,
    reloadKey,
  ]);

  useEffect(() => {
    if (isPublisherListings && listingTab !== "active" && listingTab !== "inactive") {
      setListingTab("active");
    }
  }, [isPublisherListings, listingTab]);

  const visibleListingTabs = isPublisherListings
    ? LISTING_TABS.filter((t) => t.id === "active" || t.id === "inactive")
    : LISTING_TABS;

  const openMetricEvents = (
    listingId: string,
    title: string,
    metric: PublisherMetricKey,
  ) => {
    setEventsListingId(listingId);
    setEventsTitle(title);
    setEventsMetric(metric);
    setEventsOpen(true);
  };

  const detailRows = useMemo(() => {
    if (!listingDetail) return [];
    return getListingDetailRows({
      id: listingDetail.id,
      form: {
        dynamicData: {
          ...(listingDetail.dynamicData || {}),
          ...(listingDetail.form?.dynamicData || {}),
        },
      },
      dynamicData: listingDetail.dynamicData,
      building_type: listingDetail.buildingType,
      property_type: listingDetail.propertyType,
    } as ListingReviewItem);
  }, [listingDetail]);

  const openListingDetail = async (listingId: string) => {
    if (!userId) return;
    setDetailOpen(true);
    setDetailLoading(true);
    setListingDetail(null);
    try {
      const detail = await listingsService.getAdminUserListingDetail(
        userId,
        listingId,
      );
      setListingDetail(detail);
    } catch (err) {
      console.error(err);
      setListingDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const confirmHardDelete = async () => {
    if (!userId || !hardDeleteId) return;
    setHardDeleteBusy(true);
    setHardDeleteError("");
    try {
      await listingsService.hardDeleteAdminUserListing(userId, hardDeleteId);
      setHardDeleteId(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setHardDeleteError(
          `Delete denied. Assign ${userAnalyticsDeletePermissionHint()} on the staff role, then logout and login again.`,
        );
      } else {
        setHardDeleteError(
          subscriptionApiError(err, "Failed to hard delete listing."),
        );
      }
    } finally {
      setHardDeleteBusy(false);
    }
  };

  if (!userId) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
        Select a user to view listings.
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
        You need <code>{userAnalyticsReadPermissionHint()}</code> to view this tab.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-gray-900">Listings</h4>
          <p className="mt-1 text-xs text-gray-500">
            {isPublisherListings
              ? isFloorRole
                ? "DBF listings. Active and inactive only. Metrics: views, reveal, call, WA (lifetime)."
                : "Developer listings. Active and inactive only. Metrics are lifetime totals."
              : isAgentRole
                ? "Resale/rent or buy requirement. Active and inactive tabs include views, reveal, call, and WA metrics."
                : "Filter by Resale/Rental or Buy Requirement, then by status. Click a row for full details."}
          </p>
        </div>
        {canCreateDeveloperListing && onEditListing ? (
          <Button
            type="button"
            size="sm"
            onClick={() => onEditListing("new")}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add listing
          </Button>
        ) : null}
      </div>

      {userId ? (
        <MyListingAnalyticsConfigPanel
          userId={userId}
          refreshKey={refreshKey}
        />
      ) : null}

      {!isPublisherListings ? (
      <div className="mt-3 flex flex-wrap gap-2">
        {CATEGORY_GROUPS.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => {
              setCategoryGroup(group.id);
              setListingTab("active");
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              categoryGroup === group.id
                ? "bg-slate-900 text-white"
                : "border border-gray-200 bg-white text-gray-700"
            }`}
          >
            {group.label}
          </button>
        ))}
      </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {visibleListingTabs.map((tab) => {
          const count = listingsPayload?.tabs?.[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setListingTab(tab.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                listingTab === tab.id
                  ? "bg-primary text-white"
                  : "border border-gray-200 bg-white text-gray-700"
              }`}
            >
              {tab.label}
              {count != null ? (
                <span className="ml-1 opacity-80">({count})</span>
              ) : null}
            </button>
          );
        })}
      </div>
      {listingsError ? (
        <p className="mt-4 text-sm text-red-600">{listingsError}</p>
      ) : null}
      {listingsLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !listingsPayload?.items?.length ? (
        <p className="mt-4 text-sm text-gray-500">No listings in this tab.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-2 py-2">Title</th>
                {!isPublisherListings ? (
                  <>
                    <th className="px-2 py-2">Category</th>
                    <th className="px-2 py-2">Location</th>
                    <th className="px-2 py-2">Expires</th>
                  </>
                ) : (
                  <th className="px-2 py-2">Location</th>
                )}
                {showListingMetrics && metricsTabActive ? (
                  <th className="px-2 py-2">Metrics</th>
                ) : null}
                <th className="px-2 py-2">Created</th>
                {isPublisherListings || listingTab === "expired" || canEditDeveloperListing ? (
                  <th className="px-2 py-2">
                    {isPublisherListings ? "Actions" : listingTab === "expired" ? "Hard delete from system" : "Actions"}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {listingsPayload.items.map((item, idx) => {
                const id = String(item.id || idx);
                const title = String(
                  item.displayTitle ||
                    item.title ||
                    item.propertyName ||
                    "Listing",
                );
                const category = String(
                  item.category && typeof item.category === "object"
                    ? (item.category as { name?: string }).name || "—"
                    : item.category || "—",
                );
                const location = String(
                  item.locationName ||
                    (item.location as { name?: string } | undefined)?.name ||
                    item.cityName ||
                    "—",
                );
                const created = String(
                  item.createdAt || item.created_at || "",
                );
                const counts = metricsByListingId.get(id);
                const metricRow = counts
                  ? publisherRowFromCounts(id, title, location, listingTab, counts)
                  : null;
                return (
                  <tr
                    key={id}
                    className="cursor-pointer border-b border-gray-50 hover:bg-gray-50"
                    onClick={() => void openListingDetail(id)}
                  >
                    <td className="px-2 py-2.5 font-medium text-gray-900">
                      {title}
                    </td>
                    {!isPublisherListings ? (
                      <>
                        <td className="px-2 py-2.5 text-gray-600">{category}</td>
                        <td className="px-2 py-2.5 text-gray-600">{location}</td>
                        <td className="px-2 py-2.5 text-gray-600">
                          {expiryForTab(listingTab, item)}
                        </td>
                      </>
                    ) : (
                      <td className="px-2 py-2.5 text-gray-600">{location}</td>
                    )}
                    {showListingMetrics && metricsTabActive ? (
                      <td
                        className="px-2 py-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {metricsLoading && !counts ? (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        ) : metricRow ? (
                          <PublisherListingMetricChips
                            row={metricRow}
                            track={isAgentRole ? "developer" : publisherTrack}
                            metricSet={metricSet}
                            onMetric={(metric) =>
                              openMetricEvents(id, title, metric)
                            }
                          />
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    ) : null}
                    <td className="px-2 py-2.5 text-gray-600">
                      {fmtDateTime(created)}
                    </td>
                    {isPublisherListings || listingTab === "expired" || canEditDeveloperListing ? (
                      <td className="px-2 py-2.5">
                        <div className="flex flex-col gap-1.5">
                          {!isPublisherListings ? (
                            <span className="text-gray-600">
                              {hardDeleteAt(item)}
                            </span>
                          ) : null}
                          {canEditDeveloperListing &&
                          isDeveloperRole &&
                          metricsTabActive ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-fit"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onEditListing) onEditListing(id);
                                else setEditListingId(id);
                              }}
                            >
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Edit
                            </Button>
                          ) : null}
                          {isPublisherListings ? (
                            canDeleteListing ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-fit border-red-200 text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHardDeleteError("");
                                  setHardDeleteId(id);
                                }}
                              >
                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                Delete
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-400">
                                No delete permission
                              </span>
                            )
                          ) : canDeleteListing ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-fit border-red-200 text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHardDeleteError("");
                                setHardDeleteId(id);
                              }}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              Delete
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden sm:max-w-3xl">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {listingDetail?.title || "Property details"}
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : listingDetail ? (
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Category" value={listingDetail.categoryName} />
                <DetailField
                  label="Building type"
                  value={listingDetail.buildingTypeName}
                />
                <DetailField
                  label="Property type"
                  value={listingDetail.propertyTypeName}
                />
                <DetailField label="Price" value={listingDetail.priceLabel} />
                <DetailField
                  label="Project / property name"
                  value={listingDetail.propertyName}
                />
                <DetailField label="City" value={listingDetail.cityName} />
                <DetailField
                  label="Micro market"
                  value={listingDetail.microMarketName}
                />
                <DetailField label="Location" value={listingDetail.locationName} />
                <DetailField label="Status" value={listingDetail.status} />
                <DetailField
                  label="Expires"
                  value={
                    listingDetail.expiresAt
                      ? fmtDateTime(String(listingDetail.expiresAt))
                      : null
                  }
                />
                <DetailField
                  label="Created"
                  value={
                    listingDetail.createdAt
                      ? fmtDateTime(String(listingDetail.createdAt))
                      : null
                  }
                />
                <DetailField
                  label="Owner"
                  value={listingDetail.ownerUser?.name}
                />
                <DetailField
                  label="Owner phone"
                  value={
                    listingDetail.ownerUser?.contact ? (
                      <MaskedContact
                        value={listingDetail.ownerUser.contact}
                        revealKey={`user-listings-detail:${listingDetail.id}:owner`}
                      />
                    ) : null
                  }
                />
              </div>
              {detailRows.length > 0 ? (
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">
                    Property details
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {detailRows.map((row) => (
                      <DetailField
                        key={row.key}
                        label={row.label}
                        value={row.value}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">
              Could not load property details.
            </p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(hardDeleteId)}
        onOpenChange={(open) => {
          if (!open && !hardDeleteBusy) {
            setHardDeleteId(null);
            setHardDeleteError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isPublisherListings
                ? "Delete listing permanently?"
                : "Hard delete expired listing?"}
            </DialogTitle>
            <DialogDescription>
              {isPublisherListings
                ? "Permanent delete from the app. Analytics stats are retained. This cannot be undone."
                : "This permanently removes the listing from the database. An analytics snapshot is kept. This cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {hardDeleteError ? (
            <p className="text-sm text-red-600">{hardDeleteError}</p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={hardDeleteBusy}
              onClick={() => {
                setHardDeleteId(null);
                setHardDeleteError("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={hardDeleteBusy}
              onClick={() => void confirmHardDelete()}
            >
              {hardDeleteBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Hard delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {userId && editListingId && enableDeveloperListingEdit && !onEditListing ? (
        <DeveloperUserListingEditDialog
          open={Boolean(editListingId)}
          onOpenChange={(open) => !open && setEditListingId(null)}
          userId={userId}
          listingId={editListingId}
          onSaved={() => setReloadKey((n) => n + 1)}
        />
      ) : null}

      {userId && showListingMetrics ? (
        <PublisherListingEventsDialog
          userId={userId}
          open={eventsOpen}
          onOpenChange={setEventsOpen}
          listingId={eventsListingId}
          metric={eventsMetric}
          title={eventsTitle}
          eventsApi={listingEventsApi}
          categoryGroup={
            listingEventsApi === "agent" ? agentMetricsCategoryGroup : undefined
          }
        />
      ) : null}
    </div>
  );
}
