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
import { AddItemWizard } from '@/modules/developer-home/add-item-wizard';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import {
  HOME_PAGE_KINDS,
  developerHomeApiError,
  developerHomeService,
  kindMeta,
  type HomeDeveloperPreview,
  type HomeListingPreview,
  type HomePostPreview,
  type HomeSectionDetail,
  type HomeSectionKind,
  type NamedRow,
} from '@/services/developer-home.service';
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
    'Choose which developers appear in this city. They complete team, banners, and micro-markets in the app. The card shows the company logo.',
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
      ? { id: i.listing.id, listing: i.listing, title: '', post: i.postIndex ?? 1 }
      : {
          id: i.developer.id,
          developer: i.developer,
          title: i.title && i.title !== i.developer.name ? i.title : '',
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
  const [dirtyKinds, setDirtyKinds] = useState<Partial<Record<HomeSectionKind, boolean>>>({});
  const anyDirty = Object.values(dirtyKinds).some(Boolean);
  const sectionSaveRef = useRef(new Map<HomeSectionKind, () => Promise<void>>());

  const registerSectionSave = useCallback((kind: HomeSectionKind, fn: () => Promise<void>) => {
    sectionSaveRef.current.set(kind, fn);
  }, []);

  const unregisterSectionSave = useCallback((kind: HomeSectionKind) => {
    sectionSaveRef.current.delete(kind);
  }, []);

  const saveAllDirtySections = useCallback(async () => {
    for (const kind of HOME_PAGE_KINDS) {
      if (!dirtyKinds[kind]) continue;
      const fn = sectionSaveRef.current.get(kind);
      if (fn) await fn();
    }
  }, [dirtyKinds]);

  const { dialog: unsavedDialog, confirmLeave } = useUnsavedChangesGuard({
    dirty: anyDirty,
    onSave: canUpdate ? saveAllDirtySections : undefined,
    onLeaveWithoutSave: () => {
      setDirtyKinds({});
      setReloadKey((k) => k + 1);
    },
  });
  const onDirtyChange = useCallback((kind: HomeSectionKind, dirty: boolean) => {
    setDirtyKinds((prev) => (!!prev[kind] === dirty ? prev : { ...prev, [kind]: dirty }));
  }, []);

  const changeLocation = async (patch: { stateId?: string; cityId: string }) => {
    if (!(await confirmLeave())) return;
    setDirtyKinds({});
    setFilters(patch);
  };

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
            Trending Projects, Coming Soon, New Launch and Top Real Estate Developers on the agent and developer home. Pick a state and
            city, like banner ads, then set each section.
          </p>
        </div>

        <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3">
          <select
            className={selectCls}
            value={stateId}
            onChange={(e) => void changeLocation({ stateId: e.target.value, cityId: '' })}
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
            onChange={(e) => void changeLocation({ cityId: e.target.value })}
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
              states={states}
              cities={cities}
              stateCities={stateCities}
              canUpdate={canUpdate}
              onDirtyChange={onDirtyChange}
              registerSectionSave={registerSectionSave}
              unregisterSectionSave={unregisterSectionSave}
              onSaved={() => {
                setDirtyKinds((prev) => ({ ...prev, [kind]: false }));
                setReloadKey((k) => k + 1);
              }}
            />
          ))
        )}
      </div>
      {unsavedDialog}
    </PermissionGuard>
  );
}

