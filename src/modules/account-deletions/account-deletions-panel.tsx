'use client';

import { useCallback, useEffect, useState } from 'react';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { PaginationBar } from '@/components/common/pagination-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  accountDeletionApiError,
  accountDeletionsService,
  type AccountDeletionRequest,
  type AccountDeletionStatus,
} from '@/services/account-deletions.service';
import { Eye, Loader2, RefreshCw, Search, UserRound, UserX } from 'lucide-react';
import { newFirstCellClass, NewTag } from '@/components/common/new-row-marker';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: AccountDeletionStatus) {
  return status === 'completed' ? 'Completed' : 'Pending OTP';
}

function statusClass(status: AccountDeletionStatus) {
  return status === 'completed'
    ? 'bg-green-100 text-green-700'
    : 'bg-amber-100 text-amber-800';
}

function channelLabel(channel: AccountDeletionRequest['channel']) {
  if (channel === 'mobile') return 'Mobile';
  if (channel === 'email') return 'Email';
  return '—';
}

const STATUS_FILTERS: Array<{ id: '' | AccountDeletionStatus; label: string }> = [
  { id: '', label: 'All' },
  { id: 'pending_otp', label: 'Pending OTP' },
  { id: 'completed', label: 'Completed' },
];

export function AccountDeletionsPanel() {
  const [items, setItems] = useState<AccountDeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | AccountDeletionStatus>('pending_otp');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [detail, setDetail] = useState<AccountDeletionRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await accountDeletionsService.list({
        status: statusFilter,
        search,
        page,
        limit: pageSize,
      });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setError('');
    } catch (err) {
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      setError(accountDeletionApiError(err, 'Failed to load account deletion requests.'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    void accountDeletionsService
      .list({
        status: statusFilter,
        search,
        page,
        limit: pageSize,
      })
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
        setTotalPages(result.totalPages);
        setError('');
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        setTotalPages(1);
        setError(accountDeletionApiError(err, 'Failed to load account deletion requests.'));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search, statusFilter]);

  const openDetail = async (row: AccountDeletionRequest) => {
    setDetail(row);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError('');
    try {
      const next = await accountDeletionsService.get(row.id);
      if (next) setDetail(next);
    } catch (err) {
      setDetailError(accountDeletionApiError(err, 'Failed to load request details.'));
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <PermissionGuard
      permission="account_deletions:read"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view Account Deletion Requests.
        </div>
      }
    >
      <div className="max-w-7xl space-y-6 pb-16">
        <Breadcrumb items={[{ label: 'Account Deletion Requests' }]} />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Account Deletion Requests
            </h1>
            <p className="mt-1 text-gray-500">
              Requests appear as Pending OTP when started in the app, then Completed after OTP verify
              (soft-delete + inactive).
            </p>
          </div>
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
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setLoading(true);
                  setPage(1);
                  setSearch(searchDraft.trim());
                }
              }}
              placeholder="Search name, email, phone…"
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true);
              setPage(1);
              setSearch(searchDraft.trim());
            }}
          >
            Search
          </Button>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => {
              const active = statusFilter === filter.id;
              return (
                <button
                  key={filter.id || 'all'}
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    setPage(1);
                    setStatusFilter(filter.id);
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/80">
                <tr>
                  <th className="px-5 py-3 font-semibold text-gray-700">User</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Channel</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Reason</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Requested</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Completed</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              {loading ? (
                <tbody>
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                    </td>
                  </tr>
                </tbody>
              ) : items.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                      <UserX className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                      No account deletion requests found.
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 last:border-0">
                      <td className={newFirstCellClass(row.isNew, 'px-5 py-4')}>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                            <UserRound className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate font-medium text-gray-900">
                              <NewTag show={row.isNew} />
                              {row.user?.name || 'Unknown user'}
                            </p>
                            <p className="truncate text-xs text-gray-500">
                              {row.user?.email || '—'}
                            </p>
                            <p className="truncate text-xs text-gray-400">
                              {row.user?.contact || '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-600">{channelLabel(row.channel)}</td>
                      <td className="max-w-[240px] px-5 py-4 text-gray-600">
                        <p className="line-clamp-2">{row.reason || '—'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge className={statusClass(row.status)}>{statusLabel(row.status)}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500">
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500">
                        {formatDateTime(row.completedAt)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void openDetail(row)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4 text-gray-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        </div>

        <PaginationBar
          currentPage={page}
          totalItems={total}
          pageSize={pageSize}
          totalPages={totalPages}
          onPageChange={(next) => {
            setLoading(true);
            setPage(next);
          }}
          onPageSizeChange={(size) => {
            setLoading(true);
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      <Dialog open={detailOpen} onOpenChange={(open) => !open && setDetailOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Deletion request</DialogTitle>
            <DialogDescription>
              {detail ? statusLabel(detail.status) : 'Request details'}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : detail ? (
            <div className="space-y-4">
              {detailError ? (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{detailError}</div>
              ) : null}

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">User</p>
                <p className="mt-1 font-medium text-gray-900">{detail.user?.name || 'Unknown'}</p>
                <p className="text-sm text-gray-500">{detail.user?.email || '—'}</p>
                <p className="text-sm text-gray-400">{detail.user?.contact || '—'}</p>
                {detail.user?.status ? (
                  <p className="mt-2 text-xs text-gray-500">
                    Account status: <span className="font-medium">{detail.user.status}</span>
                  </p>
                ) : null}
                {detail.user?.deletedAt ? (
                  <p className="text-xs text-gray-500">
                    Soft-deleted at: {formatDateTime(detail.user.deletedAt)}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Status
                  </p>
                  <Badge className={`mt-1 ${statusClass(detail.status)}`}>
                    {statusLabel(detail.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Channel
                  </p>
                  <p className="mt-1 text-gray-700">{channelLabel(detail.channel)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Requested
                  </p>
                  <p className="mt-1 text-gray-700">{formatDateTime(detail.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Completed
                  </p>
                  <p className="mt-1 text-gray-700">{formatDateTime(detail.completedAt)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Reason</p>
                <p className="mt-1 text-sm text-gray-700">{detail.reason || '—'}</p>
              </div>

              {detail.status === 'pending_otp' && detail.otpExpiresAt ? (
                <p className="text-xs text-amber-700">
                  OTP expires at {formatDateTime(detail.otpExpiresAt)}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">Request not found.</p>
          )}
        </DialogContent>
      </Dialog>
    </PermissionGuard>
  );
}
