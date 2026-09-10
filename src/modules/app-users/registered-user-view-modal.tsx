'use client';

import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDisplayDateTime } from '@/lib/format-date';
import { VerificationDocsSection } from '@/modules/user-analytics/verification-docs-section';
import { Check, X } from 'lucide-react';

const STEP_CHIP: Record<string, { label: string; className: string }> = {
  basic: {
    label: 'OTP Sent',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  verification: {
    label: 'Company pending',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  profile: {
    label: 'Password pending',
    className: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  password: {
    label: 'Password pending',
    className: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  logged_in: {
    label: 'Logged In',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
};

type FilledChip = {
  key: string;
  label: string;
  filled: boolean;
  optional?: boolean;
  note?: string;
};

function formatDateTime(value?: string | Date | null) {
  return formatDisplayDateTime(value);
}

function buildFilledChips(
  filled: Record<string, boolean>,
  opts?: { emailOptional?: boolean },
): FilledChip[] {
  const emailFilled = !!filled.email;
  const emailVerified = !!filled.emailVerified;
  const phoneFilled = !!filled.contact;
  const phoneVerified = !!filled.contactVerified;

  return [
    { key: 'name', label: 'Name', filled: !!filled.name },
    {
      key: 'email',
      label: 'Email',
      filled: emailFilled,
      optional: !!opts?.emailOptional,
      note: emailFilled ? (emailVerified ? 'verified' : 'unverified') : undefined,
    },
    {
      key: 'contact',
      label: 'Phone',
      filled: phoneFilled,
      note: phoneFilled ? (phoneVerified ? 'verified' : 'unverified') : undefined,
    },
    { key: 'companyName', label: 'Company', filled: !!filled.companyName },
    { key: 'address', label: 'Address', filled: !!filled.address },
    { key: 'city', label: 'City', filled: !!filled.city },
    {
      key: 'gstNumber',
      label: 'GST',
      filled: !!filled.gstNumber,
      optional: true,
    },
    { key: 'password', label: 'Password', filled: !!filled.password },
    { key: 'referId', label: 'Refer ID', filled: !!filled.referId },
  ];
}

function roleLabel(user: any) {
  const name = user?.userRoles?.[0]?.role?.name;
  return name ? String(name).replace(/_/g, ' ') : '—';
}

export function RegisteredUserViewModal({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: any | null;
}) {
  if (!user) return null;

  const stepMeta = STEP_CHIP[user.signupStep];
  const chips = user.filledFields
    ? buildFilledChips(user.filledFields, {
        emailOptional: !(user.email || '').trim(),
      })
    : [];
  const editLogs = Array.isArray(user.editLogs) ? user.editLogs : [];
  const statusRemark = (user.statusRemark || '').trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User details</DialogTitle>
          <DialogDescription>
            Registered app user (view only) — signup progress, missing fields, and remarks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm pt-1 pb-2">
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 space-y-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Name
              </p>
              <p className="mt-0.5 font-semibold text-gray-900 break-words">
                {user.name || '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Email
              </p>
              <p className="mt-0.5 text-gray-800 break-all">{user.email || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Contact
              </p>
              <p className="mt-0.5 text-gray-800">{user.contact || '—'}</p>
            </div>
            {(user.addedByName || user.createdByAdmin) && (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  Added by
                </p>
                <p className="mt-0.5 text-gray-800">{user.addedByName || 'Admin'}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  Status
                </p>
                <p className="mt-0.5 capitalize text-gray-800">
                  {String(user.status || '—').replace(/_/g, ' ')}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  Role
                </p>
                <p className="mt-0.5 capitalize text-gray-800">{roleLabel(user)}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  Plan
                </p>
                <p className="mt-0.5 text-gray-800">
                  {user.subscriptionStatus ||
                    user.subscription ||
                    (user.planCode
                      ? String(user.planCode).replace(/_/g, ' ')
                      : '—')}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  City
                </p>
                <p className="mt-0.5 text-gray-800">{user.city || '—'}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">
              Signup step
            </p>
            {stepMeta ? (
              <Badge variant="outline" className={stepMeta.className}>
                {stepMeta.label}
              </Badge>
            ) : (
              <p className="text-gray-800">
                {user.signupStepLabel || user.signupStep || '—'}
              </p>
            )}
            {user.signupStepLabel && stepMeta ? (
              <p className="mt-1.5 text-xs text-gray-500 leading-snug">
                {user.signupStepLabel}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-100 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Created
              </p>
              <p className="mt-1 text-gray-800 text-xs whitespace-nowrap">
                {formatDateTime(user.createdAt)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Last login
              </p>
              <p className="mt-1 text-gray-800 text-xs whitespace-nowrap">
                {formatDateTime(user.lastLoginAt ?? user.last_login_at)}
              </p>
            </div>
          </div>

          {chips.length > 0 ? (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">
                Filled fields
              </p>
              <p className="text-xs text-gray-500 mb-2">
                Green = done · Amber = unverified · Red = missing
              </p>
              <div className="flex flex-wrap gap-1.5">
                {chips.map((chip) => {
                  const unverified = chip.filled && chip.note === 'unverified';
                  return (
                    <span
                      key={chip.key}
                      title={
                        chip.note ? `${chip.label} (${chip.note})` : chip.label
                      }
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium border ${
                        !chip.filled
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : unverified
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-green-50 text-green-700 border-green-200'
                      }`}
                    >
                      {chip.filled ? (
                        <Check className="w-3 h-3 shrink-0" />
                      ) : (
                        <X className="w-3 h-3 shrink-0" />
                      )}
                      {chip.label}
                      {chip.note === 'unverified' ? (
                        <span className="opacity-70 font-normal">unverified</span>
                      ) : null}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}

          {statusRemark ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700/80 mb-1">
                Status remark
              </p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{statusRemark}</p>
              <p className="mt-1.5 text-[10px] text-gray-500">
                {user.statusRemarkByName || 'Admin'}
                {user.statusRemarkAt
                  ? ` · ${formatDateTime(user.statusRemarkAt)}`
                  : ''}
              </p>
            </div>
          ) : null}

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">
              Remarks / edit history ({editLogs.length})
            </p>
            {editLogs.length === 0 ? (
              <p className="text-xs text-gray-500">No remarks or edits yet.</p>
            ) : (
              <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {editLogs.map((log: any) => (
                  <li
                    key={log.id || `${log.createdAt}-${log.createdByName}`}
                    className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5"
                  >
                    <p className="text-[10px] text-gray-500 mb-1.5">
                      {log.createdByName || 'Admin'} ·{' '}
                      {formatDateTime(log.createdAt)}
                    </p>
                    <ul className="space-y-1">
                      {(log.changes || []).map(
                        (
                          change: { field: string; from: string; to: string },
                          i: number,
                        ) => (
                          <li
                            key={`${log.id}-${change.field}-${i}`}
                            className="text-xs text-gray-800"
                          >
                            <span className="font-medium">{change.field}:</span>{' '}
                            <span className="text-gray-500">{change.from}</span>
                            {' → '}
                            <span>{change.to}</span>
                          </li>
                        ),
                      )}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {user.id ? (
            <VerificationDocsSection userId={String(user.id)} />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
