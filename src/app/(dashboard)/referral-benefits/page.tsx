'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  referralApiError,
  referralService,
  type ReferralSettings,
  type ReferralTier,
} from '@/services/referral.service';
import {
  Gift,
  Loader2,
  Plus,
  Settings2,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';

type EditableTier = {
  track: 'FREE_REFERRER' | 'PAID_REFERRER';
  requiredReferrals: number;
  rewardType: 'FREE_MONTHS' | 'NETRA_PERCENT';
  rewardValue: number;
  rewardCoins: number | null;
  sortOrder: number;
  isActive: boolean;
};

function toEditable(tiers: ReferralTier[]): EditableTier[] {
  return tiers.map((t, i) => ({
    track: t.track,
    requiredReferrals: Number(t.requiredReferrals),
    rewardType: t.rewardType,
    rewardValue: Number(t.rewardValue),
    rewardCoins:
      t.track === 'PAID_REFERRER' && t.rewardCoins != null ? Number(t.rewardCoins) : null,
    sortOrder: t.sortOrder ?? i + 1,
    isActive: t.isActive !== false,
  }));
}

function sortTierRows(rows: Array<{ t: EditableTier; i: number }>) {
  return [...rows].sort(
    (a, b) =>
      a.t.requiredReferrals - b.t.requiredReferrals || a.t.sortOrder - b.t.sortOrder,
  );
}

export default function ReferralBenefitsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canUpdate = hasPermission('subscriptions', 'update');

  const [settings, setSettings] = useState<ReferralSettings | null>(null);
  const [tiers, setTiers] = useState<EditableTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingTiers, setSavingTiers] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, t] = await Promise.all([
        referralService.getSettings(),
        referralService.listTiers(),
      ]);
      setSettings(s);
      setTiers(toEditable(t));
    } catch (err) {
      setError(referralApiError(err, 'Failed to load referral config.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = async () => {
    if (!settings || !canUpdate) return;
    setSavingSettings(true);
    setMessage('');
    setError('');
    try {
      const updated = await referralService.updateSettings({
        enabled: settings.enabled,
        coinsPerRupee: Number(settings.coinsPerRupee),
        shareMessageTemplate: settings.shareMessageTemplate,
        importantInfo: settings.importantInfo,
        freeMilestoneWindowDays: Number(settings.freeMilestoneWindowDays),
        freeStandardGraceDays: 0,
        freeStandardMonthsPerReferral: Number(settings.freeStandardMonthsPerReferral),
        paidMilestoneWindowDays: Number(settings.paidMilestoneWindowDays),
        paidStandardPercent: Number(settings.paidStandardPercent),
        paidStandardCoins: null,
        paidMilestoneResetDays: Number(settings.paidMilestoneResetDays),
        paidPendingExpiryDays: Number(settings.paidPendingExpiryDays),
        freeMilestonesEnabledForNewUsers:
          settings.freeMilestonesEnabledForNewUsers !== false,
        paidMilestonesEnabledForNewUsers:
          settings.paidMilestonesEnabledForNewUsers !== false,
        renewResetsMilestones: settings.renewResetsMilestones !== false,
      });
      setSettings(updated);
      setMessage('Program settings saved.');
    } catch (err) {
      setError(referralApiError(err, 'Failed to save settings.'));
    } finally {
      setSavingSettings(false);
    }
  };

  const saveTiers = async () => {
    if (!canUpdate) return;
    setSavingTiers(true);
    setMessage('');
    setError('');
    try {
      const normalized = tiers.map((t, i) => ({
        ...t,
        sortOrder: i + 1,
      }));
      const saved = await referralService.replaceTiers(normalized);
      setTiers(toEditable(saved));
      setMessage('Reward tiers saved.');
    } catch (err) {
      setError(referralApiError(err, 'Failed to save tiers.'));
    } finally {
      setSavingTiers(false);
    }
  };

  const addTier = (track: EditableTier['track']) => {
    const sameTrack = tiers.filter((t) => t.track === track);
    const nextRequired =
      sameTrack.length > 0
        ? Math.max(...sameTrack.map((t) => t.requiredReferrals)) + 1
        : 1;
    setTiers((prev) => [
      ...prev,
      {
        track,
        requiredReferrals: nextRequired,
        rewardType: track === 'FREE_REFERRER' ? 'FREE_MONTHS' : 'NETRA_PERCENT',
        rewardValue: track === 'FREE_REFERRER' ? 1 : 15,
        rewardCoins: null,
        sortOrder: sameTrack.length + 1,
        isActive: true,
      },
    ]);
  };

  const updateTier = (index: number, patch: Partial<EditableTier>) => {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  const removeTier = (index: number) => {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const freeTiers = sortTierRows(
    tiers
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.track === 'FREE_REFERRER'),
  );
  const paidTiers = sortTierRows(
    tiers
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.track === 'PAID_REFERRER'),
  );

  return (
    <PermissionGuard permission="subscriptions:read">
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/' },
            { label: 'Referral Benefits' },
          ]}
        />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Gift className="h-6 w-6 text-primary" />
              Referral Benefits
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Set up what free and paid users earn when they refer others.{' '}
              <Link href="/referral-overview" className="text-primary underline">
                View referral chains
              </Link>
            </p>
          </div>
          {settings ? (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
                settings.enabled
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-gray-100 text-gray-600 ring-gray-200'
              }`}
            >
              {settings.enabled ? 'Program active' : 'Program disabled'}
            </span>
          ) : null}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {message}
              </p>
            ) : null}

            {settings ? (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Free reward tiers
                    </p>
                    <p className="mt-1 text-2xl font-semibold">{freeTiers.length}</p>
                  </div>
                  <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Paid reward tiers
                    </p>
                    <p className="mt-1 text-2xl font-semibold">{paidTiers.length}</p>
                  </div>
                  <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Coins per ₹1
                    </p>
                    <p className="mt-1 text-2xl font-semibold">{Number(settings.coinsPerRupee)}</p>
                  </div>
                </div>

                <section className="rounded-xl border bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-medium">General settings</h2>
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Turn the program on or off, set the invite message, and define how NetraCoins
                    are calculated.
                  </p>

                  <div className="space-y-4">
                    <label className="flex items-center gap-2 rounded-lg border bg-gray-50/50 px-3 py-2.5 text-sm">
                      <input
                        type="checkbox"
                        checked={settings.enabled}
                        disabled={!canUpdate}
                        onChange={(e) =>
                          setSettings({ ...settings, enabled: e.target.checked })
                        }
                      />
                      <span className="font-medium">Refer & Earn program enabled</span>
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          NetraCoins per ₹1 spent
                        </label>
                        <p className="mb-2 text-xs text-muted-foreground">
                          Used when calculating paid referrer rewards.
                        </p>
                        <Input
                          type="number"
                          step="0.01"
                          disabled={!canUpdate}
                          value={Number(settings.coinsPerRupee)}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              coinsPerRupee: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Invite share message
                      </label>
                      <p className="mb-2 text-xs text-muted-foreground">
                        Use <code className="rounded bg-gray-100 px-1">{'{{inviteUrl}}'}</code> for
                        the referral link.
                      </p>
                      <textarea
                        className="min-h-[88px] w-full rounded-md border px-3 py-2 text-sm"
                        disabled={!canUpdate}
                        value={settings.shareMessageTemplate || ''}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            shareMessageTemplate: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  {canUpdate ? (
                    <Button className="mt-4" onClick={saveSettings} disabled={savingSettings}>
                      {savingSettings ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Save general settings
                    </Button>
                  ) : null}
                </section>

                <div className="grid gap-6 lg:grid-cols-2">
                  <RulesCard
                    icon={<Users className="h-5 w-5 text-sky-600" />}
                    title="Free user rules"
                    description="Applies to users who are not on a paid subscription."
                    settings={settings}
                    canUpdate={canUpdate}
                    onChange={setSettings}
                    toggles={[
                      {
                        key: 'freeMilestonesEnabledForNewUsers',
                        label: 'Milestone for new free users',
                        hint: 'OFF → new free users see standard benefits only (existing users unchanged).',
                        accent: 'sky',
                      },
                    ]}
                    fields={[
                      {
                        key: 'freeMilestoneWindowDays',
                        label: 'Milestone window',
                        hint: 'Days from sign-up to hit free milestone slabs (when milestones enrolled).',
                        suffix: 'days',
                      },
                      {
                        key: 'freeStandardMonthsPerReferral',
                        label: 'After milestones / standard',
                        hint: 'Free months added per referral once in standard mode.',
                        suffix: 'months / referral',
                      },
                    ]}
                  />
                  <RulesCard
                    icon={<Wallet className="h-5 w-5 text-amber-600" />}
                    title="Paid user rules"
                    description="Applies to subscribed users earning Referral NetraCoins (% of referee’s paid amount)."
                    settings={settings}
                    canUpdate={canUpdate}
                    onChange={setSettings}
                    toggles={[
                      {
                        key: 'paidMilestonesEnabledForNewUsers',
                        label: 'Milestone for new paid users',
                        hint: 'OFF → new paid enrollments start on standard % only (existing users unchanged).',
                        accent: 'amber',
                      },
                      {
                        key: 'renewResetsMilestones',
                        label: 'Renew resets milestones',
                        hint: 'ON → at next subscription renew/end, milestone cycle resets to 0. Referral coins always expire on plan end.',
                        accent: 'amber',
                      },
                    ]}
                    fields={[
                      {
                        key: 'paidStandardPercent',
                        label: 'Standard reward %',
                        hint: 'After milestones or if missed — % of referee’s actual paid amount.',
                        suffix: '%',
                      },
                      {
                        key: 'paidMilestoneWindowDays',
                        label: 'Milestone window',
                        hint: 'Days from subscription start to hit paid slabs.',
                        suffix: 'days',
                      },
                      {
                        key: 'paidMilestoneResetDays',
                        label: 'Yearly reset days',
                        hint: 'Legacy calendar reset window (also gated by Renew toggle).',
                        suffix: 'days',
                      },
                      {
                        key: 'paidPendingExpiryDays',
                        label: 'Pending expiry',
                        hint: 'Days to wait for referee to subscribe before reward expires.',
                        suffix: 'days',
                      },
                    ]}
                  />
                </div>

                {canUpdate ? (
                  <div className="flex justify-end">
                    <Button onClick={saveSettings} disabled={savingSettings} variant="outline">
                      {savingSettings ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Save all rules
                    </Button>
                  </div>
                ) : null}
              </>
            ) : null}

            <TierSection
              title="Free user rewards"
              subtitle="When a free user refers others, they earn free subscription months at these milestones."
              example="Example: 3 referrals → 6 free months"
              rows={freeTiers}
              valueLabel="Free months"
              valueSuffix="months"
              canUpdate={canUpdate}
              onAdd={() => addTier('FREE_REFERRER')}
              onChange={updateTier}
              onRemove={removeTier}
            />

            <PaidTierSection
              title="Paid user rewards"
              subtitle="Milestone % of the referee’s actual paid amount (intro or full). No fixed coin amounts."
              example="Example: 1 referral at 15% of ₹899 → 135 Referral NetraCoins"
              rows={paidTiers}
              canUpdate={canUpdate}
              onAdd={() => addTier('PAID_REFERRER')}
              onChange={updateTier}
              onRemove={removeTier}
            />

            {canUpdate ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed bg-gray-50/50 p-4">
                <p className="text-sm text-gray-600">
                  Save after adding or editing reward tiers above.
                </p>
                <Button onClick={saveTiers} disabled={savingTiers}>
                  {savingTiers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save reward tiers
                </Button>
              </div>
            ) : null}

            <section className="rounded-xl border border-dashed bg-gray-50/50 p-4 text-xs text-gray-600">
              <p className="font-medium text-gray-800">Quick guide</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>
                  <strong>Free tiers</strong> — milestone rewards in free months when referrals sign
                  up.
                </li>
                <li>
                  <strong>Paid tiers</strong> — set milestone % and the fixed NetraCoins credited
                  when that milestone is hit.
                </li>
                <li>
                  <strong>Standard mode</strong> — kicks in after milestones end or deadlines pass;
                  uses the fixed % and NetraCoins set in paid user rules.
                </li>
              </ul>
            </section>
          </>
        )}
      </div>
    </PermissionGuard>
  );
}

function RulesCard({
  icon,
  title,
  description,
  settings,
  canUpdate,
  onChange,
  fields,
  toggles,
  dualValueFields,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  settings: ReferralSettings;
  canUpdate: boolean;
  onChange: (s: ReferralSettings) => void;
  fields: Array<{
    key: keyof ReferralSettings;
    label: string;
    hint: string;
    suffix: string;
  }>;
  toggles?: Array<{
    key: keyof ReferralSettings;
    label: string;
    hint: string;
    accent?: 'sky' | 'amber';
  }>;
  dualValueFields?: Array<{
    label: string;
    hint: string;
    fields: Array<{ key: keyof ReferralSettings; suffix: string }>;
  }>;
}) {
  return (
    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-medium">{title}</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      <div className="space-y-4">
        {toggles?.map((toggle) => (
          <label
            key={String(toggle.key)}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${
              toggle.accent === 'amber' ? 'bg-amber-50/60' : 'bg-sky-50/60'
            }`}
          >
            <input
              type="checkbox"
              className="mt-0.5"
              checked={settings[toggle.key] !== false}
              disabled={!canUpdate}
              onChange={(e) =>
                onChange({ ...settings, [toggle.key]: e.target.checked })
              }
            />
            <span>
              <span className="font-medium">{toggle.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {toggle.hint}
              </span>
            </span>
          </label>
        ))}
        {dualValueFields?.map((group) => (
          <div key={group.label} className="rounded-lg border bg-gray-50/40 p-3">
            <label className="block text-sm font-medium text-gray-800">{group.label}</label>
            <p className="mt-0.5 text-xs text-muted-foreground">{group.hint}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {group.fields.map((field, index) => (
                <div key={field.key} className="flex items-center gap-2">
                  {index > 0 ? <span className="text-xs text-gray-400">→</span> : null}
                  <Input
                    type="number"
                    className="w-24"
                    disabled={!canUpdate}
                    value={Number(settings[field.key] ?? 0)}
                    onChange={(e) =>
                      onChange({ ...settings, [field.key]: Number(e.target.value) })
                    }
                  />
                  <span className="text-xs text-gray-500">{field.suffix}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {fields.map((field) => (
          <div key={field.key} className="rounded-lg border bg-gray-50/40 p-3">
            <label className="block text-sm font-medium text-gray-800">{field.label}</label>
            <p className="mt-0.5 text-xs text-muted-foreground">{field.hint}</p>
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="number"
                className="max-w-[120px]"
                disabled={!canUpdate}
                value={Number(settings[field.key])}
                onChange={(e) =>
                  onChange({ ...settings, [field.key]: Number(e.target.value) })
                }
              />
              <span className="text-xs text-gray-500">{field.suffix}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TierSection({
  title,
  subtitle,
  example,
  rows,
  valueLabel,
  valueSuffix,
  canUpdate,
  onAdd,
  onChange,
  onRemove,
}: {
  title: string;
  subtitle: string;
  example: string;
  rows: Array<{ t: EditableTier; i: number }>;
  valueLabel: string;
  valueSuffix: string;
  canUpdate: boolean;
  onAdd: () => void;
  onChange: (index: number, patch: Partial<EditableTier>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <section className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <p className="mt-1 text-xs text-gray-500">{example}</p>
        </div>
        {canUpdate ? (
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="mr-1 h-4 w-4" />
            Add tier
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed py-8 text-center text-sm text-gray-500">
          No tiers yet. Click &quot;Add tier&quot; to create one.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ t, i }) => (
            <li
              key={i}
              className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 ${
                t.isActive ? 'bg-white' : 'bg-gray-50 opacity-70'
              }`}
            >
              <span className="text-sm text-gray-500">When user gets</span>
              <Input
                type="number"
                className="w-20"
                disabled={!canUpdate}
                value={t.requiredReferrals}
                onChange={(e) =>
                  onChange(i, { requiredReferrals: Number(e.target.value) })
                }
              />
              <span className="text-sm text-gray-500">
                referral{t.requiredReferrals === 1 ? '' : 's'} →
              </span>
              <Input
                type="number"
                className="w-20"
                disabled={!canUpdate}
                value={t.rewardValue}
                onChange={(e) => onChange(i, { rewardValue: Number(e.target.value) })}
              />
              <span className="text-sm font-medium text-gray-800">{valueSuffix}</span>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                ({valueLabel})
              </span>

              <div className="ml-auto flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    disabled={!canUpdate}
                    checked={t.isActive}
                    onChange={(e) => onChange(i, { isActive: e.target.checked })}
                  />
                  Active
                </label>
                {canUpdate ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(i)}
                    aria-label="Remove tier"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PaidTierSection({
  title,
  subtitle,
  example,
  rows,
  canUpdate,
  onAdd,
  onChange,
  onRemove,
}: {
  title: string;
  subtitle: string;
  example: string;
  rows: Array<{ t: EditableTier; i: number }>;
  canUpdate: boolean;
  onAdd: () => void;
  onChange: (index: number, patch: Partial<EditableTier>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <section className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <p className="mt-1 text-xs text-gray-500">{example}</p>
        </div>
        {canUpdate ? (
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="mr-1 h-4 w-4" />
            Add tier
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed py-8 text-center text-sm text-gray-500">
          No tiers yet. Click &quot;Add tier&quot; to create one.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ t, i }) => (
            <li
              key={i}
              className={`rounded-lg border px-4 py-3 ${
                t.isActive ? 'bg-white' : 'bg-gray-50 opacity-70'
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-gray-500">When user gets</span>
                <Input
                  type="number"
                  className="w-20"
                  disabled={!canUpdate}
                  value={t.requiredReferrals}
                  onChange={(e) =>
                    onChange(i, { requiredReferrals: Number(e.target.value) })
                  }
                />
                <span className="text-sm text-gray-500">
                  referral{t.requiredReferrals === 1 ? '' : 's'} at
                </span>
                <Input
                  type="number"
                  className="w-20"
                  disabled={!canUpdate}
                  value={t.rewardValue}
                  onChange={(e) => onChange(i, { rewardValue: Number(e.target.value) })}
                />
                <span className="text-sm font-medium text-gray-800">%</span>
                <span className="text-sm text-gray-500">
                  of referee’s paid amount → Referral NetraCoins
                </span>

                <div className="ml-auto flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      disabled={!canUpdate}
                      checked={t.isActive}
                      onChange={(e) => onChange(i, { isActive: e.target.checked })}
                    />
                    Active
                  </label>
                  {canUpdate ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemove(i)}
                      aria-label="Remove tier"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
