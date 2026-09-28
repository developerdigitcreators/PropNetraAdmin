'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  subscriptionApiError,
  subscriptionsService,
  type DbfModeDisableResult,
  type DbfModeImpact,
  type DbfModeState,
} from '@/services/subscriptions.service';
import { AlertTriangle, CalendarClock, History, Loader2, Lock } from 'lucide-react';

function formatIstDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value.length === 10 ? `${value}T00:00:00+05:30` : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function formatIstDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

const ACTION_LABEL: Record<DbfModeState['history'][number]['action'], string> = {
  on: 'Paid mode on',
  off: 'Paid mode off',
  postpone: 'Free-end postponed',
};

type Props = {
  canUpdate: boolean;
};

export function DbfModeCard({ canUpdate }: Props) {
  const [mode, setMode] = useState<DbfModeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [freeEndsOn, setFreeEndsOn] = useState('');
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState('');

  const [offOpen, setOffOpen] = useState(false);
  const [impact, setImpact] = useState<DbfModeImpact | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [notifyUsers, setNotifyUsers] = useState(true);
  const [offConfirmed, setOffConfirmed] = useState(false);
  const [offSaving, setOffSaving] = useState(false);
  const [offError, setOffError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setMode(await subscriptionsService.getDbfMode());
    } catch (err) {
      setError(subscriptionApiError(err, 'Failed to load Direct Builder Floor mode.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const isPaid = mode?.mode === 'paid';
  const isPostpone = isPaid;
  const minDate = (() => {
    if (!mode) return '';
    if (!isPaid) return mode.minFreeEndsOn;
    if (!mode.freeEndsOn) return mode.minFreeEndsOn;
    const next = new Date(`${mode.freeEndsOn}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString().slice(0, 10);
  })();

  const openDialog = () => {
    setFreeEndsOn(minDate);
    setDialogError('');
    setNotice('');
    setDialogOpen(true);
  };

  const openOffDialog = async () => {
    setOffOpen(true);
    setOffConfirmed(false);
    setNotifyUsers(true);
    setOffError('');
    setNotice('');
    setImpact(null);
    setImpactLoading(true);
    try {
      setImpact(await subscriptionsService.getDbfModeImpact());
    } catch (err) {
      setOffError(subscriptionApiError(err, 'Failed to load the impact of turning Paid mode off.'));
    } finally {
      setImpactLoading(false);
    }
  };

  const submit = async () => {
    if (!freeEndsOn) {
      setDialogError('Pick the date when the free period ends.');
      return;
    }
    if (minDate && freeEndsOn < minDate) {
      setDialogError(
        isPostpone
          ? 'The new date must be later than the current free-end date.'
          : `Pick a date on or after ${formatIstDate(minDate)} (at least 15 days from today).`,
      );
      return;
    }
    setSaving(true);
    setDialogError('');
    try {
      setMode(await subscriptionsService.enableDbfPaidMode(freeEndsOn));
      setDialogOpen(false);
    } catch (err) {
      setDialogError(subscriptionApiError(err, 'Failed to update Direct Builder Floor mode.'));
    } finally {
      setSaving(false);
    }
  };

  const submitOff = async () => {
    if (!offConfirmed) {
      setOffError('Confirm that you want to turn Paid mode off.');
      return;
    }
    setOffSaving(true);
    setOffError('');
    try {
      const { mode: next, result } = await subscriptionsService.disableDbfPaidMode(notifyUsers);
      setMode(next);
      setOffOpen(false);
      setNotice(describeOffResult(result));
    } catch (err) {
      setOffError(subscriptionApiError(err, 'Failed to turn Paid mode off.'));
    } finally {
      setOffSaving(false);
    }
  };

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Plan mode</h2>
            {mode ? (
              <Badge variant={isPaid ? 'default' : 'secondary'}>
                {isPaid ? 'Paid' : 'Free'}
              </Badge>
            ) : null}
            {mode && mode.cycle > 0 ? (
              <span className="text-xs text-gray-500">Cycle {mode.cycle}</span>
            ) : null}
          </div>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            In Free mode every Direct Builder Floor user can view and post within the Post Free
            Limit. When Paid mode is on, existing users keep free access until the date you pick
            (with reminders 15, 7, 3 and 1 days before), then need the plan; new sign-ups need the
            plan straight away. Turning it off unlocks everyone; paid users keep their plan until
            it expires but autopay stops. Turning it on again starts a fresh free period.
          </p>
        </div>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : mode ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Paid mode</span>
            <Switch
              checked={isPaid}
              disabled={!canUpdate}
              onCheckedChange={(checked) => {
                if (checked && !isPaid) openDialog();
                else if (!checked && isPaid) void openOffDialog();
              }}
            />
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      {mode && isPaid ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Paid mode on since
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {formatIstDate(mode.paidEnabledAt)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Free access ends
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {formatIstDate(mode.freeEndsOn)}
            </p>
            <p className="text-xs text-gray-500">
              {mode.cutoffPassed ? 'Free period is over' : 'Existing users only'}
            </p>
          </div>
          <div className="flex items-center rounded-lg bg-gray-50 px-4 py-3">
            {mode.canPostpone && canUpdate ? (
              <Button variant="outline" className="w-full gap-2" onClick={openDialog}>
                <CalendarClock className="h-4 w-4" />
                Postpone free-end date
              </Button>
            ) : (
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <Lock className="h-4 w-4" />
                {mode.cutoffPassed
                  ? 'Free-end date has passed and can no longer change.'
                  : 'No edit access'}
              </p>
            )}
          </div>
        </div>
      ) : null}

      {mode && !isPaid && mode.disabledAt ? (
        <p className="mt-4 text-sm text-gray-500">
          Paid mode was turned off on {formatIstDateTime(mode.disabledAt)}.
        </p>
      ) : null}

      {mode && mode.history.length > 0 ? (
        <div className="mt-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <History className="h-4 w-4" />
            History
          </h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Cycle</th>
                  <th className="px-3 py-2">Free access ends</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mode.history.map((item, index) => (
                  <tr key={`${item.at}-${index}`}>
                    <td className="px-3 py-2 text-gray-700">{formatIstDateTime(item.at)}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {ACTION_LABEL[item.action]}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{item.cycle}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {item.action === 'off' ? '—' : formatIstDate(item.freeEndsOn)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={(open) => !saving && setDialogOpen(open)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isPostpone ? 'Postpone free-end date' : 'Turn on Paid mode'}
            </DialogTitle>
            <DialogDescription>
              {isPostpone
                ? `Currently ends on ${formatIstDate(mode?.freeEndsOn)}. You can only move it later, and only before it passes. Users in the free period are notified of the new date.`
                : 'Existing Direct Builder Floor users (including anyone who joined while Paid mode was off) keep free access until this date. New users must buy the plan to view or post.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Free access ends on</label>
              <Input
                type="date"
                value={freeEndsOn}
                min={minDate || undefined}
                onChange={(e) => setFreeEndsOn(e.target.value)}
              />
              {!isPostpone ? (
                <p className="text-xs text-gray-500">
                  At least 15 days from today (earliest {formatIstDate(minDate)}).
                </p>
              ) : null}
            </div>

            {dialogError ? <p className="text-sm text-red-600">{dialogError}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isPostpone ? 'Postpone' : 'Turn on Paid mode'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={offOpen} onOpenChange={(open) => !offSaving && setOffOpen(open)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Turn off Paid mode</DialogTitle>
            <DialogDescription>
              Direct Builder Floor becomes free for everyone. Plan-locked listings are unlocked
              and new users join free. Paid users keep their plan until it expires, but autopay
              will stop so they are not charged again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {impactLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking impact…
              </div>
            ) : impact ? (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <ImpactStat label="Listings to unlock" value={impact.lockedListings} />
                <ImpactStat label="Locked users" value={impact.lockedUsers} />
                <ImpactStat label="Users in free period" value={impact.freeGraceUsers} />
                <ImpactStat label="Paid subscribers" value={impact.paidSubscribers} />
                <ImpactStat
                  label="Autopay to stop"
                  value={impact.autopaySubscribers}
                  className="col-span-2"
                />
              </div>
            ) : null}

            <label className="flex items-start gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={notifyUsers}
                onChange={(e) => setNotifyUsers(e.target.checked)}
              />
              <span>Notify Direct Builder Floor users that the plan is free now</span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={offConfirmed}
                onChange={(e) => setOffConfirmed(e.target.checked)}
              />
              <span className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                I understand autopay will stop for all paid users. Turning Paid mode on again
                starts a new free period.
              </span>
            </label>

            {offError ? <p className="text-sm text-red-600">{offError}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOffOpen(false)} disabled={offSaving}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void submitOff()}
              disabled={offSaving || impactLoading}
            >
              {offSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Turn off Paid mode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ImpactStat({
  label,
  value,
  className = '',
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={`rounded-lg bg-gray-50 px-3 py-2 ${className}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-base font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function describeOffResult(result: DbfModeDisableResult): string {
  const parts = [`Paid mode is off. Unlocked ${result.unlockedListings} listing(s)`];
  parts.push(`stopped autopay for ${result.autopayStopped} subscriber(s)`);
  let text = parts.join(', ') + '.';
  if (result.autopayFailed > 0) {
    text += ` Autopay could not be stopped for ${result.autopayFailed} subscriber(s); check them in Razorpay.`;
  }
  return text;
}
