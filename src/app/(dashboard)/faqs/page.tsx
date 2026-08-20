'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SortableTableBody } from '@/components/common/sortable-list';
import { FaqFormDialog } from '@/modules/faqs/faq-form-dialog';
import {
  faqApiError,
  faqsService,
  type FaqItem,
} from '@/services/faqs.service';
import {
  AlertTriangle,
  CircleHelp,
  Edit2,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';

export default function FaqsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('faqs', 'create');
  const canUpdate = hasPermission('faqs', 'update');
  const canDelete = hasPermission('faqs', 'delete');

  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toDelete, setToDelete] = useState<FaqItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState('');

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setFaqs(await faqsService.list());
    } catch (err) {
      setFaqs([]);
      setError(faqApiError(err, 'Failed to load FAQs.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const openCreate = () => {
    setEditing(null);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (faq: FaqItem) => {
    setEditing(faq);
    setFormError('');
    setFormOpen(true);
  };

  const handleSave = async (payload: {
    question: string;
    answer: string;
    isActive: boolean;
  }) => {
    setSaving(true);
    setFormError('');
    try {
      if (editing?.id) {
        await faqsService.update(editing.id, payload);
      } else {
        await faqsService.create(payload);
      }
      setFormOpen(false);
      setEditing(null);
      await fetchFaqs();
    } catch (err) {
      setFormError(faqApiError(err, 'Failed to save FAQ.'));
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (ordered: Array<FaqItem & { sortOrder: number }>) => {
    const previous = faqs;
    setFaqs(ordered);
    try {
      await faqsService.reorder(ordered.map((item) => item.id));
    } catch (err) {
      setFaqs(previous);
      setError(faqApiError(err, 'Failed to reorder FAQs.'));
    }
  };

  const handleToggleActive = async (faq: FaqItem, next: boolean) => {
    setStatusBusyId(faq.id);
    const previous = faqs;
    setFaqs((rows) =>
      rows.map((row) => (row.id === faq.id ? { ...row, isActive: next } : row)),
    );
    try {
      await faqsService.update(faq.id, { isActive: next });
    } catch (err) {
      setFaqs(previous);
      setError(faqApiError(err, 'Failed to update FAQ visibility.'));
    } finally {
      setStatusBusyId('');
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await faqsService.remove(toDelete.id);
      setToDelete(null);
      await fetchFaqs();
    } catch (err) {
      setError(faqApiError(err, 'Failed to delete FAQ.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PermissionGuard
      permission="faqs:read"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view FAQs.
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl pb-16">
        <Breadcrumb items={[{ label: 'FAQs' }]} />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">FAQs</h1>
            <p className="mt-1 text-gray-500">
              Questions shown in the app drawer. Drag the sort handle to change the order users see.
            </p>
          </div>
          {canCreate && (
            <Button onClick={openCreate} className="bg-primary text-white hover:bg-primary/90">
              <Plus className="mr-1.5 h-4 w-4" />
              Add FAQ
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/80">
                <tr>
                  <th className="px-5 py-3 font-semibold text-gray-700">Question</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Answer</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Sort</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Status</th>
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
              ) : faqs.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                      <CircleHelp className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                      No FAQs yet. Add the first question for the app.
                    </td>
                  </tr>
                </tbody>
              ) : (
                <SortableTableBody
                  items={faqs}
                  disabled={!canUpdate}
                  onReorder={handleReorder}
                  renderRow={(faq, { dragHandle }) => (
                    <>
                      <td className="max-w-[280px] px-5 py-4">
                        <p className="font-medium text-gray-900">{faq.question}</p>
                      </td>
                      <td className="max-w-[360px] px-5 py-4">
                        <p className="line-clamp-2 text-xs text-gray-500">{faq.answer}</p>
                      </td>
                      <td className="px-5 py-4">{dragHandle}</td>
                      <td className="px-5 py-4">
                        {canUpdate ? (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={faq.isActive}
                              disabled={statusBusyId === faq.id}
                              onCheckedChange={(checked) =>
                                handleToggleActive(faq, Boolean(checked))
                              }
                            />
                            <span className="text-xs text-gray-500">
                              {faq.isActive ? 'Visible' : 'Hidden'}
                            </span>
                          </div>
                        ) : faq.isActive ? (
                          <Badge className="bg-green-100 text-green-700">Visible</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                            Hidden
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canUpdate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(faq)}
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4 text-gray-500" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setToDelete(faq)}
                              className="text-red-500 hover:bg-red-50 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                />
              )}
            </table>
          </div>
        </div>
      </div>

      <FaqFormDialog
        open={formOpen}
        faq={editing}
        submitting={saving}
        error={formError}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditing(null);
            setFormError('');
          }
        }}
        onSubmit={handleSave}
      />

      <Dialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete FAQ
            </DialogTitle>
            <DialogDescription>
              “{toDelete?.question}” will disappear from the app. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setToDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
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
