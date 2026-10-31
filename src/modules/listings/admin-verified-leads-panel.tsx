'use client';

import { useCallback, useEffect, useMemo, useState, Fragment, type ReactNode } from 'react';
import { MaskedContact } from '@/components/contact/masked-contact';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { AdminDataTable } from '@/components/common/admin-data-table';
import { newFirstCellClass, NewTag } from '@/components/common/new-row-marker';
import { DateRangePicker } from '@/components/common/date-range-picker';
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
  type VerifiedLeadFilterOption,
  type VerifiedLeadFilterOptions,
  type VerifiedLeadFilters,
  type VerifiedLeadKind,
  type VerifiedLeadRemark,
  type VerifiedLeadRow,
  type VerifiedLeadStatus,
} from '@/services/verified-leads.service';
import {
  ensureSelected,
  VerifiedLeadsProjectFilter,
  withCount,
} from '@/modules/listings/verified-leads-project-filter';
import {
  listingsService,
  type MyListingDetail,
} from '@/services/listings.service';
import { ListingFeedbackList } from '@/components/listing-feedback/listing-feedback-list';
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  RotateCcw,
  X,
} from 'lucide-react';

const KIND_FALLBACK: VerifiedLeadFilterOption[] = [
  { value: 'all', label: 'All', count: 0 },
  { value: 'leads', label: 'Leads', count: 0 },
  { value: 'listing_viewers', label: 'Listing viewers', count: 0 },
];

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
  value?: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
    </div>
  );
}

function listingExpiryLabel(detail: {
  status?: string | null;
  daysLeft?: number | null;
  expiresAt?: string | null;
}): string {
  const days =
    typeof detail.daysLeft === 'number' && Number.isFinite(detail.daysLeft)
      ? detail.daysLeft
      : null;
  const expired =
    detail.status === 'expired' ||
    (days != null && days < 0) ||
    (!!detail.expiresAt &&
      days == null &&
      !Number.isNaN(new Date(detail.expiresAt).getTime()) &&
      new Date(detail.expiresAt).getTime() < Date.now());
  if (expired) return 'Expired';
  if (days === 0) return 'Expiring today';
  if (days != null && days > 0) {
    return `Expiring in ${days} day${days === 1 ? '' : 's'}`;
  }
  return '—';
}

function listingStatusLabel(detail: MyListingDetail) {
  if (detail.status === 'expired') return 'Expired';
  if (!detail.isActive) return 'Inactive';
  if (detail.expiringSoon) return listingExpiryLabel(detail);
  return 'Active';
}

