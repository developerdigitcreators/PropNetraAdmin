'use client';

import { useCallback, useEffect, useState, Fragment } from 'react';
import Link from 'next/link';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  referralApiError,
  referralService,
  type ReferralInviteItem,
  type ReferralOverview,
  type ReferralOverviewUserRow,
  type ReferralUserSummary,
} from '@/services/referral.service';
import { formatDisplayDateTime } from '@/lib/format-date';
import { ChevronDown, ChevronRight, Loader2, RefreshCw } from 'lucide-react';

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

function rewardText(item: {
  coinsCredited: number;
  monthsGranted: number;
  status: string;
}) {
  if (item.coinsCredited > 0) return `+${item.coinsCredited} NetraCoins`;
  if (item.monthsGranted > 0)
    return `+${item.monthsGranted} month${item.monthsGranted === 1 ? '' : 's'}`;
  if (item.status === 'pending_subscription') return 'After plan purchase';
  if (item.status === 'pending_expired') return 'Window ended';
  return '—';
}

function InviteTiming({ item }: { item: ReferralInviteItem }) {
  const lines: string[] = [];
  if (item.createdAt) {
    lines.push(`Onboarded ${formatDisplayDateTime(item.createdAt)}`);
  }
  if (item.status === 'pending_subscription' && item.pendingExpiresAt) {
    lines.push(`Plan needed by ${formatDisplayDateTime(item.pendingExpiresAt)}`);
  } else if (item.status === 'pending_expired') {
    lines.push(
      item.pendingExpiresAt
        ? `Window ended ${formatDisplayDateTime(item.pendingExpiresAt)}`
        : 'Window ended — no benefit',
    );
  } else {
    if (item.planActivatedAt) {
      lines.push(`Plan started ${formatDisplayDateTime(item.planActivatedAt)}`);
    }
    if (item.rewardExpiresAt) {
      lines.push(`Reward expiry ${formatDisplayDateTime(item.rewardExpiresAt)}`);
    }
  }

  return (
    <div className="flex flex-col gap-1 text-gray-600">
      {lines.length ? lines.map((line) => <span key={line}>{line}</span>) : <span>—</span>}
    </div>
  );
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
  const [overview, setOverview] = useState<ReferralOverview | null>(null);
  const [rows, setRows] = useState<ReferralOverviewUserRow[]>([]);
  const [qDraft, setQDraft] = useState('');
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metaTotal, setMetaTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listRes, ov] = await Promise.all([
        referralService.listOverviewUsers({ q: q || undefined, page: 1, limit: 50 }),
        referralService.overview(50).catch(() => null),
      ]);
      setRows(listRes.items || []);
      setMetaTotal(listRes.meta?.total ?? listRes.items?.length ?? 0);
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className="mr-1.5 size-3.5" />
            Refresh
          </Button>
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
                if (e.key === 'Enter') setQ(qDraft.trim());
              }}
            />
          </div>
          <Button type="button" size="sm" onClick={() => setQ(qDraft.trim())}>
            Search
          </Button>
          <span className="self-center text-xs text-gray-500">
            {metaTotal} result{metaTotal === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        ) : !rows.length ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            No users match this search.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
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
                {rows.map((row) => {
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
                                    <td className="py-3 pr-3 text-gray-700">
                                      {rewardText(item)}
                                    </td>
                                    <td className="py-3">
                                      <InviteTiming item={item} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
