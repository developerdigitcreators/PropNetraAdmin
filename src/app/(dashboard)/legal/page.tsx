'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/use-auth-store';
import { formatDisplayDateTime } from '@/lib/format-date';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { AdminDataTable } from '@/components/common/admin-data-table';
import { AdminListToolbar } from '@/components/common/admin-list-toolbar';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  legalApiError,
  legalPagesService,
  type LegalPage,
} from '@/services/legal-pages.service';
import { Edit2 } from 'lucide-react';

const LABELS: Record<LegalPage['slug'], string> = {
  terms: 'Terms & Conditions',
  privacy: 'Privacy Policy',
};

export default function LegalPagesPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canUpdate = hasPermission('legal_pages', 'update');
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPages(await legalPagesService.list());
    } catch (err) {
      setPages([]);
      setError(legalApiError(err, 'Failed to load legal pages.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPages();
  }, [fetchPages]);

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
        <Breadcrumb items={[{ label: 'Terms & Privacy' }]} />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Terms & Privacy</h1>
            <p className="mt-1 text-gray-500">
              Page title, publish state, and ordered sections for the app legal screens.
            </p>
          </div>
          <AdminListToolbar onRefresh={() => void fetchPages()} refreshDisabled={loading} />
        </div>

        <AdminDataTable
          page={1}
          limit={Math.max(pages.length, 1)}
          total={pages.length}
          totalPages={1}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
          loading={loading}
          error={error}
          isEmpty={!pages.length}
          emptyMessage="No legal pages returned."
          syncKey={pages.length}
          hidePaginationWhenEmpty
        >
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/80">
              <tr>
                <th className="px-5 py-3 font-semibold text-gray-700">Page</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Title</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Sections</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Status</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Updated</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.slug} className="border-b border-gray-50">
                  <td className="px-5 py-4 font-medium text-gray-900">{LABELS[page.slug]}</td>
                  <td className="px-5 py-4 text-gray-700">{page.title || '—'}</td>
                  <td className="px-5 py-4 text-gray-600">
                    {page.sectionCount != null ? page.sectionCount : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <Badge
                      className={
                        page.isPublished
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }
                    >
                      {page.isPublished ? 'Published' : 'Unpublished'}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{formatDisplayDateTime(page.updatedAt)}</td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/legal/${page.slug}`}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      <Edit2 className="mr-1.5 h-4 w-4" />
                      {canUpdate ? 'Manage sections' : 'View sections'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminDataTable>
      </div>
    </PermissionGuard>
  );
}
