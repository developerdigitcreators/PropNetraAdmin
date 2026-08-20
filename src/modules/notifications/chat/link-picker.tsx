'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/common/searchable-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import {
  notificationsService,
  type BroadcastKeyLabel,
  type BroadcastLinkType,
  type BroadcastListing,
} from '@/services/notifications.service';

export type LinkSelection = {
  linkType: BroadcastLinkType;
  listingId: string;
  listingLabel: string;
  pageKey: string;
};

export function LinkTypeToggle({
  active,
  onSelect,
}: {
  active: 'post' | 'page' | 'none';
  onSelect: (type: 'post' | 'page') => void;
}) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        variant={active === 'post' ? 'default' : 'outline'}
        className={active === 'post' ? 'bg-primary text-white' : ''}
        onClick={() => onSelect('post')}
      >
        Listing
      </Button>
      <Button
        type="button"
        size="sm"
        variant={active === 'page' ? 'default' : 'outline'}
        className={active === 'page' ? 'bg-primary text-white' : ''}
        onClick={() => onSelect('page')}
      >
        Internal page
      </Button>
    </div>
  );
}

type LinkPickerDialogProps = {
  open: boolean;
  pages: BroadcastKeyLabel[];
  cityId?: string;
  value: LinkSelection;
  preferredType?: 'post' | 'page';
  onClose: () => void;
  onSave: (value: LinkSelection) => void;
};

export function LinkPickerDialog({
  open,
  pages,
  cityId,
  value,
  preferredType,
  onClose,
  onSave,
}: LinkPickerDialogProps) {
  const [linkType, setLinkType] = useState<BroadcastLinkType>('post');
  const [listingId, setListingId] = useState('');
  const [listingLabel, setListingLabel] = useState('');
  const [pageKey, setPageKey] = useState('');
  const [listings, setListings] = useState<BroadcastListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setLinkType(
      preferredType || (value.linkType === 'page' ? 'page' : 'post'),
    );
    setListingId(value.listingId);
    setListingLabel(value.listingLabel);
    setPageKey(value.pageKey || pages[0]?.key || '');
    setSearch('');
  }, [open, value, pages, preferredType]);

  useEffect(() => {
    if (!open || linkType !== 'post') return;
    let cancelled = false;
    setListingsLoading(true);
    const timer = window.setTimeout(() => {
      notificationsService
        .getPublishedListings({ cityId, search })
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
  }, [open, linkType, cityId, search]);

  const listingOptions = useMemo(
    () => listings.map((l) => ({ value: l.id, label: l.title })),
    [listings],
  );
  const pageLabel = pages.find((p) => p.key === pageKey)?.label || 'Select a page';

  const canSave = linkType === 'post' ? !!listingId : !!pageKey;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link this message</DialogTitle>
          <DialogDescription>
            Tapping the card opens what you pick here. The broadcast still goes to
            PropNetra Updates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <LinkTypeToggle
            active={linkType}
            onSelect={(type) => {
              setLinkType(type);
              if (type === 'page' && !pageKey && pages[0]) setPageKey(pages[0].key);
            }}
          />

          {linkType === 'post' ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Listing / project</label>
              <SearchableSelect
                options={listingOptions}
                value={listingId}
                selectedLabel={listingLabel}
                onValueChange={(v) => {
                  setListingId(v);
                  setListingLabel(listings.find((l) => l.id === v)?.title || '');
                }}
                onSearch={setSearch}
                loading={listingsLoading}
                placeholder="Select listing / project"
                searchPlaceholder="Search listings…"
                emptyText="No published listings found."
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Internal page</label>
              <Select value={pageKey || undefined} onValueChange={(v) => setPageKey(v ?? '')}>
                <SelectTrigger className="w-full">
                  <span>{pageLabel}</span>
                </SelectTrigger>
                <SelectContent>
                  {pages.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-gray-500">
                      No pages available.
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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() =>
              onSave({ linkType: 'none', listingId: '', listingLabel: '', pageKey: '' })
            }
          >
            Remove link
          </Button>
          <Button
            onClick={() => onSave({ linkType, listingId, listingLabel, pageKey })}
            disabled={!canSave}
            className="bg-primary text-white hover:bg-primary/90"
          >
            Save link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
