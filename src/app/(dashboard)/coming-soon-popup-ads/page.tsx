'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  bannerAdsService,
  COMING_SOON_POPUP_PLACEMENT,
  DEFAULT_AUTOSLIDE,
  flattenBannerList,
  formatBannerLinkLabel,
  isBannerActive,
  normalizeAutoslideValue,
  type AdBanner,
} from '@/services/banner-ads.service';
import { PermissionGuard } from '@/components/common/permission-guard';
import { useAuthStore } from '@/store/use-auth-store';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { AdminDataTable } from '@/components/common/admin-data-table';
import { AutoslideTimePicker } from '@/components/common/autoslide-time-picker';
import { SortableTableBody } from '@/components/common/sortable-list';
import { DeleteRemarkDialog } from '@/components/common/delete-remark-dialog';
import { useClientPagedRows } from '@/hooks/use-client-paged-rows';
import { Image as ImageIcon, Loader2, Plus, Edit2, Trash2, Video } from 'lucide-react';

function autoslideSeconds(value: string) {
  const [hh = 0, mm = 0, ss = 0] = value.split(':').map((part) => Number(part) || 0);
  return hh * 3600 + mm * 60 + ss;
}

function ComingSoonPopupAdsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stateId = searchParams.get('stateId') || '';
  const cityId = searchParams.get('cityId') || '';
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('ads', 'create');
  const canUpdate = hasPermission('ads', 'update');
  const canDelete = hasPermission('ads', 'delete');

  const [banners, setBanners] = useState<AdBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoslide, setAutoslide] = useState(DEFAULT_AUTOSLIDE);
  const [savingTimer, setSavingTimer] = useState(false);
  const [toDelete, setToDelete] = useState<AdBanner | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!stateId || !cityId) return;
    setLoading(true);
    setError('');
    try {
      const data = await bannerAdsService.getBanners({
        stateId,
        cityId,
        placement: COMING_SOON_POPUP_PLACEMENT,
      });
      const rows = flattenBannerList(data)
        .filter((row) => !row.section || row.section === 'general')
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setBanners(rows);
      const saved =
        data.autoslideBySection?.general?.autoslide || data.autoslide || DEFAULT_AUTOSLIDE;
      setAutoslide(normalizeAutoslideValue(saved, DEFAULT_AUTOSLIDE));
    } catch {
      setBanners([]);
      setError('Failed to load Coming Soon popup ads.');
    } finally {
      setLoading(false);
    }
  }, [stateId, cityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const {
    page,
    limit,
    total,
    totalPages,
    pageRows,
    onPageChange,
    onPageSizeChange,
    resetPage,
  } = useClientPagedRows(banners);

  useEffect(() => {
    resetPage();
  }, [banners, resetPage]);

  const saveTimer = async (nextRaw: string) => {
    const next = normalizeAutoslideValue(nextRaw, DEFAULT_AUTOSLIDE);
    if (!canUpdate || next === autoslide) return;
    if (autoslideSeconds(next) < 1) {
      setError('Auto-scroll must be at least 00:00:01.');
      return;
    }
    const prev = autoslide;
    setAutoslide(next);
    setSavingTimer(true);
    setError('');
    try {
      await bannerAdsService.updateSettings({
        stateId,
        cityId,
        placement: COMING_SOON_POPUP_PLACEMENT,
        section: 'general',
        autoslide: next,
      });
    } catch {
      setAutoslide(prev);
      setError('Failed to update auto-scroll.');
    } finally {
      setSavingTimer(false);
    }
  };

  const handleReorder = async (ordered: Array<AdBanner & { sortOrder: number }>) => {
    const start = (page - 1) * limit;
    const merged = [...banners];
    merged.splice(start, ordered.length, ...ordered);
    const next = merged.map((item, index) => ({ ...item, sortOrder: index + 1 }));
    const previous = banners;
    setBanners(next);
    try {
      await bannerAdsService.reorderBanners(next.map((row) => row.id));
    } catch {
      setBanners(previous);
      setError('Failed to reorder ads.');
    }
  };

  const handleDelete = async (remark: string) => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await bannerAdsService.deleteBanner(toDelete.id, remark);
      setToDelete(null);
      await load();
    } catch {
      setError('Failed to delete ad.');
    } finally {
      setDeleting(false);
    }
  };

  if (!stateId || !cityId) {
    return (
      <div className="p-12 text-center text-gray-500">
        Select a state and city on Developer Home first.{' '}
        <Link href="/developer-home-sections" className="text-primary underline">
          Back
        </Link>
      </div>
    );
  }

  const formQuery = `stateId=${encodeURIComponent(stateId)}&cityId=${encodeURIComponent(cityId)}`;

  return (
    <PermissionGuard
      permission="ads:read"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view ads.
        </div>
      }
    >
      <div className="max-w-7xl space-y-6 pb-16">
        <Breadcrumb
          items={[
            {
              label: 'Developer Home',
              href: `/developer-home-sections?stateId=${encodeURIComponent(stateId)}&cityId=${encodeURIComponent(cityId)}`,
            },
            { label: 'Coming Soon popup ads' },
          ]}
        />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Coming Soon popup ads</h1>
            <p className="mt-1 text-gray-500">One carousel for this city. Section is saved as general.</p>
          </div>
          {canCreate ? (
            <Link
              href={`/coming-soon-popup-ads/new?${formQuery}`}
              className={buttonVariants({ size: 'sm' })}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add
            </Link>
          ) : null}
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-900">Auto-scroll</p>
            <p className="text-xs text-gray-500">How long each ad stays. Minimum 00:00:01. Default 00:00:05.</p>
          </div>
          <AutoslideTimePicker value={autoslide} onChange={(next) => void saveTimer(next)} disabled={!canUpdate || savingTimer} />
          {savingTimer ? <Loader2 className="mb-2 h-4 w-4 animate-spin text-primary" /> : null}
        </div>

        {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

        <AdminDataTable
          page={page}
          limit={limit}
          total={total}
          totalPages={totalPages}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          loading={loading}
          isEmpty={!banners.length}
          emptyMessage="No Coming Soon popup ads yet."
          syncKey={pageRows.length}
        >
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/80">
              <tr>
                <th className="px-5 py-3 font-semibold text-gray-700">Preview</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Media</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Link</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Order</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Status</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <SortableTableBody
              items={pageRows}
              disabled={!canUpdate}
              onReorder={handleReorder}
              renderRow={(banner, { dragHandle }) => (
                <>
                  <td className="px-5 py-4">
                    <div className="flex h-14 w-28 items-center justify-center overflow-hidden rounded-md border bg-gray-100">
                      {banner.mediaType === 'image' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={banner.mediaUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Video className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 capitalize text-gray-700">
                    <span className="inline-flex items-center gap-1.5">
                      {banner.mediaType === 'image' ? (
                        <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
                      ) : (
                        <Video className="h-3.5 w-3.5 text-purple-500" />
                      )}
                      {banner.mediaType}
                    </span>
                  </td>
                  <td className="max-w-[220px] px-5 py-4 text-xs text-gray-600">
                    {formatBannerLinkLabel(banner)}
                  </td>
                  <td className="px-5 py-4">{dragHandle}</td>
                  <td className="px-5 py-4">
                    {isBannerActive(banner) ? (
                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-700">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      {canUpdate ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/coming-soon-popup-ads/${banner.id}/edit?${formQuery}`)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setToDelete(banner)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </>
              )}
            />
          </table>
        </AdminDataTable>
      </div>

      <DeleteRemarkDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete popup ad"
        submitting={deleting}
        onConfirm={handleDelete}
      />
    </PermissionGuard>
  );
}

export default function ComingSoonPopupAdsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <ComingSoonPopupAdsContent />
    </Suspense>
  );
}