export function AdminVerifiedLeadsPanel() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const activeRole = useAuthStore((s) => s.activeRole);
  const accessToken = useAuthStore((s) => s.accessToken);
  const superAdmin = useMemo(
    () => isSuperAdmin({ user, permissions, activeRole, accessToken }),
    [user, permissions, activeRole, accessToken],
  );
  const canRemark = superAdmin || hasPermission('admin_verified_leads', 'create');
  const canStatus = superAdmin || hasPermission('admin_verified_leads', 'update');

  const [items, setItems] = useState<VerifiedLeadRow[]>([]);
  const [statuses, setStatuses] = useState<
    Array<{ value: VerifiedLeadStatus; label: string }>
  >([]);
  const [filterOptions, setFilterOptions] =
    useState<VerifiedLeadFilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qDraft, setQDraft] = useState('');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [kind, setKind] = useState<VerifiedLeadKind>('all');
  const [userRole, setUserRole] = useState('all');
  const [project, setProject] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [followUpFrom, setFollowUpFrom] = useState('');
  const [followUpTo, setFollowUpTo] = useState('');
  const [assigneeId, setAssigneeId] = useState('all');
  const [followUpDraft, setFollowUpDraft] = useState('');
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

  const filters = useMemo<VerifiedLeadFilters>(
    () => ({
      kind,
      status: statusFilter,
      userRole,
      project,
      assigneeId,
      from,
      to,
      followUpFrom,
      followUpTo,
      q,
    }),
    [kind, statusFilter, userRole, project, assigneeId, from, to, followUpFrom, followUpTo, q],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await verifiedLeadsService.list(filters, {
        page,
        limit: pageSize,
      });
      setItems(list.items || []);
      setStatuses(list.statuses || []);
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
  }, [filters, page, pageSize]);

  const loadFilterOptions = useCallback(async () => {
    try {
      setFilterOptions(await verifiedLeadsService.filterOptions(filters));
    } catch {
      // Keep the last counts; the list call surfaces API errors.
    }
  }, [filters]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    const next = qDraft.trim();
    if (next === q) return;
    const t = setTimeout(() => {
      setQ(next);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [qDraft, q]);

  const refreshAll = () => {
    void loadList();
    void loadFilterOptions();
  };

  const resetFilters = () => {
    setQDraft('');
    setQ('');
    setStatusFilter('all');
    setKind('all');
    setUserRole('all');
    setProject('');
    setFrom('');
    setTo('');
    setFollowUpFrom('');
    setFollowUpTo('');
    setAssigneeId('all');
    setPage(1);
    setExpandedId(null);
  };

  const applySearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setPage(1);
    setQ(qDraft.trim());
  };

  const filterActive =
    kind !== 'all' ||
    statusFilter !== 'all' ||
    userRole !== 'all' ||
    !!project ||
    assigneeId !== 'all' ||
    !!from ||
    !!to ||
    !!followUpFrom ||
    !!followUpTo ||
    !!q;

  const kindOptions = filterOptions?.kind.length ? filterOptions.kind : KIND_FALLBACK;
  const statusFilterOptions = ensureSelected(filterOptions?.status || [], statusFilter);
  const assigneeOptions = ensureSelected(filterOptions?.assignee || [], assigneeId);
  const shownTotal = filterOptions?.total ?? total;

  const labelOf = (opts: VerifiedLeadFilterOption[], value: string) =>
    opts.find((o) => o.value === value)?.label || value;

  const activeChips: Array<{ key: string; label: string; clear: () => void }> = [
    kind !== 'all' && {
      key: 'kind',
      label: `Type: ${labelOf(kindOptions, kind)}`,
      clear: () => setKind('all'),
    },
    userRole !== 'all' && {
      key: 'role',
      label: `Role: ${labelOf(filterOptions?.userRole || [], userRole)}`,
      clear: () => setUserRole('all'),
    },
    !!project && {
      key: 'project',
      label: `Project: ${project}`,
      clear: () => setProject(''),
    },
    statusFilter !== 'all' && {
      key: 'status',
      label: `Status: ${labelOf(statusFilterOptions, statusFilter)}`,
      clear: () => setStatusFilter('all'),
    },
    assigneeId !== 'all' && {
      key: 'assignee',
      label: `Assignee: ${labelOf(assigneeOptions, assigneeId)}`,
      clear: () => setAssigneeId('all'),
    },
    (!!from || !!to) && {
      key: 'dates',
      label: `Interested: ${from || '…'} – ${to || '…'}`,
      clear: () => {
        setFrom('');
        setTo('');
      },
    },
    (!!followUpFrom || !!followUpTo) && {
      key: 'followUp',
      label: `Follow-up: ${followUpFrom || '…'} – ${followUpTo || '…'}`,
      clear: () => {
        setFollowUpFrom('');
        setFollowUpTo('');
      },
    },
    !!q && {
      key: 'q',
      label: `Search: ${q}`,
      clear: () => {
        setQDraft('');
        setQ('');
      },
    },
  ].filter((c): c is { key: string; label: string; clear: () => void } => !!c);

  const rangeStart = total ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(page * pageSize, total);

  const toggleExpand = async (row: VerifiedLeadRow) => {
    if (expandedId === row.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(row.id);
    setRemarkDraft('');
    setFollowUpDraft(row.nextFollowUpAt ? String(row.nextFollowUpAt).slice(0, 10) : '');
    setStatusDraft(row.status);
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
        followUpDraft || undefined,
      );
      setRemarksById((prev) => ({
        ...prev,
        [row.id]: [remark, ...(prev[row.id] || [])],
      }));
      setItems((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? {
                ...item,
                isNew: false,
                latestRemark: remark,
                nextFollowUpAt: followUpDraft || item.nextFollowUpAt,
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
      setFollowUpDraft('');
      refreshAll();
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
            <h1 className="mt-2 flex flex-wrap items-baseline gap-3 text-2xl font-bold text-gray-900">
              Admin Verified My Leads
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-700">
                Total: {shownTotal}
              </span>
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Contacted leads and listing viewers on admin-verified listings —
              one row per user × property.
              {superAdmin
                ? ' Super Admin sees all rows.'
                : ' You see rows assigned to you and viewers on your posts.'}
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
              onClick={refreshAll}
              disabled={loading}
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="inline-flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
          {kindOptions.map((k) => {
            const active = kind === k.value;
            return (
              <button
                key={k.value}
                type="button"
                onClick={() => {
                  setKind(k.value as VerifiedLeadKind);
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-white text-gray-900 shadow-sm'
                    : k.count === 0 && filterOptions
                      ? 'text-gray-400 hover:text-gray-600'
                      : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {filterOptions ? withCount(k.label, k.count) : k.label}
              </button>
            );
          })}
        </div>

        <form className="flex flex-wrap items-end gap-3" onSubmit={applySearch}>
          <DateRangePicker
            from={from}
            to={to}
            onChange={(nextFrom, nextTo) => {
              setFrom(nextFrom);
              setTo(nextTo);
              setPage(1);
            }}
            label="Date range"
          />
          <VerifiedLeadsProjectFilter
            roleOptions={filterOptions?.userRole || []}
            role={userRole}
            onRoleChange={(v) => {
              setUserRole(v);
              setPage(1);
            }}
            projectOptions={filterOptions?.project || []}
            project={project}
            onProjectChange={(v) => {
              setProject(v);
              setPage(1);
            }}
          />
          <DateRangePicker
            from={followUpFrom}
            to={followUpTo}
            onChange={(nextFrom, nextTo) => {
              setFollowUpFrom(nextFrom);
              setFollowUpTo(nextTo);
              setPage(1);
            }}
            label="Follow-up date"
          />
          <div>
            <label className="mb-1 block text-xs text-gray-500">Status</label>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v ?? 'all');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusFilterOptions.some((s) => s.value === 'all') ? null : (
                  <SelectItem value="all" label={withCount('All', filterOptions?.total)}>
                    {withCount('All', filterOptions?.total)}
                  </SelectItem>
                )}
                {statusFilterOptions.map((s) => (
                  <SelectItem
                    key={s.value}
                    value={s.value}
                    label={withCount(s.label, s.count)}
                    className={s.count === 0 ? 'text-gray-400' : undefined}
                  >
                    {withCount(s.label, s.count)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Search</label>
            <Input
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder="Name, contact, project…"
              className="max-w-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Assignee</label>
            <Select
              value={assigneeId}
              onValueChange={(v) => {
                setAssigneeId(v ?? 'all');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value="all"
                  label={withCount('All assignees', filterOptions?.total)}
                >
                  {withCount('All assignees', filterOptions?.total)}
                </SelectItem>
                {assigneeOptions.map((a) => (
                  <SelectItem
                    key={a.value}
                    value={a.value}
                    label={withCount(a.label, a.count)}
                    className={a.count === 0 ? 'text-gray-400' : undefined}
                  >
                    {withCount(a.label, a.count)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>

        {filterActive ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-600">
              {total
                ? `Showing ${rangeStart}–${rangeEnd} of ${shownTotal}`
                : `Showing 0 of ${shownTotal}`}
            </span>
            {activeChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs text-gray-700"
              >
                {chip.label}
                <button
                  type="button"
                  aria-label={`Remove ${chip.label}`}
                  className="text-gray-400 hover:text-gray-700"
                  onClick={() => {
                    chip.clear();
                    setPage(1);
                  }}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}

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
          emptyMessage={
            filterActive
              ? 'No leads found for this filter'
              : 'No leads or listing viewers found.'
          }
          emptyAction={
            filterActive ? (
              <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                Clear filters
              </Button>
            ) : null
          }
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
                <th className="px-4 py-3 font-semibold text-gray-700">Follow-up</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Assigned to</th>
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
                          <span className="flex flex-col gap-1">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <NewTag show={row.isNew || row.dashboardAlert} />
                              <span>{row.username}</span>
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                                  row.sourceKind === 'viewer'
                                    ? 'bg-sky-50 text-sky-800'
                                    : 'bg-emerald-50 text-emerald-800'
                                }`}
                              >
                                {row.sourceKind === 'viewer' ? 'Viewer' : 'Lead'}
                              </span>
                            </span>
                            {row.planCode || row.userRoleLabel ? (
                              <span className="flex flex-wrap items-center gap-1.5">
                                <PlanBadge planCode={row.planCode} />
                                {row.userRoleLabel ? (
                                  <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-800">
                                    {row.userRoleLabel}
                                  </span>
                                ) : null}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <MaskedContact value={row.contact} revealKey={`verified-leads:${row.id}:contact`} />
                      </td>
                      <td className="px-4 py-3">{row.projectName || '—'}</td>
                      <td className="px-4 py-3">
                        <MaskedContact
                          value={row.leadUnitNo}
                          revealKey={`verified-leads:${row.id}:unit`}
                          variant="secret"
                        />
                      </td>
                      <td className="px-4 py-3">{row.leadContactName || '—'}</td>
                      <td className="px-4 py-3">
                        <MaskedContact value={row.leadContactPhone} revealKey={`verified-leads:${row.id}:seller`} />
                      </td>
                      <td className="px-4 py-3">{row.bhk || '—'}</td>
                      <td className="px-4 py-3">{row.city || '—'}</td>
                      <td className="px-4 py-3">{row.location || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {formatDisplayDateTime(row.interestedAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {row.nextFollowUpAt ? formatDisplayDateTime(row.nextFollowUpAt) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {row.statusLabel}
                        </span>
                      </td>
                      <td className="min-w-[140px] px-4 py-3">
                        {row.assignedStaff ? (
                          <div className="leading-tight">
                            <p className="text-sm text-gray-800">
                              {row.assignedStaff.name}
                            </p>
                            {row.assignedStaff.contact ? (
                              <p className="text-xs text-gray-500">
                                {row.assignedStaff.contact}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Not assigned</span>
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
                        <td colSpan={14} className="px-4 py-4">
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
                                      {r.nextFollowUpAt
                                        ? ` · Follow-up ${formatDisplayDateTime(r.nextFollowUpAt)}`
                                        : ''}
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
                                <div className="space-y-1">
                                  <label className="text-[11px] text-gray-500">
                                    Next follow-up
                                  </label>
                                  <Input
                                    type="date"
                                    value={followUpDraft}
                                    onChange={(e) => setFollowUpDraft(e.target.value)}
                                    className="h-9 w-[150px]"
                                  />
                                </div>
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
                    label="Expiry"
                    value={listingExpiryLabel(listingDetail)}
                  />
                  <DetailField
                    label="Unit No"
                    value={
                      listingDetail.leadUnitNo ? (
                        <MaskedContact
                          value={listingDetail.leadUnitNo}
                          revealKey={`verified-leads-detail:${listingDetail.id}:unit`}
                          variant="secret"
                        />
                      ) : null
                    }
                  />
                  <DetailField
                    label="Seller name"
                    value={listingDetail.leadContactName}
                  />
                  <DetailField
                    label="Seller phone"
                    value={
                      listingDetail.leadContactPhone ? (
                        <MaskedContact
                          value={listingDetail.leadContactPhone}
                          revealKey={`verified-leads-detail:${listingDetail.id}:seller`}
                        />
                      ) : null
                    }
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
                      listingDetail.ownerUser ? (
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          {listingDetail.ownerUser.name || null}
                          {listingDetail.ownerUser.name && listingDetail.ownerUser.contact ? ' · ' : null}
                          <MaskedContact
                            value={listingDetail.ownerUser.contact}
                            revealKey={`verified-leads-detail:${listingDetail.id}:owner`}
                            empty=""
                          />
                        </span>
                      ) : null
                    }
                  />
                </div>
                <ListingFeedbackList listingId={listingDetail.id} />
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
