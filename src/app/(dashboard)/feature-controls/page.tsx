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
        key: 'developer_view_count_enabled',
        label: 'Developer view count',
        hint: 'ON: show view count on developer feed cards and project detail. OFF: hide count on public surfaces (counting still runs). Does not affect My Listings or resale/DBF cards.',
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
  changed,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  note?: string | null;
  checked: boolean;
  changed?: boolean;
  disabled: boolean;
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
        {changed ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-amber-600">
            Unsaved
          </span>
        ) : null}
        <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
      </div>
    </div>
  );
}

function SectionSaveBar({
  dirty,
  saving,
  disabled,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  saving: boolean;
  disabled?: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-end gap-2 border-t pt-3">
      {dirty ? <span className="mr-auto text-xs text-amber-600">Unsaved changes</span> : null}
      {dirty ? (
        <Button size="sm" variant="ghost" disabled={saving} onClick={onDiscard}>
          Discard
        </Button>
      ) : null}
      <Button size="sm" disabled={!dirty || saving || disabled} onClick={onSave}>
        {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
        Save
      </Button>
    </div>
  );
}

type Section = (typeof SECTIONS)[number];
type ControlDraft = Partial<Record<FeatureControlKey, boolean>>;
type PendingConfirm = { kind: 'viewers' | 'netra_off'; section: Section } | null;

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
  const [confirm, setConfirm] = useState<PendingConfirm>(null);
  const [draft, setDraft] = useState<ControlDraft>({});
  const [groupEnabledDraft, setGroupEnabledDraft] = useState(false);
  const [groupSeenDraft, setGroupSeenDraft] = useState(false);

  const resetGroupDrafts = (g: DeveloperGroupSettings | null) => {
    if (!g) return;
    setGroupEnabledDraft(g.enabled);
    setGroupSeenDraft(g.seenByEnabled);
    setRetentionDraft(String(g.retentionDays));
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [c, g] = await Promise.all([
        featureControlsService.get(),
        developerGroupsService.getSettings().catch(() => null),
      ]);
      setControls(c);
      setDraft({});
      setGroupSettings(g);
      if (g) {
        setGroupEnabledDraft(g.enabled);
        setGroupSeenDraft(g.seenByEnabled);
        setRetentionDraft(String(g.retentionDays));
      }
    } catch (err) {
      setError(subscriptionApiError(err, 'Failed to load feature controls.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const savedValue = (key: FeatureControlKey) => !!controls?.[key];
  const valueOf = (key: FeatureControlKey) => draft[key] ?? savedValue(key);
  const isChanged = (key: FeatureControlKey) => key in draft && draft[key] !== savedValue(key);
  const changedKeys = (section: Section) =>
    section.items.map((item) => item.key).filter((key) => isChanged(key));

  const setDraftValue = (key: FeatureControlKey, value: boolean) => {
    setNotice('');
    setDraft((prev) => {
      const next = { ...prev };
      if (value === savedValue(key)) delete next[key];
      else next[key] = value;
      return next;
    });
  };

  const discardSection = (section: Section) => {
    setDraft((prev) => {
      const next = { ...prev };
      for (const item of section.items) delete next[item.key];
      return next;
    });
  };

  const saveSection = async (section: Section, confirmed = false) => {
    const keys = changedKeys(section);
    if (!keys.length) return;
    const patch = Object.fromEntries(keys.map((key) => [key, draft[key] as boolean])) as ControlDraft;
    if (!confirmed) {
      if (keys.some((key) => isListingViewersKey(key) && patch[key] === true)) {
        setConfirm({ kind: 'viewers', section });
        return;
      }
      if (patch.netra_connect_enabled === false) {
        setConfirm({ kind: 'netra_off', section });
        return;
      }
    }
    setSavingKey(section.title);
    setError('');
    setNotice('');
    try {
      const next = await featureControlsService.update(patch);
      setControls((prev) => ({ ...(prev || {}), ...next }) as FeatureControls);
      setDraft((prev) => {
        const rest = { ...prev };
        for (const key of keys) delete rest[key];
        return rest;
      });
      setNotice(`${section.title} saved.`);
    } catch (err) {
      setError(subscriptionApiError(err, 'Failed to save.'));
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
  const groupPatch: Partial<DeveloperGroupSettings> = {};
  if (groupSettings) {
    if (groupEnabledDraft !== groupSettings.enabled) groupPatch.enabled = groupEnabledDraft;
    if (groupSeenDraft !== groupSettings.seenByEnabled) groupPatch.seenByEnabled = groupSeenDraft;
    if (retentionDraft.trim() !== String(groupSettings.retentionDays)) {
      groupPatch.retentionDays = retentionValue;
    }
  }
  const groupDirty = Object.keys(groupPatch).length > 0;

  const saveGroup = async () => {
    if (!groupDirty || !retentionValid) return;
    setSavingKey('group');
    setError('');
    setNotice('');
    try {
      const next = await developerGroupsService.updateSettings(groupPatch);
      setGroupSettings(next);
      resetGroupDrafts(next);
      setNotice('Developer group chat saved.');
    } catch (err) {
      setError(subscriptionApiError(err, 'Failed to save group chat settings.'));
    } finally {
      setSavingKey(null);
    }
  };

  const controlsDirty = SECTIONS.some((section) => changedKeys(section).length > 0);
  const { dialog: unsavedDialog, confirmLeave } = useUnsavedChangesGuard({
    dirty: controlsDirty || groupDirty,
    onSave: canUpdate
      ? async () => {
          for (const section of SECTIONS) {
            if (changedKeys(section).length) await saveSection(section, true);
          }
          if (groupDirty && retentionValid) await saveGroup();
        }
      : undefined,
  });

  const refresh = async () => {
    if (await confirmLeave()) void load();
  };

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
          <Button variant="outline" className="gap-2" onClick={() => void refresh()} disabled={loading}>
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
                      checked={valueOf(item.key)}
                      changed={isChanged(item.key)}
                      disabled={!controls || !canUpdate || savingKey === section.title}
                      onChange={(v) => setDraftValue(item.key, v)}
                    />
                  ))}
                </div>
                {canUpdate ? (
                  <SectionSaveBar
                    dirty={changedKeys(section).length > 0}
                    saving={savingKey === section.title}
                    onSave={() => void saveSection(section)}
                    onDiscard={() => discardSection(section)}
                  />
                ) : null}
              </div>
            ))}

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Developer group chat</h2>
              {groupSettings ? (
                <div className="mt-2 divide-y">
                  <SwitchRow
                    label="Group chat (Launch Update)"
                    hint="When off, Launch Update and Showcase are hidden in the app (developer page shows only the Propnetra logo). The developer’s three showcase picks stay saved in the database."
                    checked={groupEnabledDraft}
                    changed={groupEnabledDraft !== groupSettings.enabled}
                    disabled={!canUpdate || savingKey === 'group'}
                    onChange={(v) => {
                      setNotice('');
                      setGroupEnabledDraft(v);
                    }}
                  />
                  <SwitchRow
                    label="Seen by"
                    hint="When off, no ticks or seen counts are shown."
                    checked={groupSeenDraft}
                    changed={groupSeenDraft !== groupSettings.seenByEnabled}
                    disabled={!canUpdate || savingKey === 'group'}
                    onChange={(v) => {
                      setNotice('');
                      setGroupSeenDraft(v);
                    }}
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
                  </div>
                  {canUpdate ? (
                    <SectionSaveBar
                      dirty={groupDirty}
                      saving={savingKey === 'group'}
                      disabled={!retentionValid}
                      onSave={() => void saveGroup()}
                      onDiscard={() => resetGroupDrafts(groupSettings)}
                    />
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  Group chat settings need the Notifications permission.
                </p>
              )}
            </div>
          </div>
        )}

        <Dialog
          open={confirm?.kind === 'viewers'}
          onOpenChange={(open) => !open && setConfirm(null)}
        >
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Turn on listing viewers?</DialogTitle>
              <DialogDescription>
                Viewers will be shown from today onwards. Older views stay saved but are hidden.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const section = confirm?.section;
                  setConfirm(null);
                  if (section) void saveSection(section, true);
                }}
              >
                Turn on &amp; save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={confirm?.kind === 'netra_off'}
          onOpenChange={(open) => !open && setConfirm(null)}
        >
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Turn off Netra Connect?</DialogTitle>
              <DialogDescription>
                For all app users: the message icon and counts are hidden, a Push Notification tab
                appears in the sidebar, and lead notifications open My Activity &gt; My Leads.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  const section = confirm?.section;
                  setConfirm(null);
                  if (section) void saveSection(section, true);
                }}
              >
                Turn off &amp; save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
