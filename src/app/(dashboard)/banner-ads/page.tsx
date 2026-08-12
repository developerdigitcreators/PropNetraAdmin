'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  bannerAdsService,
  formatBannerLinkLabel,
  normalizeAutoslideValue,
  isBannerActive,
  BANNER_FILTER_STORAGE_KEY,
  DEFAULT_SECTIONS,
  DEFAULT_AUTOSLIDE,
  type AdBanner,
  type AdPlacementOption,
  type AdSectionOption,
} from '@/services/banner-ads.service';
import { locationService } from '@/services/location.service';
import { PermissionGuard } from '@/components/common/permission-guard';
import { useAuthStore } from '@/store/use-auth-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { AutoslideTimePicker } from '@/components/common/autoslide-time-picker';
import { SortableTableBody } from '@/components/common/sortable-list';
import { withCount } from '@/lib/filter-label';
import {
  Loader2,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Video,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

type LocItem = { id: string; name: string; state_id?: string; state?: { id: string } };

function readStoredFilters(): { stateId: string; cityId: string; placement: string } {
  if (typeof window === 'undefined') return { stateId: '', cityId: '', placement: '' };
  try {
    const raw = sessionStorage.getItem(BANNER_FILTER_STORAGE_KEY);
    if (!raw) return { stateId: '', cityId: '', placement: '' };
    const parsed = JSON.parse(raw);
    return {
      stateId: parsed.stateId || '',
      cityId: parsed.cityId || '',
      placement: parsed.placement || '',
    };
  } catch {
    return { stateId: '', cityId: '', placement: '' };
  }
}

function writeStoredFilters(stateId: string, cityId: string, placement: string) {
  sessionStorage.setItem(BANNER_FILTER_STORAGE_KEY, JSON.stringify({ stateId, cityId, placement }));
}

function sortBanners(rows: AdBanner[]) {
  return [...rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

type SectionBlockProps = {
  section: AdSectionOption;
  banners: AdBanner[];
  isLoading: boolean;
  open: boolean;
  onToggle: () => void;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onReorder: (ordered: Array<AdBanner & { sortOrder: number }>) => void | Promise<void>;
  onAdd: () => void;
  onEdit: (banner: AdBanner) => void;
  onDelete: (banner: AdBanner) => void;
  emptyHint: string;
};

function SectionBlock({
  section,
  banners,
  isLoading,
  open,
  onToggle,
  canCreate,
  canUpdate,
  canDelete,
  onReorder,
  onAdd,
  onEdit,
  onDelete,
  emptyHint,
}: SectionBlockProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/80">
        <button type="button" onClick={onToggle} className="flex items-center gap-2 text-left min-w-0">
          {open ? (
            <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
          )}
          <span className="font-semibold text-gray-900">{section.label}</span>
          <Badge variant="outline" className="bg-white text-gray-600 border-gray-200">
            {banners.length}
          </Badge>
        </button>
        {canCreate && (
          <Button onClick={onAdd} size="sm" className="bg-primary text-white hover:bg-primary/90 shrink-0">
            <Plus className="w-4 h-4 mr-1.5" /> Add
          </Button>
        )}
      </div>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 font-semibold text-gray-700">Preview</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Media type</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Page / Post link</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Sort order</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Status</th>
                <th className="px-5 py-3 font-semibold text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            {isLoading ? (
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
                  </td>
                </tr>
              </tbody>
            ) : banners.length === 0 ? (
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    {emptyHint}
                  </td>
                </tr>
              </tbody>
            ) : (
              <SortableTableBody
                items={banners}
                disabled={!canUpdate}
                onReorder={onReorder}
                renderRow={(banner, { dragHandle }) => (
                  <>
                    <td className="px-5 py-4 w-40">
                      <div className="w-28 h-14 bg-gray-100 rounded-md border border-gray-200 flex items-center justify-center overflow-hidden">
                        {banner.mediaType === 'image' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={banner.mediaUrl}
                            alt="Banner"
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="flex flex-col items-center text-gray-400">
                            <Video className="w-5 h-5" />
                            <span className="text-[10px]">Video</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="inline-flex items-center gap-1.5 capitalize text-gray-700">
                        {banner.mediaType === 'image' ? (
                          <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                        ) : (
                          <Video className="w-3.5 h-3.5 text-purple-500" />
                        )}
                        {banner.mediaType}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-600 max-w-[180px]">
                      {formatBannerLinkLabel(banner)}
                    </td>
                    <td className="px-5 py-4">{dragHandle}</td>
                    <td className="px-5 py-4">
                      {isBannerActive(banner) ? (
                        <Badge className="bg-green-100 text-green-700">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canUpdate && (
                          <Button variant="ghost" size="sm" onClick={() => onEdit(banner)} title="Edit">
                            <Edit2 className="w-4 h-4 text-gray-500" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(banner)}
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
      )}
    </div>
  );
}

export default function BannerAdsPage() {
  const router = useRouter();
  const { permissions } = useAuthStore();
  const canCreate = permissions.has('ads:create') || permissions.has('ALL:ALL');
  const canUpdate = permissions.has('ads:update') || permissions.has('ALL:ALL');
  const canDelete = permissions.has('ads:delete') || permissions.has('ALL:ALL');

  const [states, setStates] = useState<LocItem[]>([]);
  const [cities, setCities] = useState<LocItem[]>([]);
  const [placements, setPlacements] = useState<AdPlacementOption[]>([]);
  const [sectionsMeta, setSectionsMeta] = useState<AdSectionOption[]>(DEFAULT_SECTIONS);
  const [stateId, setStateId] = useState('');
  const [cityId, setCityId] = useState('');
  const [placement, setPlacement] = useState('');
  const [filtersReady, setFiltersReady] = useState(false);

  const [sectionMap, setSectionMap] = useState<Record<string, AdBanner[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ top: true, general: true });

  const [autoslide, setAutoslide] = useState(DEFAULT_AUTOSLIDE);
  const [savingAutoslide, setSavingAutoslide] = useState(false);

  const [bannerToDelete, setBannerToDelete] = useState<AdBanner | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const ready = Boolean(stateId && cityId && placement);

  const citiesForState = useMemo(
    () => cities.filter((c) => c.state_id === stateId || c.state?.id === stateId),
    [cities, stateId]
  );

  const cityCountByState = useCallback(
    (sid: string) => cities.filter((c) => c.state_id === sid || c.state?.id === sid).length,
    [cities],
  );

  const bannerTotal = useMemo(
    () => Object.values(sectionMap).reduce((sum, rows) => sum + (rows?.length || 0), 0),
    [sectionMap],
  );

  const stateName = states.find((s) => s.id === stateId)?.name || '';
  const cityName = cities.find((c) => c.id === cityId)?.name || '';
  const pageLabel = placements.find((p) => p.key === placement)?.label || placement;

  const displaySections = useMemo(() => {
    const keys = new Set([
      ...sectionsMeta.map((s) => s.key),
      ...Object.keys(sectionMap),
    ]);
    // Prefer meta order; append unknown keys from response
    const ordered: AdSectionOption[] = [];
    for (const meta of sectionsMeta) {
      if (keys.has(meta.key)) {
        ordered.push(meta);
        keys.delete(meta.key);
      }
    }
    for (const key of keys) {
      ordered.push({
        key,
        label: DEFAULT_SECTIONS.find((s) => s.key === key)?.label || key,
      });
    }
    // Home page popup: no Top Banner section
    const base = ordered.length ? ordered : DEFAULT_SECTIONS;
    if (placement === 'popup') {
      return base.filter((s) => s.key === 'general');
    }
    return base;
  }, [sectionsMeta, sectionMap, placement]);

  useEffect(() => {
    Promise.all([
      locationService.getStates(),
      locationService.getCities(),
      bannerAdsService.getPlacements(),
      bannerAdsService.getSections(),
    ])
      .then(([s, c, p, sec]) => {
        setStates(Array.isArray(s) ? s : []);
        setCities(Array.isArray(c) ? c : []);
        setPlacements(Array.isArray(p) && p.length ? p : []);
        setSectionsMeta(Array.isArray(sec) && sec.length ? sec : DEFAULT_SECTIONS);
        const stored = readStoredFilters();
        if (stored.stateId) setStateId(stored.stateId);
        if (stored.cityId) setCityId(stored.cityId);
        if (stored.placement && (p || []).some((opt: AdPlacementOption) => opt.key === stored.placement)) {
          setPlacement(stored.placement);
        }
        const open: Record<string, boolean> = {};
        (sec?.length ? sec : DEFAULT_SECTIONS).forEach((item) => {
          open[item.key] = true;
        });
        setOpenSections(open);
      })
      .catch(console.error)
      .finally(() => setFiltersReady(true));
  }, []);

  // Refresh section meta when page (placement) changes — popup has General only
  useEffect(() => {
    if (!placement) return;
    bannerAdsService
      .getSections(placement)
      .then((sec) => {
        setSectionsMeta(Array.isArray(sec) && sec.length ? sec : DEFAULT_SECTIONS);
        setOpenSections((prev) => {
          const next = { ...prev };
          for (const s of sec) next[s.key] = prev[s.key] ?? true;
          return next;
        });
      })
      .catch(console.error);
  }, [placement]);

  useEffect(() => {
    if (!filtersReady) return;
    writeStoredFilters(stateId, cityId, placement);
  }, [stateId, cityId, placement, filtersReady]);

  const fetchBanners = useCallback(async () => {
    if (!stateId || !cityId || !placement) {
      setSectionMap({});
      setAutoslide(DEFAULT_AUTOSLIDE);
      return;
    }
    setIsLoading(true);
    try {
      const data = await bannerAdsService.getBanners({ stateId, cityId, placement });
      const next: Record<string, AdBanner[]> = {};
      for (const [key, rows] of Object.entries(data.sections || {})) {
        next[key] = sortBanners(rows);
      }
      for (const sec of sectionsMeta) {
        if (!next[sec.key]) next[sec.key] = [];
      }
      setSectionMap(next);
      setAutoslide(normalizeAutoslideValue(data.autoslide, DEFAULT_AUTOSLIDE));
    } catch (err) {
      console.error(err);
      setSectionMap({});
      setAutoslide(DEFAULT_AUTOSLIDE);
    } finally {
      setIsLoading(false);
    }
  }, [stateId, cityId, placement, sectionsMeta]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const onStateChange = (id: string) => {
    setStateId(id);
    setCityId('');
    setSectionMap({});
  };

  const saveAutoslide = async (nextRaw: string) => {
    const next = normalizeAutoslideValue(nextRaw, DEFAULT_AUTOSLIDE);
    if (!ready || !next || next === autoslide) return;
    const prev = autoslide;
    setAutoslide(next);
    if (!canUpdate) return;
    setSavingAutoslide(true);
    try {
      await bannerAdsService.updateSettings({
        stateId,
        cityId,
        placement,
        autoslide: next,
      });
    } catch (err) {
      console.error(err);
      setAutoslide(prev);
      alert('Failed to update autoslide.');
    } finally {
      setSavingAutoslide(false);
    }
  };

  const handleReorder = async (
    sectionKey: string,
    ordered: Array<AdBanner & { sortOrder: number }>,
  ) => {
    if (!canUpdate) return;
    const prev = sectionMap[sectionKey] || [];
    const updates = ordered.filter((item) => {
      const before = prev.find((x) => x.id === item.id);
      return (before?.sortOrder ?? 0) !== item.sortOrder;
    });

    setSectionMap((m) => ({
      ...m,
      [sectionKey]: ordered.map((b) => ({ ...b, sortOrder: b.sortOrder })),
    }));

    try {
      try {
        await bannerAdsService.reorderBanners(ordered.map((b) => b.id));
      } catch {
        await Promise.all(
          updates.map((item) =>
            bannerAdsService.updateBanner(item.id, { sortOrder: item.sortOrder }),
          ),
        );
      }
    } catch (err) {
      console.error(err);
      await fetchBanners();
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!bannerToDelete) return;
    setIsDeleting(true);
    try {
      await bannerAdsService.deleteBanner(bannerToDelete.id);
      setBannerToDelete(null);
      await fetchBanners();
    } catch (err) {
      console.error(err);
      alert('Failed to delete banner.');
    } finally {
      setIsDeleting(false);
    }
  };

  const goAdd = (section: string) => {
    router.push(
      `/banner-ads/new?stateId=${encodeURIComponent(stateId)}&cityId=${encodeURIComponent(cityId)}&placement=${encodeURIComponent(placement)}&section=${encodeURIComponent(section)}`
    );
  };

  const goEdit = (banner: AdBanner) => {
    const section = banner.section || 'general';
    router.push(
      `/banner-ads/${banner.id}/edit?stateId=${encodeURIComponent(stateId)}&cityId=${encodeURIComponent(cityId)}&placement=${encodeURIComponent(placement)}&section=${encodeURIComponent(section)}`
    );
  };

  return (
    <PermissionGuard permission="ads:read" fallback={<div className="p-12 text-center text-gray-500">You do not have permission to view Banner Ads.</div>}>
      <div className="space-y-6 max-w-7xl pb-16">
        <Breadcrumb items={[{ label: 'Banner Ads' }]} />

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Banner Ads</h1>
          <p className="text-gray-500 mt-1">Manage banners by city, page, and section.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={stateId} onValueChange={(v) => onStateChange(v ?? '')}>
            <SelectTrigger className="w-52 bg-white">
              <span>
                {stateName
                  ? withCount(stateName, cityCountByState(stateId))
                  : 'Select State'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {states.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {withCount(s.name, cityCountByState(s.id))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={cityId} onValueChange={(v) => setCityId(v ?? '')} disabled={!stateId}>
            <SelectTrigger className="w-48 bg-white">
              <span>
                {cityName || (stateId ? 'Select City' : 'Select state first')}
              </span>
            </SelectTrigger>
            <SelectContent>
              {citiesForState.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={placement} onValueChange={(v) => setPlacement(v ?? '')} disabled={!cityId}>
            <SelectTrigger className="w-56 bg-white">
              <span>
                {pageLabel
                  ? ready
                    ? withCount(pageLabel, bannerTotal)
                    : pageLabel
                  : cityId
                    ? 'Select Page'
                    : 'Select city first'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {placements.map((p) => (
                <SelectItem key={p.key} value={p.key}>
                  {p.key === placement && ready ? withCount(p.label, bannerTotal) : p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!ready ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-gray-500">
            Select State, City, and Page to view and manage banners.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-wrap items-center gap-4 justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Autoslide</p>
                <p className="text-xs text-gray-500">
                  Set hours, minutes, and seconds for how long each banner stays on {pageLabel || 'this page'}.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <AutoslideTimePicker
                  value={autoslide}
                  onChange={saveAutoslide}
                  disabled={!canUpdate || savingAutoslide}
                />
                {savingAutoslide && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
              </div>
            </div>

            {displaySections.map((section) => (
              <SectionBlock
                key={section.key}
                section={section}
                banners={sectionMap[section.key] || []}
                isLoading={isLoading}
                open={openSections[section.key] ?? true}
                onToggle={() =>
                  setOpenSections((prev) => ({ ...prev, [section.key]: !(prev[section.key] ?? true) }))
                }
                canCreate={canCreate}
                canUpdate={canUpdate}
                canDelete={canDelete}
                onReorder={(ordered) => handleReorder(section.key, ordered)}
                onAdd={() => goAdd(section.key)}
                onEdit={goEdit}
                onDelete={setBannerToDelete}
                emptyHint={`No ${section.label.toLowerCase()} banners yet.`}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!bannerToDelete} onOpenChange={(open) => { if (!open) setBannerToDelete(null); }}>
        <DialogContent>
          <DialogHeader className="hidden">
            <DialogTitle>Delete</DialogTitle>
            <DialogDescription>Confirm</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center text-center pt-2">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete banner?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This banner will be removed. This cannot be undone.
            </p>
            <div className="flex w-full gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setBannerToDelete(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PermissionGuard>
  );
}
