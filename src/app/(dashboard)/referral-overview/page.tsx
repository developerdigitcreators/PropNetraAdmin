'use client';

import { useCallback, useEffect, useState, Fragment } from 'react';
import Link from 'next/link';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  referralApiError,
  referralService,
  type ReferralByReferrerGroup,
  type ReferralOverview,
  type ReferralUserSummary,
} from '@/services/referral.service';
import { ChevronDown, ChevronRight, Loader2, RefreshCw } from 'lucide-react';

function userLabel(user: ReferralUserSummary) {
  return user.name?.trim() || user.contact?.trim() || user.email?.trim() || 'Unknown user';
}

function planShort(code?: string | null) {
  if (!code) return 'Free';
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

function statusLabel(status: string) {
  switch (status) {
    case 'rewarded_paid':
      return { label: 'Plan purchased', className: 'bg-emerald-50 text-emerald-800' };
    case 'rewarded_free':
      return { label: 'Signed up · Month given', className: 'bg-teal-50 text-teal-800' };
    case 'pending_subscription':
      return { label: 'Waiting for plan', className: 'bg-amber-50 text-amber-800' };
    case 'pending_expired':
      return { label: 'Expired', className: 'bg-gray-100 text-gray-600' };
    case 'signed_up':
      return { label: 'Signed up', className: 'bg-sky-50 text-sky-800' };
    case 'without_referral':
      return { label: 'Without referral', className: 'bg-orange-50 text-orange-800' };
    default:
      return { label: status.replace(/_/g, ' '), className: 'bg-gray-100 text-gray-600' };
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
  return '—';
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
  const [tab, setTab] = useState<'by-referrer' | 'without-referral'>('by-referrer');
  const [overview, setOverview] = useState<ReferralOverview | null>(null);
  const [groups, setGroups] = useState<ReferralByReferrerGroup[]>([]);
  const [organic, setOrganic] = useState<ReferralUserSummary[]>([]);
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
      if (tab === 'by-referrer') {
        const listRes = await referralService
          .listByReferrer({ q: q || undefined, page: 1, limit: 50 })
          .catch((err) => {
            setError(referralApiError(err, 'Failed to load referrers.'));
            return {
              items: [] as ReferralByReferrerGroup[],
              meta: { page: 1, limit: 50, total: 0, totalPages: 1 },
            };
          });
        setGroups(listRes.items || []);
        setMetaTotal(listRes.meta?.total ?? listRes.items?.length ?? 0);

        const ov = await referralService.overview(50).catch(() => null);
        setOverview(ov);
      } else {
        const list = await referralService.listWithoutReferral({
          q: q || undefined,
          page: 1,
          limit: 50,
        });
        setOrganic(list.items || []);
        setMetaTotal(list.meta?.total ?? list.items?.length ?? 0);
      }
    } catch (err) {
      setError(referralApiError(err, 'Failed to load referral overview.'));
      setGroups([]);
      setOrganic([]);
    } finally {
      setLoading(false);
    }
  }, [tab, q]);

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
              Who referred whom, rewards given, and users who joined without a
              referral.{' '}
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

        {overview && tab === 'by-referrer' ? (
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

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as 'by-referrer' | 'without-referral')}
        >
          <TabsList className="bg-gray-100">
            <TabsTrigger value="by-referrer">By referrer</TabsTrigger>
            <TabsTrigger value="without-referral">Without referral</TabsTrigger>
          </TabsList>

          <div className="mt-4 flex flex-wrap items-end gap-2">
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

          <TabsContent value="by-referrer" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : error ? (
              <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </p>
            ) : !groups.length ? (
              <p className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                No referrers match this search.
              </p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="w-10 px-3 py-3" />
                      <th className="px-4 py-3 font-medium">Referrer</th>
                      <th className="px-4 py-3 font-medium">Plan</th>
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Invited</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => {
                      const id = group.referrer.id;
                      const open = !!expanded[id];
                      return (
                        <Fragment key={id}>
                          <tr className="border-b border-gray-50">
                            <td className="px-3 py-3">
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
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {userLabel(group.referrer)}
                            </td>
                            <td className="px-4 py-3">
                              <PlanBadge planCode={group.referrer.planCode} />
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-600">
                              {group.referrer.referralCode || '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {group.invitedCount}
                            </td>
                          </tr>
                          {open ? (
                            <tr className="border-b border-gray-50 bg-gray-50/70">
                              <td colSpan={5} className="px-6 py-3">
                                <table className="min-w-full text-left text-xs">
                                  <thead className="text-gray-500">
                                    <tr>
                                      <th className="py-1 pr-3 font-medium">
                                        Invited user
                                      </th>
                                      <th className="py-1 pr-3 font-medium">
                                        Plan
                                      </th>
                                      <th className="py-1 pr-3 font-medium">
                                        Status
                                      </th>
                                      <th className="py-1 pr-3 font-medium">
                                        Reward
                                      </th>
                                      <th className="py-1 font-medium">Date</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.items.map((item) => {
                                      const st = statusLabel(item.status);
                                      return (
                                        <tr key={item.id}>
                                          <td className="py-1.5 pr-3 font-medium text-gray-900">
                                            {userLabel(item.referee)}
                                          </td>
                                          <td className="py-1.5 pr-3">
                                            <PlanBadge
                                              planCode={item.referee.planCode}
                                            />
                                          </td>
                                          <td className="py-1.5 pr-3">
                                            <span
                                              className={`rounded-full px-2 py-0.5 font-medium ${st.className}`}
                                            >
                                              {st.label}
                                            </span>
                                          </td>
                                          <td className="py-1.5 pr-3 text-gray-700">
                                            {rewardText(item)}
                                          </td>
                                          <td className="py-1.5 text-gray-600">
                                            {new Date(
                                              item.createdAt,
                                            ).toLocaleString()}
                                          </td>
                                        </tr>
                                      );
                                    })}
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
          </TabsContent>

          <TabsContent value="without-referral" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : error ? (
              <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </p>
            ) : !organic.length ? (
              <p className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                No without-referral users found.
              </p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Contact</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Plan</th>
                      <th className="px-4 py-3 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organic.map((row) => {
                      const st = statusLabel(row.status || 'without_referral');
                      return (
                        <tr
                          key={row.id}
                          className="border-b border-gray-50 last:border-0"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">
                              {userLabel(row)}
                            </p>
                            <span className="mt-1 inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-800">
                              Without referral
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {row.contact || row.email || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.className}`}
                            >
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <PlanBadge planCode={row.planCode} />
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {row.createdAt
                              ? new Date(row.createdAt).toLocaleString()
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
