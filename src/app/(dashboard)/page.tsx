'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  FileWarning,
  Headset,
  Inbox,
  Loader2,
  MessageSquare,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import {
  dashboardService,
  type AdminDashboardSummary,
  type DashboardUnreadKey,
} from '@/services/dashboard.service';
import { useAuthStore } from '@/store/use-auth-store';
import { isSuperAdmin } from '@/lib/super-admin';
import { canReadAppUsersTab } from '@/modules/app-users/app-users-access';

type DashCard = {
  key: DashboardUnreadKey | 'activeUsers' | 'inactiveUsers';
  label: string;
  href: string;
  icon: typeof Inbox;
};

const ACTION_KEYS: DashboardUnreadKey[] = [
  'documentsPending',
  'approvalPending',
  'otpIssued',
  'otpVerified',
  'reviewPending',
  'feedbacks',
  'supportTickets',
  'accountDeletions',
  'myListingsActionable',
  'subscriptionTracking',
];

export default function DashboardHome() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const permissions = useAuthStore((s) => s.permissions);
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const accessToken = useAuthStore((s) => s.accessToken);
  const superAdmin = useMemo(
    () => isSuperAdmin({ user, permissions, activeRole, accessToken }),
    [user, permissions, activeRole, accessToken],
  );

  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getSummary();
      setSummary(data);
    } catch (err) {
      console.error(err);
      setSummary({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const can = (moduleName: string, action: string) =>
    superAdmin || hasPermission(moduleName, action);

  const canUserProfile =
    can('user_analytics', 'read') ||
    canReadAppUsersTab('app_users_master', hasPermission) ||
    superAdmin;

  const cards: DashCard[] = useMemo(() => {
    const showApprovalPending =
      canUserProfile && summary?.withoutReferralApprovalRequired === true;

    const all: Array<DashCard & { show: boolean }> = [
      {
        key: 'reviewPending',
        label: 'Listing for Approval',
        href: '/moderation',
        icon: Inbox,
        show: can('locations', 'read') || can('moderation_queue', 'read'),
      },
      {
        key: 'documentsPending',
        label: 'Document verification pending',
        href: '/user-analytics',
        icon: FileWarning,
        show: canUserProfile,
      },
      {
        key: 'approvalPending',
        label: 'Approval pending',
        href: '/user-analytics',
        icon: UserCheck,
        show: showApprovalPending,
      },
      {
        key: 'otpIssued',
        label: 'OTP Issued',
        href: '/app-users/otp-issued',
        icon: Users,
        show: canReadAppUsersTab('app_users_otp_issued', hasPermission) || superAdmin,
      },
      {
        key: 'otpVerified',
        label: 'OTP Verified',
        href: '/app-users/otp-verified',
        icon: UserCheck,
        show: canReadAppUsersTab('app_users_otp_verified', hasPermission) || superAdmin,
      },
      {
        key: 'myListingsActionable',
        label: 'My Listings',
        href: '/my-listings',
        icon: ClipboardList,
        show: can('admin_my_listings', 'read'),
      },
      {
        key: 'feedbacks',
        label: 'Feedback',
        href: '/feedbacks',
        icon: MessageSquare,
        show: can('feedbacks', 'read'),
      },
      {
        key: 'supportTickets',
        label: 'Support tickets',
        href: '/support-tickets',
        icon: Headset,
        show: can('support_tickets', 'read'),
      },
      {
        key: 'subscriptionTracking',
        label: 'Subscription Tracking',
        href: '/subscribe-now-tracking',
        icon: ClipboardList,
        show: can('subscribe_now_tracking', 'read'),
      },
      {
        key: 'accountDeletions',
        label: 'Account deletions',
        href: '/account-deletions',
        icon: UserX,
        show: can('account_deletions', 'read'),
      },
      {
        key: 'activeUsers',
        label: 'Active users',
        href: '/app-users',
        icon: Users,
        show: superAdmin,
      },
      {
        key: 'inactiveUsers',
        label: 'Inactive users',
        href: '/app-users',
        icon: UserX,
        show: superAdmin,
      },
    ];
    return all.filter((c) => c.show).map(({ show: _show, ...card }) => card);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- can/hasPermission derived from store
  }, [superAdmin, hasPermission, permissions, summary, canUserProfile]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Dashboard
        </h1>
        <p className="text-gray-500 mt-1">
          Counts clear when you act on a row — not just by opening the page.
        </p>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          No counters for your permissions yet.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const count = Number(summary?.[card.key] ?? 0);
            const Icon = card.icon;
            const isActionKey = ACTION_KEYS.includes(card.key as DashboardUnreadKey);
            const urgent =
              isActionKey &&
              (summary?.highlight?.[card.key as DashboardUnreadKey] === true ||
                count > 0);
            return (
              <Link
                key={card.key}
                href={card.href}
                className={`p-6 rounded-2xl shadow-sm border transition-colors hover:border-primary/40 ${
                  urgent
                    ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-200'
                    : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-gray-500">
                    {card.label}
                  </p>
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      urgent ? 'text-amber-600' : 'text-gray-400'
                    }`}
                  />
                </div>
                <p
                  className={`text-3xl font-bold mt-2 ${
                    urgent ? 'text-amber-800' : 'text-gray-900'
                  }`}
                >
                  {count}
                </p>
                {urgent ? (
                  <p className="text-xs font-medium text-amber-700 mt-2">
                    New items — action needed
                  </p>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
