'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ImageUrlOrUpload } from '@/components/image-url-or-upload';
import {
  ComingSoonTeamGroups,
  teamGroupsError,
  toEditorTeamGroupsFromApi,
  type EditorTeamGroup,
} from '@/components/developer-home/coming-soon-team-groups';
import {
  developerComingSoonAdminService,
  developerHomeApiError,
  type AdminDeveloperComingSoonItem,
} from '@/services/developer-home.service';
import { Loader2 } from 'lucide-react';

type CityEditorState = {
  title: string;
  bannerUrls: string[];
  teamGroups: EditorTeamGroup[];
  dirty: boolean;
  saving: boolean;
  error: string;
  saveOk: boolean;
};

function emptyEditorState(item: AdminDeveloperComingSoonItem): CityEditorState {
  return {
    title: item.title || '',
    bannerUrls: [...(item.bannerUrls || [])].slice(0, 2),
    teamGroups: toEditorTeamGroupsFromApi(item.teamGroups as never),
    dirty: false,
    saving: false,
    error: '',
    saveOk: false,
  };
}

export function DeveloperComingSoonEditor({ developerId }: { developerId: string }) {
  const canUpdate = useAuthStore((s) => s.hasPermission('developer_home_sections', 'update'));
  const [items, setItems] = useState<AdminDeveloperComingSoonItem[]>([]);
  const [editors, setEditors] = useState<Record<string, CityEditorState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await developerComingSoonAdminService.listForDeveloper(developerId);
      setItems(rows);
      const next: Record<string, CityEditorState> = {};
      rows.forEach((row) => {
        next[row.homeItemId] = emptyEditorState(row);
      });
      setEditors(next);
    } catch (err) {
      setItems([]);
      setEditors({});
      setError(developerHomeApiError(err, 'Failed to load Coming Soon entries.'));
    } finally {
      setLoading(false);
    }
  }, [developerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchEditor = (homeItemId: string, patch: Partial<CityEditorState>) => {
    setEditors((prev) => {
      const cur = prev[homeItemId];
      if (!cur) return prev;
      return { ...prev, [homeItemId]: { ...cur, ...patch, dirty: true, saveOk: false } };
    });
  };

  const setBanner = (homeItemId: string, index: number, url: string) => {
    setEditors((prev) => {
      const cur = prev[homeItemId];
      if (!cur) return prev;
      const next = [...cur.bannerUrls];
      next[index] = url;
      return {
        ...prev,
        [homeItemId]: {
          ...cur,
          bannerUrls: next.filter(Boolean).slice(0, 2),
          dirty: true,
          saveOk: false,
        },
      };
    });
  };

  const save = async (item: AdminDeveloperComingSoonItem) => {
    const ed = editors[item.homeItemId];
    if (!ed || !canUpdate) return;
    const tgErr = teamGroupsError(ed.teamGroups);
    if (tgErr) {
      patchEditor(item.homeItemId, { error: tgErr });
      return;
    }
    patchEditor(item.homeItemId, { saving: true, error: '' });
    try {
      const updated = await developerComingSoonAdminService.updateItem(developerId, item.homeItemId, {
        title: ed.title.trim() || undefined,
        bannerUrls: ed.bannerUrls.filter(Boolean).slice(0, 2),
        teamGroups: ed.teamGroups.map((g) => ({
          locationId: g.locationId || null,
          microMarketId: g.microMarketId,
          memberIds: g.memberIds,
          display: g.display.length ? g.display : ['micromarket'],
        })),
      });
      setItems((prev) => prev.map((r) => (r.homeItemId === item.homeItemId ? { ...r, ...updated } : r)));
      setEditors((prev) => ({
        ...prev,
        [item.homeItemId]: { ...emptyEditorState({ ...item, ...updated }), saveOk: true },
      }));
    } catch (err) {
      patchEditor(item.homeItemId, {
        saving: false,
        error: developerHomeApiError(err, 'Failed to save Coming Soon config.'),
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500 space-y-2">
        <p>This developer is not on any active Coming Soon section.</p>
        <Link href="/developer-home-sections" className="text-primary hover:underline">
          Add them in Developer Home → Coming Soon
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Configure banners and team groups on behalf of the developer. To add or remove cities, use{' '}
        <Link href="/developer-home-sections" className="text-primary hover:underline">
          Developer Home
        </Link>{' '}
        (Coming Soon list per city).
      </p>

      {items.map((item) => {
        const ed = editors[item.homeItemId];
        if (!ed) return null;
        return (
          <div key={item.homeItemId} className="rounded-xl border bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900">{item.cityName || item.cityId}</h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge variant="outline">Featured in Coming Soon</Badge>
                  {item.configComplete ? (
                    <Badge variant="outline" className="border-green-200 text-green-700">
                      Config complete
                    </Badge>
                  ) : (
                    <Badge variant="outline">Setup in progress</Badge>
                  )}
                </div>
              </div>
              {canUpdate && (
                <Button
                  size="sm"
                  disabled={!ed.dirty || ed.saving}
                  onClick={() => void save(item)}
                >
                  {ed.saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                  Save city
                </Button>
              )}
            </div>

            <div className="space-y-1.5 max-w-md">
              <label className="text-sm font-medium text-gray-700">Card title (optional)</label>
              <Input
                value={ed.title}
                disabled={!canUpdate}
                placeholder="Uses company name when empty"
                onChange={(e) => patchEditor(item.homeItemId, { title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Banner images (max 2, HTTPS)</p>
              <div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
                {[0, 1].map((idx) => (
                  <ImageUrlOrUpload
                    key={idx}
                    kind="banner"
                    label={`Banner ${idx + 1}`}
                    value={ed.bannerUrls[idx] || ''}
                    readOnly={!canUpdate}
                    onChange={(url) => setBanner(item.homeItemId, idx, url)}
                  />
                ))}
              </div>
            </div>

            <ComingSoonTeamGroups
              developerId={developerId}
              cityId={item.cityId}
              groups={ed.teamGroups}
              disabled={!canUpdate}
              onChange={(teamGroups) => patchEditor(item.homeItemId, { teamGroups })}
            />

            {ed.error ? <p className="text-sm text-red-600">{ed.error}</p> : null}
            {ed.saveOk ? <p className="text-xs font-medium text-green-700">Saved.</p> : null}
            {!canUpdate ? (
              <p className="text-xs text-gray-500">Requires developer_home_sections:update to edit.</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
