'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiErrorInfo } from '@/services/password-reset.service';
import type {
  FakeStatsSchedule,
  FakeStatsScheduleInput,
  FakeStatsScheduleStatus,
} from '@/services/listing-fake-stats.service';
import { Loader2 } from 'lucide-react';

export const EMPTY_SCHEDULE: FakeStatsScheduleInput = { date: '', startTime: '', endTime: '' };

const STATUS_TONE: Record<FakeStatsScheduleStatus, string> = {
  pending: 'bg-amber-50 text-amber-800',
  running: 'bg-blue-50 text-blue-700',
  issue: 'bg-red-50 text-red-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

export function ScheduleStatusBadge({ row }: { row: FakeStatsSchedule }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_TONE[row.status]} ${
        row.status === 'issue' && row.error ? 'cursor-help' : ''
      }`}
      title={row.status === 'issue' && row.error ? row.error : undefined}
    >
      {row.statusLabel}
    </span>
  );
}

export function formatScheduleDate(date: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date || '—';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toLocaleDateString('en-IN', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });
}

export function todayIst() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/** Inline date + start + end inputs with Save / Cancel; shows the API error under the inputs. */
export function ScheduleForm({
  initial,
  saveLabel = 'Save',
  requireTimes = true,
  onSubmit,
  onCancel,
  onChange,
}: {
  initial: FakeStatsScheduleInput;
  saveLabel?: string;
  requireTimes?: boolean;
  onSubmit: (value: FakeStatsScheduleInput) => Promise<void>;
  onCancel: () => void;
  onChange?: (value: FakeStatsScheduleInput) => void;
}) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const patch = (next: Partial<FakeStatsScheduleInput>) => {
    const merged = { ...value, ...next };
    setValue(merged);
    setError('');
    onChange?.(merged);
  };

  const submit = async () => {
    if (!value.date || (requireTimes && (!value.startTime || !value.endTime))) {
      setError(requireTimes ? 'Pick a date, start time and end time.' : 'Pick a date.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit(value);
    } catch (err) {
      setError(apiErrorInfo(err, 'Failed to save the schedule.').message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="space-y-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={value.date}
          min={todayIst()}
          onChange={(e) => patch({ date: e.target.value })}
          className="h-8 w-40 bg-white"
          aria-label="Date"
        />
        <Input
          type="time"
          value={value.startTime}
          onChange={(e) => patch({ startTime: e.target.value })}
          className="h-8 w-32 bg-white"
          aria-label="Start time"
        />
        <span className="text-xs text-gray-500">to</span>
        <Input
          type="time"
          value={value.endTime}
          onChange={(e) => patch({ endTime: e.target.value })}
          className="h-8 w-32 bg-white"
          aria-label="End time"
        />
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
          {saveLabel}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </form>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(apiErrorInfo(err, 'Something went wrong.').message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) {
          setError('');
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Keep
          </Button>
          <Button variant="destructive" onClick={() => void confirm()} disabled={busy}>
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
