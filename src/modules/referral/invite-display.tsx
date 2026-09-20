'use client';

import type { ReactNode } from 'react';
import { formatDisplayDateTime } from '@/lib/format-date';

export type InviteDisplayInput = {
  status?: string | null;
  eventStatus?: string | null;
  coinsCredited?: number | null;
  monthsGranted?: number | null;
  createdAt?: string | null;
  onboardedAt?: string | null;
  pendingExpiresAt?: string | null;
  planActivatedAt?: string | null;
  rewardExpiresAt?: string | null;
};

function statusOf(item: InviteDisplayInput) {
  return item.status || item.eventStatus || '';
}

function onboardAt(item: InviteDisplayInput) {
  return item.onboardedAt || item.createdAt || null;
}

/** Primary reward line (coins / months / pending copy). */
export function inviteRewardPrimary(item: InviteDisplayInput): string {
  const coins = Number(item.coinsCredited || 0);
  const months = Number(item.monthsGranted || 0);
  if (coins > 0) return `+${coins} NetraCoins`;
  if (months > 0) return `+${months} month${months === 1 ? '' : 's'}`;
  const status = statusOf(item);
  if (status === 'pending_subscription') return 'After plan purchase';
  if (status === 'pending_expired') return 'Window ended';
  return '—';
}

export function InviteRewardCell({
  item,
  primaryOverride,
}: {
  item: InviteDisplayInput;
  /** When reward string already includes orphan grant extras. */
  primaryOverride?: string;
}) {
  const primary = primaryOverride ?? inviteRewardPrimary(item);
  const credited =
    Number(item.coinsCredited || 0) > 0 || Number(item.monthsGranted || 0) > 0;
  const showExpiry =
    credited &&
    !!item.rewardExpiresAt &&
    statusOf(item) !== 'pending_subscription';

  return (
    <div className="flex flex-col gap-1 text-gray-700">
      <span>{primary}</span>
      {showExpiry ? (
        <span className="text-xs text-gray-500">
          Reward expiry {formatDisplayDateTime(item.rewardExpiresAt)}
        </span>
      ) : null}
    </div>
  );
}

export function InviteTimingCell({ item }: { item: InviteDisplayInput }) {
  const status = statusOf(item);
  const onboarded = onboardAt(item);
  const lines: ReactNode[] = [];

  if (onboarded) {
    lines.push(
      <span key="onboard">Onboarded {formatDisplayDateTime(onboarded)}</span>,
    );
  }

  if (status === 'pending_subscription') {
    lines.push(
      <span key="pending" className="font-medium text-red-600">
        Plan purchase pending
      </span>,
    );
    if (item.pendingExpiresAt) {
      lines.push(
        <span key="benefit-expiry" className="text-gray-600">
          Benefit expiry {formatDisplayDateTime(item.pendingExpiresAt)}
        </span>,
      );
    }
  } else if (status === 'pending_expired') {
    lines.push(
      <span key="ended" className="text-gray-600">
        {item.pendingExpiresAt
          ? `Window ended ${formatDisplayDateTime(item.pendingExpiresAt)}`
          : 'Window ended — no benefit'}
      </span>,
    );
  } else if (item.planActivatedAt) {
    lines.push(
      <span key="purchased" className="text-gray-600">
        Plan purchased {formatDisplayDateTime(item.planActivatedAt)}
      </span>,
    );
  }

  if (!lines.length) {
    return <span className="text-gray-600">—</span>;
  }

  return <div className="flex flex-col gap-1">{lines}</div>;
}
