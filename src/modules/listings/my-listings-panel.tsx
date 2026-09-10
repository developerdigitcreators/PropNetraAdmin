'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  listingsService,
  getListingDetailRows,
  type ListingInterestDetails,
  type ListingReviewItem,
  type MyListingDetail,
  type MyListingItem,
  type MyListingsTab,
} from '@/services/listings.service';
import { PermissionGuard } from '@/components/common/permission-guard';
import { PaginationBar } from '@/components/common/pagination-bar';
import { newFirstCellClass, NewTag } from '@/components/common/new-row-marker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/use-auth-store';
import { isSuperAdmin } from '@/lib/super-admin';
import { Inbox, Loader2, MessageSquare, Plus, RefreshCw, Users } from 'lucide-react';

function stopRowClick(event: React.MouseEvent) {
  event.stopPropagation();
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
    </div>
  );
}

type StatusFilter = 'all' | 'active' | 'expired' | 'inactive';

function statusBadge(item: MyListingItem) {
  if (item.status === 'expired') return 'Expired';
  if (!item.isActive) return 'Inactive';
  if (item.expiringSoon) return `Expiring (${item.daysLeft}d)`;
  return 'Active';
}

export function MyListingsPanel() {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const activeRole = useAuthStore((s) => s.activeRole);
  const accessToken = useAuthStore((s) => s.accessToken);

  const superAdmin = useMemo(
    () => isSuperAdmin({ user, permissions, activeRole, accessToken }),
    [user, permissions, activeRole, accessToken],
  );

  const [tab, setTab] = useState<MyListingsTab>('admin_verified');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedBuildingTypeId, setSelectedBuildingTypeId] = useState<string>('');
  const [selectedPropertyTypeId, setSelectedPropertyTypeId] = useState<string>('__ALL__');
  const [items, setItems] = useState<MyListingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<{
    categories: Array<{ id: string; name: string; total: number }>;
    buildingTypes: Array<{ id: string; name: string; total: number }>;
    propertyTypes: Array<{ id: string; name: string; total: number }>;
  }>({
    categories: [],
    buildingTypes: [],
    propertyTypes: [],
  });
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [remarksOpen, setRemarksOpen] = useState(false);
  const [remarksListing, setRemarksListing] = useState<MyListingItem | null>(null);
  const [remarks, setRemarks] = useState<
    Array<{ id: string; body: string; author: { id: string; name: string } | null; createdAt: string }>
  >([]);
  const [remarkText, setRemarkText] = useState('');
  const [remarksLoading, setRemarksLoading] = useState(false);
  const [interestOpen, setInterestOpen] = useState(false);
  const [interestListing, setInterestListing] = useState<MyListingItem | null>(null);
  const [interestDetails, setInterestDetails] = useState<ListingInterestDetails | null>(null);
  const [interestLoading, setInterestLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailListing, setDetailListing] = useState<MyListingItem | null>(null);
  const [listingDetail, setListingDetail] = useState<MyListingDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listingsService.getMyListings({
        tab,
        page,
        limit: pageSize,
        categoryId: selectedCategoryId || undefined,
        buildingTypeId: selectedBuildingTypeId || undefined,
        propertyTypeId:
          selectedPropertyTypeId === '__ALL__' ? undefined : selectedPropertyTypeId,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setFilters(result.filters);
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [
    tab,
    page,
    pageSize,
    selectedCategoryId,
    selectedBuildingTypeId,
    selectedPropertyTypeId,
    statusFilter,
  ]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const openRemarks = async (item: MyListingItem) => {
    setRemarksListing(item);
    setRemarksOpen(true);
    setRemarksLoading(true);
    setRemarkText('');
    try {
      const rows = await listingsService.getAdminListingRemarks(item.id);
      setRemarks(rows);
    } catch (err) {
      console.error(err);
      setRemarks([]);
    } finally {
      setRemarksLoading(false);
    }
  };

  const openInterestDetails = async (item: MyListingItem) => {
    if (item.interestCount <= 0) return;
    setInterestListing(item);
    setInterestOpen(true);
    setInterestLoading(true);
    setInterestDetails(null);
    try {
      const details = await listingsService.getListingInterestDetails(item.id);
      setInterestDetails(details);
      await listingsService.markMyListingInterestSeen(item.id);
    } catch (err) {
      console.error(err);
    } finally {
      setInterestLoading(false);
    }
  };

  const openListingDetail = async (item: MyListingItem) => {
    setDetailListing(item);
    setDetailOpen(true);
    setDetailLoading(true);
    setListingDetail(null);
    try {
      const detail = await listingsService.getMyListingDetail(item.id);
      setListingDetail(detail);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const detailRows = useMemo(() => {
    if (!listingDetail) return [];
    return getListingDetailRows({
      id: listingDetail.id,
      form: listingDetail.form,
      building_type: listingDetail.buildingType,
      property_type: listingDetail.propertyType,
    } as ListingReviewItem);
  }, [listingDetail]);

  const submitRemark = async () => {
    if (!remarksListing || !remarkText.trim()) return;
    setActionId(remarksListing.id);
    try {
      await listingsService.addAdminListingRemark(remarksListing.id, remarkText.trim());
      setRemarkText('');
      const rows = await listingsService.getAdminListingRemarks(remarksListing.id);
      setRemarks(rows);
    } finally {
      setActionId(null);
    }
  };

  const toggleActive = async (item: MyListingItem) => {
    setActionId(item.id);
    try {
      await listingsService.setMyListingActive(item.id, !item.isActive);
      await fetchList();
      if (detailOpen && detailListing?.id === item.id) {
        const detail = await listingsService.getMyListingDetail(item.id);
        setListingDetail(detail);
      }
    } finally {
      setActionId(null);
    }
  };

  const renewListing = async (item: MyListingItem) => {
    setActionId(item.id);
    try {
      await listingsService.renewMyListing(item.id);
      await fetchList();
      if (detailOpen && detailListing?.id === item.id) {
        const detail = await listingsService.getMyListingDetail(item.id);
        setListingDetail(detail);
      }
    } finally {
      setActionId(null);
    }
  };

  const categorySum = filters.categories.reduce((a, c) => a + c.total, 0);
  const buildingSum = filters.buildingTypes.reduce((a, c) => a + c.total, 0);
  const propertySum = filters.propertyTypes.reduce((a, c) => a + c.total, 0);
  const selectedCategory = filters.categories.find((c) => c.id === selectedCategoryId);
  const selectedBuildingType = filters.buildingTypes.find((b) => b.id === selectedBuildingTypeId);
  const selectedPropertyType =
    selectedPropertyTypeId === '__ALL__'
      ? { name: 'All', total: total }
      : filters.propertyTypes.find((p) => p.id === selectedPropertyTypeId);
  const statusLabels: Record<StatusFilter, string> = {
    all: 'All',
    active: 'Active',
    inactive: 'Inactive',
    expired: 'Expired',
  };

  return (
    <PermissionGuard
      permission="admin_my_listings:read"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view My Listings.
        </div>
      }
    >
      <div className="space-y-6 pb-12">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Listings</h1>
            <p className="mt-1 text-gray-500">
              Admin-posted verified listings assigned to you
              {superAdmin ? ', plus all admin posts and app user postings.' : '.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void fetchList()}
              disabled={loading}
            >
              <RefreshCw className="mr-1.5 size-3.5" />
              Refresh
            </Button>
            <Link
              href="/add-post"
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Post
            </Link>
          </div>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as MyListingsTab);
            setPage(1);
          }}
        >
          <TabsList className="mb-4 h-auto border bg-white p-1 shadow-sm">
            <TabsTrigger value="admin_verified" className="rounded-md px-6 text-sm">
              Admin Verified
            </TabsTrigger>
            {superAdmin ? (
              <TabsTrigger value="app_postings" className="rounded-md px-6 text-sm">
                App Postings
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value={tab} className="space-y-4 focus-visible:outline-none">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[200px]">
                <p className="mb-1 text-xs text-gray-500">Category ({categorySum})</p>
                <Select
                  value={selectedCategoryId}
                  onValueChange={(v) => {
                    if (!v) return;
                    setSelectedCategoryId(v);
                    setSelectedBuildingTypeId('');
                    setSelectedPropertyTypeId('__ALL__');
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    {selectedCategory ? (
                      <span>
                        {selectedCategory.name} ({selectedCategory.total})
                      </span>
                    ) : (
                      <SelectValue placeholder="Category" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {filters.categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.total})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[200px]">
                <p className="mb-1 text-xs text-gray-500">Building type ({buildingSum})</p>
                <Select
                  value={selectedBuildingTypeId}
                  disabled={!selectedCategoryId}
                  onValueChange={(v) => {
                    if (!v) return;
                    setSelectedBuildingTypeId(v);
                    setSelectedPropertyTypeId('__ALL__');
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    {selectedBuildingType ? (
                      <span>
                        {selectedBuildingType.name} ({selectedBuildingType.total})
                      </span>
                    ) : (
                      <SelectValue placeholder="Building type" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {filters.buildingTypes.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.total})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[220px]">
                <p className="mb-1 text-xs text-gray-500">Property type ({propertySum})</p>
                <Select
                  value={selectedPropertyTypeId}
                  disabled={!selectedBuildingTypeId}
                  onValueChange={(v) => {
                    if (!v) return;
                    setSelectedPropertyTypeId(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    {selectedPropertyType ? (
                      <span>
                        {selectedPropertyType.name} ({selectedPropertyType.total})
                      </span>
                    ) : (
                      <SelectValue placeholder="Property type" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All ({total})</SelectItem>
                    {filters.propertyTypes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.total})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[160px]">
                <p className="mb-1 text-xs text-gray-500">Status</p>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v as StatusFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <span>{statusLabels[statusFilter]}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-gray-500">
                <Inbox className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                No listings match your filters.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Listing</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Price</th>
                      {tab === 'admin_verified' ? (
                        <>
                          <th className="px-4 py-3">Lead contact</th>
                          <th className="px-4 py-3">Connected staff</th>
                        </>
                      ) : (
                        <th className="px-4 py-3">Owner</th>
                      )}
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Interest</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className="cursor-pointer border-b transition-colors last:border-0 hover:bg-gray-50/80"
                        onClick={() => void openListingDetail(item)}
                      >
                        <td className={newFirstCellClass(item.isNew, 'px-4 py-3')}>
                          <div className="flex items-start gap-1.5">
                            <NewTag show={item.isNew} />
                            <div>
                              <div className="font-medium text-gray-900">{item.title}</div>
                              <div className="text-xs text-gray-500">
                                {item.expiresAt
                                  ? `Expires ${new Date(item.expiresAt).toLocaleDateString()}`
                                  : '—'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{item.categoryName || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{item.priceLabel}</td>
                        {tab === 'admin_verified' ? (
                          <>
                            <td className="px-4 py-3 text-gray-600">
                              {item.leadContactName || '—'}
                              <br />
                              <span className="text-xs">{item.leadContactPhone || ''}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {item.connectedStaff?.name || '—'}
                            </td>
                          </>
                        ) : (
                          <td className="px-4 py-3 text-gray-600">
                            {item.ownerUser?.name || '—'}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              item.expiringSoon
                                ? 'bg-amber-100 text-amber-800'
                                : item.status === 'expired'
                                  ? 'bg-gray-100 text-gray-700'
                                  : !item.isActive
                                    ? 'bg-slate-100 text-slate-700'
                                    : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {statusBadge(item)}
                          </span>
                        </td>
                        <td className="px-4 py-3" onClick={stopRowClick}>
                          {item.interestCount > 0 ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
                              onClick={() => void openInterestDetails(item)}
                            >
                              <Users className="mr-1.5 h-3.5 w-3.5" />
                              View {item.interestCount} interest
                              {item.interestCount === 1 ? '' : 's'}
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400">No interest</span>
                          )}
                        </td>
                        <td className="px-4 py-3" onClick={stopRowClick}>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void openRemarks(item)}
                            >
                              <MessageSquare className="mr-1 h-3.5 w-3.5" />
                              Remarks
                            </Button>
                            {item.actions.canToggleActive ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionId === item.id}
                                onClick={() => void toggleActive(item)}
                              >
                                {item.isActive ? 'Inactive' : 'Active'}
                              </Button>
                            ) : null}
                            {item.actions.canRenew ? (
                              <Button
                                size="sm"
                                disabled={actionId === item.id}
                                onClick={() => void renewListing(item)}
                              >
                                Renew
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <PaginationBar
              currentPage={page}
              totalItems={total}
              pageSize={pageSize}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </TabsContent>
        </Tabs>

        <Dialog open={remarksOpen} onOpenChange={setRemarksOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Remarks — {remarksListing?.title}</DialogTitle>
            </DialogHeader>
            {remarksLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {remarks.length === 0 ? (
                    <p className="text-sm text-gray-500">No remarks yet.</p>
                  ) : (
                    remarks.map((r) => (
                      <div key={r.id} className="rounded-lg border border-gray-100 p-3 text-sm">
                        <p className="text-gray-800">{r.body}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          {r.author?.name || 'Staff'} ·{' '}
                          {new Date(r.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={remarkText}
                    onChange={(e) => setRemarkText(e.target.value)}
                    placeholder="Add a remark…"
                  />
                  <Button
                    onClick={() => void submitRemark()}
                    disabled={!remarkText.trim() || actionId === remarksListing?.id}
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden sm:max-w-3xl">
            <DialogHeader className="shrink-0">
              <DialogTitle>{listingDetail?.title || detailListing?.title || 'Property details'}</DialogTitle>
            </DialogHeader>
            {detailLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : listingDetail ? (
              <>
                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DetailField label="Category" value={listingDetail.categoryName} />
                    <DetailField label="Building type" value={listingDetail.buildingTypeName} />
                    <DetailField label="Property type" value={listingDetail.propertyTypeName} />
                    <DetailField label="Price" value={listingDetail.priceLabel} />
                    <DetailField label="Project / property name" value={listingDetail.propertyName} />
                    <DetailField label="City" value={listingDetail.cityName} />
                    <DetailField label="Micro market" value={listingDetail.microMarketName} />
                    <DetailField label="Location" value={listingDetail.locationName} />
                    <DetailField label="Status" value={statusBadge(listingDetail)} />
                    <DetailField
                      label="Expires"
                      value={
                        listingDetail.expiresAt
                          ? new Date(listingDetail.expiresAt).toLocaleString()
                          : null
                      }
                    />
                    {tab === 'admin_verified' ? (
                      <>
                        <DetailField label="Lead name" value={listingDetail.leadContactName} />
                        <DetailField label="Lead phone" value={listingDetail.leadContactPhone} />
                        <DetailField
                          label="Connected staff"
                          value={
                            listingDetail.connectedStaff
                              ? `${listingDetail.connectedStaff.name} (${listingDetail.connectedStaff.contact})`
                              : null
                          }
                        />
                      </>
                    ) : (
                      <>
                        <DetailField label="Owner" value={listingDetail.ownerUser?.name} />
                        <DetailField label="Owner phone" value={listingDetail.ownerUser?.contact} />
                      </>
                    )}
                  </div>

                  {detailRows.length > 0 ? (
                    <div className="border-t border-gray-100 pt-4">
                      <h3 className="mb-3 text-sm font-semibold text-gray-900">Property details</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {detailRows.map((row) => (
                          <DetailField key={row.key} label={row.label} value={row.value} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 border-t border-gray-100 pt-4">
                  {listingDetail.interestCount > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
                      onClick={() => {
                        setDetailOpen(false);
                        void openInterestDetails(listingDetail);
                      }}
                    >
                      <Users className="mr-1.5 h-4 w-4" />
                      View {listingDetail.interestCount} interest
                      {listingDetail.interestCount === 1 ? '' : 's'}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDetailOpen(false);
                      void openRemarks(listingDetail);
                    }}
                  >
                    <MessageSquare className="mr-1.5 h-4 w-4" />
                    Remarks
                  </Button>
                  {listingDetail.actions.canToggleActive ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={actionId === listingDetail.id}
                      onClick={() => void toggleActive(listingDetail)}
                    >
                      {listingDetail.isActive ? 'Mark inactive' : 'Mark active'}
                    </Button>
                  ) : null}
                  {listingDetail.actions.canRenew ? (
                    <Button
                      type="button"
                      disabled={actionId === listingDetail.id}
                      onClick={() => void renewListing(listingDetail)}
                    >
                      Renew
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-gray-500">
                Could not load property details.
              </p>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={interestOpen} onOpenChange={setInterestOpen}>
          <DialogContent className="w-full sm:max-w-6xl">
            <DialogHeader>
              <DialogTitle>Interest — {interestListing?.title}</DialogTitle>
            </DialogHeader>
            {interestLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : interestDetails ? (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Interested users ({interestDetails.interestedUsers.length})
                    </h3>
                    {interestDetails.interestedUsers.length === 0 ? (
                      <p className="text-sm text-gray-500">No interested users yet.</p>
                    ) : (
                      <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                        {interestDetails.interestedUsers.map((user) => (
                          <div
                            key={user.id}
                            className="rounded-lg border border-gray-100 bg-gray-50/80 p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium text-gray-900">{user.name}</p>
                                {user.contact ? (
                                  <p className="text-sm text-gray-600">{user.contact}</p>
                                ) : null}
                                {user.email ? (
                                  <p className="text-xs text-gray-500">{user.email}</p>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                                {user.kinds.map((kind) => (
                                  <span
                                    key={kind}
                                    className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-800"
                                  >
                                    {kind}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <p className="mt-2 text-xs text-gray-400">
                              {new Date(user.lastInterestedAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {tab === 'admin_verified' ? 'Lead contact (form)' : 'Listing owner'}
                    </h3>
                    <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 space-y-3">
                      {tab === 'admin_verified' ? (
                        <>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Name</p>
                            <p className="text-sm font-medium text-gray-900">
                              {interestDetails.lead.name || interestListing?.leadContactName || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Phone</p>
                            <p className="text-sm font-medium text-gray-900">
                              {interestDetails.lead.phone || interestListing?.leadContactPhone || '—'}
                            </p>
                          </div>
                          {interestDetails.connectedStaff ? (
                            <div>
                              <p className="text-xs uppercase tracking-wide text-gray-400">
                                Connected staff
                              </p>
                              <p className="text-sm font-medium text-gray-900">
                                {interestDetails.connectedStaff.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {interestDetails.connectedStaff.contact}
                              </p>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Name</p>
                            <p className="text-sm font-medium text-gray-900">
                              {interestListing?.ownerUser?.name || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Phone</p>
                            <p className="text-sm font-medium text-gray-900">
                              {interestListing?.ownerUser?.contact || '—'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">All remarks</h3>
                  {interestDetails.remarks.length === 0 ? (
                    <p className="text-sm text-gray-500">No remarks yet.</p>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {interestDetails.remarks.map((remark) => (
                        <div
                          key={remark.id}
                          className="min-w-[240px] max-w-[280px] shrink-0 rounded-lg border border-gray-100 bg-white p-3 shadow-sm"
                        >
                          <p className="text-sm text-gray-800">{remark.body}</p>
                          <p className="mt-2 text-xs text-gray-400">
                            {remark.author?.name || 'Staff'} ·{' '}
                            {new Date(remark.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-gray-500">
                Could not load interest details.
              </p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
