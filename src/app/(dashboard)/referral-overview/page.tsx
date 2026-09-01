'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import {
  referralApiError,
  referralService,
  type ReferralOverview,
  type ReferralOverviewEvent,
  type ReferralUserSummary,
} from '@/services/referral.service';
import { Gift, Loader2, Users } from 'lucide-react';

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

function simpleStatus(event: ReferralOverviewEvent) {
  switch (event.status) {
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
    default:
      return { label: event.status.replace(/_/g, ' '), className: 'bg-gray-100 text-gray-600' };
  }
}

function rewardText(event: ReferralOverviewEvent) {
  if (event.coinsCredited > 0) return `+${event.coinsCredited} NetraCoins`;
  if (event.monthsGranted > 0) return `+${event.monthsGranted} month${event.monthsGranted === 1 ? '' : 's'}`;
  if (event.status === 'pending_subscription') return 'After plan purchase';
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

function ReferralCard({ event }: { event: ReferralOverviewEvent }) {
  const status = simpleStatus(event);
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900">{userLabel(event.referee)}</p>
        <p className="mt-0.5 text-xs text-gray-500">
          Referred user plan: {planShort(event.referee.planCode) || '—'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
          {status.label}
        </span>
        <span className="text-sm font-semibold text-gray-800">{rewardText(event)}</span>
        <span className="text-xs text-gray-400">
          {new Date(event.createdAt).toLocaleDateString('en-IN')}
        </span>
      </div>
    </div>
  );
}

export default function ReferralOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<ReferralOverview | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await referralService.overview(50));
    } catch (err) {
      setError(referralApiError(err, 'Failed to load overview.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byReferrer = useMemo(() => {
    if (!data?.recentEvents?.length) return [];
    const map = new Map<
      string,
      { referrer: ReferralUserSummary; items: ReferralOverviewEvent[] }
    >();
    for (const event of data.recentEvents) {
      const id = event.referrer.id;
      const existing = map.get(id);
      if (existing) {
        existing.items.push(event);
      } else {
        map.set(id, { referrer: event.referrer, items: [event] });
      }
    }
    return [...map.values()].sort(
      (a, b) => b.items.length - a.items.length,
    );
  }, [data]);

  const latest = useMemo(
    () =>
      [...(data?.recentEvents || [])].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [data],
  );

  return (
    <PermissionGuard permission="subscriptions:read">
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/' },
            { label: 'Referral Overview' },
          ]}
        />
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Gift className="h-6 w-6 text-primary" />
            Refer & Earn Overview
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Simple view: who referred whom, and what reward was given.{' '}
            <Link href="/referral-benefits" className="text-primary underline">
              Edit benefit tiers
            </Link>
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total referrals" value={data.stats.totalInView} />
              <StatCard label="Rewards given" value={data.stats.rewardedCount} accent="emerald" />
              <StatCard
                label="Waiting for plan"
                value={data.stats.pendingSubscriptions}
                accent="amber"
              />
              <StatCard label="Active referrers" value={byReferrer.length} />
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
              <p className="font-medium">How rewards work</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-blue-800/90">
                <li>
                  <strong>Free referrer</strong> — gets extra months when someone signs up with
                  their link (even if that person buys a plan later).
                </li>
                <li>
                  <strong>Paid referrer</strong> — gets NetraCoins only when the referred person
                  purchases a plan.
                </li>
                <li>
                  Old free-track rewards stay in history; they do not count toward paid milestones
                  after upgrade.
                </li>
              </ul>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
              <div className="space-y-8">
                <section className="rounded-xl border bg-white shadow-sm">
                  <div className="border-b px-4 py-3">
                    <h2 className="font-semibold text-gray-900">Latest referrals</h2>
                    <p className="text-xs text-gray-500">Newest first — one row per invite</p>
                  </div>
                  {latest.length === 0 ? (
                    <p className="p-6 text-center text-sm text-gray-500">No referrals yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] text-left text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                          <tr>
                            <th className="px-4 py-2.5 font-medium">Referrer</th>
                            <th className="px-4 py-2.5 font-medium">Invited user</th>
                            <th className="px-4 py-2.5 font-medium">Status</th>
                            <th className="px-4 py-2.5 font-medium">Reward</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {latest.map((event) => {
                            const status = simpleStatus(event);
                            return (
                              <tr key={event.id} className="hover:bg-gray-50/80">
                                <td className="px-4 py-3">
                                  <p className="font-medium">{userLabel(event.referrer)}</p>
                                  <PlanBadge planCode={event.referrer.planCode} />
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-medium">{userLabel(event.referee)}</p>
                                  <p className="text-xs text-gray-500">
                                    {planShort(event.referee.planCode) || '—'}
                                  </p>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                                  >
                                    {status.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-800">
                                  {rewardText(event)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <div>
                    <h2 className="font-semibold text-gray-900">By referrer</h2>
                    <p className="text-sm text-gray-500">
                      Each person and everyone they invited — easy to read at a glance
                    </p>
                  </div>
                  {byReferrer.length === 0 ? (
                    <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500">
                      No referral data yet.
                    </div>
                  ) : (
                    byReferrer.map((group) => (
                      <article
                        key={group.referrer.id}
                        className="overflow-hidden rounded-xl border bg-white shadow-sm"
                      >
                        <header className="border-b bg-gray-50 px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-gray-900">
                              {userLabel(group.referrer)}
                            </p>
                            <PlanBadge planCode={group.referrer.planCode} />
                            {group.referrer.referralCode ? (
                              <code className="rounded bg-white px-1.5 py-0.5 text-[11px] text-gray-600 ring-1 ring-gray-200">
                                {group.referrer.referralCode}
                              </code>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Plan: {planShort(group.referrer.planCode) || '—'} ·{' '}
                            {group.items.length} invited user
                            {group.items.length === 1 ? '' : 's'}
                          </p>
                        </header>
                        <div className="space-y-2 p-4">
                          {group.items.map((event) => (
                            <ReferralCard key={event.id} event={event} />
                          ))}
                        </div>
                      </article>
                    ))
                  )}
                </section>
              </div>

              <aside>
                <section className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <h2 className="font-medium">Top referrers</h2>
                  </div>
                  <ul className="divide-y text-sm">
                    {data.topReferrers.length === 0 ? (
                      <li className="py-3 text-gray-500">No data</li>
                    ) : (
                      data.topReferrers.map((r) => (
                        <li
                          key={r.id}
                          className="flex items-center justify-between gap-2 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{userLabel(r)}</p>
                            <PlanBadge planCode={r.planCode} />
                          </div>
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                            {r.successfulReferrals}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </section>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </PermissionGuard>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: 'emerald' | 'amber';
}) {
  const valueClass =
    accent === 'emerald'
      ? 'text-emerald-600'
      : accent === 'amber'
        ? 'text-amber-600'
        : 'text-gray-900';
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}
