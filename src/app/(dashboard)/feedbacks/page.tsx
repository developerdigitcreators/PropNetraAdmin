'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
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
import { DeleteRemarkDialog } from '@/components/common/delete-remark-dialog';
import { newFirstCellClass, NewTag } from '@/components/common/new-row-marker';
import {
  feedbackApiError,
  feedbacksService,
  type FeedbackItem,
  type FeedbackRemark,
} from '@/services/feedbacks.service';
import {
  AlertTriangle,
  Edit2,
  Eye,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FeedbacksPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('feedbacks', 'create');
  const canUpdate = hasPermission('feedbacks', 'update');
  const canDelete = hasPermission('feedbacks', 'delete');

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');

  const [detail, setDetail] = useState<FeedbackItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [remarkDraft, setRemarkDraft] = useState('');
  const [remarkBusy, setRemarkBusy] = useState(false);
  const [editingRemark, setEditingRemark] = useState<FeedbackRemark | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [toDeleteRemark, setToDeleteRemark] = useState<FeedbackRemark | null>(null);
  const [deletingRemark, setDeletingRemark] = useState(false);

  const [toDelete, setToDelete] = useState<FeedbackItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchList = useCallback(async (q?: string) => {
    setLoading(true);
    setError('');
    try {
      setItems(await feedbacksService.list(q));
    } catch (err) {
      setItems([]);
      setError(feedbackApiError(err, 'Failed to load feedback.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const applyDetail = (next: FeedbackItem | null) => {
    if (!next) return;
    setDetail(next);
    setItems((rows) =>
      rows.map((row) =>
        row.id === next.id
          ? { ...row, remarksCount: next.remarksCount, message: next.message }
          : row,
      ),
    );
  };

  const openDetail = async (row: FeedbackItem) => {
    setDetail(row);
    setDetailOpen(true);
    setDetailError('');
    setRemarkDraft('');
    setEditingRemark(null);
    setDetailLoading(true);
    try {
      const next = await feedbacksService.get(row.id);
      if (next) applyDetail(next);
    } catch (err) {
      setDetailError(feedbackApiError(err, 'Failed to load feedback.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAddRemark = async () => {
    if (!detail || !remarkDraft.trim() || remarkBusy) return;
    setRemarkBusy(true);
    setDetailError('');
    try {
      const next = await feedbacksService.addRemark(detail.id, remarkDraft.trim());
      applyDetail(next);
      setRemarkDraft('');
    } catch (err) {
      setDetailError(feedbackApiError(err, 'Failed to add remark.'));
    } finally {
      setRemarkBusy(false);
    }
  };

  const handleSaveRemark = async () => {
    if (!detail || !editingRemark || !editDraft.trim() || editBusy) return;
    setEditBusy(true);
    setDetailError('');
    try {
      const next = await feedbacksService.updateRemark(
        detail.id,
        editingRemark.id,
        editDraft.trim(),
      );
      applyDetail(next);
      setEditingRemark(null);
      setEditDraft('');
    } catch (err) {
      setDetailError(feedbackApiError(err, 'Failed to update remark.'));
    } finally {
      setEditBusy(false);
    }
  };

  const handleDeleteRemark = async () => {
    if (!detail || !toDeleteRemark) return;
    setDeletingRemark(true);
    setDetailError('');
    try {
      const next = await feedbacksService.removeRemark(detail.id, toDeleteRemark.id);
      applyDetail(next);
      setToDeleteRemark(null);
    } catch (err) {
      setDetailError(feedbackApiError(err, 'Failed to delete remark.'));
    } finally {
      setDeletingRemark(false);
    }
  };

  const handleDeleteFeedback = async (remark: string) => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await feedbacksService.remove(toDelete.id, remark);
      if (detail?.id === toDelete.id) {
        setDetailOpen(false);
        setDetail(null);
      }
      setToDelete(null);
      await fetchList(search);
    } catch (err) {
      setError(feedbackApiError(err, 'Failed to delete feedback.'));
    } finally {
      setDeleting(false);
    }
  };

  const remarks = detail?.remarks || [];

  return (
    <PermissionGuard
      permission="feedbacks:read"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view feedback.
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl pb-16">
        <Breadcrumb items={[{ label: 'Feedback' }]} />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Feedback</h1>
            <p className="mt-1 text-gray-500">
              Messages submitted from the app. You can add remarks, but the user message cannot be edited.
            </p>
          </div>
          <div className="flex w-full max-w-md flex-wrap items-center gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void fetchList(search)}
              disabled={loading}
            >
              <RefreshCw className="mr-1.5 size-3.5" />
              Refresh
            </Button>
            <form
              className="flex min-w-[220px] flex-1 items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(searchDraft.trim());
                void fetchList(searchDraft.trim());
              }}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="Search user or message"
                  className="h-9 pl-8"
                />
              </div>
              <Button type="submit" variant="outline" className="h-9">
                Search
              </Button>
            </form>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/80">
                <tr>
                  <th className="px-5 py-3 font-semibold text-gray-700">User</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Feedback</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Remarks</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Submitted</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              {loading ? (
                <tbody>
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                    </td>
                  </tr>
                </tbody>
              ) : items.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                      <MessageSquare className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                      No feedback yet.
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 last:border-0">
                      <td className={newFirstCellClass(row.isNew, 'px-5 py-4')}>
                        <div className="flex items-start gap-1.5">
                          <NewTag show={row.isNew} />
                          <div>
                            <p className="font-medium text-gray-900">{row.user.name || '—'}</p>
                            <p className="text-xs text-gray-500 break-all">{row.user.email || '—'}</p>
                            <p className="text-xs text-gray-400">{row.user.contact || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[360px] px-5 py-4">
                        <p className="line-clamp-2 text-sm text-gray-700">{row.message}</p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                          {row.remarksCount}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500">
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void openDetail(row)}
                            title="View"
                          >
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
              )}
            </table>
          </div>
        </div>
      </div>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setDetail(null);
            setEditingRemark(null);
            setDetailError('');
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User feedback</DialogTitle>
            <DialogDescription>
              The submitted message cannot be edited. Add or change remarks only.
            </DialogDescription>
          </DialogHeader>

          {detailLoading && !detail ? (
            <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin text-primary" />
          ) : detail ? (
            <div className="space-y-4 pt-1">
              {detailError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{detailError}</div>
              )}

              <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5 text-sm">
                <p className="font-medium text-gray-900">{detail.user.name || '—'}</p>
                <p className="break-all text-xs text-gray-500">{detail.user.email || '—'}</p>
                <p className="text-xs text-gray-400">{detail.user.contact || '—'}</p>
                <p className="mt-1 text-[10px] text-gray-400">
                  Submitted {formatDateTime(detail.createdAt)}
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  User message
                </p>
                <p className="whitespace-pre-wrap break-words rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-sm text-gray-800">
                  {detail.message}
                </p>
              </div>

              {canCreate && (
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Add remark
                  </label>
                  <textarea
                    value={remarkDraft}
                    onChange={(e) => setRemarkDraft(e.target.value)}
                    rows={3}
                    placeholder="Write a remark…"
                    className="min-h-[72px] w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Button
                    type="button"
                    onClick={() => void handleAddRemark()}
                    disabled={!remarkDraft.trim() || remarkBusy}
                    className="bg-primary text-white hover:bg-primary/90"
                    size="sm"
                  >
                    {remarkBusy ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-1.5 h-4 w-4" />
                    )}
                    Add remark
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Remarks ({remarks.length})
                </p>
                {detailLoading ? (
                  <Loader2 className="mx-auto my-4 h-5 w-5 animate-spin text-primary" />
                ) : remarks.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-gray-200 py-4 text-center text-sm text-gray-500">
                    No remarks yet.
                  </p>
                ) : (
                  <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {remarks.map((remark) => {
                      const isEditing = editingRemark?.id === remark.id;
                      return (
                        <li
                          key={remark.id}
                          className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-sm"
                        >
                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                value={editDraft}
                                onChange={(e) => setEditDraft(e.target.value)}
                                rows={3}
                                className="min-h-[64px] w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm"
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingRemark(null)}
                                  disabled={editBusy}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => void handleSaveRemark()}
                                  disabled={!editDraft.trim() || editBusy}
                                  className="bg-primary text-white hover:bg-primary/90"
                                >
                                  {editBusy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="whitespace-pre-wrap break-words text-gray-800">
                                {remark.text}
                              </p>
                              <div className="mt-1.5 flex items-center justify-between gap-2">
                                <p className="text-[10px] text-gray-400">
                                  {remark.createdBy.name ? `${remark.createdBy.name} · ` : ''}
                                  {formatDateTime(remark.updatedAt || remark.createdAt)}
                                </p>
                                <div className="flex items-center">
                                  {canUpdate && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      title="Edit remark"
                                      onClick={() => {
                                        setEditingRemark(remark);
                                        setEditDraft(remark.text);
                                      }}
                                    >
                                      <Edit2 className="h-3.5 w-3.5 text-gray-500" />
                                    </Button>
                                  )}
                                  {canDelete && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      title="Delete remark"
                                      className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                      onClick={() => setToDeleteRemark(remark)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <DeleteRemarkDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete feedback"
        itemName={toDelete?.user.name || toDelete?.message}
        submitting={deleting}
        onConfirm={handleDeleteFeedback}
      />

      <Dialog
        open={Boolean(toDeleteRemark)}
        onOpenChange={(open) => !open && setToDeleteRemark(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete remark
            </DialogTitle>
            <DialogDescription>
              This remark will be removed. The user feedback stays as submitted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setToDeleteRemark(null)}
              disabled={deletingRemark}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleDeleteRemark()}
              disabled={deletingRemark}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deletingRemark && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PermissionGuard>
  );
}
