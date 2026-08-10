'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  bannerAdsService,
  detectMediaType,
  postDisplayTitle,
  DEFAULT_SECTIONS,
  type AdBanner,
  type AdPageOption,
  type AdPlacementOption,
  type AdPostOption,
  type AdSectionOption,
  type BannerLinkType,
  type CreateBannerPayload,
} from '@/services/banner-ads.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/common/searchable-select';
import { Loader2, Image as ImageIcon, Video } from 'lucide-react';

export type BannerFormProps = {
  mode: 'create' | 'edit';
  stateId: string;
  cityId: string;
  stateName: string;
  cityName: string;
  /** Prefill from list filters — locked like state/city. */
  lockedPlacement?: string;
  lockedSection?: string;
  banner?: AdBanner | null;
};

export function BannerForm({
  mode,
  stateId,
  cityId,
  stateName,
  cityName,
  lockedPlacement,
  lockedSection,
  banner,
}: BannerFormProps) {
  const router = useRouter();
  const [mediaUrl, setMediaUrl] = useState(banner?.mediaUrl || '');
  const [placement, setPlacement] = useState(
    lockedPlacement || banner?.placement || 'home'
  );
  const [section, setSection] = useState(
    lockedSection || banner?.section || 'general'
  );
  const [isActive, setIsActive] = useState(
    typeof banner?.isActive === 'boolean'
      ? banner.isActive
      : banner?.status
        ? banner.status.toLowerCase() === 'active'
        : true
  );
  const [addLink, setAddLink] = useState(banner ? banner.linkType !== 'none' : false);
  const [linkKind, setLinkKind] = useState<'post' | 'page'>(
    banner?.linkType === 'page' ? 'page' : 'post'
  );
  const [listingId, setListingId] = useState(banner?.listingId || '');
  const [pageKey, setPageKey] = useState(banner?.pageKey || '');

  const [pages, setPages] = useState<AdPageOption[]>([]);
  const [placements, setPlacements] = useState<AdPlacementOption[]>([]);
  const [sections, setSections] = useState<AdSectionOption[]>(DEFAULT_SECTIONS);
  const [posts, setPosts] = useState<AdPostOption[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [helpersLoading, setHelpersLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const mediaType = useMemo(() => detectMediaType(mediaUrl), [mediaUrl]);

  useEffect(() => {
    let cancelled = false;
    setHelpersLoading(true);
    Promise.all([
      bannerAdsService.getPages(),
      bannerAdsService.getPlacements(),
      bannerAdsService.getSections(),
    ])
      .then(([pageOpts, placementOpts, sectionOpts]) => {
        if (cancelled) return;
        setPages(pageOpts);
        setPlacements(placementOpts);
        setSections(sectionOpts.length ? sectionOpts : DEFAULT_SECTIONS);
        if (!banner?.pageKey && pageOpts[0]) setPageKey(pageOpts[0].key);
        if (lockedPlacement) setPlacement(lockedPlacement);
        else if (!banner?.placement && placementOpts[0]) setPlacement(placementOpts[0].key);
        else if (!banner?.placement && !placementOpts.length) setPlacement('home');
        if (lockedSection) setSection(lockedSection);
        else if (!banner?.section && sectionOpts[0]) setSection(sectionOpts[0].key);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setPages([{ key: 'refer_and_earn', label: 'Refer & Earn' }]);
          setPlacements([{ key: 'home', label: 'Home' }]);
          setSections(DEFAULT_SECTIONS);
          if (!pageKey) setPageKey('refer_and_earn');
          if (lockedPlacement) setPlacement(lockedPlacement);
          else if (!placement) setPlacement('home');
          if (lockedSection) setSection(lockedSection);
          else if (!section) setSection('general');
        }
      })
      .finally(() => {
        if (!cancelled) setHelpersLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPosts = useCallback((q: string) => {
    if (!cityId) return;
    setPostsLoading(true);
    bannerAdsService
      .getPosts(cityId, q.trim() || undefined)
      .then(setPosts)
      .catch((err) => {
        console.error(err);
        setError('Failed to load developer posts.');
      })
      .finally(() => setPostsLoading(false));
  }, [cityId]);

  useEffect(() => {
    if (!addLink || linkKind !== 'post' || !cityId) return;
    loadPosts('');
  }, [addLink, linkKind, cityId, loadPosts]);

  const postOptions = useMemo(() => {
    const opts = posts.map((post) => ({
      value: post.id,
      label: postDisplayTitle(post),
    }));
    if (listingId && !opts.some((o) => o.value === listingId)) {
      const fallback =
        banner?.listing
          ? postDisplayTitle(banner.listing)
          : banner?.linkLabel?.startsWith('Post:')
            ? banner.linkLabel.replace(/^Post:\s*/, '')
            : listingId;
      opts.unshift({ value: listingId, label: fallback });
    }
    return opts;
  }, [posts, listingId, banner]);

  const placementLabel = placements.find((p) => p.key === placement)?.label || placement;
  const sectionLabel = sections.find((s) => s.key === section)?.label || section;
  const linkPageLabel = pages.find((p) => p.key === pageKey)?.label || pageKey;

  const validate = (): string | null => {
    if (!mediaUrl.trim()) return 'Media URL is required.';
    try {
      // eslint-disable-next-line no-new
      new URL(mediaUrl.trim());
    } catch {
      return 'Media URL must be a valid URL.';
    }
    if (!placement) return 'Page is required.';
    if (!section) return 'Section is required.';
    if (addLink && linkKind === 'post' && !listingId) return 'Select a developer post.';
    if (addLink && linkKind === 'page' && !pageKey) return 'Select a page link.';
    return null;
  };

  const buildPayload = (): CreateBannerPayload => {
    const linkType: BannerLinkType = !addLink ? 'none' : linkKind;
    return {
      stateId,
      cityId,
      mediaUrl: mediaUrl.trim(),
      mediaType,
      placement,
      section,
      linkType,
      listingId: linkType === 'post' ? listingId : null,
      pageKey: linkType === 'page' ? pageKey : null,
      isActive,
    };
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const payload = buildPayload();
      if (mode === 'edit' && banner) {
        await bannerAdsService.updateBanner(banner.id, payload);
      } else {
        await bannerAdsService.createBanner(payload);
      }
      router.push('/banner-ads');
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || err?.message || 'Failed to save banner.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">State</label>
          <Input value={stateName} disabled className="bg-gray-50" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">City</label>
          <Input value={cityName} disabled className="bg-gray-50" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Page</label>
          {lockedPlacement ? (
            <Input value={placementLabel || placement} disabled className="bg-gray-50" />
          ) : helpersLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading pages…
            </div>
          ) : (
            <Select value={placement} onValueChange={(v) => setPlacement(v ?? 'home')}>
              <SelectTrigger className="w-full">
                <span>{placementLabel || 'Select page'}</span>
              </SelectTrigger>
              <SelectContent>
                {(placements.length ? placements : [{ key: 'home', label: 'Home' }]).map((p) => (
                  <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Section</label>
          {lockedSection ? (
            <Input value={sectionLabel || section} disabled className="bg-gray-50" />
          ) : (
            <Select value={section} onValueChange={(v) => setSection(v ?? 'general')}>
              <SelectTrigger className="w-full">
                <span>{sectionLabel || 'Select section'}</span>
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-medium text-gray-700">Banner media URL</label>
          <Badge variant="outline" className="gap-1 capitalize">
            {mediaType === 'video' ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
            {mediaType}
          </Badge>
        </div>
        <Input
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          placeholder="https://cdn.example.com/banner.jpg"
        />
        <p className="text-xs text-gray-500">Paste an image or video URL. Upload comes later.</p>
        {mediaUrl && mediaType === 'image' && (
          <div className="mt-2 w-full max-w-sm h-32 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Add link?</p>
            <p className="text-xs text-gray-500">When off, tapping the banner does nothing.</p>
          </div>
          <Switch checked={addLink} onCheckedChange={setAddLink} />
        </div>

        {addLink && (
          <div className="space-y-4 pt-1">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={linkKind === 'post' ? 'default' : 'outline'}
                className={linkKind === 'post' ? 'bg-primary text-white' : ''}
                onClick={() => setLinkKind('post')}
              >
                Developer project
              </Button>
              <Button
                type="button"
                variant={linkKind === 'page' ? 'default' : 'outline'}
                className={linkKind === 'page' ? 'bg-primary text-white' : ''}
                onClick={() => setLinkKind('page')}
              >
                Internal Pages
              </Button>
            </div>

            {linkKind === 'post' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Developer post</label>
                <SearchableSelect
                  options={postOptions}
                  value={listingId}
                  onValueChange={setListingId}
                  onSearch={cityId ? loadPosts : undefined}
                  loading={postsLoading}
                  placeholder="Select developer post"
                  searchPlaceholder="Search posts…"
                  emptyText="No posts for this city."
                />
              </div>
            )}

            {linkKind === 'page' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Page</label>
                <Select
                  value={pageKey || pages[0]?.key || 'refer_and_earn'}
                  onValueChange={(v) => setPageKey(v ?? '')}
                >
                  <SelectTrigger className="w-full">
                    <span>{linkPageLabel || 'Select page'}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {(pages.length ? pages : [{ key: 'refer_and_earn', label: 'Refer & Earn' }]).map((page) => (
                      <SelectItem key={page.key} value={page.key}>
                        {page.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Active</p>
          <p className="text-xs text-gray-500">Inactive banners stay hidden in the app.</p>
        </div>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.push('/banner-ads')}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-primary text-white hover:bg-primary/90">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {mode === 'edit' ? 'Save Changes' : 'Create Banner'}
        </Button>
      </div>
    </form>
  );
}
