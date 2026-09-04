'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { Badge } from '@/components/ui/badge';
import {
  subscriptionApiError,
  subscriptionsService,
  type UserEntitlements,
} from '@/services/subscriptions.service';
import { Loader2 } from 'lucide-react';

type SubscriptionTabProps = {
  userId: string | null;
};

export function SubscriptionTab({ userId }: SubscriptionTabProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canRead = hasPermission('subscriptions', 'read');

  const [data, setData] = useState<UserEntitlements | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!userId || !canRead) {
      setData(null);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setData(await subscriptionsService.getUser(userId));
    } catch (err) {
      setData(null);
      setError(subscriptionApiError(err, 'Failed to load user subscription.'));
    } finally {
      setLoading(false);
    }
  }, [userId, canRead]);

  useEffect(() => {
    load();
  }, [load]);

  if (!userId) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
        Select a user to view subscription details.
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
        You need <code>subscriptions:read</code> to view this tab.
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {data ? (
        <>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{data.displayName}</h3>
              <p className="mt-1 font-mono text-xs text-gray-500">{data.planCode}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant={data.isSubscribed ? 'default' : 'outline'}>
                  {data.isSubscribed ? 'Subscribed' : 'Not subscribed'}
                </Badge>
                <Badge variant="secondary">{data.subscriptionStatus || '—'}</Badge>
                {data.badge ? <Badge variant="outline">{data.badge}</Badge> : null}
              </div>
            </div>

            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Trial ends" value={fmtDate(data.trialEndsAt)} />
              <Info label="Period start" value={fmtDate(data.currentPeriodStart)} />
              <Info label="Period end" value={fmtDate(data.currentPeriodEnd)} />
              <Info label="Wallet balance" value={String(data.walletBalance)} />
              <Info
                label="Listing contact credits"
                value={String(data.addonCredits.listingContactCredits)}
              />
              <Info
                label="Buy-req contact credits"
                value={String(data.addonCredits.buyReqContactCredits)}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h4 className="font-semibold text-gray-900">Usage ({data.usage.periodMonth})</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                <li>
                  Listing contacts: {data.usage.listingContactsDay} today /{' '}
                  {data.usage.listingContactsMonth} month (limits{' '}
                  {data.limits.listingContactsDaily}/{data.limits.listingContactsMonthly})
                </li>
                <li>
                  Buy-req contacts: {data.usage.buyReqContactsDay} today /{' '}
                  {data.usage.buyReqContactsMonth} month (limits{' '}
                  {data.limits.buyReqContactsDaily}/{data.limits.buyReqContactsMonthly})
                </li>
                <li>
                  Views: {data.usage.viewsDay} today / {data.usage.viewsMonth} month (
                  {data.limits.listingViewsDaily == null
                    ? 'unlimited'
                    : `limits ${data.limits.listingViewsDaily}/${data.limits.listingViewsMonthly}`}
                  )
                </li>
              </ul>
            </div>
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h4 className="font-semibold text-gray-900">Plan limits</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                <li>Active Resale+Rent posts: {data.limits.activeResaleRentPosts}</li>
                <li>Active Buy-req posts: {data.limits.activeBuyReqPosts}</li>
                <li>Monthly coin grant: {data.limits.monthlyCoinGrant}</li>
                <li>
                  Flags:{' '}
                  {[
                    data.flags.addonsEnabled && 'addons',
                    data.flags.listingBoostEnabled && 'boost',
                    data.flags.listingPriorityEnabled && 'priority',
                    data.flags.builderContactsEnabled && 'builder',
                  ]
                    .filter(Boolean)
                    .join(', ') || 'none'}
                </li>
              </ul>
            </div>
          </div>
        </>
      ) : (
        !loading && (
          <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
            No subscription data for this user.
          </div>
        )
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value || '—'}</p>
    </div>
  );
}

function fmtDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}
