'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  notificationsService,
  notificationApiError,
  MAX_BROADCAST_CITIES,
  DEFAULT_BROADCAST_LINK_TYPES,
  DEFAULT_BROADCAST_MEDIA_KINDS,
  broadcastLinkTypeLabel,
  type BroadcastBodyFormat,
  type BroadcastCity,
  type BroadcastFormat,
  type BroadcastKeyLabel,
  type BroadcastLinkType,
  type BroadcastListing,
  type BroadcastMedia,
  type BroadcastPayload,
  type SystemChannel,
} from '@/services/notifications.service';
import { SearchableSelect } from '@/components/common/searchable-select';
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
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Loader2, X } from 'lucide-react';

function isHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

type BroadcastToCityDialogProps = {
  open: boolean;
  onClose: () => void;
  onQueued: (message: string) => void;
};

export function BroadcastToCityDialog({ open, onClose, onQueued }: BroadcastToCityDialogProps) {
  const [channels, setChannels] = useState<SystemChannel[]>([]);
  const [cities, setCities] = useState<BroadcastCity[]>([]);
  const [pages, setPages] = useState<BroadcastKeyLabel[]>([]);
  const [linkTypes, setLinkTypes] = useState<BroadcastKeyLabel[]>(DEFAULT_BROADCAST_LINK_TYPES);
  const [mediaKinds, setMediaKinds] = useState<BroadcastKeyLabel[]>(DEFAULT_BROADCAST_MEDIA_KINDS);
  const [listings, setListings] = useState<BroadcastListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingSearch, setListingSearch] = useState('');
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [channelId, setChannelId] = useState('');
  const [cityIds, setCityIds] = useState<string[]>([]);
  const [cityPicker, setCityPicker] = useState('');
  const [bodyFormat, setBodyFormat] = useState<BroadcastBodyFormat>('plain');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [cardTitle, setCardTitle] = useState('');
  const [cardBody, setCardBody] = useState('');
  const [addLink, setAddLink] = useState(false);
  const [linkType, setLinkType] = useState<BroadcastLinkType>('post');
  const [listingId, setListingId] = useState('');
  const [selectedListingLabel, setSelectedListingLabel] = useState('');
  const [pageKey, setPageKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setChannelId('');
    setCityIds([]);
    setCityPicker('');
    setBodyFormat('plain');
    setTitle('');
    setBody('');
    setMediaUrls({});
    setCardTitle('');
    setCardBody('');
    setAddLink(false);
    setLinkType('post');
    setListingId('');
    setSelectedListingLabel('');
    setPageKey('');
    setListingSearch('');
    setListings([]);
    setError('');
    setIsSubmitting(false);

    setLoadingMeta(true);
    Promise.all([
      notificationsService.getBroadcastCities(),
      notificationsService.getBroadcastOptions().catch(() => ({
        channels: [] as SystemChannel[],
        linkTypes: DEFAULT_BROADCAST_LINK_TYPES,
        pages: [] as BroadcastKeyLabel[],
        mediaKinds: DEFAULT_BROADCAST_MEDIA_KINDS,
      })),
    ])
      .then(([nextCities, options]) => {
        const nextChannels = options.channels;
        setChannels(nextChannels);
        setCities(nextCities);
        setLinkTypes(options.linkTypes.length ? options.linkTypes : DEFAULT_BROADCAST_LINK_TYPES);
        setPages(options.pages);
        const kinds = options.mediaKinds.filter(
          (k) => !['text', 'none', 'plain'].includes(k.key.toLowerCase()),
        );
        setMediaKinds(kinds.length ? kinds : DEFAULT_BROADCAST_MEDIA_KINDS);
        if (nextChannels[0]) setChannelId(nextChannels[0].id);
        else setError('PropNetra Updates is not in broadcast-options.');
      })
      .catch((err) => {
        setChannels([]);
        setCities([]);
        setError(notificationApiError(err, 'Failed to load broadcast options or cities.'));
      })
      .finally(() => setLoadingMeta(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const needListings = addLink && linkType === 'post';
    if (!needListings) return;
    let cancelled = false;
    setListingsLoading(true);
    const timer = window.setTimeout(() => {
      notificationsService
        .getPublishedListings({
          cityId: cityIds[0],
          search: listingSearch,
        })
        .then((items) => {
          if (!cancelled) setListings(items);
        })
        .catch(() => {
          if (!cancelled) setListings([]);
        })
        .finally(() => {
          if (!cancelled) setListingsLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, addLink, linkType, cityIds, listingSearch]);

  const lockedChannel = channels[0];
  const selectedChannelLabel = lockedChannel?.name || 'PropNetra Updates';

  const cityOptions = useMemo(
    () =>
      cities
        .filter((c) => !cityIds.includes(c.id))
        .map((c) => ({ value: c.id, label: c.name })),
    [cities, cityIds],
  );
  const selectedCities = useMemo(
    () => cities.filter((c) => cityIds.includes(c.id)),
    [cities, cityIds],
  );

  const listingOptions = useMemo(
    () => listings.map((l) => ({ value: l.id, label: l.title })),
    [listings],
  );
  const pageLabel = pages.find((p) => p.key === pageKey)?.label || 'Select page';

  const media: BroadcastMedia[] = mediaKinds
    .map((kind) => ({ kind: kind.key, url: (mediaUrls[kind.key] || '').trim() }))
    .filter((item) => item.url);
  const imageUrl = media.find((m) => m.kind === 'image')?.url || '';
  const format: BroadcastFormat = imageUrl ? 'text_image' : 'text';
  const mediaOk = media.every((item) => isHttpsUrl(item.url));
  const citiesOk = cityIds.length >= 1 && cityIds.length <= MAX_BROADCAST_CITIES;
  const linkOk =
    !addLink ||
    (linkType === 'post' && !!listingId) ||
    (linkType === 'page' && !!pageKey);

  const canSubmit =
    !!channelId &&
    citiesOk &&
    !!title.trim() &&
    !!body.trim() &&
    mediaOk &&
    linkOk &&
    !isSubmitting;

  const addCity = (id: string) => {
    if (!id || cityIds.includes(id)) return;
    if (cityIds.length >= MAX_BROADCAST_CITIES) {
      setError(`Select 1–${MAX_BROADCAST_CITIES} cities.`);
      return;
    }
    setCityIds((prev) => [...prev, id]);
    setCityPicker('');
    setError('');
  };

  const submit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError('');
    try {
      if (media.some((item) => !isHttpsUrl(item.url))) {
        setError('Media URLs must be valid HTTPS links.');
        setIsSubmitting(false);
        return;
      }

      const resolvedLinkType: BroadcastLinkType = addLink ? linkType : 'none';
      const payload: BroadcastPayload = {
        channelId,
        cityIds,
        title: title.trim(),
        body: body.trim(),
        bodyFormat,
        format,
        linkType: resolvedLinkType,
        ...(cardTitle.trim() ? { cardTitle: cardTitle.trim() } : {}),
        ...(cardBody.trim() ? { cardBody: cardBody.trim() } : {}),
        ...(imageUrl ? { imageUrl } : {}),
        ...(media.length ? { media } : {}),
        ...(resolvedLinkType === 'post' && listingId ? { listingId } : {}),
        ...(resolvedLinkType === 'page' && pageKey ? { pageKey } : {}),
      };

      const result = await notificationsService.broadcast(payload);
      onQueued(result?.queued ? 'Queued' : 'Broadcast submitted.');
      onClose();
    } catch (err) {
      setError(notificationApiError(err, 'Failed to queue broadcast.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Broadcast to city</DialogTitle>
          <DialogDescription>
            PropNetra Updates only. Goes to Groups feed and city-alert FCM, not General inbox.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Channel</label>
            <p className="text-sm text-gray-900">{loadingMeta ? 'Loading…' : selectedChannelLabel}</p>
            <p className="text-xs text-gray-500">
              Listing groups are automatic. Admin compose is PropNetra Updates only.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Cities</label>
            <SearchableSelect
              options={cityOptions}
              value={cityPicker}
              onValueChange={addCity}
              loading={loadingMeta}
              placeholder="Select cities by name"
              searchPlaceholder="Search city…"
              emptyText="No more cities to add."
              disabled={cityIds.length >= MAX_BROADCAST_CITIES}
            />
            {selectedCities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {selectedCities.map((city) => (
                  <span
                    key={city.id}
                    className="inline-flex items-center gap-1 rounded-full bg-primary-light text-primary px-2.5 py-1 text-xs font-medium"
                  >
                    {city.name}
                    <button
                      type="button"
                      onClick={() => setCityIds((prev) => prev.filter((id) => id !== city.id))}
                      className="rounded-full p-0.5 hover:bg-white/60"
                      aria-label={`Remove ${city.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500">
              {cityIds.length} of {MAX_BROADCAST_CITIES} cities selected.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 p-3 space-y-3">
            <p className="text-sm font-medium text-gray-900">Tray (phone notification)</p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tray title"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Tray body — plain text"
                rows={3}
                maxLength={500}
                className="w-full min-h-20 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Media URLs</label>
            <div className="space-y-2">
              {mediaKinds.map((kind) => (
                <Input
                  key={kind.key}
                  value={mediaUrls[kind.key] || ''}
                  onChange={(e) =>
                    setMediaUrls((prev) => ({ ...prev, [kind.key]: e.target.value }))
                  }
                  placeholder={`${kind.label} HTTPS URL`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Optional HTTPS image, video, or PDF. Image URL makes this text+image.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 p-3 space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Groups card (in-app)</p>
              <p className="text-xs text-gray-500">Leave empty to use tray text</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Body format</label>
              <Select
                value={bodyFormat}
                onValueChange={(v) => setBodyFormat((v as BroadcastBodyFormat) || 'plain')}
              >
                <SelectTrigger className="w-full">
                  <span>{bodyFormat === 'markdown' ? 'markdown' : 'plain'}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plain">plain</SelectItem>
                  <SelectItem value="markdown">markdown</SelectItem>
                </SelectContent>
              </Select>
              {bodyFormat === 'markdown' && (
                <p className="text-xs text-gray-500">Markers only: *bold* _italic_ ~strike~. No HTML.</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Card title</label>
              <Input
                value={cardTitle}
                onChange={(e) => setCardTitle(e.target.value)}
                placeholder="Optional"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Card body</label>
              <textarea
                value={cardBody}
                onChange={(e) => setCardBody(e.target.value)}
                placeholder="Optional — *bold* _italic_ ~strike~"
                rows={3}
                maxLength={500}
                className="w-full min-h-20 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Add link?</p>
                <p className="text-xs text-gray-500">Off: card tap does nothing.</p>
              </div>
              <Switch
                checked={addLink}
                onCheckedChange={(v) => {
                  setAddLink(v);
                  if (v && linkType === 'page' && !pageKey && pages[0]) setPageKey(pages[0].key);
                }}
              />
            </div>

            {addLink && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  {linkTypes
                    .filter((t) => t.key !== 'none')
                    .map((t) => (
                      <Button
                        key={t.key}
                        type="button"
                        variant={linkType === t.key ? 'default' : 'outline'}
                        className={linkType === t.key ? 'bg-primary text-white' : ''}
                        onClick={() => {
                          const next = t.key as BroadcastLinkType;
                          setLinkType(next === 'page' ? 'page' : 'post');
                          if (next === 'page' && !pageKey && pages[0]) setPageKey(pages[0].key);
                        }}
                      >
                        {broadcastLinkTypeLabel(t)}
                      </Button>
                    ))}
                </div>

                {linkType === 'post' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Listing / project <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      options={listingOptions}
                      value={listingId}
                      selectedLabel={selectedListingLabel}
                      onValueChange={(v) => {
                        setListingId(v);
                        setSelectedListingLabel(listings.find((l) => l.id === v)?.title || '');
                      }}
                      onSearch={setListingSearch}
                      loading={listingsLoading}
                      placeholder="Select listing / project"
                      searchPlaceholder="Search listings…"
                      emptyText="No published listings found."
                    />
                    <p className="text-xs text-gray-500">
                      Opens the listing. Broadcast stays on PropNetra Updates — Groups + city-alert FCM.
                    </p>
                  </div>
                )}

                {linkType === 'page' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Internal page <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={pageKey || undefined}
                      onValueChange={(v) => setPageKey(v ?? '')}
                    >
                      <SelectTrigger className="w-full">
                        <span>{pageLabel}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {pages.length === 0 ? (
                          <div className="px-3 py-4 text-sm text-gray-500">
                            No pages from broadcast-options.
                          </div>
                        ) : (
                          pages.map((p) => (
                            <SelectItem key={p.key} value={p.key}>
                              {p.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit} className="bg-primary text-white hover:bg-primary/90">
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Broadcast
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
