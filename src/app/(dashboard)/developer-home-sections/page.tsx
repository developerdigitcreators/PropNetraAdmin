'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SortableGrid } from '@/components/common/sortable-list';
import { AutoslideTimePicker } from '@/components/common/autoslide-time-picker';
import { DbfPickDialog, type DbfPickOption } from '@/modules/dbf-featured/dbf-pick-dialog';
import { useUrlFilters } from '@/hooks/use-url-filters';
import {
  HOME_PAGE_KINDS,
  developerHomeApiError,
  developerHomeService,
  kindMeta,
  type HomeDeveloperPreview,
  type HomeListingPreview,
  type HomeSectionDetail,
  type HomeSectionKind,
  type NamedRow,
} from '@/services/developer-home.service';
import {
  ComingSoonTeamGroups,
  teamGroupsError,
  toEditorTeamGroups,
  type EditorTeamGroup,
} from '@/components/developer-home/coming-soon-team-groups';
import { Building2, Loader2, Plus, Save, Trash2 } from 'lucide-react';

const selectCls =
  'h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60';

const MAX_ITEMS = 30;
const MAX_POSTS = 4;
const MAX_PROJECTS_PER_POST = 10;

const KIND_HINTS: Record<HomeSectionKind, string> = {
  trending_projects: 'Horizontal carousel of developer projects.',
  new_launch_1:
    'Up to 4 posts (2x2 on home). Each post needs at least one project; each card fades to its post\u2019s next project on the auto-scroll time.',
  new_launch_2: '',
  coming_soon:
    'Select a developer, then add location / micro-market sections with team members. Tapping the card in the app shows only these members, grouped by micro-market.',
  top_developers:
    'Company logos scroll continuously in up to 2 rows. Tapping a logo opens the developer\u2019s company profile.',
  handpicked_developers:
    'Developer page grid (3 per row) with each developer\u2019s project count in this city. Manual keeps the cards still; Auto-scroll fades one step on the time below. Ads appear after every 5 rows.',
};

type EditorItem = {
  id: string;
  listing?: HomeListingPreview;
  developer?: HomeDeveloperPreview;
  title: string;
  teamGroups: EditorTeamGroup[];
  /** New Launch post (1-4); always 1 for other kinds. */
  post: number;
};

function Thumb({ url, round }: { url?: string | null; round?: boolean }) {
  const cls = round ? 'h-12 w-12 rounded-full' : 'h-12 w-16 rounded';
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={`${cls} object-cover border bg-gray-50`} />;
  }
  return (
    <div className={`${cls} border bg-gray-50 flex items-center justify-center`}>
      <Building2 className="h-5 w-5 text-gray-300" />
    </div>
  );
}

function toEditorItems(section: HomeSectionDetail): EditorItem[] {
  return section.items.map((i) =>
    'listing' in i
      ? { id: i.listing.id, listing: i.listing, title: '', teamGroups: [], post: i.postIndex ?? 1 }
      : {
          id: i.developer.id,
          developer: i.developer,
          title: i.title && i.title !== i.developer.name ? i.title : '',
          teamGroups: toEditorTeamGroups(i.teamGroups),
          post: 1,
        },
  );
}

export default function DeveloperHomeSectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <DeveloperHomeContent />
    </Suspense>
  );
}

