'use client';

import { useCallback, useEffect, useMemo, useState, Fragment } from 'react';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { AdminDataTable } from '@/components/common/admin-data-table';
import { newFirstCellClass, NewTag } from '@/components/common/new-row-marker';
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
import { planLabelFromCode, resolvePlanChip } from '@/lib/plan-labels';
import { formatDisplayDateTime } from '@/lib/format-date';
import {
  verifiedLeadsApiError,
  verifiedLeadsService,
  type VerifiedLeadAssignee,
  type VerifiedLeadRemark,
  type VerifiedLeadRow,
  type VerifiedLeadStatus,
} from '@/services/verified-leads.service';
import {
  listingsService,
  type MyListingDetail,
} from '@/services/listings.service';
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';

function PlanBadge({ planCode }: { planCode?: string | null }) {
  const chip = resolvePlanChip(null, planCode);
  if (!chip && !planCode) return null;
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
        chip?.className || 'bg-slate-100 text-slate-700'
      }`}
    >
      {chip?.label || planLabelFromCode(planCode) || '—'}
    </span>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
    </div>
  );
}

function listingStatusLabel(detail: MyListingDetail) {
  if (detail.status === 'expired') return 'Expired';
  if (!detail.isActive) return 'Inactive';
  if (detail.expiringSoon) return `Expiring (${detail.daysLeft}d)`;
  return 'Active';
}

export function AdminVerifiedLeadsPanel() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);
  const canAssign =
    superAdmin || hasPermission('admin_verified_leads', 'assign');
  const canRemark = superAdmin || hasPermission('admin_verified_leads', 'create');
  const canStatus = superAdmin || hasPermission('admin_verified_leads', 'update');

  const [items, setItems] = useState<VerifiedLeadRow[]>([]);
  const [statuses, setStatuses] = useState<
    Array<{ value: VerifiedLeadStatus; label: string }>
  >([]);
  const [assignees, setAssignees] = useState<VerifiedLeadAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qDraft, setQDraft] = useState('');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [remarksById, setRemarksById] = useState<Record<string, VerifiedLeadRemark[]>>(
    {},
  );
  const [remarksLoading, setRemarksLoading] = useState<string | null>(null);
  const [remarkDraft, setRemarkDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState<VerifiedLeadStatus>('new');
  const [saving, setSaving] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [listingDetail, setListingDetail] = useState<MyListingDetail | null>(
    null,
  );
  const [detailError, setDetailError] = useState('');

  const openListingDetail = async (listingId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError('');
    setListingDetail(null);
    try {
      const detail = await listingsService.getMyListingDetail(listingId);
      setListingDetail(detail);
    } catch (err) {
      setDetailError(
        verifiedLeadsApiError(err, 'Failed to load listing details.'),
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, staff] = await Promise.all([
        verifiedLeadsService.list({
          page,
          limit: pageSize,
          q: q.trim() || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
        }),
        canAssign
          ? verifiedLeadsService.listAssignees().catch(() => [])
          : Promise.resolve([]),
      ]);
      setItems(list.items || []);
      setStatuses(list.statuses || []);
      setAssignees(staff || []);
      setTotal(list.meta?.total || 0);
      setTotalPages(list.meta?.totalPages || 1);
    } catch (err) {
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      setError(verifiedLeadsApiError(err, 'Failed to load leads.'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q, statusFilter, canAssign]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetFilters = () => {
    setQDraft('');
    setQ('');
    setStatusFilter('all');
    setPage(1);
    setExpandedId(null);
  };

  const applySearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setPage(1);
    setQ(qDraft.trim());
  };

  const toggleExpand = async (row: VerifiedLeadRow) => {
    if (expandedId === row.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(row.id);
    setRemarkDraft('');
    setStatusDraft(row.status);
    if (remarksById[row.id]) return;
    setRemarksLoading(row.id);
    try {
      const remarks = await verifiedLeadsService.listRemarks(row.id);
      setRemarksById((prev) => ({ ...prev, [row.id]: remarks }));
    } catch (err) {
      setError(verifiedLeadsApiError(err, 'Failed to load remarks.'));
    } finally {
      setRemarksLoading(null);
    }
  };

  const onAssign = async (row: VerifiedLeadRow, staffUserId: string) => {
    if (!staffUserId) return;
    setSaving(true);
    setError('');
    const staff =
      assignees.find((a) => a.id === staffUserId) ||
      row.assignedStaff ||
      null;
    try {
      const updated = await verifiedLeadsService.assign(row.id, staffUserId);
      setItems((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? {
                ...item,
                ...updated,
                isNew: false,
                assignedStaff:
                  updated.assignedStaff?.name
                    ? updated.assignedStaff
                    : staff || updated.assignedStaff,
              }
            : item,
        ),
      );
    } catch (err) {
      setError(verifiedLeadsApiError(err, 'Failed to assign lead.'));
    } finally {
      setSaving(false);
    }
  };

  const onAddRemark = async (row: VerifiedLeadRow) => {
    const body = remarkDraft.trim();
    if (!body) return;
    setSaving(true);
    setError('');
    try {
      const remark = await verifiedLeadsService.addRemark(
        row.id,
        body,
        canStatus ? statusDraft : undefined,
      );
      setRemarksById((prev) => ({
        ...prev,
        [row.id]: [...(prev[row.id] || []), remark],
      }));
      setItems((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? {
                ...item,
                isNew: false,
                ...(canStatus && statusDraft !== row.status
                  ? {
                      status: statusDraft,
                      statusLabel:
                        statuses.find((s) => s.value === statusDraft)?.label ||
                        statusDraft,
                    }
                  : {}),
              }
            : item,
        ),
      );
      setRemarkDraft('');
    } catch (err) {
      setError(verifiedLeadsApiError(err, 'Failed to add remark.'));
    } finally {
      setSaving(false);
    }
  };

  const statusOptions = useMemo(
    () =>
      statuses.length
        ? statuses
        : [
            { value: 'new' as const, label: 'New' },
            { value: 'contacted' as const, label: 'Contacted' },
            { value: 'follow_up' as const, label: 'Follow up' },
            { value: 'closed' as const, label: 'Closed' },
          ],
    [statuses],
  );

  return (
    <PermissionGuard permission="admin_verified_leads:read">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Breadcrumb items={[{ label: 'Admin Verified My Leads' }]} />
            <h1 className="mt-2 text-2xl font-bold text-gray-900">
              Admin Verified My Leads
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Interests on admin-verified listings — one row per user × property.
              {superAdmin
                ? ' Super Admin sees all leads.'
                : ' You see leads assigned to you.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reset
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <form className="flex flex-wrap gap-3" onSubmit={applySearch}>
          <Input
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="Search name, contact, project…"
            className="max-w-xs"
          />
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>

        <AdminDataTable
          page={page}
          limit={pageSize}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          loading={loading}
          error={error || null}
          isEmpty={!items.length}
          emptyMessage="No leads found."
          syncKey={items.length}
        >
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/80 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-700">Username</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Contact no</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Project</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Unit</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Seller</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Seller phone</th>
                <th className="px-4 py-3 font-semibold text-gray-700">BHK</th>
                <th className="px-4 py-3 font-semibold text-gray-700">City</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Location</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Dated</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Assign</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Post</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const open = expandedId === row.id;
                return (
                  <Fragment key={row.id}>
                    <tr className="border-b border-gray-50 text-gray-800 last:border-0">
                      <td className={newFirstCellClass(row.isNew, 'px-4 py-3')}>
                        <button
                          type="button"
                          className="flex items-start gap-2 text-left font-medium hover:text-primary"
                          onClick={() => void toggleExpand(row)}
                        >
                          {open ? (
                            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                          ) : (
                            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                          )}
                          <span className="flex flex-wrap items-center gap-1.5">
                            <NewTag show={row.isNew} />
                            <span>{row.username}</span>
                            <PlanBadge planCode={row.planCode} />
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3">{row.contact || '—'}</td>
                      <td className="px-4 py-3">{row.projectName || '—'}</td>
                      <td className="px-4 py-3">{row.leadUnitNo || '—'}</td>
                      <td className="px-4 py-3">{row.leadContactName || '—'}</td>
                      <td className="px-4 py-3">{row.leadContactPhone || '—'}</td>
                      <td className="px-4 py-3">{row.bhk || '—'}</td>
                      <td className="px-4 py-3">{row.city || '—'}</td>
                      <td className="px-4 py-3">{row.location || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {formatDisplayDateTime(row.interestedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {row.statusLabel}
                        </span>
                      </td>
                      <td className="min-w-[180px] px-4 py-3">
                        {canAssign && (!row.assignedLocked || superAdmin) ? (
                          <Select
                            value={row.assignedStaff?.id || undefined}
                            onValueChange={(v) => {
                              if (!v) return;
                              void onAssign(row, v);
                            }}
                            disabled={saving}
                          >
                            <SelectTrigger className="h-8 w-[170px] text-xs">
                              <span className="truncate">
                                {assignees.find(
                                  (a) => a.id === row.assignedStaff?.id,
                                )?.name ||
                                  row.assignedStaff?.name ||
                                  'Assign staff'}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              {assignees.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : row.assignedStaff ? (
                          <span className="text-xs text-gray-700">
                            {row.assignedStaff.name}
                            {row.assignedLocked ? (
                              <span className="ml-1 text-gray-400">(locked)</span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-xs font-medium text-primary"
                          onClick={() => void openListingDetail(row.listingId)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                    {open ? (
                      <tr className="bg-slate-50/80">
                        <td colSpan={13} className="px-4 py-4">
                          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Remarks
                            </p>
                            {remarksLoading === row.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : (remarksById[row.id] || []).length === 0 ? (
                              <p className="text-sm text-gray-500">No remarks yet.</p>
                            ) : (
                              <ul className="space-y-2">
                                {(remarksById[row.id] || []).map((r) => (
                                  <li
                                    key={r.id}
                                    className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
                                  >
                                    <p className="text-gray-900">{r.body}</p>
                                    <p className="mt-1 text-[11px] text-gray-500">
                                      {r.author?.name || 'Admin'}
                                      {r.statusLabel ? ` · ${r.statusLabel}` : ''}
                                      {' · '}
                                      {formatDisplayDateTime(r.createdAt)}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            )}

                            {canRemark ? (
                              <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
                                {canStatus ? (
                                  <div className="space-y-1">
                                    <label className="text-[11px] text-gray-500">
                                      Status
                                    </label>
                                    <Select
                                      value={statusDraft}
                                      onValueChange={(v) =>
                                        setStatusDraft(v as VerifiedLeadStatus)
                                      }
                                    >
                                      <SelectTrigger className="h-9 w-[150px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {statusOptions.map((s) => (
                                          <SelectItem key={s.value} value={s.value}>
                                            {s.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                ) : null}
                                <div className="min-w-[220px] flex-1 space-y-1">
                                  <label className="text-[11px] text-gray-500">
                                    Add remark
                                  </label>
                                  <Input
                                    value={remarkDraft}
                                    onChange={(e) => setRemarkDraft(e.target.value)}
                                    placeholder="Write a remark…"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={saving || !remarkDraft.trim()}
                                  onClick={() => void onAddRemark(row)}
                                >
                                  Save
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </AdminDataTable>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden sm:max-w-3xl">
            <DialogHeader className="shrink-0">
              <DialogTitle>
                {listingDetail?.title || 'Property details'}
              </DialogTitle>
            </DialogHeader>
            {detailLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : detailError ? (
              <p className="py-6 text-sm text-red-600">{detailError}</p>
            ) : listingDetail ? (
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailField
                    label="Category"
                    value={listingDetail.categoryName}
                  />
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
                  <DetailField
                    label="Location"
                    value={listingDetail.locationName}
                  />
                  <DetailField
                    label="Status"
                    value={listingStatusLabel(listingDetail)}
                  />
                  <DetailField
                    label="Expires"
                    value={
                      listingDetail.expiresAt
                        ? formatDisplayDateTime(listingDetail.expiresAt)
                        : null
                    }
                  />
                  <DetailField
                    label="Unit No"
                    value={listingDetail.leadUnitNo}
                  />
                  <DetailField
                    label="Seller name"
                    value={listingDetail.leadContactName}
                  />
                  <DetailField
                    label="Seller phone"
                    value={listingDetail.leadContactPhone}
                  />
                  <DetailField
                    label="Connected staff"
                    value={
                      listingDetail.connectedStaff
                        ? [
                            listingDetail.connectedStaff.name,
                            listingDetail.connectedStaff.contact,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : null
                    }
                  />
                  <DetailField
                    label="Owner"
                    value={
                      listingDetail.ownerUser
                        ? [
                            listingDetail.ownerUser.name,
                            listingDetail.ownerUser.contact,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : null
                    }
                  />
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