function SectionCard({
  kind,
  section,
  cityDevelopers,
  stateId,
  cityId,
  states,
  cities,
  stateCities,
  canUpdate,
  onDirtyChange,
  registerSectionSave,
  unregisterSectionSave,
  onSaved,
}: {
  kind: HomeSectionKind;
  section?: HomeSectionDetail;
  cityDevelopers: HomeDeveloperPreview[];
  stateId: string;
  cityId: string;
  states: NamedRow[];
  cities: NamedRow[];
  stateCities: NamedRow[];
  canUpdate: boolean;
  onDirtyChange: (kind: HomeSectionKind, dirty: boolean) => void;
  registerSectionSave: (kind: HomeSectionKind, fn: () => Promise<void>) => void;
  unregisterSectionSave: (kind: HomeSectionKind) => void;
  onSaved: () => void;
}) {
  const meta = kindMeta(kind);
  const isDeveloperKind = meta.items === 'developer';
  const wizardMode = isDeveloperKind ? 'developer-only' : 'projects';
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

  const excludeListingIds = useMemo(() => items.map((i) => i.id), [items]);
  const excludeDeveloperIds = useMemo(
    () => (isDeveloperKind ? items.map((i) => i.id) : []),
    [isDeveloperKind, items],
  );

  const snapshot = JSON.stringify({
    title,
    autoslide,
    scrollMode,
    isActive,
    extraCityIds,
    items: items.map((i) => ({
      id: i.id,
      post: i.post,
      title: i.title,
    })),
  });
  const [baseline] = useState(snapshot);
  const dirty = snapshot !== baseline;

  useEffect(() => {
    onDirtyChange(kind, dirty);
  }, [kind, dirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange(kind, false), [kind, onDirtyChange]);

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

  const postToListing = (p: HomePostPreview): HomeListingPreview => ({
    id: p.id,
    title: p.title,
    location: p.location,
    priceLabel: p.priceLabel,
    imageUrl: p.imageUrl,
    developer: p.developerName
      ? { id: p.developerId || '', name: p.developerName, logoUrl: null }
      : null,
  });

  const addProjects = (posts: HomePostPreview[]) => {
    setError('');
    if (!posts.length) return;
    setItems((prev) => {
      let next = [...prev];
      for (const p of posts) {
        if (isPosts) {
          const existing = next.find((i) => i.id === p.id);
          if (existing) {
            setError(`This project is already in Post ${existing.post}.`);
            continue;
          }
          if (next.filter((i) => i.post === pickPost).length >= MAX_PROJECTS_PER_POST) {
            setError(`Maximum ${MAX_PROJECTS_PER_POST} projects per post.`);
            break;
          }
          next.push({
            id: p.id,
            listing: postToListing(p),
            title: '',
            post: pickPost,
          });
        } else {
          if (next.length >= MAX_ITEMS) {
            setError(`Maximum ${MAX_ITEMS} items for this section.`);
            break;
          }
          if (next.some((i) => i.id === p.id)) continue;
          next.push({
            id: p.id,
            listing: postToListing(p),
            title: '',
            post: 1,
          });
        }
      }
      return next;
    });
  };

  const addDeveloper = (dev: HomeDeveloperPreview) => {
    setError('');
    if (items.some((i) => i.id === dev.id)) {
      setError('That developer is already in this section.');
      return;
    }
    if (items.length >= MAX_ITEMS) {
      setError(`Maximum ${MAX_ITEMS} items for this section.`);
      return;
    }
    devCache.current.set(dev.id, dev);
    setItems((prev) => [
      ...prev,
      {
        id: dev.id,
        developer: { ...dev, name: dev.companyName || dev.name },
        title: '',
        post: 1,
      },
    ]);
  };

  const save = useCallback(async () => {
    setError('');
    if (isPosts) {
      for (let post = 1; post <= postCount; post++) {
        if (!items.some((i) => i.post === post)) {
          const msg = `Post ${post} needs at least one project.`;
          setError(msg);
          throw new Error(msg);
        }
      }
      const seen = new Map<string, number>();
      for (const i of items) {
        const first = seen.get(i.id);
        if (first !== undefined && first !== i.post) {
          const msg = `${i.listing?.title || 'A project'} is in Post ${first} and Post ${i.post}. Each post needs different projects.`;
          setError(msg);
          throw new Error(msg);
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
      throw err;
    }
  }, [
    cityId,
    extraCityIds,
    isActive,
    isDeveloperKind,
    isPosts,
    items,
    kind,
    onSaved,
    postCount,
    scrollMode,
    stateId,
    title,
    autoslide,
  ]);

  useEffect(() => {
    registerSectionSave(kind, save);
    return () => unregisterSectionSave(kind);
  }, [kind, registerSectionSave, save, unregisterSectionSave]);

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
            <p className="text-xs text-gray-500">
              Team, banners, and micro-markets are configured by the developer in the app.
            </p>
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
        <div className="flex flex-wrap items-center gap-2">
          {canUpdate && (
          <Button size="sm" onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save
          </Button>
          )}
        </div>
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

      <AddItemWizard
        open={pickOpen}
        onOpenChange={setPickOpen}
        mode={wizardMode}
        title={isDeveloperKind ? 'Add developer' : isPosts ? `Add projects — Post ${pickPost}` : 'Add projects'}
        description={
          isDeveloperKind
            ? 'Choose a picker city, then a developer with at least one published project there.'
            : 'Choose picker city and developer, then select one or more projects. Section still saves for the display city above.'
        }
        submitLabel={isDeveloperKind ? 'Add developer' : 'Add to section'}
        displayStateId={stateId}
        displayCityId={cityId}
        states={states}
        cities={cities}
        excludeListingIds={excludeListingIds}
        excludeDeveloperIds={excludeDeveloperIds}
        onSubmitDeveloper={addDeveloper}
        onSubmitProjects={addProjects}
      />
    </div>
  );
}
