'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { SortableTableBody } from '@/components/common/sortable-list';
import { ReelFormDialog } from '@/modules/netra-reels/reel-form-dialog';
import { ReelPlayer } from '@/modules/netra-reels/reel-player';
import { DeleteRemarkDialog } from '@/components/common/delete-remark-dialog';
import {
  netraReelsApiError,
  netraReelsService,
  platformLabel,
  type NetraReel,
} from '@/services/netra-reels.service';
import {
  Clapperboard,
  Edit2,
  Loader2,
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => openPlayer()}
              disabled={!reels.length}
            >
              <Play className="w-4 h-4 mr-1.5" />
              Watch reels
            </Button>
            {canCreate && (
              <Button onClick={openCreate} className="bg-primary text-white hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-1.5" />
                Add reel
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">{error}</div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
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
              {loading ? (
                <tbody>
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
                    </td>
                  </tr>
                </tbody>
              ) : reels.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                      <Clapperboard className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                      No reels yet. Upload a video to get started.
                    </td>
                  </tr>
                </tbody>
              ) : (
                <SortableTableBody
                  items={reels}
                  disabled={!canUpdate}
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
              )}
            </table>
          </div>
        </div>
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
    </PermissionGuard>
  );
}
