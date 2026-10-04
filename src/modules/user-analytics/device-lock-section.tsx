'use client';

import { useEffect, useState } from 'react';
import { Loader2, RotateCcw, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { isSuperAdmin } from '@/lib/super-admin';
import {
  adminUsersService,
  type UserDeviceLock,
} from '@/services/admin-users.service';
import { subscriptionApiError } from '@/services/subscriptions.service';
import { useAuthStore } from '@/store/use-auth-store';

const RESET_CONFIRM =
  "Reset this user's device? Their next login will bind to the phone they use.";

function statusMeta(lock: UserDeviceLock) {
  if (lock.isDeviceLockExempt) {
    return { label: 'Exempt', className: 'bg-sky-50 text-sky-800 border-sky-200' };
  }
  if (lock.boundDeviceId) {
    return { label: 'Locked', className: 'bg-green-50 text-green-800 border-green-200' };
  }
  return { label: 'Not bound', className: 'bg-gray-50 text-gray-700 border-gray-200' };
}

export function DeviceLockSection({ userId }: { userId: string }) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const permissions = useAuthStore((s) => s.permissions);
  const accessToken = useAuthStore((s) => s.accessToken);
  const superAdmin = isSuperAdmin({ user, activeRole, permissions, accessToken });
  const canRead = superAdmin || hasPermission('users', 'read');
  const canUpdate = superAdmin || hasPermission('users', 'update');

  const [lock, setLock] = useState<UserDeviceLock | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'reset' | 'exempt' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;
    adminUsersService
      .getDeviceLock(userId)
      .then((next) => {
        if (!cancelled) setLock(next);
      })
      .catch((err) => {
        if (!cancelled) setError(subscriptionApiError(err, 'Could not load device lock.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canRead, userId]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (!canRead) return null;

  const resetDevice = async () => {
    if (!window.confirm(RESET_CONFIRM)) return;
    setBusy('reset');
    setError('');
    setNotice('');
    try {
      setLock(await adminUsersService.resetDevice(userId));
      setNotice('Device reset. The next login will bind to the phone they use.');
    } catch (err) {
      setError(subscriptionApiError(err, 'Could not reset device.'));
      setBusy(null);
      return;
    }
    try {
      setLock(await adminUsersService.getDeviceLock(userId));
    } catch {
      // The reset response already holds the updated state.
    } finally {
      setBusy(null);
    }
  };

  const setExempt = async (isExempt: boolean) => {
    setBusy('exempt');
    setError('');
    setNotice('');
    try {
      setLock(await adminUsersService.setDeviceExemption(userId, isExempt));
      setNotice(
        isExempt
          ? 'User is now exempt from device lock.'
          : 'Device lock is on. The next login binds to the phone they use.',
      );
    } catch (err) {
      setError(subscriptionApiError(err, 'Could not update exemption.'));
    } finally {
      setBusy(null);
    }
  };

  const status = lock ? statusMeta(lock) : null;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
          <Smartphone className="h-4 w-4" />
          Device Lock
        </p>
        {status ? (
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${status.className}`}
          >
            {status.label}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          {notice}
        </p>
      ) : null}

      {loading && !lock ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : lock ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Bound device
              </p>
              <p className="break-all font-mono text-sm text-gray-700">
                {lock.boundDeviceId || (
                  <span className="font-sans text-gray-500">Not bound</span>
                )}
              </p>
            </div>
            {canUpdate && lock.boundDeviceId ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy !== null}
                onClick={() => void resetDevice()}
              >
                {busy === 'reset' ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <RotateCcw className="mr-1 h-3 w-3" />
                )}
                Reset Device
              </Button>
            ) : null}
          </div>

          {canUpdate ? (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <Switch
                checked={lock.isDeviceLockExempt}
                disabled={busy !== null}
                onCheckedChange={(checked: boolean) => void setExempt(checked)}
              />
              Exempt from device lock
              {busy === 'exempt' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : null}
            </label>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
