'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Button } from '@/components/ui/button';
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
  featureControlsService,
  type FeatureControlKey,
  type FeatureControls,
  type ListingViewersKey,
} from '@/services/feature-controls.service';
import {
  DEVELOPER_GROUP_RETENTION_MAX,
  DEVELOPER_GROUP_RETENTION_MIN,
  developerGroupsService,
  type DeveloperGroupSettings,
} from '@/services/developer-groups.service';
import { subscriptionApiError } from '@/services/subscriptions.service';
import { Loader2, RefreshCw, ToggleRight } from 'lucide-react';

const SECTIONS: Array<{
  title: string;
  items: Array<{ key: FeatureControlKey; label: string; hint: string }>;
}> = [
  {
    title: 'Netra Connect',
    items: [
      {
        key: 'netra_connect_enabled',
        label: 'Netra Connect',
        hint: 'ON: Chats and message icon visible, app icon count shown. OFF: Chats count and message icon hidden, sidebar Push Notification tab shown, lead pushes open My Leads.',
      },
    ],
  },
  {
    title: 'Listing viewers',
    items: [
      {
        key: 'listing_viewers_developer_enabled',
        label: 'Developers',
        hint: 'Show who viewed this developer’s listings. Contact reveal uses plan limits only.',
      },
      {
        key: 'listing_viewers_dbf_enabled',
        label: 'Direct Builder Floor',
        hint: 'Show who viewed this Direct Builder Floor user’s listings. Contact reveal uses plan limits only.',
      },
      {
        key: 'listing_viewers_agent_enabled',
        label: 'Agents',
        hint: 'Show who viewed this agent’s listings. Contact reveal uses plan limits only.',
      },
    ],
  },
  {
    title: 'Developer postings',
    items: [
      {
        key: 'developer_share_count_enabled',
        label: 'Share count',
        hint: 'Show how many times a developer project was shared on cards and the detail page.',
      },
      {
        key: 'developer_compare_agents_enabled',
        label: 'Agents can compare developer projects',
        hint: 'When off, the Compare option is hidden for every agent. Developers never get Compare.',
      },
    ],
  },
  {
    title: 'Launch Reels',
    items: [
      {
        key: 'reels_silent_enabled',
        label: 'Silent option',
        hint: 'Let viewers mute / unmute reels.',
      },
      {
        key: 'reels_share_enabled',
        label: 'Share option',
        hint: 'Show the share button on reels.',
      },
      {
        key: 'reels_views_enabled',
        label: 'Views count',
        hint: 'Show the views count on reels.',
      },
    ],
  },
  {
    title: 'Autopay reminder',
    items: [
      {
        key: 'autopay_renewal_reminder_enabled',
        label: 'Autopay reminder',
        hint: 'Send push 24 hours before a user’s plan ends.',
      },
    ],
  },
];

const LISTING_VIEWERS_KEYS: ListingViewersKey[] = [
  'listing_viewers_developer_enabled',
  'listing_viewers_dbf_enabled',
  'listing_viewers_agent_enabled',
];

function isListingViewersKey(key: FeatureControlKey): key is ListingViewersKey {
  return (LISTING_VIEWERS_KEYS as string[]).includes(key);
}

function formatIstDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function viewersSinceNote(controls: FeatureControls | null, key: ListingViewersKey) {
  if (!controls?.[key]) return null;
  const since = controls.enabledSince?.[key];
  const date = since ? formatIstDate(since) : '';
  return date
    ? `Viewers visible since ${date}`
    : 'Showing all past viewers. Turn OFF and ON to start from today.';
}

function SwitchRow({
  label,
  hint,
  note,
  checked,
  disabled,
  saving,
  onChange,
}: {
  label: string;
  hint: string;
  note?: string | null;
  checked: boolean;
  disabled: boolean;
  saving: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="mt-0.5 text-xs text-gray-500">{hint}</p>
        {note ? <p className="mt-1 text-xs font-medium text-primary">{note}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : null}
        <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
      </div>
    </div>
  );
}

