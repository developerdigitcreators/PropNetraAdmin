'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { AdminDataTable } from '@/components/common/admin-data-table';
import { AdminListToolbar } from '@/components/common/admin-list-toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { newFirstCellClass, NewTag } from '@/components/common/new-row-marker';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { feedbackApiError } from '@/services/feedbacks.service';
import {
  listingFeedbackIssueLabels,
  listingFeedbacksService,
  type ListingFeedbackItem,
} from '@/services/listing-feedbacks.service';
import { AlertTriangle, Eye, Loader2, Search, Trash2 } from 'lucide-react';
import { formatDisplayDateTime } from '@/lib/format-date';

function PersonCell({ person }: { person: ListingFeedbackItem['agent'] }) {
  return (
    <div>
      <p className="font-medium text-gray-900">{person.name || '—'}</p>
      <p className="text-xs text-gray-500 break-all">{person.contact || '—'}</p>
    </div>
  );
}

function IssueBadges({ row }: { row: ListingFeedbackItem }) {
  const issues = listingFeedbackIssueLabels(row);
  if (!issues.length) return <span className="text-xs text-gray-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {issues.map((label) => (
        <Badge key={label} variant="secondary" className="bg-orange-50 text-orange-700">
          {label}
        </Badge>
      ))}
    </div>
  );
}

function ListingFeedbacksPageInner() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canDelete = hasPermission('listing_feedbacks', 'delete');

  const { filters, setFilters, resetFilters } = useUrlFilters({
    q: '',
    listingId: '',
    ownerUserId: '',
  });
  const [searchDraft, setSearchDraft] = useState(filters.q);
  const [items, setItems] = useState<ListingFeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [detail, setDetail] = useState<ListingFeedbackItem | null>(null);
  const [toDelete, setToDelete] = useState<ListingFeedbackItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listingFeedbacksService.list({
        q: filters.q,
        listingId: filters.listingId || undefined,
        ownerUserId: filters.ownerUserId || undefined,
        page,
        limit,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      setItems([]);
      setTotal(0);
      setError(feedbackApiError(err, 'Failed to load listing feedback.'));
    } finally {
      setLoading(false);
    }
  }, [filters.q, filters.listingId, filters.ownerUserId, page, limit]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    setPage(1);
  }, [filters.q, filters.listingId, filters.ownerUserId]);

  const openDetail = (row: ListingFeedbackItem) => {
    setDetail(row);
    if (row.isNew) {
      listingFeedbacksService.markSeen(row.id).catch(() => {});
      setItems((rows) => rows.map((r) => (r.id === row.id ? { ...r, isNew: false } : r)));
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await listingFeedbacksService.remove(toDelete.id);
      if (detail?.id === toDelete.id) setDetail(null);
      setToDelete(null);
      await fetchList();
    } catch (err) {
      setError(feedbackApiError(err, 'Failed to delete feedback.'));
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <PermissionGuard
      permission="listing_feedbacks:read"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view listing feedback.
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl pb-16">
        <Breadcrumb items={[{ label: 'Listing Feedback' }]} />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Listing Feedback</h1>
            <p className="mt-1 text-gray-500">
              Feedback given by agents on listings after revealing the contact. Visible only in admin.
            </p>
          </div>
          <AdminListToolbar
            onRefresh={() => void fetchList()}
            refreshBusy={loading}
            onReset={() => {
              resetFilters();
              setSearchDraft('');
              setPage(1);
            }}
          />
        </div>

        <form
          className="flex max-w-md flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setFilters({ q: searchDraft.trim() });
          }}
        >
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search listing, owner, agent or remarks"
              className="h-9 pl-8"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>

        <AdminDataTable
          page={page}
          limit={limit}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={(n: number) => {
            setLimit(n);
            setPage(1);
          }}
          loading={loading}
          error={error || null}
          isEmpty={!items.length}
          emptyMessage="No listing feedback yet."
          syncKey={items.length}
        >
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/80">
              <tr>
                <th className="px-5 py-3 font-semibold text-gray-700">Listing</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Owner</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Agent</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Issues</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Remarks</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Submitted</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0">
                  <td className={newFirstCellClass(row.isNew, 'px-5 py-4')}>
                    <div className="flex items-start gap-1.5">
                      <NewTag show={row.isNew} />
                      <div>
                        <p className="font-medium text-gray-900">{row.listing.title}</p>
                        <p className="text-xs text-gray-500">
                          {[row.listing.category, row.listing.location].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <PersonCell person={row.owner} />
                  </td>
                  <td className="px-5 py-4">
                    <PersonCell person={row.agent} />
                  </td>
                  <td className="max-w-[260px] px-5 py-4">
                    <IssueBadges row={row} />
                  </td>
                  <td className="max-w-[280px] px-5 py-4">
                    <p className="line-clamp-2 text-sm text-gray-700">{row.remarks || '—'}</p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500">
                    {formatDisplayDateTime(row.createdAt)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openDetail(row)} title="View">
                        <Eye className="h-4 w-4 text-gray-500" />
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setToDelete(row)}
                          className="text-red-500 hover:bg-red-50 hover:text-red-600"
                          title="Delete feedback"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminDataTable>
      </div>

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Listing feedback</DialogTitle>
            <DialogDescription>Submitted by an agent from the contact reveal popup.</DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4 pt-1 text-sm">
              <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5">
                <p className="font-medium text-gray-900">{detail.listing.title}</p>
                <p className="text-xs text-gray-500">
                  {[detail.listing.category, detail.listing.location].filter(Boolean).join(' · ') || '—'}
                </p>
                <p className="mt-1 text-[10px] text-gray-400">
                  Submitted {formatDisplayDateTime(detail.createdAt)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Owner</p>
                  <PersonCell person={detail.owner} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Agent</p>
                  <PersonCell person={detail.agent} />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Issues</p>
                <IssueBadges row={detail} />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Remarks</p>
                <p className="whitespace-pre-wrap break-words rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-gray-800">
                  {detail.remarks || '—'}
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete listing feedback
            </DialogTitle>
            <DialogDescription>
              This feedback will be removed permanently. The agent will be able to submit again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setToDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PermissionGuard>
  );
}

export default function ListingFeedbacksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <ListingFeedbacksPageInner />
    </Suspense>
  );
}
