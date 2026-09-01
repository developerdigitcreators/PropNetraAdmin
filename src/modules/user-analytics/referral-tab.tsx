'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  referralApiError,
  referralService,
  type ReferralChainNode,
  type ReferralGraph,
} from '@/services/referral.service';
import { GitBranch, Loader2 } from 'lucide-react';

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
  const invited = (graph?.invited || []) as Array<{
    id: string;
    name?: string;
    status?: string;
    referralCode?: string | null;
  }>;

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
          {graph?.rewardState?.mode ? (
            <>
              {' '}
              · Mode: <strong>{graph.rewardState.mode}</strong>
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
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
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
              <dt className="text-muted-foreground">Mode</dt>
              <dd className="font-medium">{graph.rewardState.mode}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cycle anchor</dt>
              <dd>
                {graph.rewardState.cycleAnchorAt
                  ? new Date(graph.rewardState.cycleAnchorAt).toLocaleString()
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Milestone deadline</dt>
              <dd>
                {graph.rewardState.milestoneDeadlineAt
                  ? new Date(graph.rewardState.milestoneDeadlineAt).toLocaleString()
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Onboard / paid in cycle</dt>
              <dd>
                {graph.rewardState.onboardCountInCycle} /{' '}
                {graph.rewardState.paidQualifiedCountInCycle}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Resets</dt>
              <dd>{graph.rewardState.resetCount}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No reward state yet</p>
        )}
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold">Benefit history</h3>
        {(graph?.benefitHistory || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No grants yet</p>
        ) : (
          <ul className="divide-y text-sm">
            {(graph?.benefitHistory || []).map((g, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 py-2">
                <span className="font-medium">
                  {g.rewardType === 'FREE_MONTHS'
                    ? `${g.monthsGranted ?? g.rewardValue} mo`
                    : `${g.rewardValue}%`}
                </span>
                {g.coinsCredited != null && g.coinsCredited > 0 ? (
                  <span className="text-xs text-emerald-700">+{g.coinsCredited} coins</span>
                ) : null}
                {g.reason ? (
                  <span className="text-xs text-muted-foreground">{g.reason}</span>
                ) : null}
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(g.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
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
          <p className="text-sm text-muted-foreground">No referrer</p>
        )}
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold">Direct invites</h3>
        {invited.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet</p>
        ) : (
          <ul className="divide-y text-sm">
            {invited.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="font-medium">{u.name || u.id}</span>
                <span className="text-xs text-muted-foreground">{u.status}</span>
                {u.referralCode ? (
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {u.referralCode}
                  </code>
                ) : null}
              </li>
            ))}
          </ul>
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
