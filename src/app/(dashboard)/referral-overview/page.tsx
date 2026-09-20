'use client';

import { useCallback, useEffect, useState, Fragment, Suspense } from 'react';
import Link from 'next/link';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { AdminDataTable } from '@/components/common/admin-data-table';
import { AdminListToolbar } from '@/components/common/admin-list-toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  referralApiError,
  referralService,
  type ReferralOverview,
  type ReferralOverviewUserRow,
  type ReferralUserSummary,
} from '@/services/referral.service';
import { formatDisplayDateTime } from '@/lib/format-date';
import { useClientPagedRows } from '@/hooks/use-client-paged-rows';
import { useUrlFilters } from '@/hooks/use-url-filters';
import {
  InviteRewardCell,
  InviteTimingCell,
} from '@/modules/referral/invite-display';
import { TableHScroll } from '@/components/ui/table-h-scroll';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

function userLabel(user: ReferralUserSummary) {
  return user.name?.trim() || user.contact?.trim() || user.email?.trim() || 'Unknown user';
}

function planShort(code?: string | null) {
  if (!code) return '—';
  const map: Record<string, string> = {
    FREE_TRIAL: 'Free',
    FREE_LIFETIME: 'Free',
    NETWORK_PAID: 'Network paid',
    PRO: 'Pro',
    ELITE: 'Elite',
  };
  return map[code] || code.replace(/_/g, ' ');
}

function planBadgeClass(code?: string | null) {
  switch (code) {
    case 'ELITE':
      return 'bg-blue-100 text-blue-800';
    case 'PRO':
      return 'bg-violet-100 text-violet-800';
    case 'NETWORK_PAID':
      return 'bg-teal-100 text-teal-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function PlanBadge({ planCode }: { planCode?: string | null }) {
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${planBadgeClass(planCode)}`}
    >
      {planShort(planCode)}
    </span>
  );
}

export default function ReferralOverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <ReferralOverviewPageInner />
    </Suspense>
  );
}

function ReferralOverviewPageInner() {
  const [overview, setOverview] = useState<ReferralOverview | null>(null);
  const [rows, setRows] = useState<ReferralOverviewUserRow[]>([]);
  const { filters, setFilters, resetFilters } = useUrlFilters({ q: '' });
  const q = filters.q;
  const [qDraft, setQDraft] = useState(q);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listRes, ov] = await Promise.all([
        referralService.listOverviewUsers({ q: q || undefined, page: 1, limit: 50 }),
        referralService.overview(50).catch(() => null),
      ]);
      setRows(listRes.items || []);
      setOverview(ov);
    } catch (err) {
      setError(referralApiError(err, 'Failed to load referral overview.'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q]);

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
  } = useClientPagedRows(rows);

  useEffect(() => {
    resetPage();
  }, [q, resetPage]);

  return (
    <PermissionGuard permission="subscriptions:read">
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Breadcrumb
              items={[
                { label: 'Dashboard', href: '/' },
                { label: 'Refer & Earn Overview' },
              ]}
            />
            <h1 className="mt-2 text-2xl font-semibold text-gray-900">
              Refer & Earn Overview
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Users who referred at least one onboarded invitee, rewards given,
              and whether each referrer joined with or without a referral.{' '}
              <Link
                href="/referral-benefits"
                className="font-medium text-primary hover:underline"
              >
                Edit benefit tiers
              </Link>
            </p>
          </div>
          <AdminListToolbar
            onRefresh={() => void load()}
            refreshBusy={loading}
            onReset={() => {
              setQDraft('');
              resetFilters();
              resetPage();
            }}
          />
        </div>

        {overview ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total referrals', value: overview.stats.totalInView },
              {
                label: 'Rewards given',
                value: overview.stats.rewardedCount,
                className: 'text-emerald-700',
              },
              {
                label: 'Waiting for plan',
                value: overview.stats.pendingSubscriptions,
                className: 'text-amber-700',
              },
              {
                label: 'Active referrers',
                value: overview.topReferrers?.length || 0,
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {card.label}
                </p>
                <p
                  className={`mt-1 text-2xl font-semibold ${card.className || 'text-gray-900'}`}
                >
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1">
            <Input
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder="Search name, phone, email, code…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') setFilters({ q: qDraft.trim() });
              }}
            />
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => setFilters({ q: qDraft.trim() })}>
            Search
          </Button>
        </div>

        <AdminDataTable
          page={page}
          limit={limit}
          total={total}
          totalPages={totalPages}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          loading={loading}
          error={error || null}
          isEmpty={!rows.length}
          emptyMessage="No users match this search."
          syncKey={pageRows.length}
        >
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="w-10 px-3 py-3" />
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Invited</th>
                <th className="px-4 py-3 font-medium">Plan start</th>
                <th className="px-4 py-3 font-medium">Joined via</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const id = row.user.id;
                const canExpand = row.kind === 'referrer' && row.items.length > 0;
                const open = !!expanded[id];
                const joinedVia =
                  row.user.joinedViaReferral === true ||
                  (row.user.withoutReferral === false && !!row.user.referIdUsed)
                    ? 'With referral'
                    : 'Without referral';
                return (
                  <Fragment key={`${row.kind}-${id}`}>
                    <tr className="border-b border-gray-50">
                      <td className="px-3 py-3">
                        {canExpand ? (
                          <button
                            type="button"
                            className="rounded p-1 text-gray-500 hover:bg-gray-100"
                            onClick={() =>
                              setExpanded((prev) => ({
                                ...prev,
                                [id]: !prev[id],
                              }))
                            }
                          >
                            {open ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </button>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {userLabel(row.user)}
                      </td>
                      <td className="px-4 py-3">
                        <PlanBadge planCode={row.user.planCode} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {row.user.referralCode || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.invitedCount}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDisplayDateTime(
                          row.user.planStartedAt || row.user.createdAt || null,
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            joinedVia === 'Without referral'
                              ? 'bg-orange-50 text-orange-800'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {joinedVia}
                        </span>
                      </td>
                    </tr>
                    {open && canExpand ? (
                      <tr className="border-b border-gray-50 bg-gray-50/70">
                        <td colSpan={7} className="px-6 py-4">
                          <TableHScroll syncKey={row.items.length} stickyScrollbar>
                            <table className="min-w-full text-left text-xs">
                              <thead className="text-gray-500">
                                <tr>
                                  <th className="py-2 pr-3 font-medium">Invited user</th>
                                  <th className="py-2 pr-3 font-medium">
                                    Invitee plan at benefit
                                  </th>
                                  <th className="py-2 pr-3 font-medium">
                                    Referrer plan at benefit
                                  </th>
                                  <th className="py-2 pr-3 font-medium">Reward</th>
                                  <th className="py-2 font-medium">Timing</th>
                                </tr>
                              </thead>
                              <tbody>
                                {row.items.map((item) => (
                                  <tr key={item.id} className="border-t border-gray-100/80">
                                    <td className="py-3 pr-3 font-medium text-gray-900">
                                      {userLabel(item.referee)}
                                    </td>
                                    <td className="py-3 pr-3">
                                      <PlanBadge planCode={item.inviteePlanAtBenefit} />
                                    </td>
                                    <td className="py-3 pr-3">
                                      <PlanBadge planCode={item.referrerPlanAtBenefit} />
                                    </td>
                                    <td className="py-3 pr-3">
                                      <InviteRewardCell item={item} />
                                    </td>
                                    <td className="py-3 text-xs">
                                      <InviteTimingCell item={item} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </TableHScroll>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </AdminDataTable>
      </div>
    </PermissionGuard>
  );
}