function DeveloperHomeContent() {
  const { permissions } = useAuthStore();
  const canUpdate =
    permissions.has('developer_home_sections:update') || permissions.has('developer_home_sections:create');

  const [states, setStates] = useState<NamedRow[]>([]);
  const [cities, setCities] = useState<NamedRow[]>([]);
  const { filters, setFilters } = useUrlFilters({ stateId: '', cityId: '' });
  const { stateId, cityId } = filters;

  const [sections, setSections] = useState<Partial<Record<HomeSectionKind, HomeSectionDetail>>>({});
  const [cityDevelopers, setCityDevelopers] = useState<HomeDeveloperPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    developerHomeService.states().then(setStates).catch(() => setStates([]));
    developerHomeService.cities().then(setCities).catch(() => setCities([]));
  }, []);

  const stateCities = useMemo(() => cities.filter((c) => c.stateId === stateId), [cities, stateId]);

  useEffect(() => {
    if (!cityId) {
      setSections({});
      setCityDevelopers([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    developerHomeService
      .byCity(cityId)
      .then((res) => {
        if (cancelled) return;
        setSections(res.sections || {});
        setCityDevelopers(Array.isArray(res.developers) ? res.developers : []);
      })
      .catch((err) => !cancelled && setError(developerHomeApiError(err, 'Failed to load sections.')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [cityId, reloadKey]);

  return (
    <PermissionGuard
      permission="developer_home_sections:read"
      fallback={<div className="p-12 text-center text-gray-500">You do not have permission to view this page.</div>}
    >
      <div className="space-y-6 pb-24">
        <Breadcrumb items={[{ label: 'Developer Home' }]} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Developer Home</h1>
          <p className="text-gray-500 mt-1">
            Trending Projects, Coming Soon, New Launch and Top Picker on the agent and developer home. Pick a state and
            city, like banner ads, then set each section.
          </p>
        </div>

        <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3">
          <select
            className={selectCls}
            value={stateId}
            onChange={(e) => setFilters({ stateId: e.target.value, cityId: '' })}
          >
            <option value="">Select state</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className={selectCls}
            value={cityId}
            disabled={!stateId}
            onChange={(e) => setFilters({ cityId: e.target.value })}
          >
            <option value="">Select city</option>
            {stateCities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!cityId ? (
          <div className="bg-white rounded-xl border border-dashed p-12 text-center text-gray-500">
            Select a state and city to manage its home sections.
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          HOME_PAGE_KINDS.map((kind) => (
            <SectionCard
              key={`${cityId}-${kind}-${reloadKey}`}
              kind={kind}
              section={sections[kind]}
              cityDevelopers={cityDevelopers}
              stateId={stateId}
              cityId={cityId}
              stateCities={stateCities}
              canUpdate={canUpdate}
              onSaved={() => setReloadKey((k) => k + 1)}
            />
          ))
        )}
      </div>
    </PermissionGuard>
  );
}

function SectionCard({
  kind,
  section,
  cityDevelopers,
  stateId,
  cityId,
  stateCities,
  canUpdate,
  onSaved,
}: {
  kind: HomeSectionKind;
  section?: HomeSectionDetail;
  cityDevelopers: HomeDeveloperPreview[];
  stateId: string;
  cityId: string;
  stateCities: NamedRow[];
  canUpdate: boolean;
  onSaved: () => void;
}) {
  const meta = kindMeta(kind);
  const isDeveloperKind = meta.items === 'developer';
  const [title, setTitle] = useState(section?.title || '');
  const [autoslide, setAutoslide] = useState(section?.autoslide || '00:00:05');
  const [scrollMode, setScrollMode] = useState<'manual' | 'auto'>(
    section?.scrollMode === 'manual' ? 'manual' : 'auto',
  );
  const [isActive, setIsActive] = useState(section?.isActive ?? true);
  const [items, setItems] = useState<EditorItem[]>(() => (section ? toEditorItems(section) : []));
  const [extraCityIds, setExtraCityIds] = useState<string[]>([]);
  const [showCities, setShowCities] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pickOpen, setPickOpen] = useState(false);
  const devCache = useRef(new Map<string, HomeDeveloperPreview>());
  const isPosts = kind === 'new_launch_1';
  const [postCount, setPostCount] = useState(() =>
    Math.min(MAX_POSTS, Math.max(1, ...items.map((i) => i.post))),
  );
  const [pickPost, setPickPost] = useState(1);

  useEffect(() => {
    cityDevelopers.forEach((d) => devCache.current.set(d.id, d));
  }, [cityDevelopers]);

  const otherCities = stateCities.filter((c) => c.id !== cityId);

  const openPicker = (post = 1) => {
    setPickPost(post);
    setPickOpen(true);
  };

  const removePost = (post: number) => {
    setItems((prev) =>
      prev.filter((p) => p.post !== post).map((p) => (p.post > post ? { ...p, post: p.post - 1 } : p)),
    );
    setPostCount((n) => Math.max(1, n - 1));
  };

  /** Section search may omit `projectCount`; fall back to the city's developer list. */
  const projectCountFor = useCallback(
    (id: string, dev?: HomeDeveloperPreview | null) =>
      Number(dev?.projectCount) ||
      Number(cityDevelopers.find((d) => d.id === id)?.projectCount) ||
      0,
    [cityDevelopers],
  );

  const search = useCallback(
    async (q: string): Promise<DbfPickOption[]> => {
      const taken = new Set(items.map((i) => i.id));
      if (isDeveloperKind) {
        const listedOnly = kind === 'handpicked_developers';
        const listed = listedOnly
          ? cityDevelopers.filter((d) => Number(d.projectCount) > 0)
          : [];
        const term = q.trim().toLowerCase();
        const fromCity = listed.filter((d) => {
          if (!term) return true;
          return [d.companyName, d.name, d.contact]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(term));
        });
        const devs = listedOnly ? fromCity : await developerHomeService.searchSectionDevelopers(q);
        devs.forEach((d) => devCache.current.set(d.id, d));
        return devs
          .filter((d) => !taken.has(d.id))
          .map((d) => ({
            value: d.id,
            label: d.name || d.companyName || '',
            badge: projectCountFor(d.id, d),
          }));
      }
      return (await developerHomeService.searchPosts(q, cityId))
        .filter((p) => !taken.has(p.id))
        .map((p) => ({ value: p.id, label: [p.title, p.location, p.developerName].filter(Boolean).join(' · ') }));
    },
    [items, isDeveloperKind, cityId, kind, cityDevelopers, projectCountFor],
  );

  const addItem = async (id: string) => {
    setPickOpen(false);
    if (isPosts) {
      const existing = items.find((i) => i.id === id);
      if (existing) return setError(`This project is already in Post ${existing.post}.`);
      if (items.filter((i) => i.post === pickPost).length >= MAX_PROJECTS_PER_POST) {
        return setError(`Maximum ${MAX_PROJECTS_PER_POST} projects per post.`);
      }
    } else if (items.length >= MAX_ITEMS) {
      return setError(`Maximum ${MAX_ITEMS} items for this section.`);
    }
    if (isDeveloperKind) {
      const found = devCache.current.get(id);
      if (!found) return setError('Could not load that developer.');
      setItems((prev) => [
        ...prev,
        {
          id,
          developer: { ...found, name: found.companyName || found.name },
          title: '',
          teamGroups: [],
          post: 1,
        },
      ]);
      return;
    }
    const p = (await developerHomeService.searchPosts(id)).find((x) => x.id === id);
    if (!p) return setError('Could not load that project.');
    setItems((prev) => [
      ...prev,
      {
        id,
        listing: {
          id: p.id,
          title: p.title,
          location: p.location,
          priceLabel: p.priceLabel,
          imageUrl: p.imageUrl,
          developer: p.developerName ? { id: '', name: p.developerName, logoUrl: null } : null,
        },
        title: '',
        teamGroups: [],
        post: isPosts ? pickPost : 1,
      },
    ]);
  };

  const save = async () => {
    setError('');
    if (kind === 'coming_soon') {
      for (const i of items) {
        const msg = teamGroupsError(i.teamGroups);
        if (msg) return setError(`${i.developer?.name || 'Developer'}: ${msg}`);
      }
    }
    if (isPosts) {
      for (let post = 1; post <= postCount; post++) {
        if (!items.some((i) => i.post === post)) {
          return setError(`Post ${post} needs at least one project.`);
        }
      }
      const seen = new Map<string, number>();
      for (const i of items) {
        const first = seen.get(i.id);
        if (first !== undefined && first !== i.post) {
          return setError(
            `${i.listing?.title || 'A project'} is in Post ${first} and Post ${i.post}. Each post needs different projects.`,
          );
        }
        seen.set(i.id, i.post);
      }
    }
    setSaving(true);
    try {
      await developerHomeService.saveSection({
        kind,
        stateId: stateId || undefined,
        cityIds: [cityId, ...extraCityIds],
        title: title.trim() || undefined,
        autoslide,
        isActive,
        ...(kind === 'handpicked_developers' ? { scrollMode } : {}),
        items: items.map((i) =>
          isDeveloperKind
            ? {
                developerId: i.id,
                title: i.title.trim() || undefined,
                ...(kind === 'coming_soon'
                  ? {
                      teamGroups: i.teamGroups.map((g) => ({
                        locationId: g.locationId || null,
                        microMarketId: g.microMarketId,
                        memberIds: g.memberIds,
                        display: g.display,
                      })),
                    }
                  : {}),
              }
            : isPosts
              ? { listingId: i.id, postIndex: i.post }
              : { listingId: i.id },
        ),
      });
      onSaved();
    } catch (err) {
      setError(developerHomeApiError(err, 'Failed to save.'));
      setSaving(false);
    }
  };

  const renderRow = (it: EditorItem, dragHandle: ReactNode) => (
    <div
      className={`flex gap-3 p-3 rounded-lg border bg-gray-50 ${
        kind === 'coming_soon' ? 'items-start' : 'items-center'
      }`}
    >
      {dragHandle}
      <Thumb url={it.listing?.imageUrl || it.developer?.logoUrl} round={!!it.developer} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-medium text-sm text-gray-900 truncate">
            {it.listing?.title || it.developer?.name || it.id}
          </p>
          {it.developer && (
            <span
              className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
              title="Projects in this city"
            >
              {projectCountFor(it.id, it.developer)}
            </span>
          )}
        </div>
        {it.listing ? (
          <p className="text-xs text-gray-500 truncate">
            {[it.listing.location, it.listing.priceLabel, it.listing.developer?.name].filter(Boolean).join(' · ')}
          </p>
        ) : kind === 'handpicked_developers' ? (
          <p className="text-xs text-gray-500">
            {(() => {
              const n = projectCountFor(it.id, it.developer);
              return n ? `${n} project${n === 1 ? '' : 's'} in this city` : 'No published projects in this city';
            })()}
          </p>
        ) : kind === 'coming_soon' ? (
          <div className="space-y-2">
            <Input
              value={it.title}
              disabled={!canUpdate}
              placeholder="Card title (optional)"
              className="sm:max-w-sm"
              onChange={(e) =>
                setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, title: e.target.value } : p)))
              }
            />
            <p className="text-xs text-gray-500">The card shows the developer&apos;s company logo.</p>
            <ComingSoonTeamGroups
              developerId={it.id}
              cityId={cityId}
              groups={it.teamGroups}
              disabled={!canUpdate}
              onChange={(teamGroups) =>
                setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, teamGroups } : p)))
              }
            />
          </div>
        ) : null}
      </div>
      {canUpdate && (
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => setItems((prev) => prev.filter((p) => !(p.id === it.id && p.post === it.post)))}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">{meta.label}</h2>
          <Badge variant="outline">
            {isPosts ? `${postCount}/${MAX_POSTS} posts` : `${items.length}/${MAX_ITEMS}`}
          </Badge>
          {!section?.id && <Badge variant="outline" className="text-gray-500">Not set</Badge>}
          {section?.id && !section.isActive && <Badge variant="outline" className="text-gray-500">Hidden</Badge>}
        </div>
        {canUpdate && (
          <Button size="sm" onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save
          </Button>
        )}
      </div>
      {KIND_HINTS[kind] && <p className="text-xs text-gray-500">{KIND_HINTS[kind]}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 md:grid-cols-3 md:items-end">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Title (optional)</label>
          <Input
            value={title}
            disabled={!canUpdate}
            placeholder={section?.defaultTitle || meta.label}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        {kind === 'handpicked_developers' && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Scroll</label>
            <div className="flex h-9 w-fit overflow-hidden rounded-md border border-gray-200">
              {([
                ['manual', 'Manual'],
                ['auto', 'Auto-scroll'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  disabled={!canUpdate}
                  onClick={() => setScrollMode(value)}
                  className={`px-3 text-sm ${
                    scrollMode === value ? 'bg-primary text-white' : 'bg-white text-gray-700'
                  } disabled:opacity-60`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        {meta.autoslide && (kind !== 'handpicked_developers' || scrollMode === 'auto') && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Auto-scroll every</label>
            <AutoslideTimePicker value={autoslide} onChange={setAutoslide} disabled={!canUpdate} />
          </div>
        )}
        <label className="flex h-9 items-center gap-2 text-sm text-gray-700">
          <Switch checked={isActive} disabled={!canUpdate} onCheckedChange={setIsActive} />
          Show in app
        </label>
      </div>

      {canUpdate && otherCities.length > 0 && (
        <div className="space-y-2">
          <button type="button" className="text-xs text-primary" onClick={() => setShowCities((v) => !v)}>
            {showCities ? 'Hide' : 'Also apply to other cities'}
            {extraCityIds.length ? ` (${extraCityIds.length} selected)` : ''}
          </button>
          {showCities && (
            <div className="flex flex-wrap gap-2">
              {otherCities.map((c) => {
                const on = extraCityIds.includes(c.id);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() =>
                      setExtraCityIds((prev) => (on ? prev.filter((x) => x !== c.id) : [...prev, c.id]))
                    }
                    className={`px-3 py-1 rounded-full border text-sm ${
                      on ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-200'
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {isPosts ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Posts</h3>
            {canUpdate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPostCount((n) => Math.min(MAX_POSTS, n + 1))}
                disabled={postCount >= MAX_POSTS}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Post
              </Button>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: postCount }, (_, idx) => idx + 1).map((post) => {
              const postItems = items.filter((i) => i.post === post);
              return (
                <div key={post} className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-900">Post {post}</h4>
                      <Badge variant="outline">
                        {postItems.length}/{MAX_PROJECTS_PER_POST}
                      </Badge>
                    </div>
                    {canUpdate && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPicker(post)}
                          disabled={postItems.length >= MAX_PROJECTS_PER_POST}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add Project
                        </Button>
                        {postCount > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removePost(post)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  {postItems.length === 0 ? (
                    <p className="text-center text-xs text-red-500 p-4 border border-dashed rounded-lg">
                      Link at least one developer project to this post.
                    </p>
                  ) : (
                    <SortableGrid
                      items={postItems}
                      disabled={!canUpdate}
                      onReorder={(ordered) =>
                        setItems((prev) => [
                          ...prev.filter((p) => p.post !== post),
                          ...ordered.map(({ sortOrder: _s, ...rest }) => rest as EditorItem),
                        ])
                      }
                      className="grid-cols-1 sm:grid-cols-1 md:grid-cols-1"
                      renderItem={(it, { dragHandle }) => renderRow(it, dragHandle)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              {isDeveloperKind ? 'Developers' : 'Developer projects'}
            </h3>
            {canUpdate && (
              <Button variant="outline" size="sm" onClick={() => openPicker()} disabled={items.length >= MAX_ITEMS}>
                <Plus className="h-4 w-4 mr-1" /> Add {isDeveloperKind ? 'Developer' : 'Project'}
              </Button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="text-center text-sm text-gray-500 p-6 border border-dashed rounded-lg">
              Nothing selected. The section stays hidden in the app.
            </p>
          ) : (
            <SortableGrid
              items={items}
              disabled={!canUpdate}
              onReorder={(ordered) => setItems(ordered.map(({ sortOrder: _s, ...rest }) => rest as EditorItem))}
              className="grid-cols-1 sm:grid-cols-1 md:grid-cols-1"
              renderItem={(it, { dragHandle }) => renderRow(it, dragHandle)}
            />
          )}
        </>
      )}

      <DbfPickDialog
        open={pickOpen}
        title={isDeveloperKind ? 'Add developer' : 'Add project'}
        description={
          isDeveloperKind
            ? kind === 'handpicked_developers'
              ? 'Only developers with a published project in this city can be selected. Project count is shown next to each name.'
              : 'Only active Developer accounts can be selected.'
            : 'Only published Developer projects can be selected.'
        }
        fieldLabel={isDeveloperKind ? 'Developer' : 'Project'}
        placeholder={isDeveloperKind ? 'Select a developer' : 'Select a project'}
        searchPlaceholder={
          isDeveloperKind ? 'Search by company, name or phone' : 'Search by project, location or developer'
        }
        emptyText={
          kind === 'handpicked_developers'
            ? 'No developers with a listing in this city.'
            : 'No matches.'
        }
        submitLabel="Add"
        submitting={false}
        error=""
        search={search}
        onOpenChange={setPickOpen}
        onSubmit={(id) => void addItem(id)}
      />
    </div>
  );
}
