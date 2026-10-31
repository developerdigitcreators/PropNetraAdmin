'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { formatDisplayDateTime } from '@/lib/format-date';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { AdminDataTable } from '@/components/common/admin-data-table';
import { AdminListToolbar } from '@/components/common/admin-list-toolbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SortableTableBody } from '@/components/common/sortable-list';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LegalSectionFormDialog } from '@/modules/legal/legal-section-form-dialog';
import {
  htmlToPlainPreview,
  legalApiError,
  legalPagesService,
  type LegalSlug,
} from '@/services/legal-pages.service';
import {
  legalSectionsService,
  type LegalSection,
} from '@/services/legal-sections.service';
import { Edit2, Loader2, Plus, Trash2 } from 'lucide-react';

const LABELS: Record<LegalSlug, string> = {
  terms: 'Terms & Conditions',
  privacy: 'Privacy Policy',
};

function isSlug(value: string): value is LegalSlug {
  return value === 'terms' || value === 'privacy';
}

export default function LegalSectionsPage() {
  const params = useParams<{ slug: string }>();
  const slugParam = String(params.slug || '');

  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('legal_pages', 'create');
  const canUpdate = hasPermission('legal_pages', 'update');
  const canDelete = hasPermission('legal_pages', 'delete');

  const [pageTitle, setPageTitle] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [pageUpdatedAt, setPageUpdatedAt] = useState<string | null>(null);
  const [sections, setSections] = useState<LegalSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pageSaving, setPageSaving] = useState(false);
  const [pageNotice, setPageNotice] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LegalSection | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toDelete, setToDelete] = useState<LegalSection | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState('');

  const fetchAll = useCallback(async () => {
    if (!isSlug(slugParam)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [page, rows] = await Promise.all([
        legalPagesService.get(slugParam),
        legalSectionsService.list(slugParam),
      ]);
      setPageTitle(page.title);
      setIsPublished(page.isPublished);
      setPageUpdatedAt(page.updatedAt);
      setSections(rows);
    } catch (err) {
      setSections([]);
      setError(legalApiError(err, 'Failed to load legal page.'));
    } finally {
      setLoading(false);
    }
  }, [slugParam]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const savePageMeta = async () => {
    if (!isSlug(slugParam) || !canUpdate || pageSaving) return;
    setPageSaving(true);
    setPageNotice('');
    setError('');
    try {
      const next = await legalPagesService.update(slugParam, {
        title: pageTitle.trim() || LABELS[slugParam],
        isPublished,
      });
      setPageTitle(next.title);
      setIsPublished(next.isPublished);
      setPageUpdatedAt(next.updatedAt);
      setPageNotice('Page settings saved.');
    } catch (err) {
      setError(legalApiError(err, 'Failed to save page settings.'));
    } finally {
      setPageSaving(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (section: LegalSection) => {
    setEditing(section);
    setFormError('');
    setFormOpen(true);
  };

  const handleSaveSection = async (payload: {
    title: string;
    bodyHtml: string;
    isActive: boolean;
  }) => {
    if (!isSlug(slugParam)) return;
    setSaving(true);
    setFormError('');
    try {
      if (editing?.id) {
        await legalSectionsService.update(slugParam, editing.id, payload);
      } else {
        await legalSectionsService.create(slugParam, payload);
      }
      setFormOpen(false);
      setEditing(null);
      await fetchAll();
    } catch (err) {
      setFormError(legalApiError(err, 'Failed to save section.'));
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (ordered: Array<LegalSection & { sortOrder: number }>) => {
    if (!isSlug(slugParam)) return;
    const previous = sections;
    setSections(ordered);
    try {
      await legalSectionsService.reorder(
        slugParam,
        ordered.map((item) => item.id),
      );
    } catch (err) {
      setSections(previous);
      setError(legalApiError(err, 'Failed to reorder sections.'));
    }
  };

  const handleToggleActive = async (section: LegalSection, next: boolean) => {
    if (!isSlug(slugParam)) return;
    setStatusBusyId(section.id);
    const previous = sections;
    setSections((rows) =>
      rows.map((row) => (row.id === section.id ? { ...row, isActive: next } : row)),
    );
    try {
      await legalSectionsService.update(slugParam, section.id, { isActive: next });
    } catch (err) {
      setSections(previous);
      setError(legalApiError(err, 'Failed to update section visibility.'));
    } finally {
      setStatusBusyId('');
    }
  };

  const handleDeleteSection = async () => {
    if (!isSlug(slugParam) || !toDelete) return;
    setDeleting(true);
    try {
      await legalSectionsService.remove(slugParam, toDelete.id);
      setToDelete(null);
      await fetchAll();
    } catch (err) {
      setError(legalApiError(err, 'Failed to delete section.'));
    } finally {
      setDeleting(false);
    }
  };

  if (!isSlug(slugParam)) {
    return (
      <div className="p-12 text-center text-gray-500">
        Unknown legal page.{' '}
        <Link href="/legal" className="text-primary underline">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <PermissionGuard
      permission="legal_pages:read"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view legal pages.
        </div>
      }
    >
      <div className="max-w-7xl space-y-6 pb-16">
        <Breadcrumb
          items={[
            { label: 'Terms & Privacy', href: '/legal' },
            { label: LABELS[slugParam] },
          ]}
        />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {LABELS[slugParam]}
            </h1>
            <p className="mt-1 text-gray-500">
              Manage sections shown in the app. Updated {formatDisplayDateTime(pageUpdatedAt)}.
              Unpublished pages return 404 in the app.
            </p>
          </div>
          <AdminListToolbar onRefresh={() => void fetchAll()} refreshDisabled={loading}>
            {canCreate ? (
              <Button onClick={openCreate} className="bg-primary text-white hover:bg-primary/90">
                <Plus className="mr-1.5 h-4 w-4" />
                Add section
              </Button>
            ) : null}
          </AdminListToolbar>
        </div>

        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          {pageNotice ? (
            <p className="rounded-lg bg-green-50 p-2 text-sm text-green-700">{pageNotice}</p>
          ) : null}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <label className="block min-w-0 flex-1 space-y-1.5">
              <span className="text-sm font-medium text-gray-900">Page title</span>
              <Input
                value={pageTitle}
                disabled={!canUpdate}
                onChange={(e) => setPageTitle(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={isPublished}
                  disabled={!canUpdate}
                  onCheckedChange={(checked) => setIsPublished(Boolean(checked))}
                />
                <span className="text-sm text-gray-700">
                  Published
                  {!isPublished ? (
                    <Badge variant="secondary" className="ml-2 bg-gray-100 text-gray-600">
                      App 404
                    </Badge>
                  ) : null}
                </span>
              </div>
              {canUpdate ? (
                <Button
                  variant="outline"
                  onClick={() => void savePageMeta()}
                  disabled={pageSaving || loading}
                >
                  {pageSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                  Save page
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        ) : null}

        <AdminDataTable
          page={1}
          limit={Math.max(sections.length, 1)}
          total={sections.length}
          totalPages={1}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
          loading={loading}
          isEmpty={!sections.length}
          emptyMessage="No sections yet. Add the first section for this page."
          syncKey={sections.length}
          hidePaginationWhenEmpty
        >
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/80">
              <tr>
                <th className="px-5 py-3 font-semibold text-gray-700">Title</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Description</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Sort</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Visible</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <SortableTableBody
              items={sections}
              disabled={!canUpdate}
              onReorder={handleReorder}
              renderRow={(section, { dragHandle }) => (
                <>
                  <td className="max-w-[240px] px-5 py-4">
                    <p className="font-medium text-gray-900">{section.title}</p>
                  </td>
                  <td className="max-w-[360px] px-5 py-4">
                    <p className="line-clamp-2 text-xs text-gray-500">
                      {htmlToPlainPreview(section.bodyHtml)}
                    </p>
                  </td>
                  <td className="px-5 py-4">{dragHandle}</td>
                  <td className="px-5 py-4">
                    {canUpdate ? (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={section.isActive}
                          disabled={statusBusyId === section.id}
                          onCheckedChange={(checked) =>
                            handleToggleActive(section, Boolean(checked))
                          }
                        />
                        <span className="text-xs text-gray-500">
                          {section.isActive ? 'Visible' : 'Hidden'}
                        </span>
                      </div>
                    ) : section.isActive ? (
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
                          onClick={() => openEdit(section)}
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4 text-gray-500" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setToDelete(section)}
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
          </table>
        </AdminDataTable>
      </div>

      <LegalSectionFormDialog
        open={formOpen}
        section={editing}
        submitting={saving}
        error={formError}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditing(null);
            setFormError('');
          }
        }}
        onSubmit={handleSaveSection}
      />

      <Dialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete section</DialogTitle>
            <DialogDescription>
              Remove “{toDelete?.title}”? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setToDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteSection()}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGuard>
  );
}
