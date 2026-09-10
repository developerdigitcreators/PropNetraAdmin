"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  listingsService,
  type ApproveListingReviewPayload,
  type ListingReviewItem,
  type ReviewQueueFiltersResponse,
  type ReviewTab,
  type SaveListingCatalogPayload,
  type RejectListingReviewPayload,
} from "@/services/listings.service";
import { ListingReviewTable } from "@/modules/listings/listing-review-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Inbox, Plus, RefreshCw } from "lucide-react";
import { PermissionGuard } from "@/components/common/permission-guard";
import { PaginationBar } from "@/components/common/pagination-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/use-auth-store";
import { permissionSetHas } from "@/lib/super-admin";

export default function ReviewListingPage() {
  const canCreatePost = useAuthStore(
    (s) =>
      permissionSetHas(s.permissions, "locations:read") ||
      permissionSetHas(s.permissions, "listings:create"),
  );
  const [tab, setTab] = useState<ReviewTab>("unverified");
  const [unverified, setUnverified] = useState<ListingReviewItem[]>([]);
  const [verified, setVerified] = useState<ListingReviewItem[]>([]);
  const [rejected, setRejected] = useState<ListingReviewItem[]>([]);
  const [pageSize, setPageSize] = useState<number>(10);
  const [unverifiedPage, setUnverifiedPage] = useState(1);
  const [verifiedPage, setVerifiedPage] = useState(1);
  const [rejectedPage, setRejectedPage] = useState(1);
  const [unverifiedTotal, setUnverifiedTotal] = useState(0);
  const [verifiedTotal, setVerifiedTotal] = useState(0);
  const [rejectedTotal, setRejectedTotal] = useState(0);
  const [unverifiedTotalPages, setUnverifiedTotalPages] = useState(1);
  const [verifiedTotalPages, setVerifiedTotalPages] = useState(1);
  const [rejectedTotalPages, setRejectedTotalPages] = useState(1);
  const [filtersByTab, setFiltersByTab] = useState<{
    unverified?: ReviewQueueFiltersResponse | null;
    verified?: ReviewQueueFiltersResponse | null;
    rejected?: ReviewQueueFiltersResponse | null;
  }>({});

  // Defaults are applied by backend when these are undefined / omitted:
  // Resale + Residential, and propertyTypeId stays null (All).
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | undefined
  >(undefined);
  const [selectedBuildingTypeId, setSelectedBuildingTypeId] = useState<
    string | undefined
  >(undefined);
  const [selectedPropertyTypeId, setSelectedPropertyTypeId] = useState<
    string | null
  >(null);

  const [isLoading, setIsLoading] = useState(true);

  const apiFilters = useMemo(() => {
    return {
      categoryId:
        typeof selectedCategoryId === "string" ? selectedCategoryId : undefined,
      buildingTypeId:
        typeof selectedBuildingTypeId === "string"
          ? selectedBuildingTypeId
          : undefined,
      propertyTypeId:
        typeof selectedPropertyTypeId === "string"
          ? selectedPropertyTypeId
          : undefined,
    };
  }, [selectedBuildingTypeId, selectedCategoryId, selectedPropertyTypeId]);

  const fetchTab = useCallback(
    async (target: ReviewTab, page: number) => {
      const result = await listingsService.getReviewQueue(
        target,
        page,
        pageSize,
        apiFilters,
      );

      // Save items + pagination totals
      if (target === "verified") {
        setVerified(result.items);
        // Pagination uses filtered `total`; tab badge uses category-options sum.
        setVerifiedTotal(result.total);
        setVerifiedTotalPages(result.totalPages ?? 1);
      } else if (target === "rejected") {
        setRejected(result.items);
        setRejectedTotal(result.total);
        setRejectedTotalPages(result.totalPages ?? 1);
      } else {
        setUnverified(result.items);
        setUnverifiedTotal(result.total);
        setUnverifiedTotalPages(result.totalPages ?? 1);
      }

      // Save dropdown filters options for that tab
      setFiltersByTab((prev) => ({
        ...prev,
        [target]: result.filters ?? null,
      }));

      // On first load (when we didn't pass ids), adopt backend-resolved defaults.
      if (
        target === "unverified" &&
        result.selectedFilters &&
        (selectedCategoryId === undefined ||
          selectedBuildingTypeId === undefined)
      ) {
        const sf = result.selectedFilters;
        if (selectedCategoryId === undefined) {
          setSelectedCategoryId(sf.categoryId ?? undefined);
        }
        if (selectedBuildingTypeId === undefined) {
          setSelectedBuildingTypeId(sf.buildingTypeId ?? undefined);
        }
        if (selectedPropertyTypeId === null) {
          setSelectedPropertyTypeId(sf.propertyTypeId);
        }
      }
    },
    [
      apiFilters,
      pageSize,
      selectedBuildingTypeId,
      selectedCategoryId,
      selectedPropertyTypeId,
    ],
  );

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchTab("unverified", unverifiedPage),
        fetchTab("verified", verifiedPage),
        fetchTab("rejected", rejectedPage),
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchTab, unverifiedPage, verifiedPage, rejectedPage]);

  const handlePageChange = useCallback(
    (target: ReviewTab, nextPage: number) => {
      if (target === "unverified") setUnverifiedPage(nextPage);
      if (target === "verified") setVerifiedPage(nextPage);
      if (target === "rejected") setRejectedPage(nextPage);
    },
    [],
  );

  const handlePageSizeChange = useCallback((nextSize: number) => {
    setPageSize(nextSize);
    // Reset pages when changing pagination size to avoid drifting.
    setUnverifiedPage(1);
    setVerifiedPage(1);
    setRejectedPage(1);
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const resetPagesToFirst = useCallback(() => {
    setUnverifiedPage(1);
    setVerifiedPage(1);
    setRejectedPage(1);
  }, []);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    // Let backend resolve defaults for building type based on category.
    setSelectedBuildingTypeId(undefined);
    setSelectedPropertyTypeId(null);
    resetPagesToFirst();
  };

  const handleBuildingTypeChange = (buildingTypeId: string) => {
    setSelectedBuildingTypeId(buildingTypeId);
    setSelectedPropertyTypeId(null);
    resetPagesToFirst();
  };

  const handlePropertyTypeChange = (propertyTypeId: string | "__ALL__") => {
    setSelectedPropertyTypeId(
      propertyTypeId === "__ALL__" ? null : propertyTypeId,
    );
    resetPagesToFirst();
  };

  const handleApprove = async (
    id: string,
    payload: ApproveListingReviewPayload,
  ) => {
    await listingsService.approveReview(id, payload);
    await refreshAll();
  };

  const handleReject = async (
    id: string,
    payload: RejectListingReviewPayload,
  ) => {
    await listingsService.rejectReviewWithRemark(id, payload);
    await refreshAll();
  };

  const handleSaveToDb = async (
    id: string,
    payload: SaveListingCatalogPayload,
  ) => {
    await listingsService.saveToDb(id, payload);
    await refreshAll();
  };

  const handleToggleForSale = async (id: string, enabled: boolean) => {
    await listingsService.setForSaleTitle(id, enabled);
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await listingsService.setListingActive(id, active);
  };

  // Verified tab badge = sum of category option totals (same as "Category (N)" heading).
  const verifiedTabCount = useMemo(() => {
    const cats = filtersByTab.verified?.categories ?? [];
    if (cats.length === 0) return verifiedTotal;
    return cats.reduce((acc, c) => acc + (c.total || 0), 0);
  }, [filtersByTab.verified, verifiedTotal]);

  return (
    <PermissionGuard
      permission="locations:read"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view review listings.
        </div>
      }
    >
      <div className="space-y-6 pb-12">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Review Listing
            </h1>
            <p className="text-gray-500 mt-1">
              Approve custom project names / locations and publish listings for
              other agents.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refreshAll()}
              disabled={isLoading}
            >
              <RefreshCw className="mr-1.5 size-3.5" />
              Refresh
            </Button>
            {canCreatePost && (
              <Link
                href="/add-post"
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Post
              </Link>
            )}
          </div>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as ReviewTab)}
          className="w-full"
        >
          <TabsList className="mb-6 bg-white border shadow-sm p-1 h-auto">
            <TabsTrigger
              value="unverified"
              className="data-[state=active]:bg-primary-light data-[state=active]:text-primary rounded-md px-6 text-sm"
            >
              Listing for Approval
              <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                {unverifiedTotal}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="verified"
              className="data-[state=active]:bg-primary-light data-[state=active]:text-primary rounded-md px-6 text-sm"
            >
              Approved Listings
              <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                {verifiedTabCount}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="rejected"
              className="data-[state=active]:bg-primary-light data-[state=active]:text-primary rounded-md px-6 text-sm"
            >
              Rejected
              <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                {rejectedTotal}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="unverified"
            className="focus-visible:outline-none"
          >
            {isLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : unverified.length === 0 ? (
              <EmptyState message="No unverified listings pending review." />
            ) : (
              (() => {
                const filters = filtersByTab.unverified;
                return (
                  <div className="space-y-4">
                    <FiltersBar
                      filters={filters}
                      selectedCategoryId={selectedCategoryId}
                      selectedBuildingTypeId={selectedBuildingTypeId}
                      selectedPropertyTypeId={selectedPropertyTypeId}
                      totalForAllPropertyTypes={unverifiedTotal}
                      onCategoryChange={handleCategoryChange}
                      onBuildingTypeChange={handleBuildingTypeChange}
                      onPropertyTypeChange={handlePropertyTypeChange}
                    />

                    <ListingReviewTable
                      items={unverified}
                      mode="unverified"
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onSaveToDb={handleSaveToDb}
                      onToggleForSale={handleToggleForSale}
                    />

                    <PaginationBar
                      currentPage={unverifiedPage}
                      totalItems={unverifiedTotal}
                      pageSize={pageSize}
                      totalPages={unverifiedTotalPages}
                      onPageChange={(p) => handlePageChange("unverified", p)}
                      onPageSizeChange={handlePageSizeChange}
                    />
                  </div>
                );
              })()
            )}
          </TabsContent>

          <TabsContent value="verified" className="focus-visible:outline-none">
            {isLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : verified.length === 0 ? (
              <EmptyState message="No verified (published) listings yet." />
            ) : (
              (() => {
                const filters = filtersByTab.verified;
                return (
                  <div className="space-y-4">
                    <FiltersBar
                      filters={filters}
                      selectedCategoryId={selectedCategoryId}
                      selectedBuildingTypeId={selectedBuildingTypeId}
                      selectedPropertyTypeId={selectedPropertyTypeId}
                      totalForAllPropertyTypes={verifiedTotal}
                      onCategoryChange={handleCategoryChange}
                      onBuildingTypeChange={handleBuildingTypeChange}
                      onPropertyTypeChange={handlePropertyTypeChange}
                    />

                    <ListingReviewTable
                      items={verified}
                      mode="verified"
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onSaveToDb={handleSaveToDb}
                      onToggleForSale={handleToggleForSale}
                      onToggleActive={handleToggleActive}
                    />

                    <PaginationBar
                      currentPage={verifiedPage}
                      totalItems={verifiedTotal}
                      pageSize={pageSize}
                      totalPages={verifiedTotalPages}
                      onPageChange={(p) => handlePageChange("verified", p)}
                      onPageSizeChange={handlePageSizeChange}
                    />
                  </div>
                );
              })()
            )}
          </TabsContent>

          <TabsContent value="rejected" className="focus-visible:outline-none">
            {isLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : rejected.length === 0 ? (
              <EmptyState message="No rejected listings yet." />
            ) : (
              (() => {
                const filters = filtersByTab.rejected;
                return (
                  <div className="space-y-4">
                    <FiltersBar
                      filters={filters}
                      selectedCategoryId={selectedCategoryId}
                      selectedBuildingTypeId={selectedBuildingTypeId}
                      selectedPropertyTypeId={selectedPropertyTypeId}
                      totalForAllPropertyTypes={rejectedTotal}
                      onCategoryChange={handleCategoryChange}
                      onBuildingTypeChange={handleBuildingTypeChange}
                      onPropertyTypeChange={handlePropertyTypeChange}
                    />

                    <ListingReviewTable
                      items={rejected}
                      mode="rejected"
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onSaveToDb={handleSaveToDb}
                      onToggleForSale={handleToggleForSale}
                    />

                    <PaginationBar
                      currentPage={rejectedPage}
                      totalItems={rejectedTotal}
                      pageSize={pageSize}
                      totalPages={rejectedTotalPages}
                      onPageChange={(p) => handlePageChange("rejected", p)}
                      onPageSizeChange={handlePageSizeChange}
                    />
                  </div>
                );
              })()
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}

function FiltersBar({
  filters,
  selectedCategoryId,
  selectedBuildingTypeId,
  selectedPropertyTypeId,
  totalForAllPropertyTypes,
  onCategoryChange,
  onBuildingTypeChange,
  onPropertyTypeChange,
}: {
  filters?: ReviewQueueFiltersResponse | null;
  selectedCategoryId: string | undefined;
  selectedBuildingTypeId: string | undefined;
  selectedPropertyTypeId: string | null;
  totalForAllPropertyTypes: number;
  onCategoryChange: (categoryId: string) => void;
  onBuildingTypeChange: (buildingTypeId: string) => void;
  onPropertyTypeChange: (propertyTypeId: string | "__ALL__") => void;
}) {
  const propertyTypeValue = selectedPropertyTypeId ?? "__ALL__";
  const categories = filters?.categories ?? [];
  const buildingTypes = filters?.buildingTypes ?? [];
  const propertyTypes = filters?.propertyTypes ?? [];

  const buildingTypeSum = buildingTypes.reduce(
    (acc, bt) => acc + (bt.total || 0),
    0,
  );
  const propertyTypeSum = propertyTypes.reduce(
    (acc, pt) => acc + (pt.total || 0),
    0,
  );

  const categorySelected = categories.find(
    (c) => c.categoryId === selectedCategoryId,
  );
  const buildingTypeSelected = buildingTypes.find(
    (bt) => bt.buildingTypeId === selectedBuildingTypeId,
  );
  const propertyTypeSelected =
    propertyTypeValue === "__ALL__"
      ? null
      : propertyTypes.find((pt) => pt.propertyTypeId === propertyTypeValue) ||
        null;

  const categorySum = categories.reduce((acc, c) => acc + (c.total || 0), 0);
  const categoryLabel = categorySelected
    ? `${categorySelected.categoryName} (${categorySelected.total})`
    : "Select category";
  const buildingTypeLabel = buildingTypeSelected
    ? `${buildingTypeSelected.buildingTypeName} (${buildingTypeSelected.total})`
    : "Select building type";
  const propertyTypeLabel =
    propertyTypeValue === "__ALL__" || !propertyTypeSelected
      ? `All Property Types (${totalForAllPropertyTypes})`
      : `${propertyTypeSelected.propertyTypeName} (${propertyTypeSelected.total})`;

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="min-w-[220px]">
        <p className="text-xs text-gray-500 mb-1">
          Category <span className="opacity-70">({categorySum})</span>
        </p>
        <Select
          value={selectedCategoryId ?? ""}
          disabled={categories.length === 0}
          onValueChange={(v) => onCategoryChange(v)}
        >
          <SelectTrigger>
            <span className="truncate">{categoryLabel}</span>
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.categoryId} value={c.categoryId}>
                <span className="truncate">{c.categoryName}</span>
                <span className="opacity-70 shrink-0">({c.total})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[220px]">
        <p className="text-xs text-gray-500 mb-1">
          Building Type <span className="opacity-70">({buildingTypeSum})</span>
        </p>
        <Select
          value={selectedBuildingTypeId ?? ""}
          disabled={!selectedCategoryId || buildingTypes.length === 0}
          onValueChange={(v) => onBuildingTypeChange(v)}
        >
          <SelectTrigger>
            <span className="truncate">{buildingTypeLabel}</span>
          </SelectTrigger>
          <SelectContent>
            {buildingTypes.map((bt) => (
              <SelectItem key={bt.buildingTypeId} value={bt.buildingTypeId}>
                <span className="truncate">{bt.buildingTypeName}</span>
                <span className="opacity-70 shrink-0">({bt.total})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[260px]">
        <p className="text-xs text-gray-500 mb-1">
          Property Type <span className="opacity-70">({propertyTypeSum})</span>
        </p>
        <Select
          value={propertyTypeValue}
          disabled={!selectedBuildingTypeId || propertyTypes.length === 0}
          onValueChange={(v) =>
            onPropertyTypeChange(v === "__ALL__" ? "__ALL__" : (v as string))
          }
        >
          <SelectTrigger>
            <span className="truncate">{propertyTypeLabel}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">
              All Property Types{" "}
              <span className="opacity-70 shrink-0">
                ({totalForAllPropertyTypes})
              </span>
            </SelectItem>
            {propertyTypes.map((pt) => (
              <SelectItem key={pt.propertyTypeId} value={pt.propertyTypeId}>
                <span className="truncate">{pt.propertyTypeName}</span>
                <span className="opacity-70 shrink-0">({pt.total})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
        <Inbox className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">All caught up!</h3>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
