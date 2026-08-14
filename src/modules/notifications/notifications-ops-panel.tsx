'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  notificationsService,
  notificationApiError,
  type NotificationsOps,
} from '@/services/notifications.service';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';

function formatWhen(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type NotificationsOpsPanelProps = {
  canToggle: boolean;
};

export function NotificationsOpsPanel({ canToggle }: NotificationsOpsPanelProps) {
  const [ops, setOps] = useState<NotificationsOps | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmOn, setConfirmOn] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOps(await notificationsService.getOps());
    } catch (err) {
      setOps(null);
      setError(notificationApiError(err, 'Failed to load ops.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const applyKillSwitch = async (next: boolean) => {
    setSaving(true);
    setError('');
    try {
      await notificationsService.updateOps({ cityPushKillSwitch: next });
      setOps((prev) => (prev ? { ...prev, cityPushKillSwitch: next } : prev));
      setConfirmOn(false);
      const fresh = await notificationsService.getOps();
      setOps(fresh);
    } catch (err) {
      setError(notificationApiError(err, 'Failed to update kill-switch.'));
    } finally {
      setSaving(false);
    }
  };

  const onToggle = (checked: boolean) => {
    if (!canToggle || !ops) return;
    if (checked === ops.cityPushKillSwitch) return;
    if (checked) {
      setConfirmOn(true);
      return;
    }
    applyKillSwitch(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !ops) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
    );
  }

  if (!ops) return null;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">City push kill-switch</p>
            <p className="text-xs text-gray-500 mt-1">
              Turns off PropNetra Updates city-alert trays. Listing status and account
              notifications still run. Listing group campaigns are not included.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-xs font-semibold ${ops.cityPushKillSwitch ? 'text-red-600' : 'text-gray-500'}`}
            >
              {ops.cityPushKillSwitch ? 'ON' : 'OFF'}
            </span>
            <Switch
              checked={ops.cityPushKillSwitch}
              onCheckedChange={onToggle}
              disabled={!canToggle || saving}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-900 mb-3">Cities with alerts ON</p>
        {ops.citiesWithAlertsOn.length === 0 ? (
          <p className="text-sm text-gray-500">None.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {ops.citiesWithAlertsOn.map((city) => (
              <div key={city.id || city.name} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-800">{city.name}</span>
                <span className="font-medium text-gray-900">{city.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Counts are for PropNetra Updates only. Listing group campaigns are not shown.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Feed live" value={ops.feedLive} />
        <StatCard label="Feed expired pending" value={ops.feedExpiredPending} />
        <StatCard label="Campaigns sent" value={ops.campaignsSent} />
        <StatCard label="Campaigns failed" value={ops.campaignsFailed} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard label="FCM failed jobs" value={ops.fcmFailedJobs} />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Last cleanup</p>
          <p className="text-2xl font-semibold text-gray-900">{ops.lastCleanupCount ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">{formatWhen(ops.lastCleanupAt)} — flag off, no button here.</p>
        </div>
      </div>

      <Dialog open={confirmOn} onOpenChange={(open) => !open && !saving && setConfirmOn(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="hidden">
            <DialogTitle>Confirm kill-switch</DialogTitle>
            <DialogDescription>Confirm</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center text-center pt-2">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Turn on city push kill-switch?</h3>
            <p className="text-sm text-gray-500 mb-6">
              PropNetra Updates city-alert trays will stop. Listing status and account notifications
              still run.
            </p>
            <div className="flex w-full gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmOn(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => applyKillSwitch(true)}
                disabled={saving}
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Turn on
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
