'use client';

import { Fragment, useState, type ReactNode } from 'react';
import { Check, ChevronDown, ChevronRight, Copy, Gift } from 'lucide-react';
import { AdminDataTable } from '@/components/common/admin-data-table';
import { MaskedContact } from '@/components/contact/masked-contact';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDisplayDateTime } from '@/lib/format-date';
import { resolvePlanChip } from '@/lib/plan-labels';
import type {
  SalesInvitee,
  SalesPerformance,
  SalesSecondLevelInvitee,
  SalesTotals,
} from '@/services/referral.service';

export function formatRupeesFromPaise(paise: number | null | undefined, emptyWhenZero = false) {
  if (paise == null || !Number.isFinite(paise)) return '—';
  if (emptyWhenZero && paise === 0) return '—';
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
  }).format(rupees);
}

const STATUS_LABELS: Record<string, string> = {
  onboarded: 'Onboarded',
  pending_subscription: 'Plan pending',
  pending_expired: 'Window ended',
  rewarded: 'Rewarded',
  qualified: 'Qualified',
};

function statusLabel(status: string | null) {
  if (!status) return '—';
  const known = STATUS_LABELS[status];
  if (known) return known;
  const text = status.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function PlanChip({ planCode }: { planCode: string | null }) {
  const chip = resolvePlanChip(null, planCode);
  if (!chip) return <span className="text-xs text-gray-400">—</span>;
  return (
    <Badge variant="outline" className={chip.className}>
      {chip.label}
    </Badge>
  );
}

function TypeChip({ type }: { type: SalesSecondLevelInvitee['allotteeType'] }) {
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
        type === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
      }`}
    >
      {type === 'paid' ? 'Paid' : 'Free'}
    </span>
  );
}

export function SalesStatCards({ totals }: { totals: SalesTotals }) {
  const cards: Array<{ label: string; value: ReactNode; note?: string; className?: string }> = [
    { label: 'Total Invites', value: totals.totalInvites },
    { label: 'Direct Invites', value: totals.directInvites },
    { label: 'Referral Invites', value: totals.referralInvites },
    { label: 'Paid Users', value: totals.paidUsers, className: 'text-emerald-700' },
    { label: 'Free Users', value: totals.freeUsers, className: 'text-slate-700' },
    {
      label: 'Sales Revenue',
      value: formatRupeesFromPaise(totals.salesRevenuePaise),
      note: 'excl. GST',
      className: 'text-primary',
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{card.label}</p>
          <p className={`mt-1 text-2xl font-semibold ${card.className || 'text-gray-900'}`}>
            {card.value}
          </p>
          {card.note ? <p className="text-[11px] text-gray-400">{card.note}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function ReferralLinkCard({
  title,
  referralCode,
  inviteUrl,
}: {
  title: string;
  referralCode: string | null;
  inviteUrl: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  const copy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyError('');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopyError('Could not copy link.');
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
        <Gift className="h-4 w-4 text-primary" />
        {title}
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Code{' '}
        <span className="font-mono font-semibold text-gray-800">{referralCode || '—'}</span>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="max-w-full flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800">
          {inviteUrl || 'No invite link'}
        </code>
        <Button type="button" size="sm" onClick={() => void copy()} disabled={!inviteUrl}>
          {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      {copyError ? <p className="mt-2 text-xs text-red-600">{copyError}</p> : null}
    </div>
  );
}

export function SalesFilterBar({
  leading,
  from,
  to,
  qDraft,
  onFromChange,
  onToChange,
  onQDraftChange,
  onSearch,
  onReset,
}: {
  leading?: ReactNode;
  from: string;
  to: string;
  qDraft: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onQDraftChange: (v: string) => void;
  onSearch: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      {leading}
      <div>
        <label className="mb-1 block text-xs text-gray-500">From</label>
        <Input
          type="date"
          className="h-9 w-[150px]"
          value={from}
          max={to || undefined}
          onChange={(e) => onFromChange(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">To</label>
        <Input
          type="date"
          className="h-9 w-[150px]"
          value={to}
          min={from || undefined}
          onChange={(e) => onToChange(e.target.value)}
        />
      </div>
      <div className="min-w-[220px] flex-1">
        <label className="mb-1 block text-xs text-gray-500">Search</label>
        <Input
          className="h-9"
          value={qDraft}
          placeholder="Search name, phone, email, code…"
          onChange={(e) => onQDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSearch();
          }}
        />
      </div>
      <Button type="button" size="sm" className="h-9" onClick={onSearch}>
        Search
      </Button>
      <Button type="button" size="sm" variant="outline" className="h-9" onClick={onReset}>
        Reset
      </Button>
    </div>
  );
}

function JoinedCell({ joinedAt, joinedInRange = true }: { joinedAt: string | null; joinedInRange?: boolean }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="whitespace-nowrap text-gray-600">{formatDisplayDateTime(joinedAt)}</span>
      {!joinedInRange ? (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
          Joined before range
        </span>
      ) : null}
    </div>
  );
}

function SecondLevelTable({ parent }: { parent: SalesInvitee }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-700">
        Referred by {parent.name} ({parent.secondLevelCount})
      </p>
      {parent.secondLevel.length === 0 ? (
        <p className="text-xs text-gray-500">No second-level invites</p>
      ) : (
        <table className="min-w-full text-left text-xs">
          <thead className="text-gray-500">
            <tr>
              <th className="py-2 pr-3 font-medium">User</th>
              <th className="py-2 pr-3 font-medium">Plan</th>
              <th className="py-2 pr-3 font-medium">Plan Cost</th>
              <th className="py-2 pr-3 font-medium">Type</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {parent.secondLevel.map((row) => (
              <tr key={`${row.id}-${row.joinedAt}`} className="border-t border-gray-100/80">
                <td className="py-2.5 pr-3 font-medium text-gray-900">{row.name}</td>
                <td className="py-2.5 pr-3">
                  <PlanChip planCode={row.planCode} />
                </td>
                <td className="py-2.5 pr-3 text-gray-700">
                  {formatRupeesFromPaise(row.planCostPaise, true)}
                </td>
                <td className="py-2.5 pr-3">
                  <TypeChip type={row.allotteeType} />
                </td>
                <td className="py-2.5 pr-3 text-gray-700">{statusLabel(row.eventStatus)}</td>
                <td className="py-2.5">
                  <JoinedCell joinedAt={row.joinedAt} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function SalesInviteesTable({
  data,
  loading,
  error,
  showReferredBy,
  revealPrefix,
  onPageChange,
  onPageSizeChange,
}: {
  data: SalesPerformance | null;
  loading: boolean;
  error: string;
  showReferredBy: boolean;
  revealPrefix: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (limit: number) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const rows = data?.invitees ?? [];
  const meta = data?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 1 };
  const colCount = showReferredBy ? 9 : 8;

  return (
    <AdminDataTable
      page={meta.page}
      limit={meta.limit}
      total={meta.total}
      totalPages={meta.totalPages}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      loading={loading && !data}
      error={error || null}
      isEmpty={!rows.length}
      emptyMessage="No invitees for these filters."
      syncKey={`${rows.length}-${showReferredBy}`}
    >
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="w-10 px-3 py-3" />
            <th className="px-4 py-3 font-medium">User</th>
            <th className="px-4 py-3 font-medium">Contact</th>
            {showReferredBy ? <th className="px-4 py-3 font-medium">Referred by</th> : null}
            <th className="px-4 py-3 font-medium">Plan</th>
            <th className="px-4 py-3 font-medium">Plan Cost</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Joined</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = `${row.id}-${row.joinedAt}`;
            const open = !!expanded[key];
            return (
              <Fragment key={key}>
                <tr className="border-b border-gray-50 text-gray-800">
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      aria-label={open ? 'Collapse' : 'Expand'}
                      className="rounded p-1 text-gray-500 hover:bg-gray-100"
                      onClick={() => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
                    >
                      {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{row.name}</div>
                    {row.secondLevelCount > 0 ? (
                      <div className="text-[11px] text-gray-500">
                        {row.secondLevelCount} second-level
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {row.contact ? (
                      <MaskedContact value={row.contact} revealKey={`${revealPrefix}:${row.id}:contact`} />
                    ) : null}
                    {row.email ? <div className="text-xs text-gray-500">{row.email}</div> : null}
                    {!row.contact && !row.email ? '—' : null}
                  </td>
                  {showReferredBy ? (
                    <td className="px-4 py-3 text-gray-700">{row.referredBy?.name || '—'}</td>
                  ) : null}
                  <td className="px-4 py-3">
                    <PlanChip planCode={row.planCode} />
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatRupeesFromPaise(row.planCostPaise, true)}
                  </td>
                  <td className="px-4 py-3">
                    <TypeChip type={row.allotteeType} />
                  </td>
                  <td className="px-4 py-3 text-gray-700">{statusLabel(row.eventStatus)}</td>
                  <td className="px-4 py-3">
                    <JoinedCell joinedAt={row.joinedAt} joinedInRange={row.joinedInRange} />
                  </td>
                </tr>
                {open ? (
                  <tr className="border-b border-gray-50 bg-gray-50/70">
                    <td colSpan={colCount} className="px-6 py-4">
                      <SecondLevelTable parent={row} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </AdminDataTable>
  );
}
