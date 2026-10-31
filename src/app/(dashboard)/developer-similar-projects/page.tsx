'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { SortableGrid } from '@/components/common/sortable-list';
import { AutoslideTimePicker } from '@/components/common/autoslide-time-picker';
import { DeleteRemarkDialog } from '@/components/common/delete-remark-dialog';
import { DeveloperProjectPickDialog } from '@/modules/developer-similar-projects/developer-project-pick-dialog';
import {
  developerSimilarProjectsService,
  devSimilarApiError,
  type DevProjectPreview,
  type DevSimilarSetSummary,
} from '@/services/developer-similar-projects.service';
import { ArrowLeft, Building2, Loader2, Plus, Save, Trash2 } from 'lucide-react';

function ProjectThumb({ project }: { project: DevProjectPreview | null }) {
  if (project?.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={project.imageUrl} alt="" className="h-12 w-16 rounded object-cover border bg-gray-50" />;
  }
  return (
    <div className="h-12 w-16 rounded border bg-gray-50 flex items-center justify-center">
      <Building2 className="h-5 w-5 text-gray-300" />
    </div>
  );
}

export default function DeveloperSimilarProjectsPage() {
  const { permissions } = useAuthStore();
  const canCreate = permissions.has('developer_similar_projects:create');
  const canUpdate = permissions.has('developer_similar_projects:update') || canCreate;
  const canDelete = permissions.has('developer_similar_projects:delete');

  const [sets, setSets] = useState<DevSimilarSetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pickPageOpen, setPickPageOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<DevSimilarSetSummary | null>(null);

  const loadSets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setSets(await developerSimilarProjectsService.listSets());
    } catch (err) {
      setError(devSimilarApiError(err, 'Failed to load similar project pages.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSets();
  }, [loadSets]);

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await developerSimilarProjectsService.deleteSet(toDelete.listingId);
      setToDelete(null);
      await loadSets();
    } catch (err) {
      setError(devSimilarApiError(err, 'Failed to delete.'));
    }
  };

  if (editingId) {
    return (
      <PermissionGuard permission="developer_similar_projects:read">
        <SimilarSetEditor
          listingId={editingId}
          canUpdate={canUpdate}
          onBack={() => {
            setEditingId(null);
            void loadSets();
          }}
        />
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard
      permission="developer_similar_projects:read"
      fallback={<div className="p-12 text-center text-gray-500">You do not have permission to view this page.</div>}
    >
      <div className="space-y-6 pb-24">
        <Breadcrumb items={[{ label: 'Developer Similar Projects' }]} />
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Developer Similar Projects</h1>
            <p className="text-gray-500 mt-1">
              Pick a Developer property page, then choose the projects shown in its &quot;Similar Projects&quot; carousel.
            </p>
          </div>
          {canUpdate && (
            <Button onClick={() => setPickPageOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Configure Page
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : sets.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed p-12 text-center text-gray-500">
            No property pages configured yet.
          </div>
        ) : (
          <div className="bg-white rounded-xl border divide-y">
            {sets.map((s) => (
              <div key={s.listingId} className="flex items-center gap-4 p-4">
                <ProjectThumb project={s.listing} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{s.listing?.title || s.listingId}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {[s.listing?.location, s.listing?.developerName].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <Badge variant="outline">{s.similarCount} similar</Badge>
                <Badge variant="outline" className="font-mono">{s.autoslide}</Badge>
                {!s.isActive && <Badge variant="outline" className="text-gray-500">Hidden</Badge>}
                <Button variant="outline" size="sm" onClick={() => setEditingId(s.listingId)}>
                  {canUpdate ? 'Edit' : 'View'}
                </Button>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setToDelete(s)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <DeveloperProjectPickDialog
          open={pickPageOpen}
          title="Select property page"
          description="Choose the Developer project whose detail page will show the similar projects."
          submitLabel="Continue"
          markConfigured
          onOpenChange={setPickPageOpen}
          onSubmit={(project) => {
            setPickPageOpen(false);
            setEditingId(project.id);
          }}
        />

        <DeleteRemarkDialog
          open={Boolean(toDelete)}
          onOpenChange={(open) => !open && setToDelete(null)}
          title="Remove similar projects?"
          itemName={toDelete?.listing?.title}
          onConfirm={handleDelete}
        />
      </div>
    </PermissionGuard>
  );
}

function SimilarSetEditor({
  listingId,
  canUpdate,
  onBack,
}: {
  listingId: string;
  canUpdate: boolean;
  onBack: () => void;
}) {
  const [page, setPage] = useState<DevProjectPreview | null>(null);
  const [items, setItems] = useState<DevProjectPreview[]>([]);
  const [autoslide, setAutoslide] = useState('00:00:05');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [pickOpen, setPickOpen] = useState(false);
  const { dialog: unsavedDialog, confirmLeave } = useUnsavedChangesGuard({
    dirty,
    onSave: canUpdate ? () => save() : undefined,
  });

  const goBack = async () => {
    if (await confirmLeave()) onBack();
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    developerSimilarProjectsService
      .getSet(listingId)
      .then((set) => {
        if (cancelled) return;
        setPage(set.listing);
        setItems(set.items);
        setAutoslide(set.autoslide);
        setIsActive(set.isActive);
      })
      .catch((err) => !cancelled && setError(devSimilarApiError(err, 'Failed to load.')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const addProject = (project: DevProjectPreview) => {
    setPickOpen(false);
    setItems((prev) => (prev.some((p) => p.id === project.id) ? prev : [...prev, project]));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const set = await developerSimilarProjectsService.saveSet(listingId, {
        similarListingIds: items.map((i) => i.id),
        autoslide,
        isActive,
      });
      setItems(set.items);
      setDirty(false);
    } catch (err) {
      setError(devSimilarApiError(err, 'Failed to save.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <Breadcrumb items={[{ label: 'Developer Similar Projects', href: '/developer-similar-projects' }, { label: page?.title || 'Page' }]} />
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => void goBack()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <ProjectThumb project={page} />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{page?.title || 'Loading…'}</h1>
            <p className="text-sm text-gray-500 truncate">
              {[page?.location, page?.developerName].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        {canUpdate && (
          <Button onClick={() => void save()} disabled={!dirty || saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white rounded-xl border p-5 flex flex-wrap items-end gap-6">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Auto-scroll every</label>
          <AutoslideTimePicker
            value={autoslide}
            onChange={(v) => {
              setAutoslide(v);
              setDirty(true);
            }}
            disabled={!canUpdate}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <Switch
            checked={isActive}
            disabled={!canUpdate}
            onCheckedChange={(v) => {
              setIsActive(v);
              setDirty(true);
            }}
          />
          Show on property page
        </label>
      </div>

      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Similar projects ({items.length})</h2>
          {canUpdate && (
            <Button variant="outline" size="sm" onClick={() => setPickOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Project
            </Button>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-gray-500 p-6 border border-dashed rounded-lg">
            No similar projects selected. The section stays hidden in the app.
          </p>
        ) : (
          <SortableGrid
            items={items}
            disabled={!canUpdate}
            onReorder={(ordered) => {
              setItems(ordered.map(({ sortOrder: _s, ...rest }) => rest as DevProjectPreview));
              setDirty(true);
            }}
            className="grid-cols-1 sm:grid-cols-1 md:grid-cols-1"
            renderItem={(p, { dragHandle }) => (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50">
                {dragHandle}
                <ProjectThumb project={p} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-gray-900 truncate">{p.title}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {[p.location, p.priceLabel, p.developerName].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {canUpdate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setItems((prev) => prev.filter((i) => i.id !== p.id));
                      setDirty(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          />
        )}
      </div>

      <DeveloperProjectPickDialog
        open={pickOpen}
        title="Add similar project"
        description="Only published Developer projects can be selected."
        submitLabel="Add"
        excludeIds={[listingId, ...items.map((i) => i.id)]}
        onOpenChange={setPickOpen}
        onSubmit={addProject}
      />
      {unsavedDialog}
    </div>
  );
}
