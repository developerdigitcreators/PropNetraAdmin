'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import {
  adminUsersService,
  type DeveloperProfileStatsMode,
  type MasterProfile,
  type MasterProfileStats,
  type MasterDeveloperShowcaseItem,
} from '@/services/admin-users.service';
import { apiErrorInfo } from '@/services/password-reset.service';
import { useAuthStore } from '@/store/use-auth-store';

function isDeveloperProfile(profile: MasterProfile): boolean {
  if (profile.appRole === 'developer') return true;
  return isDeveloperAppRole(profile.user.roleName);
}

function isDeveloperAppRole(role?: string | null) {
  const r = String(role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  return r === 'developer';
}

function defaultProfileStats(mode: DeveloperProfileStatsMode = 'dynamic'): MasterProfileStats {
  return { mode, live: {}, display: {} };
}

function StatsField({ label, value }: { label: string; value?: string | number | null }) {
  const text = value == null || value === '' ? '—' : String(value);
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 break-words text-sm text-gray-800">{text}</p>
    </div>
  );
}

export function ProfileStatsSection({
  userId,
  stats,
  canUpdate,
  onSaved,
  registerLeaveGuard,
}: {
  userId: string;
  stats: MasterProfileStats;
  canUpdate: boolean;
  onSaved: () => void;
  registerLeaveGuard?: (confirmLeave: (() => Promise<boolean>) | null) => void;
}) {
  const [mode, setMode] = useState<DeveloperProfileStatsMode>(stats.mode);
  const [manualProjects, setManualProjects] = useState(() =>
    String(stats.manualTotalProjects ?? ''),
  );
  const [manualCities, setManualCities] = useState(() => String(stats.manualTotalCities ?? ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const baselineProjects = String(stats.manualTotalProjects ?? '');
  const baselineCities = String(stats.manualTotalCities ?? '');

  useEffect(() => {
    setMode(stats.mode);
    setManualProjects(baselineProjects);
    setManualCities(baselineCities);
    setError('');
  }, [stats, baselineProjects, baselineCities]);

  const dirty = useMemo(() => {
    if (mode !== stats.mode) return true;
    if (mode === 'manual') {
      return manualProjects !== baselineProjects || manualCities !== baselineCities;
    }
    return false;
  }, [mode, stats.mode, manualProjects, manualCities, baselineProjects, baselineCities]);

  const resetDraft = useCallback(() => {
    setMode(stats.mode);
    setManualProjects(baselineProjects);
    setManualCities(baselineCities);
    setError('');
  }, [stats.mode, baselineProjects, baselineCities]);

  const save = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      if (mode === 'dynamic') {
        await adminUsersService.patchUser(userId, { developerProfileStatsMode: 'dynamic' });
        onSaved();
        return;
      }
      const totalProjectCount = Number(manualProjects);
      const totalCities = Number(manualCities);
      if (!Number.isFinite(totalProjectCount) || totalProjectCount < 0) {
        setError('Enter a valid total projects count.');
        throw new Error('validation');
      }
      if (!Number.isFinite(totalCities) || totalCities < 0) {
        setError('Enter a valid total cities count.');
        throw new Error('validation');
      }
      await adminUsersService.patchUser(userId, {
        developerProfileStatsMode: 'manual',
        totalProjectCount,
        totalCities,
      });
      onSaved();
    } catch (err) {
      if ((err as Error)?.message !== 'validation') {
        setError(apiErrorInfo(err, 'Failed to save profile stats.').message);
      }
      throw err;
    } finally {
      setBusy(false);
    }
  }, [mode, manualProjects, manualCities, onSaved, userId]);

  const { dialog, confirmLeave } = useUnsavedChangesGuard({
    dirty,
    onSave: save,
    onLeaveWithoutSave: resetDraft,
  });

  useEffect(() => {
    registerLeaveGuard?.(confirmLeave);
    return () => registerLeaveGuard?.(null);
  }, [confirmLeave, registerLeaveGuard]);

  return (
    <>
      {dialog}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Profile stats</h3>
        <div className="mt-3 space-y-3">
          <fieldset className="space-y-2" disabled={!canUpdate || busy}>
            <legend className="sr-only">Profile stats source</legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name={`profile-stats-mode-${userId}`}
                checked={mode === 'dynamic'}
                onChange={() => setMode('dynamic')}
              />
              Use database counts
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name={`profile-stats-mode-${userId}`}
                checked={mode === 'manual'}
                onChange={() => setMode('manual')}
              />
              Manual override
            </label>
          </fieldset>

          {mode === 'dynamic' ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Database</p>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <StatsField label="Total projects" value={stats.live?.totalProjects} />
                <StatsField label="Total cities" value={stats.live?.totalCities} />
              </div>
            </div>
          ) : (
            <div className="grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Total projects</label>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={manualProjects}
                  disabled={!canUpdate || busy}
                  onChange={(e) => setManualProjects(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Total cities</label>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={manualCities}
                  disabled={!canUpdate || busy}
                  onChange={(e) => setManualCities(e.target.value)}
                />
              </div>
            </div>
          )}

          {error ? <p className="text-xs text-red-600">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-3">
            {canUpdate ? (
              <Button type="button" size="sm" disabled={busy || !dirty} onClick={() => void save()}>
                {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            ) : (
              <p className="text-xs text-gray-400">No edit access</p>
            )}
            {dirty && canUpdate ? (
              <span className="text-xs font-medium text-amber-600">Unsaved changes</span>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

export function DeveloperShowcaseReadonly({
  items,
}: {
  items: MasterDeveloperShowcaseItem[];
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">Showcase</h3>
      <p className="mt-1 text-xs text-gray-500">
        Shown in the app only when Launch Update (group chat) is on. The developer edits these in
        the app; admin cannot change them here.
      </p>
      {items.length ? (
        <ol className="mt-3 space-y-2">
          {items.map((row, index) => (
            <li
              key={`${row.sortOrder ?? index + 1}-${row.projectName}-${row.location}`}
              className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2.5 text-sm text-gray-800"
            >
              <span className="font-medium text-gray-900">
                {row.projectName || '—'}
              </span>
              {row.location ? (
                <span className="text-gray-600">{` · ${row.location}`}</span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-gray-500">No showcase projects saved yet.</p>
      )}
    </div>
  );
}

/** Loads master-profile stats for User Analytics (developer users). */
export function DeveloperProfileStatsSection({
  userId,
  refreshKey = 0,
  registerLeaveGuard,
}: {
  userId: string;
  refreshKey?: number;
  registerLeaveGuard?: (confirmLeave: (() => Promise<boolean>) | null) => void;
}) {
  const canUpdateMaster = useAuthStore((s) => s.hasPermission)('app_users_master', 'update');
  const [stats, setStats] = useState<MasterProfileStats | null>(null);
  const [showcase, setShowcase] = useState<MasterDeveloperShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    adminUsersService
      .getMasterProfile(userId)
      .then((profile) => {
        if (cancelled) return;
        if (!isDeveloperProfile(profile)) {
          setStats(null);
          setShowcase([]);
          return;
        }
        setStats(profile.profileStats ?? defaultProfileStats('dynamic'));
        setShowcase(profile.developerShowcase ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setStats(null);
          setLoadError(apiErrorInfo(err, 'Failed to load profile stats.').message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey, reloadTick]);

  if (loading) {
    return (
      <div className="flex justify-center rounded-2xl border border-gray-100 bg-white py-8 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
        {loadError}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      <ProfileStatsSection
        userId={userId}
        stats={stats}
        canUpdate={canUpdateMaster}
        registerLeaveGuard={registerLeaveGuard}
        onSaved={() => setReloadTick((n) => n + 1)}
      />
      <DeveloperShowcaseReadonly items={showcase} />
    </div>
  );
}
