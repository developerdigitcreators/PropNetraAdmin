'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { AdminDataTable } from '@/components/common/admin-data-table';
import { AdminListToolbar } from '@/components/common/admin-list-toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { SortableTableBody } from '@/components/common/sortable-list';
import { ReelFormDialog } from '@/modules/netra-reels/reel-form-dialog';
import { ReelPlayer } from '@/modules/netra-reels/reel-player';
import { DeleteRemarkDialog } from '@/components/common/delete-remark-dialog';
import {
  formatTimeLeft,
  netraReelsApiError,
  netraReelsService,
  platformLabel,
  reelFeedLabel,
  type LaunchReelSettings,
  type NetraReel,
} from '@/services/netra-reels.service';
import {
  Edit2,
  Play,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { InstagramIcon } from '@/modules/netra-reels/platform-icons';

export default function NetraReelsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('netra_reels', 'create');
  const canUpdate = hasPermission('netra_reels', 'update');
  const canDelete = hasPermission('netra_reels', 'delete');

  const [reels, setReels] = useState<NetraReel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<NetraReel | null>(null);
  const [toDelete, setToDelete] = useState<NetraReel | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [playerReels, setPlayerReels] = useState<NetraReel[]>([]);
  const [statusBusyId, setStatusBusyId] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [launchSettings, setLaunchSettings] = useState<LaunchReelSettings | null>(null);
  const [settingsDraft, setSettingsDraft] = useState({ validityHours: '', maxActivePerDeveloper: '' });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const settingsDirty =
    !!launchSettings &&
    (settingsDraft.validityHours !== String(launchSettings.validityHours) ||
      settingsDraft.maxActivePerDeveloper !== String(launchSettings.maxActivePerDeveloper));
  const { dialog: unsavedDialog } = useUnsavedChangesGuard({
    dirty: settingsDirty,
    onSave: () => saveLaunchSettings(),
  });

  const loadLaunchSettings = useCallback(async () => {
    try {
      const next = await netraReelsService.getLaunchSettings();
      setLaunchSettings(next);
      setSettingsDraft({
        validityHours: String(next.validityHours),
        maxActivePerDeveloper: String(next.maxActivePerDeveloper),
      });
    } catch {
      // settings card stays hidden
    }
  }, []);

  useEffect(() => {
    void loadLaunchSettings();
  }, [loadLaunchSettings]);

  const saveLaunchSettings = async () => {
    const validityHours = Math.round(Number(settingsDraft.validityHours));
    const maxActivePerDeveloper = Math.round(Number(settingsDraft.maxActivePerDeveloper));
    if (!(validityHours >= 1 && validityHours <= 168) || !(maxActivePerDeveloper >= 1 && maxActivePerDeveloper <= 20)) {
      setSettingsMessage('Validity must be 1–168 hours and max active 1–20.');
      return;
    }
    setSavingSettings(true);
    setSettingsMessage('');
    try {
      const next = await netraReelsService.updateLaunchSettings({ validityHours, maxActivePerDeveloper });
      setLaunchSettings(next);
      setSettingsMessage('Saved. Applies to reels posted from now on.');
    } catch (err) {
      setSettingsMessage(netraReelsApiError(err, 'Failed to save settings.'));
    } finally {
      setSavingSettings(false);
    }
  };

  const cityOptions = useMemo(
    () => [...new Set(reels.map((r) => r.cityName).filter((c): c is string => Boolean(c)))].sort(),
    [reels],
  );
  const visibleReels = useMemo(
    () => (cityFilter === 'all' ? reels : reels.filter((r) => r.cityName === cityFilter)),
    [reels, cityFilter],
  );

  const fetchReels = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setReels(await netraReelsService.list());
    } catch (err) {
      setReels([]);
      setError(netraReelsApiError(err, 'Failed to load NetraReels.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  const activeReels = useMemo(() => reels.filter((reel) => reel.isActive), [reels]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (reel: NetraReel) => {
    setEditing(reel);
    setFormOpen(true);
  };

  const openPlayer = (reel?: NetraReel) => {
    if (reel) {
      setPlayerReels(reels);
      setPlayerIndex(Math.max(0, reels.findIndex((item) => item.id === reel.id)));
      setPlayerOpen(true);
      return;
    }
    const list = activeReels.length ? activeReels : reels;
    if (!list.length) return;
    setPlayerReels(list);
    setPlayerIndex(0);
    setPlayerOpen(true);
  };

  const handleReorder = async (ordered: Array<NetraReel & { sortOrder: number }>) => {
    const previous = reels;
    setReels(ordered);
    try {
      await netraReelsService.reorder(ordered.map((item) => item.id));
    } catch (err) {
      setReels(previous);
      setError(netraReelsApiError(err, 'Failed to reorder reels.'));
    }
  };

  const handleToggleActive = async (reel: NetraReel, next: boolean) => {
    setStatusBusyId(reel.id);
    const previous = reels;
    setReels((rows) => rows.map((row) => (row.id === reel.id ? { ...row, isActive: next } : row)));
    try {
      await netraReelsService.update(reel.id, { isActive: next });
    } catch (err) {
      setReels(previous);
      setError(netraReelsApiError(err, 'Failed to update reel status.'));
    } finally {
      setStatusBusyId('');
    }
  };

  const handleDelete = async (remark: string) => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await netraReelsService.remove(toDelete.id, remark);
      setToDelete(null);
      await fetchReels();
    } catch (err) {
      setError(netraReelsApiError(err, 'Failed to delete reel.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PermissionGuard
      permission="netra_reels:read"
      fallback={<div className="p-12 text-center text-gray-500">You do not have permission to view NetraReels.</div>}
    >
      <div className="space-y-6 max-w-7xl pb-16">
        <Breadcrumb items={[{ label: 'NetraReels' }]} />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">NetraReels</h1>
            <p className="text-gray-500 mt-1">
              Admin-only uploaded videos. Staff see this module only when NetraReels permission is granted.
            </p>
          </div>
          <AdminListToolbar
            onRefresh={() => void fetchReels()}
            refreshDisabled={loading}
          >
            <Button
              variant="outline"
              onClick={() => openPlayer()}
              disabled={!reels.length}
            >
              <Play className="w-4 h-4 mr-1.5" />
              Watch reels
            </Button>
            {canCreate ? (
              <Button onClick={openCreate} className="bg-primary text-white hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-1.5" />
                Add reel
              </Button>
            ) : null}
          </AdminListToolbar>
        </div>

        {error ? (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">{error}</div>
        ) : null}

        {launchSettings ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[220px] flex-1">
                <h2 className="text-sm font-semibold text-gray-900">Launch reels (developer-posted)</h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Developers add Launch reels from the app, in their own city. Each reel is deleted from the
                  app and storage after the validity period, whether active or inactive.
                </p>
              </div>
              <label className="space-y-1">
                <span className="block text-xs font-medium text-gray-700">Validity (hours)</span>
                <Input
                  type="number"
                  min={1}
                  max={168}
                  value={settingsDraft.validityHours}
                  onChange={(e) => setSettingsDraft((d) => ({ ...d, validityHours: e.target.value }))}
                  className="h-9 w-28 bg-white"
                  disabled={!canUpdate}
                />
              </label>
              <label className="space-y-1">
                <span className="block text-xs font-medium text-gray-700">Max active per developer</span>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={settingsDraft.maxActivePerDeveloper}
                  onChange={(e) => setSettingsDraft((d) => ({ ...d, maxActivePerDeveloper: e.target.value }))}
                  className="h-9 w-28 bg-white"
                  disabled={!canUpdate}
                />
              </label>
              {canUpdate ? (
                <Button onClick={() => void saveLaunchSettings()} disabled={savingSettings} className="h-9">
                  {savingSettings ? 'Saving…' : 'Save'}
                </Button>
              ) : null}
            </div>
            {settingsMessage ? <p className="mt-2 text-xs text-gray-700">{settingsMessage}</p> : null}
          </div>
        ) : null}

        {cityOptions.length ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">City</span>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm"
            >
              <option value="all">All reels</option>
              {cityOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <AdminDataTable
          page={1}
          limit={Math.max(visibleReels.length, 1)}
          total={visibleReels.length}
          totalPages={1}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
          loading={loading}
          isEmpty={!visibleReels.length}
          emptyMessage="No reels yet. Upload a video to get started."
          syncKey={visibleReels.length}
          hidePaginationWhenEmpty
        >
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 font-semibold text-gray-700">Preview</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Title / caption</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Source</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Sort</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Status</th>
                <th className="px-5 py-3 font-semibold text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            <SortableTableBody
              items={visibleReels}
              disabled={!canUpdate || cityFilter !== 'all'}
              onReorder={handleReorder}
              renderRow={(reel, { dragHandle }) => (
                <>
                  <td className="px-5 py-4 w-28">
                    <button
                      type="button"
                      onClick={() => openPlayer(reel)}
                      className="relative w-16 h-24 rounded-lg overflow-hidden bg-black border border-gray-200 group"
                      title="Watch"
                    >
                      {reel.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={reel.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/70">
                          {reel.platform === 'instagram' ? (
                            <InstagramIcon className="w-5 h-5" />
                          ) : reel.platform === 'upload' ? (
                            <Upload className="w-5 h-5" />
                          ) : null}
                        </div>
                      )}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </span>
                    </button>
                  </td>
                  <td className="px-5 py-4 max-w-[320px]">
                    <p className="font-medium text-gray-900 truncate">{reel.title || 'Untitled reel'}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{reel.caption || reel.sourceUrl}</p>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant="outline" className="bg-white text-gray-700 border-gray-200">
                      <span className="inline-flex items-center gap-1">
                        {reel.platform === 'instagram' ? (
                          <InstagramIcon className="w-3 h-3" />
                        ) : reel.platform === 'upload' ? (
                          <Upload className="w-3 h-3" />
                        ) : null}
                        {platformLabel(reel.platform)}
                      </span>
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`mt-1.5 block w-fit ${
                        reel.feed === 'launch'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {reelFeedLabel(reel.feed)}
                    </Badge>
                    {reel.postedByDeveloper ? (
                      <div className="mt-1.5 text-xs text-gray-600">
                        <p className="truncate max-w-[200px]">
                          By {reel.developerName || 'developer'}
                          {reel.cityName ? ` · ${reel.cityName}` : ''}
                        </p>
                        {reel.expiresAt ? (
                          <p className="text-amber-700">{formatTimeLeft(reel.expiresAt)}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-5 py-4">{dragHandle}</td>
                  <td className="px-5 py-4">
                    {canUpdate ? (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={reel.isActive}
                          disabled={statusBusyId === reel.id}
                          onCheckedChange={(checked) => handleToggleActive(reel, Boolean(checked))}
                        />
                        <span className="text-xs text-gray-500">{reel.isActive ? 'Active' : 'Hidden'}</span>
                      </div>
                    ) : reel.isActive ? (
                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-700">Hidden</Badge>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openPlayer(reel)} title="Watch">
                        <Play className="w-4 h-4 text-gray-500" />
                      </Button>
                      {canUpdate && (
                        <Button variant="ghost" size="sm" onClick={() => openEdit(reel)} title="Edit">
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setToDelete(reel)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </>
              )}
            />
          </table>
        </AdminDataTable>
      </div>

      <ReelFormDialog
        open={formOpen}
        reel={editing}
        onOpenChange={setFormOpen}
        onSaved={fetchReels}
      />

      {playerOpen && (
        <ReelPlayer
          reels={playerReels}
          startIndex={playerIndex}
          onClose={() => setPlayerOpen(false)}
        />
      )}

      <DeleteRemarkDialog
        open={!!toDelete}
        onOpenChange={(open) => { if (!open) setToDelete(null); }}
        title="Delete this reel?"
        itemName={toDelete?.title || toDelete?.sourceUrl}
        submitting={deleting}
        onConfirm={handleDelete}
      />
      {unsavedDialog}
    </PermissionGuard>
  );
}
