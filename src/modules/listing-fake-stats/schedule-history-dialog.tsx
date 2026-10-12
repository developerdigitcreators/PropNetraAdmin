'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaginationBar } from '@/components/common/pagination-bar';
import { apiErrorInfo } from '@/services/password-reset.service';
import {
  listingFakeStatsService,
  type FakeStatsHistory,
  type FakeStatsSchedule,
} from '@/services/listing-fake-stats.service';
import {
  ConfirmDialog,
  ScheduleForm,
  ScheduleStatusBadge,
  formatScheduleDate,
  todayIst,
} from '@/modules/listing-fake-stats/schedule-parts';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';

const ALL = 'all';

type Confirm =
  | { kind: 'row'; row: FakeStatsSchedule }
  | { kind: 'bulk' }
  | null;

export function ScheduleHistoryDialog({
  open,
  onOpenChange,
  cityId,
  roles,
  canUpdate,
  onChanged,
  onToast,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cityId: string;
  roles: Array<{ value: string; label: string }>;
  canUpdate: boolean;
  onChanged: () => void;
  onToast: (message: string) => void;
}) {
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [data, setData] = useState<FakeStatsHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allSelected, setAllSelected] = useState(false);
  const [renewId, setRenewId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const load = useCallback(async () => {
    if (!cityId) return;
    setLoading(true);
    setError('');
    try {
      setData(
        await listingFakeStatsService.getHistory({
          cityId,
          role: role || undefined,
          status: status || undefined,
          page,
          limit,
        }),
      );
    } catch (err) {
      setData(null);
      setError(apiErrorInfo(err, 'Failed to load history.').message);
    } finally {
      setLoading(false);
    }
  }, [cityId, role, status, page, limit]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const clearSelection = () => {
    setSelected(new Set());
    setAllSelected(false);
  };

  const changeFilter = (next: { role?: string; status?: string }) => {
    if (next.role !== undefined) setRole(next.role);
    if (next.status !== undefined) setStatus(next.status);
    setPage(1);
    setRenewId(null);
    clearSelection();
  };

  const items = data?.items || [];
  const total = data?.total || 0;
  const counts = data?.counts || { completed: 0, cancelled: 0, issue: 0 };
  const deletable = items.filter((r) => r.canDelete);
  const isChecked = (row: FakeStatsSchedule) => allSelected || selected.has(row.id);
  const selectedCount = allSelected ? total : selected.size;
  const pageAllChecked = deletable.length > 0 && deletable.every(isChecked);
  const roleLabel = roles.find((r) => r.value === role)?.label;

  const toggleRow = (row: FakeStatsSchedule, checked: boolean) => {
    if (allSelected) {
      const next = new Set(deletable.map((r) => r.id));
      next.delete(row.id);
      setAllSelected(false);
      setSelected(next);
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(row.id);
      else next.delete(row.id);
      return next;
    });
  };

  const afterDelete = async (message: string) => {
    clearSelection();
    onToast(message);
    onChanged();
    if (items.length <= 1 && page > 1) setPage(page - 1);
    else await load();
  };

  const statusOptions = [
    { value: ALL, label: `All (${counts.completed + counts.cancelled + counts.issue})` },
    { value: 'completed', label: `Completed (${counts.completed})` },
    { value: 'cancelled', label: `Cancelled (${counts.cancelled})` },
    { value: 'issue', label: `Issue (${counts.issue})` },
  ];
  const roleOptions = [{ value: ALL, label: 'All roles' }, ...roles];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] w-full overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Schedule history</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Role</label>
            <Select value={role || ALL} onValueChange={(v) => changeFilter({ role: !v || v === ALL ? '' : v })}>
              <SelectTrigger className="h-9 min-w-[180px] bg-white">
                <SelectValue>{(v: string) => roleOptions.find((o) => o.value === v)?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value} label={o.label}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Status</label>
            <Select
              value={status || ALL}
              onValueChange={(v) => changeFilter({ status: !v || v === ALL ? '' : v })}
            >
              <SelectTrigger className="h-9 min-w-[180px] bg-white">
                <SelectValue>{(v: string) => statusOptions.find((o) => o.value === v)?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value} label={o.label}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {canUpdate ? (
              <Button
                variant="destructive"
                size="sm"
                disabled={selectedCount === 0}
                onClick={() => setConfirm({ kind: 'bulk' })}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete selected{selectedCount ? ` (${selectedCount})` : ''}
              </Button>
            ) : null}
          </div>
        </div>

        {canUpdate && pageAllChecked && !allSelected && total > deletable.length ? (
          <p className="rounded-md bg-primary-light/40 px-3 py-2 text-xs text-gray-700">
            {selected.size} rows on this page are selected.{' '}
            <button type="button" className="font-medium text-primary underline" onClick={() => setAllSelected(true)}>
              Select all {total}
              {roleLabel ? ` ${roleLabel}` : ''} rows
            </button>
          </p>
        ) : null}
        {allSelected ? (
          <p className="rounded-md bg-primary-light/40 px-3 py-2 text-xs text-gray-700">
            All {total} rows{roleLabel ? ` for ${roleLabel}` : ''} are selected, including other pages.{' '}
            <button type="button" className="font-medium text-primary underline" onClick={clearSelection}>
              Clear selection
            </button>
          </p>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/80 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="w-10 px-3 py-2">
                  {canUpdate ? (
                    <Checkbox
                      checked={pageAllChecked}
                      disabled={!deletable.length}
                      onCheckedChange={(checked: boolean) => {
                        if (checked) {
                          setSelected(new Set(deletable.map((r) => r.id)));
                        } else {
                          clearSelection();
                        }
                      }}
                      aria-label="Select all rows on this page"
                    />
                  ) : null}
                </th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Time range</th>
                <th className="px-3 py-2 font-medium">Added by</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Views added</th>
                <th className="px-3 py-2 text-right font-medium">Listings</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && !items.length ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                  </td>
                </tr>
              ) : !items.length ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-gray-500">
                    No history yet.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <Fragment key={row.id}>
                    <tr className="border-b border-gray-50 last:border-0">
                      <td className="px-3 py-2.5">
                        {canUpdate && row.canDelete ? (
                          <Checkbox
                            checked={isChecked(row)}
                            onCheckedChange={(checked: boolean) => toggleRow(row, checked)}
                            aria-label="Select row"
                          />
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-gray-900">{row.roleLabel}</td>
                      <td className="px-3 py-2.5 text-gray-700">{formatScheduleDate(row.date)}</td>
                      <td className="px-3 py-2.5 text-gray-700">{row.timeRange || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-700">{row.addedBy?.name || '—'}</td>
                      <td className="px-3 py-2.5">
                        <ScheduleStatusBadge row={row} />
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-900">
                        {row.viewsAdded}
                        {row.viewsPlanned ? <span className="text-gray-400"> / {row.viewsPlanned}</span> : null}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-900">{row.listingsCount}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {canUpdate && row.canRenew ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRenewId(renewId === row.id ? null : row.id)}
                            >
                              Renew
                            </Button>
                          ) : null}
                          {canUpdate && row.canDelete ? (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              title="Delete"
                              aria-label="Delete row"
                              onClick={() => setConfirm({ kind: 'row', row })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {renewId === row.id ? (
                      <tr className="border-b border-gray-50 bg-primary-light/20">
                        <td />
                        <td colSpan={8} className="px-3 py-2.5">
                          <p className="mb-1.5 text-xs text-gray-600">
                            Renew {row.roleLabel}: pick a new date. Times are pre-filled and can be changed.
                          </p>
                          <ScheduleForm
                            initial={{ date: todayIst(), startTime: row.startTime, endTime: row.endTime }}
                            saveLabel="Renew"
                            requireTimes={false}
                            onSubmit={async (v) => {
                              await listingFakeStatsService.renewSchedule(row.id, {
                                date: v.date,
                                ...(v.startTime ? { startTime: v.startTime } : {}),
                                ...(v.endTime ? { endTime: v.endTime } : {}),
                              });
                              setRenewId(null);
                              onToast(`Renewed. A Pending run was added to ${row.roleLabel} views.`);
                              onChanged();
                              await load();
                            }}
                            onCancel={() => setRenewId(null)}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > 0 ? (
          <PaginationBar
            currentPage={page}
            totalItems={total}
            pageSize={limit}
            totalPages={Math.max(1, Math.ceil(total / limit))}
            onPageChange={(p: number) => {
              setPage(p);
              setRenewId(null);
              if (!allSelected) setSelected(new Set());
            }}
            onPageSizeChange={(n: number) => {
              setLimit(n);
              setPage(1);
              setRenewId(null);
              if (!allSelected) setSelected(new Set());
            }}
          />
        ) : null}

        <ConfirmDialog
          open={confirm !== null}
          title={confirm?.kind === 'row' ? 'Delete this history row?' : 'Delete selected rows?'}
          description={
            confirm?.kind === 'row'
              ? `${confirm.row.roleLabel} · ${formatScheduleDate(confirm.row.date)} · ${confirm.row.timeRange}. This cannot be undone.`
              : allSelected
                ? `This permanently deletes all ${total} history rows${
                    roleLabel ? ` for ${roleLabel}` : ''
                  } in this city, including rows on other pages.`
                : `This permanently deletes ${selected.size} selected row${selected.size === 1 ? '' : 's'}.`
          }
          confirmLabel="Delete"
          onConfirm={async () => {
            if (confirm?.kind === 'row') {
              await listingFakeStatsService.deleteSchedule(confirm.row.id);
              await afterDelete('Row deleted.');
              return;
            }
            if (allSelected) {
              await listingFakeStatsService.bulkDeleteSchedules({
                all: true,
                cityId,
                ...(role ? { role } : {}),
              });
            } else {
              await listingFakeStatsService.bulkDeleteSchedules({ ids: [...selected] });
            }
            await afterDelete('Selected rows deleted.');
          }}
          onClose={() => setConfirm(null)}
        />
      </DialogContent>
    </Dialog>
  );
}
