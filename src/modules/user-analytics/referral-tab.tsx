'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  referralApiError,
  referralService,
  type ReferralChainNode,
  type ReferralGraph,
} from '@/services/referral.service';
import { formatDisplayDateTime } from '@/lib/format-date';
import { GitBranch, Loader2 } from 'lucide-react';

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

function ChainTree({ node }: { node: ReferralChainNode }) {
  return (
    <li className="ml-2">
      <div className="flex flex-wrap items-center gap-2 py-1 text-sm">
        <span className="font-medium">{node.name}</span>
        <span className="text-xs text-muted-foreground">{node.status}</span>
        {node.referralCode ? (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            {node.referralCode}
          </code>
        ) : null}
      </div>
      {node.children?.length ? (
        <ul className="ml-4 border-l border-dashed border-gray-200 pl-3">
          {node.children.map((c) => (
            <ChainTree key={c.id} node={c} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

type InviteRow = {
  key: string;
  name: string;
  inviteePlanAtBenefit?: string | null;
  referrerPlanAtBenefit?: string | null;
  reward: string;
  onboardedAt?: string | null;
  planActivatedAt?: string | null;
  rewardExpiresAt?: string | null;
  pendingExpiresAt?: string | null;
  eventStatus?: string | null;
};

export function ReferralTab({ userId }: { userId: string }) {
  const [graph, setGraph] = useState<ReferralGraph | null>(null);
  const [chain, setChain] = useState<ReferralChainNode | null>(null);
  const [showChain, setShowChain] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chainLoading, setChainLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setGraph(await referralService.getGraph(userId));
    } catch (err) {
      setError(referralApiError(err, 'Failed to load referral graph.'));
      setGraph(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const loadChain = async () => {
    setChainLoading(true);
    setError('');
    try {
      const res = await referralService.getChain(userId, 10);
      setChain(res.root);
      setShowChain(true);
    } catch (err) {
      setError(referralApiError(err, 'Failed to load full chain.'));
    } finally {
      setChainLoading(false);
    }
  };

  const inviteRows = useMemo((): InviteRow[] => {
    if (!graph) return [];
    const invited = (graph.invited || []) as Array<{
      id: string;
      name?: string;
      eventStatus?: string | null;
      pendingExpiresAt?: string | null;
      planActivatedAt?: string | null;
      rewardExpiresAt?: string | null;
      onboardedAt?: string | null;
      coinsCredited?: number;
      monthsGranted?: number;
      inviteePlanAtBenefit?: string | null;
      referrerPlanAtBenefit?: string | null;
    }>;

    const fromInvites: InviteRow[] = invited.map((u) => {
      let reward = '—';
      if ((u.coinsCredited ?? 0) > 0) reward = `+${u.coinsCredited} NetraCoins`;
      else if ((u.monthsGranted ?? 0) > 0)
        reward = `+${u.monthsGranted} month${u.monthsGranted === 1 ? '' : 's'}`;
      else if (u.eventStatus === 'pending_subscription') reward = 'After plan purchase';
      else if (u.eventStatus === 'pending_expired') reward = 'Window ended';

      return {
        key: u.id,
        name: u.name?.trim() || u.id,
        inviteePlanAtBenefit: u.inviteePlanAtBenefit,
        referrerPlanAtBenefit: u.referrerPlanAtBenefit,
        reward,
        onboardedAt: u.onboardedAt,
        planActivatedAt: u.planActivatedAt,
        rewardExpiresAt: u.rewardExpiresAt,
        pendingExpiresAt: u.pendingExpiresAt,
        eventStatus: u.eventStatus,
      };
    });

    const covered = new Set(invited.map((u) => u.id));
    const orphanGrants = (graph.benefitHistory || []).filter(
      (g) => !g.triggerRefereeId || !covered.has(g.triggerRefereeId),
    );

    for (const g of orphanGrants) {
      let reward = '—';
      if (g.coinsCredited != null && g.coinsCredited > 0) {
        reward = `+${g.coinsCredited} NetraCoins`;
      } else if (g.rewardType === 'FREE_MONTHS') {
        reward = `+${g.monthsGranted ?? g.rewardValue} mo`;
      } else {
        reward = `${g.rewardValue}%`;
      }
      if (g.reason) reward = `${reward} · ${g.reason}`;

      fromInvites.push({
        key: `grant-${g.createdAt}-${g.reason || g.rewardType}`,
        name: g.triggerRefereeId ? 'Invitee' : 'System',
        inviteePlanAtBenefit: g.inviteePlanAtBenefit,
        referrerPlanAtBenefit: g.referrerPlanAtBenefit,
        reward,
        onboardedAt: g.createdAt,
        rewardExpiresAt: g.rewardExpiresAt,
        eventStatus: null,
      });
    }

    return fromInvites;
  }, [graph]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  const referrer = graph?.referrer as
    | { id?: string; name?: string; referralCode?: string }
    | null
    | undefined;

  const milestoneOn =
    graph?.rewardState?.milestoneOn ??
    !!graph?.rewardState?.mode?.includes('MILESTONE');
  const renewOn = !!graph?.programSettings?.renewResetsMilestones;

  return (
    <div className="space-y-5">
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Successful referrals: <strong>{graph?.successfulReferrals ?? 0}</strong>
          {graph?.rewardState ? (
            <>
              {' '}
              · Milestone: <strong>{milestoneOn ? 'On' : 'Off'}</strong>
            </>
          ) : null}
        </p>
        <div className="flex gap-2">
          <Link
            href="/referral-benefits"
            className="inline-flex h-7 items-center rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
          >
            Configure benefits
          </Link>
          <Button size="sm" onClick={loadChain} disabled={chainLoading}>
            {chainLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GitBranch className="mr-2 h-4 w-4" />
            )}
            Full chain
          </Button>
        </div>
      </div>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold">Reward cycle</h3>
        {graph?.rewardState ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Referrer tier</dt>
              <dd className="font-medium">
                {graph.isPaidReferrer ? (
                  <span className="text-violet-700">Paid (NetraCoin track)</span>
                ) : (
                  <span className="text-slate-700">Free (month extension track)</span>
                )}
                {(graph.user as { planCode?: string })?.planCode ? (
                  <span className="ml-1 text-xs text-muted-foreground">
                    · {(graph.user as { planCode?: string }).planCode}
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Milestone</dt>
              <dd className="font-medium">{milestoneOn ? 'On' : 'Off'}</dd>
            </div>
            {renewOn ? (
              <div>
                <dt className="text-muted-foreground">Milestone started</dt>
                <dd>
                  {graph.rewardState.cycleAnchorAt
                    ? formatDisplayDateTime(graph.rewardState.cycleAnchorAt)
                    : '—'}
                </dd>
              </div>
            ) : null}
            {milestoneOn ? (
              <div>
                <dt className="text-muted-foreground">Milestone deadline</dt>
                <dd>
                  {graph.rewardState.milestoneDeadlineAt
                    ? formatDisplayDateTime(graph.rewardState.milestoneDeadlineAt)
                    : '—'}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-muted-foreground">Onboard</dt>
              <dd className="font-medium">{graph.rewardState.onboardCountInCycle}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Converted plan user</dt>
              <dd className="font-medium">
                {graph.rewardState.paidQualifiedCountInCycle}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No reward state yet</p>
        )}
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">Invites & benefits</h3>
        {inviteRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="pb-2 pr-3 font-medium">Invited user</th>
                  <th className="pb-2 pr-3 font-medium">Invitee plan at benefit</th>
                  <th className="pb-2 pr-3 font-medium">Referrer plan at benefit</th>
                  <th className="pb-2 pr-3 font-medium">Reward</th>
                  <th className="pb-2 font-medium">Timing</th>
                </tr>
              </thead>
              <tbody>
                {inviteRows.map((row) => {
                  const lines: string[] = [];
                  if (row.onboardedAt) {
                    lines.push(`Onboarded ${formatDisplayDateTime(row.onboardedAt)}`);
                  }
                  if (
                    row.eventStatus === 'pending_subscription' &&
                    row.pendingExpiresAt
                  ) {
                    lines.push(
                      `Plan needed by ${formatDisplayDateTime(row.pendingExpiresAt)}`,
                    );
                  } else if (row.eventStatus === 'pending_expired' && row.pendingExpiresAt) {
                    lines.push(
                      `Window ended ${formatDisplayDateTime(row.pendingExpiresAt)}`,
                    );
                  } else {
                    if (row.planActivatedAt) {
                      lines.push(
                        `Plan started ${formatDisplayDateTime(row.planActivatedAt)}`,
                      );
                    }
                    if (row.rewardExpiresAt) {
                      lines.push(
                        `Reward expiry ${formatDisplayDateTime(row.rewardExpiresAt)}`,
                      );
                    }
                  }
                  return (
                    <tr key={row.key} className="border-t border-gray-100">
                      <td className="py-3 pr-3 font-medium text-gray-900">{row.name}</td>
                      <td className="py-3 pr-3">
                        <PlanBadge planCode={row.inviteePlanAtBenefit} />
                      </td>
                      <td className="py-3 pr-3">
                        <PlanBadge planCode={row.referrerPlanAtBenefit} />
                      </td>
                      <td className="py-3 pr-3 text-gray-700">{row.reward}</td>
                      <td className="py-3">
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          {lines.length ? (
                            lines.map((line) => <span key={line}>{line}</span>)
                          ) : (
                            <span>—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold">Referred by</h3>
        {referrer?.id ? (
          <p className="text-sm">
            {referrer.name || referrer.id}
            {referrer.referralCode ? (
              <code className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">
                {referrer.referralCode}
              </code>
            ) : null}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-800">
              Without referral
            </span>
          </div>
        )}
      </section>

      {showChain && chain ? (
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold">Full descendant chain</h3>
          <ul>
            <ChainTree node={chain} />
          </ul>
        </section>
      ) : null}
    </div>
  );
}