export default function FeatureControlsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canUpdate = hasPermission('feature_controls', 'update');

  const [controls, setControls] = useState<FeatureControls | null>(null);
  const [groupSettings, setGroupSettings] = useState<DeveloperGroupSettings | null>(null);
  const [retentionDraft, setRetentionDraft] = useState(String(DEVELOPER_GROUP_RETENTION_MIN));
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmKey, setConfirmKey] = useState<ListingViewersKey | null>(null);
  const [confirmNetraOff, setConfirmNetraOff] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [c, g] = await Promise.all([
        featureControlsService.get(),
        developerGroupsService.getSettings().catch(() => null),
      ]);
      setControls(c);
      setGroupSettings(g);
      if (g) setRetentionDraft(String(g.retentionDays));
    } catch (err) {
      setError(subscriptionApiError(err, 'Failed to load feature controls.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveControl = async (key: FeatureControlKey, value: boolean) => {
    setSavingKey(key);
    setError('');
    setNotice('');
    try {
      const next = await featureControlsService.update({ [key]: value });
      setControls((prev) => ({ ...(prev || {}), ...next }) as FeatureControls);
      setNotice('Saved.');
    } catch (err) {
      setError(subscriptionApiError(err, 'Failed to save.'));
    } finally {
      setSavingKey(null);
    }
  };

  const saveGroup = async (key: string, patch: Partial<DeveloperGroupSettings>) => {
    setSavingKey(key);
    setError('');
    setNotice('');
    try {
      const next = await developerGroupsService.updateSettings(patch);
      setGroupSettings(next);
      setRetentionDraft(String(next.retentionDays));
      setNotice('Saved.');
    } catch (err) {
      setError(subscriptionApiError(err, 'Failed to save group chat settings.'));
    } finally {
      setSavingKey(null);
    }
  };

  const retentionValue = Number(retentionDraft);
  const retentionValid =
    retentionDraft.trim() !== '' &&
    Number.isInteger(retentionValue) &&
    retentionValue >= DEVELOPER_GROUP_RETENTION_MIN &&
    retentionValue <= DEVELOPER_GROUP_RETENTION_MAX;
  const { dialog: unsavedDialog } = useUnsavedChangesGuard({
    dirty: groupSettings != null && retentionDraft.trim() !== String(groupSettings.retentionDays),
  });

  return (
    <PermissionGuard permission="feature_controls:read">
      {unsavedDialog}
      <div className="space-y-6">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/' }, { label: 'Feature Controls' }]} />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
              <ToggleRight className="h-6 w-6 text-primary" />
              Feature Controls
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Turn app features on or off for everyone. Changes reach the app within a minute.
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {notice}
          </div>
        ) : null}

        {loading && !controls ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {SECTIONS.map((section) => (
              <div key={section.title} className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                <div className="mt-2 divide-y">
                  {section.items.map((item) => (
                    <SwitchRow
                      key={item.key}
                      label={item.label}
                      hint={item.hint}
                      note={
                        isListingViewersKey(item.key)
                          ? viewersSinceNote(controls, item.key)
                          : null
                      }
                      checked={!!controls?.[item.key]}
                      disabled={!controls || !canUpdate || savingKey === item.key}
                      saving={savingKey === item.key}
                      onChange={(v) => {
                        if (v && isListingViewersKey(item.key)) setConfirmKey(item.key);
                        else if (!v && item.key === 'netra_connect_enabled') setConfirmNetraOff(true);
                        else void saveControl(item.key, v);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Developer group chat</h2>
              {groupSettings ? (
                <div className="mt-2 divide-y">
                  <SwitchRow
                    label="Group chat (Launch Update)"
                    hint="When off, the developer page shows only the Propnetra logo."
                    checked={groupSettings.enabled}
                    disabled={!canUpdate || savingKey === 'g-enabled'}
                    saving={savingKey === 'g-enabled'}
                    onChange={(v) => void saveGroup('g-enabled', { enabled: v })}
                  />
                  <SwitchRow
                    label="Seen by"
                    hint="When off, no ticks or seen counts are shown."
                    checked={groupSettings.seenByEnabled}
                    disabled={!canUpdate || savingKey === 'g-seen'}
                    saving={savingKey === 'g-seen'}
                    onChange={(v) => void saveGroup('g-seen', { seenByEnabled: v })}
                  />
                  <div className="py-3">
                    <p className="text-sm font-medium text-gray-900">Delete messages after</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={DEVELOPER_GROUP_RETENTION_MIN}
                        max={DEVELOPER_GROUP_RETENTION_MAX}
                        step={1}
                        value={retentionDraft}
                        disabled={!canUpdate}
                        onChange={(e) => setRetentionDraft(e.target.value)}
                        className="w-28"
                        aria-invalid={!retentionValid}
                      />
                      <span className="text-sm text-gray-600">days</span>
                    </div>
                    <p className={`mt-1 text-xs ${retentionValid ? 'text-gray-500' : 'text-red-600'}`}>
                      Enter a value between {DEVELOPER_GROUP_RETENTION_MIN} and{' '}
                      {DEVELOPER_GROUP_RETENTION_MAX} days.
                    </p>
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        disabled={
                          !canUpdate ||
                          !retentionValid ||
                          savingKey === 'g-retention' ||
                          retentionValue === groupSettings.retentionDays
                        }
                        onClick={() => void saveGroup('g-retention', { retentionDays: retentionValue })}
                      >
                        {savingKey === 'g-retention' ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  Group chat settings need the Notifications permission.
                </p>
              )}
            </div>
          </div>
        )}

        <Dialog open={!!confirmKey} onOpenChange={(open) => !open && setConfirmKey(null)}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Turn on listing viewers?</DialogTitle>
              <DialogDescription>
                Viewers will be shown from today onwards. Older views stay saved but are hidden.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmKey(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const key = confirmKey;
                  setConfirmKey(null);
                  if (key) void saveControl(key, true);
                }}
              >
                Turn on
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={confirmNetraOff} onOpenChange={(open) => !open && setConfirmNetraOff(false)}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Turn off Netra Connect?</DialogTitle>
              <DialogDescription>
                For all app users: the message icon and counts are hidden, a Push Notification tab
                appears in the sidebar, and lead notifications open My Activity &gt; My Leads.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmNetraOff(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setConfirmNetraOff(false);
                  void saveControl('netra_connect_enabled', false);
                }}
              >
                Turn off
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
