'use client';

import { useCallback, useEffect, useState } from 'react';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { AdminDataTable } from '@/components/common/admin-data-table';
import { MaskedContact } from '@/components/contact/masked-contact';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  developerPostingsAnalyticsService,
  type DeveloperPostingDetail,
  type DeveloperPostingRow,
  type DeveloperPostingsQuery,
  type PostingPerson,
} from '@/services/developer-postings-analytics.service';
import { subscriptionApiError } from '@/services/subscriptions.service';
import { BarChart3, Loader2, RefreshCw, X } from 'lucide-react';

const SORTS: Array<{ value: NonNullable<DeveloperPostingsQuery['sort']>; label: string }> = [
  { value: 'recent', label: 'Newest' },
  { value: 'views', label: 'Most views' },
  { value: 'shares', label: 'Most shares' },
  { value: 'brochures', label: 'Most brochure downloads' },
  { value: 'contacts', label: 'Most contacts' },
];

function fmtDate(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function PeopleTable({
  rows,
  empty,
  extra,
  revealPrefix,
}: {
  rows: PostingPerson[];
  revealPrefix: string;
  empty: string;
  extra?: { label: string; value: (r: PostingPerson) => string | null | undefined };
}) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-gray-500">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b text-xs uppercase text-gray-500">
          <tr>
            <th className="py-2 pr-3 font-medium">User</th>
            <th className="py-2 pr-3 font-medium">Contact</th>
            {extra ? <th className="py-2 pr-3 font-medium">{extra.label}</th> : null}
            <th className="py-2 font-medium">When</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="py-2 pr-3 font-medium text-gray-900">{r.name || '—'}</td>
              <td className="py-2 pr-3 text-gray-600">
                <MaskedContact value={r.contact} revealKey={`${revealPrefix}:${r.id}`} />
              </td>
              {extra ? <td className="py-2 pr-3 text-gray-600">{extra.value(r) || '—'}</td> : null}
              <td className="py-2 text-gray-600">{fmtDate(r.at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailDrawer({ listingId, onClose }: { listingId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<DeveloperPostingDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setDetail(null);
    setError('');
    developerPostingsAnalyticsService
      .detail(listingId)
      .then((d) => alive && setDetail(d))
      .catch((err) => alive && setError(subscriptionApiError(err, 'Failed to load posting.')));
    return () => {
      alive = false;
    };
  }, [listingId]);

  const p = detail?.posting;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-gray-900">{p?.title || 'Posting'}</h2>
            {p ? (
              <p className="mt-1 text-sm text-gray-500">
                {[p.location, p.micromarket, p.city].filter(Boolean).join(', ') || '—'}
              </p>
            ) : null}
          </div>
          <Button variant="outline" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {!detail && !error ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : null}

        {detail && p ? (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border bg-gray-50 p-4 text-sm sm:grid-cols-3">
              <Info label="Developer" value={p.developer.name} />
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Developer contact</p>
                <p className="font-medium text-gray-900">
                  <MaskedContact value={p.developer.contact} revealKey={`dev-postings:${listingId}:developer`} />
                </p>
              </div>
              <Info label="Status" value={p.status} />
              <Info label="Price" value={p.price} />
              <Info label="Building type" value={p.buildingType} />
              <Info label="Property type" value={p.propertyType} />
              <Info label="Posted" value={fmtDate(p.createdAt)} />
              <Info label="Expires" value={fmtDate(p.expiresAt)} />
            </div>

            <Tabs defaultValue="shares" className="mt-6">
              <TabsList>
                <TabsTrigger value="shares">Shares ({detail.totals.shares})</TabsTrigger>
                <TabsTrigger value="views">Views ({detail.totals.views})</TabsTrigger>
                <TabsTrigger value="brochure">Brochure ({detail.totals.brochures})</TabsTrigger>
                <TabsTrigger value="contacts">Contacts ({detail.totals.contacts})</TabsTrigger>
              </TabsList>
              <TabsContent value="shares" className="mt-3">
                <PeopleTable
                  rows={detail.shares}
                  revealPrefix={`dev-postings:${listingId}:shares`}
                  empty="No shares yet."
                  extra={{ label: 'Channel', value: (r) => r.channel }}
                />
              </TabsContent>
              <TabsContent value="views" className="mt-3">
                <PeopleTable
                  rows={detail.views}
                  revealPrefix={`dev-postings:${listingId}:views`}
                  empty="No views yet."
                  extra={{ label: 'First viewed', value: (r) => fmtDate(r.firstViewedAt) }}
                />
              </TabsContent>
              <TabsContent value="brochure" className="mt-3">
                <PeopleTable
                  rows={detail.brochures}
                  revealPrefix={`dev-postings:${listingId}:brochures`}
                  empty="No brochure downloads yet."
                  extra={{ label: 'Day', value: (r) => r.day }}
                />
              </TabsContent>
              <TabsContent value="contacts" className="mt-3">
                <PeopleTable
                  rows={detail.contacts}
                  revealPrefix={`dev-postings:${listingId}:contacts`}
                  empty="No contacts yet."
                  extra={{
                    label: 'Source',
                    value: (r) =>
                      [r.source?.replace(/_/g, ' '), r.teamMemberName ? `(${r.teamMemberName})` : null]
                        .filter(Boolean)
                        .join(' '),
                  }}
                />
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="truncate font-medium capitalize text-gray-900">{value || '—'}</p>
    </div>
  );
}

export default function DeveloperPostingsAnalyticsPage() {
  const [rows, setRows] = useState<DeveloperPostingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<NonNullable<DeveloperPostingsQuery['sort']>>('recent');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await developerPostingsAnalyticsService.list({
        search: search || undefined,
        sort,
        page,
        limit: pageSize,
      });
      setRows(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(subscriptionApiError(err, 'Failed to load developer postings.'));
    } finally {
      setLoading(false);
    }
  }, [search, sort, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(searchDraft.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [searchDraft]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PermissionGuard permission="developer_postings_analytics:read">
      <div className="space-y-6">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/' }, { label: 'Developer Postings Analytics' }]} />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
              <BarChart3 className="h-6 w-6 text-primary" />
              Developer Postings Analytics
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Views, shares, brochure downloads and contacts for every developer project.
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search project, developer or location"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            className="max-w-sm"
          />
          <select
            className="h-9 rounded-md border bg-white px-3 text-sm"
            value={sort}
            onChange={(e) => {
              setPage(1);
              setSort(e.target.value as NonNullable<DeveloperPostingsQuery['sort']>);
            }}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

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
          isEmpty={!rows.length}
          emptyMessage="No developer postings found."
          syncKey={rows.length}
        >
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/80">
              <tr>
                <th className="px-5 py-3 font-semibold text-gray-700">Project</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Developer</th>
                <th className="px-5 py-3 font-semibold text-gray-700">City</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Status</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-700">Views</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-700">Shares</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-700">Brochure</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-700">Contacts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50"
                  onClick={() => setOpenId(r.id)}
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-900">{r.title}</p>
                    <p className="text-xs text-gray-500">{r.location || '—'}</p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-gray-700">{r.developer?.name || '—'}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-gray-700">{r.city || '—'}</td>
                  <td className="whitespace-nowrap px-5 py-4 capitalize text-gray-700">{r.status}</td>
                  <td className="px-5 py-4 text-right font-medium">{r.views}</td>
                  <td className="px-5 py-4 text-right font-medium">{r.shares}</td>
                  <td className="px-5 py-4 text-right font-medium">{r.brochures}</td>
                  <td className="px-5 py-4 text-right font-medium">{r.contacts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminDataTable>

        {openId ? <DetailDrawer listingId={openId} onClose={() => setOpenId(null)} /> : null}
      </div>
    </PermissionGuard>
  );
}
