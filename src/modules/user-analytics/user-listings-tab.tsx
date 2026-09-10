"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/use-auth-store";
import {
  getListingDetailRows,
  listingsService,
  type ListingReviewItem,
  type MyListingDetail,
} from "@/services/listings.service";
import { subscriptionApiError } from "@/services/subscriptions.service";
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
import { Loader2, Trash2 } from "lucide-react";

type UserListingsTabProps = {
  userId: string | null;
};

type CategoryGroupKey = "resale_rent" | "buy_requirement";

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

function DetailField({ label, value }: { label: string; value?: string | null }) {
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

export function UserListingsTab({ userId }: UserListingsTabProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canRead = hasPermission("subscriptions", "read");
  const canWrite = hasPermission("subscriptions", "write");

  const [categoryGroup, setCategoryGroup] =
    useState<CategoryGroupKey>("resale_rent");
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
        categoryGroup,
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
  }, [userId, canRead, listingTab, categoryGroup, reloadKey]);

  const detailRows = useMemo(() => {
    if (!listingDetail) return [];
    return getListingDetailRows({
      id: listingDetail.id,
      form: listingDetail.form,
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
      setHardDeleteError(
        subscriptionApiError(err, "Failed to hard delete listing."),
      );
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
        You need <code>subscriptions:read</code> to view this tab.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h4 className="font-semibold text-gray-900">Listings</h4>
      <p className="mt-1 text-xs text-gray-500">
        Filter by Resale/Rental or Buy Requirement, then by status. Click a row
        for full details.
      </p>

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

      <div className="mt-3 flex flex-wrap gap-2">
        {LISTING_TABS.map((tab) => {
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
                <th className="px-2 py-2">Category</th>
                <th className="px-2 py-2">Location</th>
                <th className="px-2 py-2">Expires</th>
                <th className="px-2 py-2">Created</th>
                {listingTab === "expired" ? (
                  <th className="px-2 py-2">Hard delete from system</th>
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
                return (
                  <tr
                    key={id}
                    className="cursor-pointer border-b border-gray-50 hover:bg-gray-50"
                    onClick={() => void openListingDetail(id)}
                  >
                    <td className="px-2 py-2.5 font-medium text-gray-900">
                      {title}
                    </td>
                    <td className="px-2 py-2.5 text-gray-600">{category}</td>
                    <td className="px-2 py-2.5 text-gray-600">{location}</td>
                    <td className="px-2 py-2.5 text-gray-600">
                      {expiryForTab(listingTab, item)}
                    </td>
                    <td className="px-2 py-2.5 text-gray-600">
                      {fmtDateTime(created)}
                    </td>
                    {listingTab === "expired" ? (
                      <td className="px-2 py-2.5">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-gray-600">
                            {hardDeleteAt(item)}
                          </span>
                          {canWrite ? (
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
                              Hard delete
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
                  value={listingDetail.ownerUser?.contact}
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
            <DialogTitle>Hard delete expired listing?</DialogTitle>
            <DialogDescription>
              This permanently removes the listing from the database. An
              analytics snapshot is kept. This cannot be undone.
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
    </div>
  );
}
